import { describe, it, expect } from 'vitest';
import { isCorrectChoice, sceneHasValidChoices, shuffleChoices } from './guidedStation';
import type { GuidedChoice } from '../types';

const choices: GuidedChoice[] = [
  { action: 'A', correct: true, feedback: 'ok' },
  { action: 'B', feedback: 'consequência B' },
  { action: 'C', feedback: 'consequência C' },
];

describe('shuffleChoices', () => {
  it('mantém todas as opções e guarda o índice original', () => {
    const result = shuffleChoices(choices);
    expect(result).toHaveLength(3);
    expect(result.map((c) => c.key).sort()).toEqual([0, 1, 2]);
    expect(result.find((c) => c.key === 0)?.action).toBe('A');
  });

  it('embaralha conforme o gerador aleatório e não altera a lista original', () => {
    const result = shuffleChoices(choices, () => 0);
    expect(result.map((c) => c.action)).toEqual(['B', 'C', 'A']);
    expect(choices.map((c) => c.action)).toEqual(['A', 'B', 'C']);
  });
});

describe('isCorrectChoice / sceneHasValidChoices', () => {
  it('só é certa quando correct é true', () => {
    expect(isCorrectChoice(choices[0])).toBe(true);
    expect(isCorrectChoice(choices[1])).toBe(false);
  });

  it('exige pelo menos uma certa e uma errada', () => {
    expect(sceneHasValidChoices(choices)).toBe(true);
    expect(sceneHasValidChoices([choices[0]])).toBe(false);
    expect(sceneHasValidChoices([choices[1], choices[2]])).toBe(false);
  });

  it('aceita mais de uma certa (o roteiro admite mais de uma conduta)', () => {
    expect(sceneHasValidChoices([{ ...choices[0] }, { action: 'D', correct: true, feedback: 'ok' }, choices[1]])).toBe(true);
  });
});
