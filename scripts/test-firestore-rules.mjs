/**
 * TESTE DAS SECURITY RULES DO FIRESTORE — contra o emulador local, nunca contra produção.
 *
 * Contexto: item 3.1/Aceite da Etapa 3 pedia "teste provando que aluno A não lê dado de aluno
 * B". As regras (firestore.rules) foram escritas mas nunca testadas de verdade — este script
 * fecha essa lacuna localmente, adiantando também parte do item 5.1 (testes de Security Rules
 * no emulador). Não sobe nada pra nuvem, não precisa de service account nem de projeto real
 * (usa um project id "demo-*", que o emulador trata como 100% offline).
 *
 * ---------------------------------------------------------------------------
 * COMO RODAR
 * ---------------------------------------------------------------------------
 * 1. npm install --no-save @firebase/rules-unit-testing   (só para rodar este script)
 * 2. Precisa de Java instalado (o emulador do Firestore roda em cima da JVM).
 * 3. npx firebase-tools emulators:exec --only firestore "node scripts/test-firestore-rules.mjs"
 *    (o comando `emulators:exec` sobe o emulador, roda o script, derruba o emulador depois —
 *    não precisa deixar nada rodando em background)
 *
 * Se algum teste falhar, o script imprime qual regra e sai com código != 0.
 */

import { readFileSync } from 'node:fs';
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, addDoc, collection, deleteDoc } from 'firebase/firestore';

const rules = readFileSync(new URL('../firestore.rules', import.meta.url), 'utf8');

const testEnv = await initializeTestEnvironment({
  projectId: 'demo-luna-medclass',
  firestore: { rules, host: '127.0.0.1', port: 8080 },
});

let failures = 0;
const check = async (label, fn) => {
  try {
    await fn();
    console.log(`✅ ${label}`);
  } catch (err) {
    failures++;
    console.error(`❌ ${label}\n   ${err.message}`);
  }
};

const STUDENT_A = 'student_a_uid';
const STUDENT_B = 'student_b_uid';
const ADMIN_UID = 'admin_uid';

const asStudentA = testEnv.authenticatedContext(STUDENT_A).firestore();
const asStudentB = testEnv.authenticatedContext(STUDENT_B).firestore();
const asAdmin = testEnv.authenticatedContext(ADMIN_UID, { admin: true }).firestore();
const asAnon = testEnv.unauthenticatedContext().firestore();

// Semeia dados direto (bypassando as regras) para poder testar leitura/escrita em cima deles.
await testEnv.withSecurityRulesDisabled(async (ctx) => {
  const db = ctx.firestore();
  await setDoc(doc(db, 'users', STUDENT_A), { uid: STUDENT_A, role: 'student', email: 'a@x.com' });
  await setDoc(doc(db, 'quizResults', 'result_a'), { userId: STUDENT_A, score: 8, total: 10 });
  await setDoc(doc(db, 'quizResults', 'result_b'), { userId: STUDENT_B, score: 5, total: 10 });
  await setDoc(doc(db, 'config', 'periods'), { items: [{ id: 'p1', name: 'Período 1' }] });
  await setDoc(doc(db, 'config', 'disciplines'), { items: [{ id: 'hm1', title: 'HM1', periodId: 'p1' }] });
  await setDoc(doc(db, 'osceStations', 'osce1'), { disciplineId: 'hm1', mode: 'clinical', title: 'Estação 1' });
  await setDoc(doc(db, 'questions', 'q1'), { disciplineId: 'hm1', q: 'Pergunta?' });
  await setDoc(doc(db, 'config', 'areasConhecimento'), { items: [{ id: 'a1', label: 'Anatomia' }] });
  await setDoc(doc(db, 'config', 'subareasConhecimento'), { items: [{ id: 's1', label: 'Sistema Reprodutor Feminino' }] });
  await setDoc(doc(db, 'config', 'simulatorAccess'), { 'osce-rpg': true });
  await setDoc(doc(db, 'materials', 'mat1'), { title: 'Original', disciplineId: 'hm1', unit: 'N1' });
});

