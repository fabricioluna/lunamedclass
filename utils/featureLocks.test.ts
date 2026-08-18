import { describe, it, expect } from 'vitest';
import { isFeatureLocked, setFeatureLock, getFeatureLockState } from './featureLocks';

describe('isFeatureLocked — compatibilidade com o formato antigo', () => {
  it('entrada sem unidade (formato legado) bloqueia as duas unidades', () => {
    const locks = ['quiz'];
    expect(isFeatureLocked(locks, 'quiz', 'N1')).toBe(true);
    expect(isFeatureLocked(locks, 'quiz', 'N2')).toBe(true);
  });

  it('entrada sem unidade também bloqueia disciplina sem unidade (UC)', () => {
    expect(isFeatureLocked(['materials'], 'materials')).toBe(true);
  });

  it('lista vazia ou ausente não bloqueia nada', () => {
    expect(isFeatureLocked([], 'quiz', 'N1')).toBe(false);
    expect(isFeatureLocked(undefined, 'quiz', 'N1')).toBe(false);
  });

  it('funcionalidade não listada não é bloqueada', () => {
    expect(isFeatureLocked(['quiz'], 'materials', 'N1')).toBe(false);
  });
});

describe('isFeatureLocked — travas por unidade', () => {
  const locks = ['quiz:N2'];

  it('bloqueia só a unidade indicada', () => {
    expect(isFeatureLocked(locks, 'quiz', 'N2')).toBe(true);
    expect(isFeatureLocked(locks, 'quiz', 'N1')).toBe(false);
  });

  it('numa disciplina sem unidade (UC), trava por unidade não vale', () => {
    expect(isFeatureLocked(locks, 'quiz')).toBe(false);
  });
});

describe('setFeatureLock — escopo global', () => {
  it('bloquear tudo grava a forma curta, sem entradas por unidade', () => {
    expect(setFeatureLock([], 'quiz', 'all', true)).toEqual(['quiz']);
  });

  it('desbloquear tudo limpa qualquer resquício por unidade', () => {
    expect(setFeatureLock(['quiz:N1', 'quiz:N2'], 'quiz', 'all', false)).toEqual([]);
  });

  it('não mexe nas travas de outras funcionalidades', () => {
    const resultado = setFeatureLock(['materials', 'quiz:N1'], 'quiz', 'all', true);
    expect(resultado).toContain('materials');
    expect(resultado).toContain('quiz');
    expect(resultado).not.toContain('quiz:N1');
  });
});

describe('setFeatureLock — por unidade', () => {
  it('bloquear só a N2 preserva a N1 liberada', () => {
    const resultado = setFeatureLock([], 'quiz', 'N2', true);
    expect(isFeatureLocked(resultado, 'quiz', 'N2')).toBe(true);
    expect(isFeatureLocked(resultado, 'quiz', 'N1')).toBe(false);
  });

  it('bloquear as duas unidades separadamente colapsa na forma global', () => {
    let locks = setFeatureLock([], 'quiz', 'N1', true);
    locks = setFeatureLock(locks, 'quiz', 'N2', true);
    expect(locks).toEqual(['quiz']);
  });

  // É o caso de uso que motivou o item: início de semestre, tudo fechado, e o admin quer
  // abrir SÓ a N1 — sem que a N2 abra junto.
  it('destravar a N1 a partir de uma trava global mantém a N2 travada', () => {
    const resultado = setFeatureLock(['quiz'], 'quiz', 'N1', false);
    expect(isFeatureLocked(resultado, 'quiz', 'N1')).toBe(false);
    expect(isFeatureLocked(resultado, 'quiz', 'N2')).toBe(true);
    expect(resultado).toEqual(['quiz:N2']);
  });

  it('destravar a última unidade travada limpa a funcionalidade', () => {
    expect(setFeatureLock(['quiz:N1'], 'quiz', 'N1', false)).toEqual([]);
  });

  it('nunca convive "quiz" e "quiz:N1" ao mesmo tempo (estados contraditórios)', () => {
    const resultado = setFeatureLock(['quiz'], 'quiz', 'N2', true);
    expect(resultado.filter(e => e.startsWith('quiz')).length).toBe(1);
  });

  it('operação repetida é idempotente', () => {
    const uma = setFeatureLock([], 'quiz', 'N1', true);
    expect(setFeatureLock(uma, 'quiz', 'N1', true)).toEqual(uma);
  });
});

describe('getFeatureLockState', () => {
  it('reconhece os três estados', () => {
    expect(getFeatureLockState([], 'quiz')).toBe('none');
    expect(getFeatureLockState(['quiz'], 'quiz')).toBe('all');
    expect(getFeatureLockState(['quiz:N1'], 'quiz')).toBe('partial');
  });
});
