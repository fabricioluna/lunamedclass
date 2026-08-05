/**
 * CUSTOM CLAIMS: marca um UID como admin no Firebase Auth (não no banco).
 *
 * Contexto (ver PLANO-REESTRUTURACAO.md, item 3.2):
 * Até aqui, "quem é admin" vivia hardcoded como UID dentro das Security Rules do RTDB
 * (ver database.rules.README.md) — solução interina da Etapa 0. Com o Firestore (Etapa 3),
 * a autoridade passa a ser um Custom Claim `admin: true` gravado no próprio usuário do
 * Firebase Auth. `firestore.rules` já assume isso (`request.auth.token.admin == true`).
 *
 * O plano original previa uma Cloud Function `setAdminClaim` para isso. Decisão tomada com
 * o usuário: como só existe 1 admin e o projeto não tem Firebase CLI/Cloud Functions
 * configurados (exigiria ativar o plano Blaze só para isso), este script local — mesmo
 * padrão dos scripts de 0.8/0.9/backup, usando a service account — resolve sem infra nova.
 * Só precisa rodar de novo se o admin mudar (raro).
 *
 * ---------------------------------------------------------------------------
 * COMO RODAR
 * ---------------------------------------------------------------------------
 * 1. Chave de serviço em scripts/serviceAccount.json (mesma que os outros scripts usam).
 * 2. npm install --no-save firebase-admin   (pule se já tiver instalado)
 * 3. Simule primeiro. NÃO escreve nada:
 *      node scripts/set-admin-claim.mjs
 * 4. Se o relatório fizer sentido, aplique:
 *      node scripts/set-admin-claim.mjs --apply
 * 5. IMPORTANTE: claims só valem no próximo login (ou próximo refresh do ID token). O admin
 *    precisa deslogar e logar de novo — ou o app precisa forçar getIdTokenResult(true) — para
 *    o painel /admin reconhecer o novo claim.
 *
 * É idempotente: rodar de novo com o mesmo UID não causa dano, só confirma o estado.
 */

import { readFileSync } from 'node:fs';
import { initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

const APPLY = process.argv.includes('--apply');
const ADMIN_UID = 'BFrlESQGtYZaYnxwTCdlXIidqfO2';

const serviceAccount = JSON.parse(
  readFileSync(new URL('./serviceAccount.json', import.meta.url), 'utf8')
);

initializeApp({ credential: cert(serviceAccount) });
const auth = getAuth();

console.log(APPLY ? '\n=== MODO APLICAR — vai gravar o custom claim ===\n'
                  : '\n=== SIMULAÇÃO (dry-run) — nada será escrito ===\n');

const user = await auth.getUser(ADMIN_UID);
const currentClaims = user.customClaims || {};

console.log(`Usuário: ${user.email} (${user.uid})`);
console.log('Claims atuais:', currentClaims);

if (currentClaims.admin === true) {
  console.log('\n✅ Já tem o claim admin=true. Nada a fazer.\n');
  process.exit(0);
}

console.log('\nClaim a gravar: { admin: true } (preservando os demais claims existentes)');

if (!APPLY) {
  console.log('\nSimulação concluída. Para aplicar:\n');
  console.log('  node scripts/set-admin-claim.mjs --apply\n');
  process.exit(0);
}

await auth.setCustomUserClaims(ADMIN_UID, { ...currentClaims, admin: true });
console.log('\n✅ Custom claim gravado. Peça para o admin deslogar e logar de novo no site.\n');
process.exit(0);
