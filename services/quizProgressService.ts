import { firestoreDB } from '../firebase';
import { doc, getDoc, setDoc, deleteDoc, writeBatch } from 'firebase/firestore';
import { AcademicUnit } from '../types';

// Progresso de simulado teórico por aluno (retomar entre dispositivos + "só questões não
// respondidas") — duas estruturas, ambas sob users/{uid} (isolamento pela ROTA do documento,
// mesmo padrão de services/flashcardsService.ts, regra 3 do CLAUDE.md por construção).
// Atenção ao editar firestore.rules: regras não são recursivas, então match /users/{uid} não
// cobre estas subcoleções — cada uma precisa do próprio match.

// Tentativa em andamento de um simulado (discipline + unidade). Diferente do Lab, não tem
// expiração: um simulado teórico pode ficar pausado por dias entre provas/plantões, e cada
// resposta confirmada já vira um doc imutável em quizResults na hora (handlePartialAnswer) —
// descartar a tentativa não perde histórico, só a posição de retomada.
export interface QuizAttemptProgressDoc {
  disciplineId: string;
  unit: AcademicUnit;
  quizTitle?: string;
  questionIds: string[];
  answers: Record<string, number>;
  startedAt: number;
  updatedAt: number;
}

// Último resultado conhecido por questão, dentro de uma disciplina (N1 e N2 juntos — o ID da
// questão já é globalmente único). Alimenta o filtro "apenas questões não respondidas" e o
// botão de reset em QuizSetupView.
export interface QuizQuestionStatusDoc {
  disciplineId: string;
  results: Record<string, boolean>;
  updatedAt: number;
}

// O Firestore recusa `undefined` numa escrita (ex.: quizTitle ausente num simulado misto sem
// banco oficial) — mesmo cuidado de services/flashcardsService.ts.
const stripUndefined = <T>(value: T): T => {
  if (Array.isArray(value)) return value.map(stripUndefined) as unknown as T;
  if (value === null || typeof value !== 'object') return value;
  const clean: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
    if (item !== undefined) clean[key] = stripUndefined(item);
  }
  return clean as unknown as T;
};

export const buildAttemptKey = (disciplineId: string, unit: AcademicUnit): string => `${disciplineId}_${unit}`;

const attemptRef = (uid: string, attemptKey: string) => doc(firestoreDB, 'users', uid, 'quizAttempts', attemptKey);

const questionStatusRef = (uid: string, disciplineId: string) =>
  doc(firestoreDB, 'users', uid, 'quizQuestionStatus', disciplineId);

export const fetchQuizAttempt = async (uid: string, attemptKey: string): Promise<QuizAttemptProgressDoc | null> => {
  const snap = await getDoc(attemptRef(uid, attemptKey));
  return snap.exists() ? (snap.data() as QuizAttemptProgressDoc) : null;
};

// Cria (ou substitui por inteiro) a tentativa daquele discipline+unit — usado ao gerar um
// simulado novo ou ao refazer (completo/errados), nunca com merge: uma tentativa nova não deve
// herdar respostas da anterior.
export const startQuizAttempt = async (
  uid: string,
  attemptKey: string,
  data: Omit<QuizAttemptProgressDoc, 'answers' | 'updatedAt'>,
): Promise<void> => {
  const payload: QuizAttemptProgressDoc = { ...data, answers: {}, updatedAt: Date.now() };
  await setDoc(attemptRef(uid, attemptKey), stripUndefined(payload));
};

// Chamado a cada questão respondida (mesmo ponto onde já se grava em quizResults). Atualiza os
// dois documentos numa única ida ao servidor: a resposta na tentativa em andamento e o
// resultado mais recente daquela questão na disciplina.
export const recordQuizAnswer = async (
  uid: string,
  attemptKey: string,
  disciplineId: string,
  questionId: string,
  isCorrect: boolean,
  optionIndex: number,
): Promise<void> => {
  const batch = writeBatch(firestoreDB);
  const now = Date.now();
  batch.set(
    attemptRef(uid, attemptKey),
    { answers: { [questionId]: optionIndex }, updatedAt: now },
    { merge: true },
  );
  batch.set(
    questionStatusRef(uid, disciplineId),
    { disciplineId, results: { [questionId]: isCorrect }, updatedAt: now },
    { merge: true },
  );
  await batch.commit();
};

// Chamado ao terminar o simulado ou ao escolher "novo simulado" descartando uma tentativa salva.
export const clearQuizAttempt = async (uid: string, attemptKey: string): Promise<void> => {
  await deleteDoc(attemptRef(uid, attemptKey));
};

export const fetchQuizQuestionStatus = async (uid: string, disciplineId: string): Promise<Record<string, boolean>> => {
  const snap = await getDoc(questionStatusRef(uid, disciplineId));
  const data = snap.data() as QuizQuestionStatusDoc | undefined;
  return data?.results ?? {};
};

// Botão "zerar questões já respondidas" — some com o documento inteiro daquela disciplina.
export const resetQuizQuestionStatus = async (uid: string, disciplineId: string): Promise<void> => {
  await deleteDoc(questionStatusRef(uid, disciplineId));
};
