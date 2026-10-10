import { describe, it, expect } from 'vitest';
import { calculateGuidedScore, sceneCredit } from './guidedScoring';

describe('sceneCredit', () => {
  it('1 de primeira, 0,5 na segunda, 0 da terceira em diante', () => {
    expect(sceneCredit(1)).toBe(1);
    expect(sceneCredit(2)).toBe(0.5);
    expect(sceneCredit(3)).toBe(0);
    expect(sceneCredit(6)).toBe(0);
  });

  it('nenhuma tentativa registrada não zera a cena (cena ainda não jogada conta como acerto de primeira)', () => {
    expect(sceneCredit(0)).toBe(1);
  });
});

describe('calculateGuidedScore', () => {
  it('todas de primeira dá 10', () => {
    const result = calculateGuidedScore([1, 1, 1, 1]);
    expect(result.grade).toBe(10);
    expect(result.firstTry).toBe(4);
    expect(result.withRetries).toBe(0);
    expect(result.totalWrong).toBe(0);
  });

  it('uma cena na segunda tentativa tira meio ponto daquela cena', () => {
    // 3 de primeira (3) + 1 na segunda (0,5) = 3,5 de 4 → 8,75 → 8,8
    const result = calculateGuidedScore([1, 2, 1, 1]);
    expect(result.grade).toBe(8.8);
    expect(result.withRetries).toBe(1);
    expect(result.totalWrong).toBe(1);
  });

  it('a partir da terceira tentativa a cena não pontua', () => {
    const result = calculateGuidedScore([1, 3, 1, 1]);
    expect(result.grade).toBe(7.5);
    expect(result.totalWrong).toBe(2);
  });

  it('soma os erros de todas as cenas', () => {
    expect(calculateGuidedScore([2, 3, 4, 1]).totalWrong).toBe(1 + 2 + 3);
  });

  it('sem cenas não gera divisão por zero', () => {
    expect(calculateGuidedScore([]).grade).toBe(0);
  });
});
