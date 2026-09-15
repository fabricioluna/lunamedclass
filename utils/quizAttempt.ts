import { Question } from '../types';

// Lógica pura de reconstrução/filtragem de tentativa de simulado teórico — sem Firebase, quem
// persiste é services/quizProgressService.ts (mesma filosofia de utils/srs.ts).

// Reconstitui a lista de questões de uma tentativa salva, na MESMA ordem em que foram
// apresentadas. Só guardamos IDs no Firestore (não o objeto Question inteiro, que pode ter
// imagem/explicação grandes) — aqui recompomos a partir do banco de questões já carregado.
// IDs que não existem mais no banco (questão removida no meio tempo) são descartados.
export function reconstructAttemptQuestions(questionIds: string[], allQuestions: Question[]): Question[] {
  const byId = new Map(allQuestions.map(q => [q.id, q]));
  const result: Question[] = [];
  for (const id of questionIds) {
    const question = byId.get(id);
    if (question) result.push(question);
  }
  return result;
}

// Índice para onde o simulado deve retomar: a primeira questão ainda sem resposta, na ordem
// original. Se todas já foram respondidas, retoma na última (permite só ver o relatório final).
export function resolveResumeIndex(questionIds: string[], answers: Record<string, number>): number {
  const firstUnanswered = questionIds.findIndex(id => answers[id] === undefined);
  if (firstUnanswered !== -1) return firstUnanswered;
  return Math.max(0, questionIds.length - 1);
}

// Filtro "apenas questões não respondidas": remove só as que o resultado MAIS RECENTE marcou
// como acerto (status[id] === true). Ausente ou `false` (nunca respondida, ou errada da última
// vez) continua elegível — é assim que "erro mais recente sobrescreve" fica satisfeito de graça.
export function filterOutRecentlyCorrect(questions: Question[], status: Record<string, boolean>): Question[] {
  return questions.filter(q => status[q.id] !== true);
}

// Extrai o rótulo de um conjunto de questões: nome do banco oficial se for uma seleção
// homogênea, "Simulado Misto" caso contrário. Lógica hoje duplicada como closure em
// features/quiz/QuizView.tsx — promovida aqui para ser reutilizável e testável.
export function resolveQuizTitle(questions: Question[]): string {
  const uniqueTitles = Array.from(new Set(questions.map(q => q.quizTitle).filter(Boolean)));
  return uniqueTitles.length === 1 ? (uniqueTitles[0] as string) : 'Simulado Misto';
}
