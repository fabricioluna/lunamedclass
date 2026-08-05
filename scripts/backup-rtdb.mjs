/**
 * BACKUP: exporta o Realtime Database inteiro para um arquivo .json local
 *
 * Contexto: pré-requisito da Etapa 3 (migração para Firestore, ponto de não-retorno).
 * O console do Firebase tem um "Exportar JSON" na aba Dados, mas a UI muda de versão pra
 * versão e nem sempre é fácil achar. Este script faz a mesma coisa via Admin SDK, com a
 * vantagem de eu poder conferir o resultado (tamanho, coleções, contagem de registros) sem
 * depender de captura de tela.
 *
 * Só LÊ o banco — não escreve nada em produção. O arquivo gerado fica em backups/, que está
 * no .gitignore (o dump contém dado real de aluno: e-mail, notas — não pode ir pro git).
 *
 * ---------------------------------------------------------------------------
 * COMO RODAR
 * ---------------------------------------------------------------------------
 * 1. Chave de serviço em scripts/serviceAccount.json (mesma que os outros scripts usam).
 * 2. npm install --no-save firebase-admin   (pule se já tiver instalado)
 * 3. node scripts/backup-rtdb.mjs
 *
 * Gera backups/rtdb-backup-<timestamp>.json e imprime um resumo do que foi salvo.
 */

import { writeFileSync, mkdirSync, readFileSync, statSync } from 'node:fs';
import { initializeApp, cert } from 'firebase-admin/app';
import { getDatabase } from 'firebase-admin/database';

const DB_URL = 'https://monitor-virtual-fms-default-rtdb.firebaseio.com';
const BACKUP_DIR = new URL('../backups/', import.meta.url);

const serviceAccount = JSON.parse(
  readFileSync(new URL('./serviceAccount.json', import.meta.url), 'utf8')
);

initializeApp({ credential: cert(serviceAccount), databaseURL: DB_URL });
const db = getDatabase();

console.log('\n=== Baixando o RTDB inteiro (só leitura) ===\n');

const snap = await db.ref('/').get();
const data = snap.val() || {};

mkdirSync(BACKUP_DIR, { recursive: true });

const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const outPath = new URL(`rtdb-backup-${timestamp}.json`, BACKUP_DIR);

writeFileSync(outPath, JSON.stringify(data, null, 2), 'utf8');

const sizeBytes = statSync(outPath).size;
const sizeMB = (sizeBytes / 1024 / 1024).toFixed(2);

console.log(`✅ Backup salvo em: ${outPath.pathname}`);
console.log(`   Tamanho: ${sizeMB} MB (${sizeBytes} bytes)\n`);

console.log('Resumo por coleção (nó de nível 1):');
for (const [key, value] of Object.entries(data)) {
  const count = value && typeof value === 'object' ? Object.keys(value).length : 1;
  console.log(`  - ${key}: ${count} registros`);
}

console.log('\nGuarde esse arquivo fora do repositório (ele não vai pro git, mas é um segredo —\ncontém dado real de aluno). Depois de confirmar que a Etapa 3 correu bem, pode apagar.\n');

process.exit(0);
