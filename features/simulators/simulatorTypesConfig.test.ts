import { describe, it, expect } from 'vitest';
import { stationModeMatchesType } from './simulatorTypesConfig';

describe('stationModeMatchesType', () => {
  it('cada tipo casa só com o próprio modo', () => {
    expect(stationModeMatchesType('rpg', 'rpg')).toBe(true);
    expect(stationModeMatchesType('guided', 'guided')).toBe(true);
    expect(stationModeMatchesType('clinical', 'clinical')).toBe(true);
    expect(stationModeMatchesType('ai', 'ai')).toBe(true);
  });

  it('o RPG guiado tem tipo próprio: não aparece no RPG com IA, no estático nem no Paciente Virtual', () => {
    expect(stationModeMatchesType('guided', 'rpg')).toBe(false);
    expect(stationModeMatchesType('guided', 'clinical')).toBe(false);
    expect(stationModeMatchesType('guided', 'ai')).toBe(false);
  });

  it('o RPG com IA não vaza para o RPG guiado', () => {
    expect(stationModeMatchesType('rpg', 'guided')).toBe(false);
  });
});
