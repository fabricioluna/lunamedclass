// Pontuação do RPG guiado (features/osce/GuidedRpgView.tsx). Regra pura, testada em
// guidedScoring.test.ts.
//
// Cada cena vale o mesmo. Acertar de primeira vale 1; precisar de uma segunda tentativa vale
// 0,5; a partir da terceira, 0. A cena só avança quando o aluno acerta — então a nota mede
// quantas condutas ele já sabia, não se ele "chegou ao fim". A nota é escalada para 0-10 e
// arredondada para 1 casa decimal.

export interface GuidedScoreResult {
  grade: number;
  firstTry: number; // cenas acertadas de primeira
  withRetries: number; // cenas que precisaram de mais de uma tentativa
  totalWrong: number; // escolhas erradas somadas
}

export const sceneCredit = (attempts: number): number => {
  if (attempts <= 1) return 1;
  if (attempts === 2) return 0.5;
  return 0;
};

// --- RPG digitado: as dicas custam pontos -------------------------------------------------------
// Sem alternativas na tela, o aluno pode travar; a dica nível 1 é uma pista e a de nível 2 mostra
// a conduta. Cada nível usado desconta da cena (que nunca fica abaixo de 0).
export const HINT_PENALTY = [0, 0.25, 0.5] as const;
export const MAX_HINT_LEVEL = 2;

export interface TypedSceneInput {
  attempts: number;
  hintLevel: number; // 0 = nenhuma dica; 1 = pista; 2 = conduta mostrada
}

export interface TypedScoreResult extends GuidedScoreResult {
  hintsUsed: number; // soma dos níveis de dica de todas as cenas
}

export const typedSceneCredit = ({ attempts, hintLevel }: TypedSceneInput): number =>
  Math.max(0, sceneCredit(attempts) - HINT_PENALTY[Math.min(Math.max(hintLevel, 0), MAX_HINT_LEVEL)]);

export function calculateTypedScore(scenes: TypedSceneInput[]): TypedScoreResult {
  const total = scenes.length;
  const points = scenes.reduce((sum, scene) => sum + typedSceneCredit(scene), 0);
  const attempts = scenes.map((scene) => scene.attempts);

  return {
    grade: total > 0 ? parseFloat(((points / total) * 10).toFixed(1)) : 0,
    firstTry: attempts.filter((a) => a <= 1).length,
    withRetries: attempts.filter((a) => a > 1).length,
    totalWrong: attempts.reduce((sum, a) => sum + Math.max(0, a - 1), 0),
    hintsUsed: scenes.reduce((sum, scene) => sum + Math.min(Math.max(scene.hintLevel, 0), MAX_HINT_LEVEL), 0),
  };
}

export function calculateGuidedScore(attemptsByScene: number[]): GuidedScoreResult {
  const total = attemptsByScene.length;
  const points = attemptsByScene.reduce((sum, attempts) => sum + sceneCredit(attempts), 0);

  return {
    grade: total > 0 ? parseFloat(((points / total) * 10).toFixed(1)) : 0,
    firstTry: attemptsByScene.filter((a) => a <= 1).length,
    withRetries: attemptsByScene.filter((a) => a > 1).length,
    totalWrong: attemptsByScene.reduce((sum, attempts) => sum + Math.max(0, attempts - 1), 0),
  };
}
