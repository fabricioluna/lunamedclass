// Pontuação das estações OSCE estáticas (features/osce/OsceView.tsx). Extraído do componente
// para permitir teste unitário — mesma fórmula que já rodava embutida no JSX.
//
// Regra: cada ação certa vale 1.0 ponto; acertar a ordem exata (mesma posição do gabarito)
// soma +0.5 de bônus. Cada ação selecionada que não está no gabarito desconta 0.5 (piso em 0).
// A nota final é escalada para 0-10 com base no total de ações do gabarito e arredondada para
// 1 casa decimal.

export interface OsceScoreResult {
  points: number;
  maxPoints: number;
  errors: number;
  grade: number;
}

export function calculateOsceScore(correctOrderIndices: number[], selectedActions: number[]): OsceScoreResult {
  let points = 0;
  const maxPoints = correctOrderIndices.length * 1.5;

  correctOrderIndices.forEach((correctIdx, position) => {
    const userIndex = selectedActions.indexOf(correctIdx);
    if (userIndex !== -1) {
      points += 1.0;
      if (userIndex === position) points += 0.5;
    }
  });

  const errors = selectedActions.filter((i) => !correctOrderIndices.includes(i)).length;
  points = Math.max(0, points - errors * 0.5);

  const grade = maxPoints > 0 ? (points / maxPoints) * 10 : 0;

  return { points, maxPoints, errors, grade: parseFloat(grade.toFixed(1)) };
}
