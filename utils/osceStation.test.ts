import { describe, it, expect } from 'vitest';
import { buildActionCloud, explanationFor, normalizeStaticStation } from './osceStation';

describe('normalizeStaticStation', () => {
  it('usa steps/distractors quando existem', () => {
    const result = normalizeStaticStation({
      steps: [{ action: 'A', why: 'porque A' }],
      distractors: [{ action: 'X' }],
      actionCloud: ['ignorado'],
      correctOrderIndices: [0],
    });
    expect(result.steps).toEqual([{ action: 'A', why: 'porque A' }]);
    expect(result.distractors).toEqual([{ action: 'X' }]);
  });

  it('converte o formato antigo: gabarito pelos índices, o resto vira distrator', () => {
    const result = normalizeStaticStation({
      actionCloud: ['Distrator', 'Segundo', 'Primeiro'],
      correctOrderIndices: [2, 1],
    });
    expect(result.steps.map((s) => s.action)).toEqual(['Primeiro', 'Segundo']);
    expect(result.distractors.map((d) => d.action)).toEqual(['Distrator']);
  });

  it('ignora índice do formato antigo que aponta para fora da nuvem', () => {
    const result = normalizeStaticStation({ actionCloud: ['A'], correctOrderIndices: [0, 5] });
    expect(result.steps.map((s) => s.action)).toEqual(['A']);
  });

  it('estação sem nada vira listas vazias', () => {
    expect(normalizeStaticStation({})).toEqual({ steps: [], distractors: [] });
  });
});

describe('buildActionCloud', () => {
  const station = {
    steps: [{ action: 'Mãos' }, { action: 'Avental' }, { action: 'Mãos' }],
    distractors: [{ action: 'Propé' }],
  };

  it('tem um botão por ação distinta (passo repetido aparece uma vez só)', () => {
    const cloud = buildActionCloud(station);
    expect(cloud).toHaveLength(3);
    expect(new Set(cloud)).toEqual(new Set(['Mãos', 'Avental', 'Propé']));
  });

  it('embaralha conforme o gerador aleatório', () => {
    // random() = 0 sempre troca o elemento atual com o primeiro
    expect(buildActionCloud(station, () => 0)).toEqual(['Avental', 'Propé', 'Mãos']);
  });
});

describe('explanationFor', () => {
  it('acha o porquê no passo ou no distrator', () => {
    const station = {
      steps: [{ action: 'A', why: 'passo' }],
      distractors: [{ action: 'X', why: 'distrator' }],
    };
    expect(explanationFor(station, 'A')).toBe('passo');
    expect(explanationFor(station, 'X')).toBe('distrator');
    expect(explanationFor(station, 'Z')).toBeUndefined();
  });
});
