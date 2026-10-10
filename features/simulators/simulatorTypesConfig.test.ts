import { describe, it, expect } from 'vitest';
import { stationModeMatchesType } from './simulatorTypesConfig';

describe('stationModeMatchesType', () => {
  it('o tipo RPG inclui o RPG por texto livre e o RPG guiado', () => {
    expect(stationModeMatchesType('rpg', 'rpg')).toBe(true);
    expect(stationModeMatchesType('guided', 'rpg')).toBe(true);
  });

  it('os demais tipos casam só com o próprio modo', () => {
    expect(stationModeMatchesType('clinical', 'clinical')).toBe(true);
    expect(stationModeMatchesType('guided', 'clinical')).toBe(false);
    expect(stationModeMatchesType('ai', 'ai')).toBe(true);
    expect(stationModeMatchesType('guided', 'ai')).toBe(false);
  });

  it('o RPG guiado não vaza para o estático nem para o Paciente Virtual', () => {
    expect(stationModeMatchesType('clinical', 'rpg')).toBe(false);
    expect(stationModeMatchesType('ai', 'rpg')).toBe(false);
  });
});