// === ISOLAMENTO ENTRE ALUNOS (o motivo inteiro da migração pro Firestore) ===
await check('Aluno A NÃO lê o resultado do Aluno B (get direto por ID)', async () => {
  await assertFails(getDoc(doc(asStudentA, 'quizResults', 'result_b')));
});
await check('Aluno A lê o PRÓPRIO resultado', async () => {
  await assertSucceeds(getDoc(doc(asStudentA, 'quizResults', 'result_a')));
});
await check('Admin lê o resultado de qualquer aluno', async () => {
  await assertSucceeds(getDoc(doc(asAdmin, 'quizResults', 'result_b')));
});
await check('Aluno B NÃO lê o resultado do Aluno A (isolamento nos dois sentidos)', async () => {
  await assertFails(getDoc(doc(asStudentB, 'quizResults', 'result_a')));
});
await check('Aluno A NÃO cria resultado em nome do Aluno B (userId falso)', async () => {
  await assertFails(addDoc(collection(asStudentA, 'quizResults'), { userId: STUDENT_B, score: 10, total: 10 }));
});
await check('Aluno A cria o PRÓPRIO resultado', async () => {
  await assertSucceeds(addDoc(collection(asStudentA, 'quizResults'), { userId: STUDENT_A, score: 7, total: 10 }));
});

// === CONFIG (periods/disciplines/featureFlags) — leitura só autenticada, escrita só admin ===
await check('Visitante anônimo NÃO lê config/periods', async () => {
  await assertFails(getDoc(doc(asAnon, 'config', 'periods')));
});
await check('Aluno autenticado lê config/periods', async () => {
  await assertSucceeds(getDoc(doc(asStudentA, 'config', 'periods')));
});
await check('Aluno NÃO escreve em config/periods', async () => {
  await assertFails(setDoc(doc(asStudentA, 'config', 'periods'), { items: [] }));
});
await check('Admin escreve em config/periods', async () => {
  await assertSucceeds(setDoc(doc(asAdmin, 'config', 'periods'), { items: [] }));
});

// === DISCIPLINES — exceção pública (item 6.16: OSCE público precisa achar título/categoria
// da disciplina sem depender de login) ===
await check('Visitante anônimo LÊ config/disciplines (pública por design, item 6.16)', async () => {
  await assertSucceeds(getDoc(doc(asAnon, 'config', 'disciplines')));
});
await check('Visitante anônimo NÃO escreve em config/disciplines', async () => {
  await assertFails(setDoc(doc(asAnon, 'config', 'disciplines'), { items: [] }));
});
await check('Admin escreve em config/disciplines', async () => {
  await assertSucceeds(setDoc(doc(asAdmin, 'config', 'disciplines'), { items: [] }));
});

// === OSCE STATIONS — público de propósito (item 6.16): os 3 modos rodam sem login ===
await check('Visitante anônimo LÊ osceStations (pública por design, item 6.16)', async () => {
  await assertSucceeds(getDoc(doc(asAnon, 'osceStations', 'osce1')));
});
await check('Visitante anônimo NÃO escreve em osceStations', async () => {
  await assertFails(setDoc(doc(asAnon, 'osceStations', 'osce1'), { title: 'Hackeado' }));
});
await check('Aluno NÃO escreve em osceStations (só admin publica conteúdo)', async () => {
  await assertFails(setDoc(doc(asStudentA, 'osceStations', 'osce1'), { title: 'Hackeado' }));
});
await check('Admin escreve em osceStations', async () => {
  await assertSucceeds(setDoc(doc(asAdmin, 'osceStations', 'osce1'), { title: 'Editado' }, { merge: true }));
});

// === QUESTIONS — continua exigindo login (Simulado Teórico não mudou) ===
await check('Visitante anônimo NÃO lê questions', async () => {
  await assertFails(getDoc(doc(asAnon, 'questions', 'q1')));
});
await check('Aluno autenticado lê questions', async () => {
  await assertSucceeds(getDoc(doc(asStudentA, 'questions', 'q1')));
});

