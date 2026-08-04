/**
 * BACKFILL: userEmail -> userId em quizResults
 *
 * Contexto (ver PLANO-REESTRUTURACAO.md, item 0.9):
 * O campo `userId` só passou a ser gravado nos resultados em 19/07/2026 (commit 7fc974f).
 * Resultados anteriores têm apenas `userEmail`. Como as Security Rules agora exigem a query
 * `orderByChild('userId').equalTo(uid)`, esses resultados antigos ficaram invisíveis no
 * dashboard do aluno. Este script preenche o `userId` que falta.
 *
 * ---------------------------------------------------------------------------
 * COMO RODAR
 * ---------------------------------------------------------------------------
 * 1. Baixe a chave de serviço:
 *      Firebase Console > engrenagem > Configurações do projeto > Contas de serviço
 *      > "Gerar nova chave privada" > salve como  scripts/serviceAccount.json
 *    (esse arquivo é um segredo — já está no .gitignore)
 *
 * 2. Instale a dependência (só para rodar o script):
 *      npm install --no-save firebase-admin
 *
 * 3. Simule primeiro. NÃO escreve nada:
 *      node scripts/backfill-userid.mjs
 *
 * 4. Se o relatório fizer sentido, aplique:
 *      node scripts/backfill-userid.mjs --apply
 *
 * 5. Apague scripts/serviceAccount.json quando terminar.
 *
 * É idempotente: rodar duas vezes não causa dano.
 */

import { readFileSync } from 'node:fs';
import { initializeApp, cert } from 'firebase-admin/app';
import { getDatabase } from 'firebase-admin/database';

const APPLY = process.argv.includes('--apply');
const DB_URL = 'https://monitor-virtual-fms-default-rtdb.firebaseio.com';

const serviceAccount = JSON.parse(
  readFileSync(new URL('./serviceAccount.json', import.meta.url), 'utf8')
);

initializeApp({ credential: cert(serviceAccount), databaseURL: DB_URL });
const db = getDatabase();

console.log(APPLY ? '\n=== MODO APLICAR — vai escrever no banco ===\n'
                  : '\n=== SIMULAÇÃO (dry-run) — nada será escrito ===\n');

// 1. email -> uid
const usersSnap = await db.ref('users').get();
const users = usersSnap.val() || {};
const emailToUid = new Map();
for (const [uid, profile] of Object.entries(users)) {
  if (profile?.email) emailToUid.set(profile.email.toLowerCase().trim(), uid);
}
console.log(`Usuários com e-mail cadastrado: ${emailToUid.size}`);

// 2. varrer resultados
const resultsSnap = await db.ref('quizResults').get();
const results = resultsSnap.val() || {};
const total = Object.keys(results).length;

const updates = {};
let jaOk = 0, semEmail = 0, emailDesconhecido = 0;
const desconhecidos = new Set();

for (const [id, r] of Object.entries(results)) {
  if (!r) continue;
  if (r.userId) { jaOk++; continue; }
  if (!r.userEmail) { semEmail++; continue; }

  const uid = emailToUid.get(String(r.userEmail).toLowerCase().trim());
  if (!uid) {
    emailDesconhecido++;
    desconhecidos.add(r.userEmail);
    continue;
  }
  updates[`${id}/userId`] = uid;
}

const corrigiveis = Object.keys(updates).length;

console.log(`
Resultados no banco ........... ${total}
  já têm userId ............... ${jaOk}
  CORRIGÍVEIS (email -> uid) .. ${corrigiveis}
  sem userId e sem email ...... ${semEmail}   (irrecuperáveis)
  email sem usuário............ ${emailDesconhecido}   (conta apagada?)
`);

if (desconhecidos.size) {
  console.log('E-mails sem usuário correspondente:');
  for (const e of desconhecidos) console.log('  -', e);
  console.log('');
}

if (!corrigiveis) {
  console.log('Nada a fazer.\n');
  process.exit(0);
}

if (!APPLY) {
  console.log(`Simulação concluída. Para aplicar as ${corrigiveis} correções:\n`);
  console.log('  node scripts/backfill-userid.mjs --apply\n');
  process.exit(0);
}

await db.ref('quizResults').update(updates);
console.log(`✅ ${corrigiveis} resultados atualizados.\n`);
console.log('Confira o dashboard de um aluno antigo e apague scripts/serviceAccount.json.\n');
process.exit(0);
