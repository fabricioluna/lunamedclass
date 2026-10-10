import { describe, it, expect } from 'vitest';
import { calculateOsceScore } from './osceScoring';

describe('calculateOsceScore', () => {
  it('gabarito completo na ordem certa dá nota 10', () => {
    const result = calculateOsceScore(['A', 'B', 'C'], ['A', 'B', 'C']);
    expect(result.grade).toBe(10);
    expect(result.errors).toBe(0);
    expect(result.omittedPositions).toEqual([]);
    expect(result.selections.every((s) => s.status === 'in-order')).toBe(true);
  });

  it('esquecer um passo custa só aquele passo — os seguintes continuam na ordem certa', () => {
    // Com a regra antiga (posição exata), C e D virariam "fora de sequência".
    const result = calculateOsceScore(['A', 'B', 'C', 'D'], ['A', 'C', 'D']);
    expect(result.selections.map((s) => s.status)).toEqual(['in-order', 'in-order', 'in-order']);
    expect(result.omittedPositions).toEqual([1]);
    // 3 passos na ordem (1.5 cada) = 4.5 / 6.0 * 10
    expect(result.points).toBeCloseTo(4.5);
    expect(result.grade).toBe(7.5);
  });

  it('passo certo fora da ordem relativa ganha o ponto base, sem o bônus', () => {
    const result = calculateOsceScore(['A', 'B', 'C'], ['B', 'C', 'A']);
    // LCS = B, C (na ordem); A fica fora de ordem
    expect(result.selections.map((s) => s.status)).toEqual(['in-order', 'in-order', 'out-of-order']);
    expect(result.selections[2].expectedPosition).toBe(0);
    expect(result.points).toBeCloseTo(1.5 + 1.5 + 1.0);
  });

  it('ação fora do gabarito desconta 0.5 ponto', () => {
    const result = calculateOsceScore(['A', 'B'], ['A', 'B', 'Distrator']);
    expect(result.errors).toBe(1);
    expect(result.selections[2].status).toBe('wrong');
    expect(result.points).toBeCloseTo(2.5);
  });

  it('passo repetido no gabarito é comparado pelo texto, não pelo botão', () => {
    const desparamentacao = ['Luvas', 'Mãos', 'Avental', 'Mãos', 'Máscara', 'Mãos'];
    const result = calculateOsceScore(desparamentacao, [...desparamentacao]);
    expect(result.grade).toBe(10);
  });

  it('esquecer uma das higienizações repetidas é apontado como omissão daquela posição', () => {
    const gabarito = ['Luvas', 'Mãos', 'Avental', 'Mãos', 'Máscara', 'Mãos'];
    const result = calculateOsceScore(gabarito, ['Luvas', 'Mãos', 'Avental', 'Máscara', 'Mãos']);
    expect(result.errors).toBe(0);
    expect(result.omittedPositions).toHaveLength(1);
    expect(gabarito[result.omittedPositions[0]]).toBe('Mãos');
  });

  it('repetir um passo mais vezes do que o gabarito pede conta como erro', () => {
    const result = calculateOsceScore(['Mãos', 'Avental'], ['Mãos', 'Mãos', 'Avental']);
    expect(result.errors).toBe(1);
    expect(result.omittedPositions).toEqual([]);
  });

  it('ao repetir uma ação, a primeira vez conta como certa e a repetição como erro', () => {
    const result = calculateOsceScore(['A', 'B', 'C'], ['B', 'B']);
    expect(result.selections.map((s) => s.status)).toEqual(['in-order', 'wrong']);
  });

  it('pontuação nunca fica negativa mesmo com muitos erros', () => {
    const result = calculateOsceScore(['A'], ['X', 'Y', 'Z', 'W']);
    expect(result.points).toBe(0);
    expect(result.grade).toBe(0);
  });

  it('gabarito vazio não gera divisão por zero', () => {
    const result = calculateOsceScore([], ['A', 'B']);
    expect(result.maxPoints).toBe(0);
    expect(result.grade).toBe(0);
  });

  it('nenhuma ação selecionada dá nota 0 sem erros, com todos os passos omitidos', () => {
    const result = calculateOsceScore(['A', 'B', 'C'], []);
    expect(result.grade).toBe(0);
    expect(result.errors).toBe(0);
    expect(result.omittedPositions).toEqual([0, 1, 2]);
  });
});