// === ÁREAS DE CONHECIMENTO — única leitura pública de config/* (Etapa 6, D6-style) ===
await check('Visitante anônimo LÊ config/areasConhecimento (pública por design)', async () => {
  await assertSucceeds(getDoc(doc(asAnon, 'config', 'areasConhecimento')));
});
await check('Visitante anônimo NÃO escreve em config/areasConhecimento', async () => {
  await assertFails(setDoc(doc(asAnon, 'config', 'areasConhecimento'), { items: [] }));
});
await check('Admin escreve em config/areasConhecimento', async () => {
  await assertSucceeds(setDoc(doc(asAdmin, 'config', 'areasConhecimento'), { items: [] }));
});
await check('Visitante anônimo LÊ config/subareasConhecimento (pública por design)', async () => {
  await assertSucceeds(getDoc(doc(asAnon, 'config', 'subareasConhecimento')));
});
await check('Visitante anônimo NÃO escreve em config/subareasConhecimento', async () => {
  await assertFails(setDoc(doc(asAnon, 'config', 'subareasConhecimento'), { items: [] }));
});
await check('Admin escreve em config/subareasConhecimento', async () => {
  await assertSucceeds(setDoc(doc(asAdmin, 'config', 'subareasConhecimento'), { items: [] }));
});

// === TRAVA DE TIPO DE SIMULADOR — mesma exceção pública (item novo, Etapa 6) ===
await check('Visitante anônimo LÊ config/simulatorAccess (pública por design)', async () => {
  await assertSucceeds(getDoc(doc(asAnon, 'config', 'simulatorAccess')));
});
await check('Visitante anônimo NÃO escreve em config/simulatorAccess', async () => {
  await assertFails(setDoc(doc(asAnon, 'config', 'simulatorAccess'), { 'osce-rpg': false }));
});
await check('Aluno NÃO escreve em config/simulatorAccess', async () => {
  await assertFails(setDoc(doc(asStudentA, 'config', 'simulatorAccess'), { 'osce-rpg': false }));
});
await check('Admin escreve em config/simulatorAccess', async () => {
  await assertSucceeds(setDoc(doc(asAdmin, 'config', 'simulatorAccess'), { 'osce-rpg': false }));
});

// === MATERIALS — aluno cria, não edita nem apaga o de outro (fix desta sessão) ===
await check('Aluno cria um material novo', async () => {
  await assertSucceeds(addDoc(collection(asStudentA, 'materials'), { title: 'Novo', disciplineId: 'hm1', unit: 'N1' }));
});
await check('Aluno NÃO edita material já publicado (nem o próprio)', async () => {
  await assertFails(setDoc(doc(asStudentA, 'materials', 'mat1'), { title: 'Alterado' }, { merge: true }));
});
await check('Aluno NÃO apaga material', async () => {
  await assertFails(deleteDoc(doc(asStudentA, 'materials', 'mat1')));
});
await check('Admin edita e apaga material', async () => {
  await assertSucceeds(setDoc(doc(asAdmin, 'materials', 'mat1'), { title: 'Corrigido' }, { merge: true }));
  await assertSucceeds(deleteDoc(doc(asAdmin, 'materials', 'mat1')));
});

// === PERFIL DE USUÁRIO — cada um só o próprio ===
await check('Aluno A NÃO lê o perfil do Aluno B', async () => {
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), 'users', STUDENT_B), { uid: STUDENT_B, role: 'student' });
  });
  await assertFails(getDoc(doc(asStudentA, 'users', STUDENT_B)));
});
await check('Aluno A lê o PRÓPRIO perfil', async () => {
  await assertSucceeds(getDoc(doc(asStudentA, 'users', STUDENT_A)));
});

// === PROGRESSO DE FLASHCARDS (Etapa 6, item 6.3) — subcoleção sob users/{uid}, isolamento
// pela ROTA do documento. Regras não são recursivas: users/{uid} liberado pro dono não cobre
// a subcoleção sozinho, por isso este bloco existe. ===
await testEnv.withSecurityRulesDisabled(async (ctx) => {
  const db = ctx.firestore();
  await setDoc(doc(db, 'users', STUDENT_A, 'flashcardProgress', 'sim1'), {
    simulationId: 'sim1',
    cards: { q1: { cardId: 'q1', ease: 2.5, intervalDays: 0, repetitions: 0, lapses: 0, reviews: 0, dueAt: 0 } },
  });
});
await check('Aluno A lê o PRÓPRIO progresso de flashcards', async () => {
  await assertSucceeds(getDoc(doc(asStudentA, 'users', STUDENT_A, 'flashcardProgress', 'sim1')));
});
await check('Aluno A escreve no PRÓPRIO progresso de flashcards', async () => {
  await assertSucceeds(setDoc(doc(asStudentA, 'users', STUDENT_A, 'flashcardProgress', 'sim1'), {
    simulationId: 'sim1', cards: {},
  }));
});
await check('Aluno B NÃO lê o progresso de flashcards do Aluno A', async () => {
  await assertFails(getDoc(doc(asStudentB, 'users', STUDENT_A, 'flashcardProgress', 'sim1')));
});
await check('Aluno B NÃO escreve no progresso de flashcards do Aluno A', async () => {
  await assertFails(setDoc(doc(asStudentB, 'users', STUDENT_A, 'flashcardProgress', 'sim1'), {
    simulationId: 'sim1', cards: {},
  }));
});
await check('Visitante anônimo NÃO lê progresso de flashcards de ninguém', async () => {
  await assertFails(getDoc(doc(asAnon, 'users', STUDENT_A, 'flashcardProgress', 'sim1')));
});

