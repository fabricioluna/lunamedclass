// Regra de filtro por unidade (N1/N2) usada em features/quiz/QuizSetupView.tsx. Extraído do
// componente (estava repetido 5x inline) para permitir teste unitário — mesma regra que já
// rodava embutida no JSX: questão sem `unit` é legado e conta como N1; disciplinas UC ignoram
// o filtro de unidade (bloco unificado).

import type { AcademicUnit, Question } from '../types';

export function resolveQuestionUnit(question: Pick<Question, 'unit'>): AcademicUnit {
  return question.unit || 'N1';
}

export interface UnitFilterParams {
  disciplineId: string;
  isUC: boolean;
  selectedUnit: AcademicUnit;
}

export function matchesDisciplineAndUnit(
  question: Pick<Question, 'disciplineId' | 'unit'>,
  { disciplineId, isUC, selectedUnit }: UnitFilterParams,
): boolean {
  if (question.disciplineId !== disciplineId) return false;
  if (isUC) return true;
  return resolveQuestionUnit(question) === selectedUnit;
}
