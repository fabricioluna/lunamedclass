import { describe, it, expect } from 'vitest';
import { resolveQuestionUnit, matchesDisciplineAndUnit } from './questionFilters';
import type { Question } from '../types';

const baseQuestion: Question = {
  id: 'q1',
  disciplineId: 'hm1',
  theme: 'Cardio',
  q: '...',
  options: [],
  answer: 0,
  explanation: '',
  tag: '',
  isPractical: false,
};

describe('resolveQuestionUnit', () => {
  it('questão sem unit é tratada como legado N1', () => {
    expect(resolveQuestionUnit({ unit: undefined })).toBe('N1');
  });

  it('questão com unit explícita mantém o valor', () => {
    expect(resolveQuestionUnit({ unit: 'N2' })).toBe('N2');
  });
});

describe('matchesDisciplineAndUnit', () => {
  it('rejeita questão de outra disciplina', () => {
    const q = { ...baseQuestion, disciplineId: 'outra' };
    expect(matchesDisciplineAndUnit(q, { disciplineId: 'hm1', isUC: false, selectedUnit: 'N1' })).toBe(false);
  });

  it('disciplina UC ignora o filtro de unidade (bloco unificado)', () => {
    const n2Question = { ...baseQuestion, unit: 'N2' as const };
    expect(matchesDisciplineAndUnit(n2Question, { disciplineId: 'hm1', isUC: true, selectedUnit: 'N1' })).toBe(true);
  });

  it('questão legado (sem unit) conta como N1 e passa quando selectedUnit é N1', () => {
    expect(matchesDisciplineAndUnit(baseQuestion, { disciplineId: 'hm1', isUC: false, selectedUnit: 'N1' })).toBe(true);
  });

  it('questão legado (sem unit) NÃO passa quando selectedUnit é N2', () => {
    expect(matchesDisciplineAndUnit(baseQuestion, { disciplineId: 'hm1', isUC: false, selectedUnit: 'N2' })).toBe(false);
  });

  it('questão marcada N2 passa quando selectedUnit é N2', () => {
    const n2Question = { ...baseQuestion, unit: 'N2' as const };
    expect(matchesDisciplineAndUnit(n2Question, { disciplineId: 'hm1', isUC: false, selectedUnit: 'N2' })).toBe(true);
  });

  it('questão marcada N2 NÃO passa quando selectedUnit é N1', () => {
    const n2Question = { ...baseQuestion, unit: 'N2' as const };
    expect(matchesDisciplineAndUnit(n2Question, { disciplineId: 'hm1', isUC: false, selectedUnit: 'N1' })).toBe(false);
  });
});
