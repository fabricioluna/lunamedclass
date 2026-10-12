import { describe, it, expect } from 'vitest';
import { stationModeMatchesType } from './simulatorTypesConfig';

describe('stationModeMatchesType', () => {
  it('cada tipo casa só com o próprio modo', () => {
    expect(stationModeMatchesType('clinical', 'clinical')).toBe(true);
    expect(stationModeMatchesType('guided', 'guided')).toBe(true);
    expect(stationModeMatchesType('guided', 'clinical')).toBe(false);
    expect(stationModeMatchesType('clinical', 'guided')).toBe(false);
  });
});
