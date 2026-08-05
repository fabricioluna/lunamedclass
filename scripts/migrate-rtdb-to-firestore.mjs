/**
 * MIGRAÇÃO: RTDB → Firestore.
 *
 * Contexto (ver PLANO-REESTRUTURACAO.md, item 3.7 — "ponto de não-retorno" da Etapa 3):
 * Este script lê o Realtime Database inteiro (só leitura, nunca escreve nem apaga nada lá) e
 * grava o equivalente no Firestore, seguindo o modelo documentado em firestore.rules.README.md.
 * `materials` já vivia só no Firestore (não existe em RTDB) — não é tocado aqui.
 *
 * Reaproveita os IDs originais do RTDB como ID do documento no Firestore (em vez de deixar o
 * Firestore gerar um novo) — isso torna o script IDEMPOTENTE: rodar de novo sobrescreve com
 * os mesmos dados, não duplica.
 *
 * Mapeamento de coleções:
 *   users/{uid}            → Firestore users/{uid}                    (mesmo formato)
 *   quizResults/{id}        → Firestore quizResults/{id}
 *   osceAnalytics/{id}       → Firestore osceAnalytics/{id}
 *   questions/{id}           → Firestore questions/{id}
 *   osce/{id}                → Firestore osceStations/{id}             (renomeado)
 *   labSimulations/{id}      → Firestore labSimulations/{id}
 *   periodRequests/{id}      → Firestore periodRequests/{id}
 *   surveys/{id}              → Firestore surveys/{id}
 *   periods                   → Firestore config/periods {items: [...]}
 *   disciplines + discipline_config → Firestore config/disciplines {items: [...]}
 *     (os overrides de discipline_config — themes/references/status/lockedFeatures — são
 *     mesclados direto dentro de cada disciplina; o Firestore não tem a cascata de permissão
 *     do RTDB que motivou esse nó separado, ver firestore.rules.README.md)
 *   feature_flags              → Firestore config/featureFlags {items: {...}}
 *
 * ---------------------------------------------------------------------------
 * COMO RODAR
 * ---------------------------------------------------------------------------
 * 1. Chave de serviço em scripts/serviceAccount.json (mesma dos outros scripts).
 * 2. npm install --no-save firebase-admin   (pule se já tiver instalado)
 * 3. Confirme que existe um backup recente (scripts/backup-rtdb.mjs) antes de rodar --apply.
 * 4. Simule primeiro. NÃO escreve nada no Firestore:
 *      node scripts/migrate-rtdb-to-firestore.mjs
 * 5. Se a contagem por coleção bater com o esperado, aplique:
 *      node scripts/migrate-rtdb-to-firestore.mjs --apply
 * 6. Depois de confirmar no app que tudo funciona a partir do Firestore, o RTDB pode ser
 *    aposentado (D3) — decisão e execução do usuário, não deste script.
 */

import { readFileSync } from 'node:fs';
import { initializeApp, cert } from 'firebase-admin/app';
import { getDatabase } from 'firebase-admin/database';
import { getFirestore } from 'firebase-admin/firestore';

const APPLY = process.argv.includes('--apply');
const DB_URL = 'https://monitor-virtual-fms-default-rtdb.firebaseio.com';

const serviceAccount = JSON.parse(
  readFileSync(new URL('./serviceAccount.json', import.meta.url), 'utf8')
);

initializeApp({ credential: cert(serviceAccount), databaseURL: DB_URL });
const rtdb = getDatabase();
const firestore = getFirestore();

console.log(APPLY ? '\n=== MODO APLICAR — vai escrever no Firestore ===\n'
                  : '\n=== SIMULAÇÃO (dry-run) — nada será escrito ===\n');

console.log('Lendo o RTDB inteiro (só leitura)...');
const snap = await rtdb.ref('/').get();
const data = snap.val() || {};

const asArray = (obj) => (obj ? Object.entries(obj).map(([id, value]) => ({ id, ...value })) : []);

// Commits em lotes de 500 (limite do Firestore por batch).
const commitInChunks = async (docs, writer) => {
  if (!APPLY) return;
  const CHUNK = 500;
  for (let i = 0; i < docs.length; i += CHUNK) {
    const batch = firestore.batch();
    docs.slice(i, i + CHUNK).forEach((d) => writer(batch, d));
    await batch.commit();
  }
};

const report = [];

// === COLEÇÕES 1:1 (mesmo formato, mesmo id) ===
const simpleCollections = [
  { rtdbPath: 'users', firestoreCollection: 'users' },
  { rtdbPath: 'quizResults', firestoreCollection: 'quizResults' },
  { rtdbPath: 'osceAnalytics', firestoreCollection: 'osceAnalytics' },
  { rtdbPath: 'questions', firestoreCollection: 'questions' },
  { rtdbPath: 'osce', firestoreCollection: 'osceStations' },
  { rtdbPath: 'labSimulations', firestoreCollection: 'labSimulations' },
  { rtdbPath: 'periodRequests', firestoreCollection: 'periodRequests' },
  { rtdbPath: 'surveys', firestoreCollection: 'surveys' },
];

for (const { rtdbPath, firestoreCollection } of simpleCollections) {
  const items = asArray(data[rtdbPath]);
  report.push(`${String(items.length).padStart(5)}  ${rtdbPath.padEnd(16)} → ${firestoreCollection}`);
  await commitInChunks(items, (batch, item) => {
    const { id, ...rest } = item;
    batch.set(firestore.collection(firestoreCollection).doc(id), rest);
  });
}

// === PERÍODOS (array simples) ===
const periods = Array.isArray(data.periods) ? data.periods : Object.values(data.periods || {});
report.push(`${String(periods.length).padStart(5)}  periods          → config/periods`);
if (APPLY) await firestore.collection('config').doc('periods').set({ items: periods });

// === DISCIPLINAS + DISCIPLINE_CONFIG MESCLADOS ===
const disciplinesRaw = Array.isArray(data.disciplines) ? data.disciplines : Object.values(data.disciplines || {});
const disciplineConfig = data.discipline_config || {};
const disciplines = disciplinesRaw.map((disc) => {
  const override = disciplineConfig[disc.id];
  if (!override) return disc;
  return {
    ...disc,
    themes: Array.isArray(override.themes) ? override.themes : disc.themes,
    references: Array.isArray(override.references) ? override.references : disc.references,
    status: override.status || disc.status,
    lockedFeatures: Array.isArray(override.lockedFeatures) ? override.lockedFeatures : disc.lockedFeatures,
  };
});
report.push(`${String(disciplines.length).padStart(5)}  disciplines      → config/disciplines (com discipline_config mesclado)`);
if (APPLY) await firestore.collection('config').doc('disciplines').set({ items: disciplines });

// === FEATURE FLAGS (mapa, não array) ===
const featureFlags = data.feature_flags || {};
report.push(`${String(Object.keys(featureFlags).length).padStart(5)}  feature_flags    → config/featureFlags`);
if (APPLY) await firestore.collection('config').doc('featureFlags').set({ items: featureFlags });

console.log('\nResumo da migração:\n');
console.log(report.join('\n'));

if (!APPLY) {
  console.log('\nSimulação concluída — nada foi escrito. Para aplicar:\n');
  console.log('  node scripts/migrate-rtdb-to-firestore.mjs --apply\n');
} else {
  console.log('\n✅ Migração aplicada. Teste o app inteiro (ver checklist na Etapa 3 do plano)');
  console.log('   antes de considerar o RTDB aposentável.\n');
}
process.exit(0);
