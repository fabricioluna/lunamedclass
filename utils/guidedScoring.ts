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
