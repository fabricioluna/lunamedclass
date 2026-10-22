import { describe, it, expect } from 'vitest';
import { isTextEntryTarget } from './keyboard';

const input = (type: string) => Object.assign(document.createElement('input'), { type });

describe('isTextEntryTarget', () => {
  it('campos de texto contam como "escrevendo"', () => {
    expect(isTextEntryTarget(input('text'))).toBe(true);
    expect(isTextEntryTarget(document.createElement('textarea'))).toBe(true);
    expect(isTextEntryTarget(document.createElement('select'))).toBe(true);
  });

  it('régua, checkbox e botão com foco NÃO bloqueiam os atalhos', () => {
    expect(isTextEntryTarget(input('range'))).toBe(false);
    expect(isTextEntryTarget(input('checkbox'))).toBe(false);
    expect(isTextEntryTarget(document.createElement('button'))).toBe(false);
    expect(isTextEntryTarget(document.body)).toBe(false);
    expect(isTextEntryTarget(null)).toBe(false);
  });
});
