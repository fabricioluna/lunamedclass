/**
 * FIX: perfil incompleto do admin em users/{uid}
 *
 * Contexto (ver PLANO-REESTRUTURACAO.md, item 0.8):
 * O nó users/BFrlESQGtYZaYnxwTCdlXIidqfO2 só tem `role` e `lastLogin` — a race condition do
 * item 2.1 (já corrigida em código, commit 6b773a4) impediu o perfil completo de ser gravado
 * quando o admin logou pela primeira vez. Este script preenche os campos que faltam, sem tocar
 * em `role` nem `lastLogin`, que já existem e estão corretos.
 *
 * ---------------------------------------------------------------------------
 * COMO RODAR
 * ---------------------------------------------------------------------------
 * 1. Baixe a chave de serviço (pule se já tiver feito isso para o backfill-userid.mjs — é a
 *    mesma chave, serve para os dois scripts):
 *      Firebase Console > engrenagem > Configurações do projeto > Contas de serviço
 *      > "Gerar nova chave privada" > salve como  scripts/serviceAccount.json
 *    (esse arquivo é um segredo — já está no .gitignore)
 *
 * 2. Instale a dependência (só para rodar o script):
 *      npm install --no-save firebase-admin
 *
 * 3. Simule primeiro. NÃO escreve nada:
 *      node scripts/fix-admin-profile.mjs
 *
 * 4. Se o relatório fizer sentido, aplique:
 *      node scripts/fix-admin-profile.mjs --apply
 *
 * 5. Apague scripts/serviceAccount.json quando terminar (ou mantenha se for rodar o
 *    backfill-userid.mjs na sequência).
 *
 * É idempotente: rodar duas vezes não causa dano — só preenche campos que ainda estiverem vazios.
 */

import { readFileSync } from 'node:fs';
import { initializeApp, cert } from 'firebase-admin/app';
import { getDatabase } from 'firebase-admin/database';

const APPLY = process.argv.includes('--apply');
const DB_URL = 'https://monitor-virtual-fms-default-rtdb.firebaseio.com';
const ADMIN_UID = 'BFrlESQGtYZaYnxwTCdlXIidqfO2';

const EXPECTED_FIELDS = {
  uid: ADMIN_UID,
  email: 'fabricioluna@gmail.com',
  displayName: 'Fabrício Luna',
  photoURL: null,
  createdAt: '2026-07-19T15:14:22.561Z',
};

const serviceAccount = JSON.parse(
  readFileSync(new URL('./serviceAccount.json', import.meta.url), 'utf8')
);

initializeApp({ credential: cert(serviceAccount), databaseURL: DB_URL });
const db = getDatabase();

console.log(APPLY ? '\n=== MODO APLICAR — vai escrever no banco ===\n'
                  : '\n=== SIMULAÇÃO (dry-run) — nada será escrito ===\n');

const ref = db.ref(`users/${ADMIN_UID}`);
const snap = await ref.get();
const current = snap.val();

if (!current) {
  console.log(`❌ Nó users/${ADMIN_UID} não existe. Nada a fazer — verifique o UID no plano.`);
  process.exit(1);
}

console.log('Perfil atual:', current);

const updates = {};
for (const [key, value] of Object.entries(EXPECTED_FIELDS)) {
  if (current[key] === undefined) {
    updates[key] = value;
  }
}

const faltando = Object.keys(updates);

if (faltando.length === 0) {
  console.log('\n✅ Perfil já está completo. Nada a fazer.\n');
  process.exit(0);
}

console.log(`\nCampos faltando: ${faltando.join(', ')}`);
console.log('Valores que serão gravados:', updates);

if (!APPLY) {
  console.log('\nSimulação concluída. Para aplicar:\n');
  console.log('  node scripts/fix-admin-profile.mjs --apply\n');
  process.exit(0);
}

await ref.update(updates);
console.log('\n✅ Perfil do admin atualizado.\n');
process.exit(0);