// === TENTATIVA DE SIMULADO EM ANDAMENTO + STATUS DE ACERTO POR QUESTÃO (retomar entre
// dispositivos) — mesmo padrão de subcoleção/isolamento por rota que flashcardProgress. ===
await testEnv.withSecurityRulesDisabled(async (ctx) => {
  const db = ctx.firestore();
  await setDoc(doc(db, 'users', STUDENT_A, 'quizAttempts', 'hm1_N1'), {
    disciplineId: 'hm1', unit: 'N1', questionIds: ['q1', 'q2'], answers: {}, startedAt: 0, updatedAt: 0,
  });
  await setDoc(doc(db, 'users', STUDENT_A, 'quizQuestionStatus', 'hm1'), {
    disciplineId: 'hm1', results: { q1: true }, updatedAt: 0,
  });
});
await check('Aluno A lê a PRÓPRIA tentativa de simulado em andamento', async () => {
  await assertSucceeds(getDoc(doc(asStudentA, 'users', STUDENT_A, 'quizAttempts', 'hm1_N1')));
});
await check('Aluno A escreve na PRÓPRIA tentativa de simulado em andamento', async () => {
  await assertSucceeds(setDoc(doc(asStudentA, 'users', STUDENT_A, 'quizAttempts', 'hm1_N1'), {
    disciplineId: 'hm1', unit: 'N1', questionIds: ['q1'], answers: {}, startedAt: 0, updatedAt: 0,
  }));
});
await check('Aluno B NÃO lê a tentativa de simulado em andamento do Aluno A', async () => {
  await assertFails(getDoc(doc(asStudentB, 'users', STUDENT_A, 'quizAttempts', 'hm1_N1')));
});
await check('Aluno B NÃO escreve na tentativa de simulado em andamento do Aluno A', async () => {
  await assertFails(setDoc(doc(asStudentB, 'users', STUDENT_A, 'quizAttempts', 'hm1_N1'), {
    disciplineId: 'hm1', unit: 'N1', questionIds: [], answers: {}, startedAt: 0, updatedAt: 0,
  }));
});
await check('Visitante anônimo NÃO lê tentativa de simulado de ninguém', async () => {
  await assertFails(getDoc(doc(asAnon, 'users', STUDENT_A, 'quizAttempts', 'hm1_N1')));
});
await check('Aluno A lê o PRÓPRIO status de questões respondidas', async () => {
  await assertSucceeds(getDoc(doc(asStudentA, 'users', STUDENT_A, 'quizQuestionStatus', 'hm1')));
});
await check('Aluno A zera o PRÓPRIO status de questões respondidas', async () => {
  await assertSucceeds(deleteDoc(doc(asStudentA, 'users', STUDENT_A, 'quizQuestionStatus', 'hm1')));
});
await check('Aluno B NÃO lê o status de questões respondidas do Aluno A', async () => {
  await assertFails(getDoc(doc(asStudentB, 'users', STUDENT_A, 'quizQuestionStatus', 'hm1')));
});
await check('Aluno B NÃO zera o status de questões respondidas do Aluno A', async () => {
  await assertFails(deleteDoc(doc(asStudentB, 'users', STUDENT_A, 'quizQuestionStatus', 'hm1')));
});

await testEnv.cleanup();

console.log(`\n${failures === 0 ? '✅ Todos os testes passaram' : `❌ ${failures} teste(s) falharam`}`);
process.exit(failures === 0 ? 0 : 1);
