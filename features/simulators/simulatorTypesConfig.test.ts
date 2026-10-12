import { describe, it, expect } from 'vitest';
import { stationModeMatchesType } from './simulatorTypesConfig';

describe('stationModeMatchesType', () => {
  it('o RPG com IA lista os casos do motor antigo e os guiados (digitados)', () => {
    expect(stationModeMatchesType('rpg', 'rpg')).toBe(true);
    expect(stationModeMatchesType('guided', 'rpg')).toBe(true);
  });

  it('o RPG Guiado lista só os guiados', () => {
    expect(stationModeMatchesType('guided', 'guided')).toBe(true);
    expect(stationModeMatchesType('rpg', 'guided')).toBe(false);
  });

  it('os demais tipos casam só com o próprio modo, sem receber os guiados', () => {
    expect(stationModeMatchesType('clinical', 'clinical')).toBe(true);
    expect(stationModeMatchesType('ai', 'ai')).toBe(true);
    expect(stationModeMatchesType('guided', 'clinical')).toBe(false);
    expect(stationModeMatchesType('guided', 'ai')).toBe(false);
    expect(stationModeMatchesType('clinical', 'rpg')).toBe(false);
    expect(stationModeMatchesType('ai', 'rpg')).toBe(false);
  });
});
