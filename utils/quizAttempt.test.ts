import { describe, it, expect } from 'vitest';
import {
  reconstructAttemptQuestions,
  resolveResumeIndex,
  filterOutRecentlyCorrect,
  resolveQuizTitle,
} from './quizAttempt';
import { Question } from '../types';

const makeQuestion = (overrides: Partial<Question> & { id: string }): Question => ({
  disciplineId: 'hm1',
  theme: 'Tema',
  q: 'Pergunta?',
  options: ['A', 'B'],
  answer: 0,
  explanation: '',
  tag: '',
  isPractical: false,
  ...overrides,
});

describe('reconstructAttemptQuestions', () => {
  it('preserva a ordem original salva na tentativa', () => {
    const bank = [makeQuestion({ id: 'q1' }), makeQuestion({ id: 'q2' }), makeQuestion({ id: 'q3' })];
    const result = reconstructAttemptQuestions(['q3', 'q1'], bank);
    expect(result.map(q => q.id)).toEqual(['q3', 'q1']);
  });

  it('descarta IDs que não existem mais no banco', () => {
    const bank = [makeQuestion({ id: 'q1' })];
    const result = reconstructAttemptQuestions(['q1', 'removida'], bank);
    expect(result.map(q => q.id)).toEqual(['q1']);
  });
});

describe('resolveResumeIndex', () => {
  it('retoma na primeira questão sem resposta', () => {
    expect(resolveResumeIndex(['q1', 'q2', 'q3'], { q1: 0 })).toBe(1);
  });

  it('retoma no início se nada foi respondido', () => {
    expect(resolveResumeIndex(['q1', 'q2'], {})).toBe(0);
  });

  it('retoma na última questão se tudo já foi respondido', () => {
    expect(resolveResumeIndex(['q1', 'q2'], { q1: 0, q2: 1 })).toBe(1);
  });
});

describe('filterOutRecentlyCorrect', () => {
  it('remove só as questões cujo resultado mais recente foi acerto', () => {
    const questions = [makeQuestion({ id: 'q1' }), makeQuestion({ id: 'q2' }), makeQuestion({ id: 'q3' })];
    const status = { q1: true, q2: false };
    const result = filterOutRecentlyCorrect(questions, status);
    expect(result.map(q => q.id)).toEqual(['q2', 'q3']);
  });
});

describe('resolveQuizTitle', () => {
  it('usa o título único quando todas as questões são do mesmo banco oficial', () => {
    const questions = [makeQuestion({ id: 'q1', quizTitle: 'Prova 1' }), makeQuestion({ id: 'q2', quizTitle: 'Prova 1' })];
    expect(resolveQuizTitle(questions)).toBe('Prova 1');
  });

  it('retorna "Simulado Misto" quando há mais de um título ou nenhum', () => {
    const mixed = [makeQuestion({ id: 'q1', quizTitle: 'Prova 1' }), makeQuestion({ id: 'q2', quizTitle: 'Prova 2' })];
    expect(resolveQuizTitle(mixed)).toBe('Simulado Misto');

    const none = [makeQuestion({ id: 'q1' }), makeQuestion({ id: 'q2' })];
    expect(resolveQuizTitle(none)).toBe('Simulado Misto');
  });
});
