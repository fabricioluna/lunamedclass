import { describe, it, expect } from 'vitest';
import { setItemField, removeItemField } from './configItems';

interface Item {
  id: string;
  name: string;
  icon?: string;
  crest?: string;
}

const base: Item[] = [
  { id: 'periodo1', name: '1º Período', icon: '🌱' },
  { id: 'periodo2', name: '2º Período', icon: '🎓', crest: '/turma8.jpg' },
  { id: 'periodo3', name: '3º Período', icon: '🔬' },
];

describe('setItemField', () => {
  it('altera só o campo alvo do item alvo', () => {
    const result = setItemField(base, 'periodo2', 'icon', '⚖️');
    expect(result[1]).toEqual({ id: 'periodo2', name: '2º Período', icon: '⚖️', crest: '/turma8.jpg' });
  });

  it('preserva os demais itens intactos', () => {
    const result = setItemField(base, 'periodo2', 'icon', '⚖️');
    expect(result[0]).toEqual(base[0]);
    expect(result[2]).toEqual(base[2]);
    expect(result).toHaveLength(base.length);
  });

  it('é no-op quando o id não existe (nunca perde itens)', () => {
    expect(setItemField(base, 'inexistente', 'icon', '💥')).toEqual(base);
  });

  it('não muta o array de entrada', () => {
    setItemField(base, 'periodo2', 'icon', '⚖️');
    expect(base[1].icon).toBe('🎓');
  });

  it('cria o campo quando ele ainda não existe no item', () => {
    const result = setItemField(base, 'periodo3', 'crest', '/turma8.jpg');
    expect(result[2].crest).toBe('/turma8.jpg');
  });
});

describe('removeItemField', () => {
  it('remove a chave do objeto, não grava undefined (o Firestore rejeita undefined)', () => {
    const result = removeItemField(base, 'periodo2', 'crest');
    expect('crest' in result[1]).toBe(false);
  });

  it('preserva os demais campos do item e os demais itens', () => {
    const result = removeItemField(base, 'periodo2', 'crest');
    expect(result[1]).toEqual({ id: 'periodo2', name: '2º Período', icon: '🎓' });
    expect(result[0]).toEqual(base[0]);
    expect(result[2]).toEqual(base[2]);
  });

  it('é no-op quando o item não tem o campo', () => {
    expect(removeItemField(base, 'periodo1', 'crest')).toEqual(base);
  });

  it('não muta o array de entrada', () => {
    removeItemField(base, 'periodo2', 'crest');
    expect(base[1].crest).toBe('/turma8.jpg');
  });
});
