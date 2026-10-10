// Pontuação das estações OSCE estáticas (features/osce/OsceView.tsx). Regra pura, testada em
// osceScoring.test.ts.
//
// Regra (item 6.17): cada passo do gabarito realizado vale 1.0 ponto; se ele está na ORDEM
// RELATIVA certa soma +0.5 de bônus. Cada ação que não pertence ao gabarito — distrator ou
// repetição a mais de um passo — desconta 0.5 (piso em 0). A nota é escalada para 0-10 e
// arredondada para 1 casa decimal.
//
// Por que ordem relativa e não posição exata (regra anterior): com posição exata, esquecer o
// 2º passo empurrava todos os seguintes uma casa e eles viravam "fora de sequência" — um
// esquecimento só derrubava a nota da técnica inteira. A ordem relativa é a maior
// subsequência comum (LCS) entre o que o aluno fez e o gabarito: o esquecimento custa só o
// próprio passo.
//
// A comparação é pelo TEXTO do passo, não por índice de botão, porque um mesmo passo pode
// aparecer várias vezes no gabarito (ex.: "Higienizar as mãos" 3x na desparamentação).

export type SelectionStatus = 'in-order' | 'out-of-order' | 'wrong';

export interface SelectionAssessment {
  action: string;
  status: SelectionStatus;
  expectedPosition?: number; // índice (0-based) do passo do gabarito que esta ação cumpriu
}

export interface OsceScoreResult {
  points: number;
  maxPoints: number;
  errors: number;
  grade: number;
  selections: SelectionAssessment[];
  omittedPositions: number[]; // índices (0-based) dos passos do gabarito que o aluno não fez
}

const IN_ORDER_POINTS = 1.5;
const OUT_OF_ORDER_POINTS = 1.0;
const WRONG_PENALTY = 0.5;

// Pares (posição do aluno, posição do gabarito) da maior subsequência comum.
const longestCommonSubsequencePairs = (selected: string[], correct: string[]): [number, number][] => {
  const m = selected.length;
  const n = correct.length;
  const table: number[][] = Array.from({ length: m + 1 }, () => new Array<number>(n + 1).fill(0));

  for (let i = m - 1; i >= 0; i--) {
    for (let j = n - 1; j >= 0; j--) {
      table[i][j] = selected[i] === correct[j]
        ? table[i + 1][j + 1] + 1
        : Math.max(table[i + 1][j], table[i][j + 1]);
    }
  }

  const pairs: [number, number][] = [];
  let i = 0;
  let j = 0;
  while (i < m && j < n) {
    if (selected[i] === correct[j]) {
      pairs.push([i, j]);
      i++;
      j++;
    } else if (table[i + 1][j] > table[i][j + 1]) {
      i++;
    } else {
      // No empate, avança o gabarito e não o aluno: assim a PRIMEIRA vez que o aluno faz um
      // passo é a que conta como certa, e a repetição posterior é que vira erro.
      j++;
    }
  }
  return pairs;
};

export function calculateOsceScore(correctSequence: string[], selectedSequence: string[]): OsceScoreResult {
  const selections: SelectionAssessment[] = selectedSequence.map((action) => ({ action, status: 'wrong' }));
  const fulfilled = new Array<boolean>(correctSequence.length).fill(false);

  for (const [userPos, correctPos] of longestCommonSubsequencePairs(selectedSequence, correctSequence)) {
    selections[userPos] = { action: selectedSequence[userPos], status: 'in-order', expectedPosition: correctPos };
    fulfilled[correctPos] = true;
  }

  // O que sobrou do aluno e ainda corresponde a um passo não cumprido é acerto fora de ordem;
  // o resto (distrator ou repetição além do que o gabarito pede) é erro.
  selections.forEach((selection, userPos) => {
    if (selection.status !== 'wrong') return;
    const correctPos = correctSequence.findIndex((step, idx) => !fulfilled[idx] && step === selection.action);
    if (correctPos === -1) return;
    selections[userPos] = { action: selection.action, status: 'out-of-order', expectedPosition: correctPos };
    fulfilled[correctPos] = true;
  });

  const inOrder = selections.filter((s) => s.status === 'in-order').length;
  const outOfOrder = selections.filter((s) => s.status === 'out-of-order').length;
  const errors = selections.filter((s) => s.status === 'wrong').length;

  const points = Math.max(0, inOrder * IN_ORDER_POINTS + outOfOrder * OUT_OF_ORDER_POINTS - errors * WRONG_PENALTY);
  const maxPoints = correctSequence.length * IN_ORDER_POINTS;
  const grade = maxPoints > 0 ? (points / maxPoints) * 10 : 0;

  return {
    points,
    maxPoints,
    errors,
    grade: parseFloat(grade.toFixed(1)),
    selections,
    omittedPositions: fulfilled.flatMap((done, idx) => (done ? [] : [idx])),
  };
}
