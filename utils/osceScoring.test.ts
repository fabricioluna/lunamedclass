import { describe, it, expect } from 'vitest';
import { calculateOsceScore } from './osceScoring';

describe('calculateOsceScore', () => {
  it('gabarito completo na ordem certa dá nota 10', () => {
    const gabarito = [2, 0, 1];
    const result = calculateOsceScore(gabarito, [2, 0, 1]);
    expect(result.grade).toBe(10);
    expect(result.errors).toBe(0);
  });

  it('ações certas fora de ordem perdem só o bônus de 0.5 por posição, não o ponto base', () => {
    const gabarito = [2, 0, 1];
    // mesmas 3 ações, mas em ordem diferente do gabarito
    const result = calculateOsceScore(gabarito, [0, 1, 2]);
    // 3 acertos de conteúdo (1.0 cada) sem nenhum bônus de ordem = 3 / 4.5 * 10
    expect(result.points).toBeCloseTo(3.0);
    expect(result.grade).toBeCloseTo(parseFloat(((3 / 4.5) * 10).toFixed(1)));
  });

  it('ação selecionada fora do gabarito desconta 0.5 ponto', () => {
    const gabarito = [0, 1];
    const result = calculateOsceScore(gabarito, [0, 1, 99]);
    expect(result.errors).toBe(1);
    // 2 ações certas com bônus de ordem (3.0) - 1 erro (0.5) = 2.5 / 3.0 * 10
    expect(result.points).toBeCloseTo(2.5);
  });

  it('pontuação nunca fica negativa mesmo com muitos erros', () => {
    const gabarito = [0];
    const result = calculateOsceScore(gabarito, [10, 11, 12, 13]);
    expect(result.points).toBe(0);
    expect(result.grade).toBe(0);
  });

  it('gabarito vazio não gera divisão por zero', () => {
    const result = calculateOsceScore([], [0, 1]);
    expect(result.maxPoints).toBe(0);
    expect(result.grade).toBe(0);
  });

  it('nenhuma ação selecionada dá nota 0 sem erros', () => {
    const result = calculateOsceScore([0, 1, 2], []);
    expect(result.grade).toBe(0);
    expect(result.errors).toBe(0);
  });
});
