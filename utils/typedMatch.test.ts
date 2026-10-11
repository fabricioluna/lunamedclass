import { describe, it, expect } from 'vitest';
import { localMatch, normalizeText, parseMatchApiResult } from './typedMatch';

const options = [
  'Higienizar as mãos',
  'Colocar a máscara PFF2/N95 antes de entrar no quarto',
  'Colocar a máscara cirúrgica',
  'Entrar e manter a porta do quarto fechada',
];

describe('normalizeText', () => {
  it('ignora maiúsculas, acentos, pontuação e espaços sobrando', () => {
    expect(normalizeText('  Higienizar,  AS Mãos!! ')).toBe('higienizar as maos');
    expect(normalizeText('PFF2/N95')).toBe('pff2 n95');
  });
});

describe('localMatch', () => {
  it('reconhece o texto igual a uma conduta, mesmo com acento, caixa e pontuação diferentes', () => {
    expect(localMatch('higienizar as maos.', options)).toEqual({ kind: 'match', index: 0 });
    expect(localMatch('COLOCAR A MÁSCARA CIRÚRGICA', options)).toEqual({ kind: 'match', index: 2 });
  });

  it('ignora a ordem das palavras e as palavras de ligação', () => {
    expect(localMatch('as mãos higienizar', options)).toEqual({ kind: 'match', index: 0 });
    expect(localMatch('manter a porta do quarto fechada e entrar', options)).toEqual({ kind: 'match', index: 3 });
  });

  it('NÃO decide quando o texto é só parecido (isso vai para a IA)', () => {
    expect(localMatch('lavo as mãos com álcool', options)).toEqual({ kind: 'none' });
    expect(localMatch('coloco a máscara', options)).toEqual({ kind: 'none' });
    expect(localMatch('higienizar', options)).toEqual({ kind: 'none' });
  });

  it('NÃO decide quando falta ou sobra um detalhe que muda a conduta', () => {
    expect(localMatch('colocar a máscara PFF2/N95', options)).toEqual({ kind: 'none' });
    expect(localMatch('colocar a máscara PFF2/N95 antes de entrar no quarto e calçar luvas', options)).toEqual({ kind: 'none' });
  });

  it('texto vazio ou só pontuação não casa com nada', () => {
    expect(localMatch('', options)).toEqual({ kind: 'none' });
    expect(localMatch('?!', options)).toEqual({ kind: 'none' });
  });

  it('se duas condutas fossem iguais ao texto, não escolhe (ambiguidade)', () => {
    expect(localMatch('higienizar as mãos', ['Higienizar as mãos', 'higienizar as mãos.'])).toEqual({ kind: 'none' });
  });
});

describe('parseMatchApiResult', () => {
  it('lê índice válido, várias ações e nenhuma', () => {
    expect(parseMatchApiResult({ index: 2, multiple: false }, 4)).toEqual({ kind: 'match', index: 2 });
    expect(parseMatchApiResult({ index: null, multiple: true }, 4)).toEqual({ kind: 'multiple' });
    expect(parseMatchApiResult({ index: null, multiple: false }, 4)).toEqual({ kind: 'none' });
  });

  it('índice fora da faixa, não inteiro ou lixo viram "nenhuma"', () => {
    expect(parseMatchApiResult({ index: 4, multiple: false }, 4)).toEqual({ kind: 'none' });
    expect(parseMatchApiResult({ index: -1 }, 4)).toEqual({ kind: 'none' });
    expect(parseMatchApiResult({ index: 1.2 }, 4)).toEqual({ kind: 'none' });
    expect(parseMatchApiResult('texto', 4)).toEqual({ kind: 'none' });
    expect(parseMatchApiResult(null, 4)).toEqual({ kind: 'none' });
  });
});
