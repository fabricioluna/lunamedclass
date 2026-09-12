import { describe, it, expect } from 'vitest';
import { parseExplanation } from './explanationParser';

describe('parseExplanation', () => {
  it('texto vazio retorna estrutura vazia', () => {
    expect(parseExplanation('')).toEqual({ intro: [], optionsHeading: null, options: [] });
  });

  it('texto sem marcadores de alternativa vira apenas parágrafos de intro', () => {
    const result = parseExplanation('Primeira frase. Segunda frase sem ponto final');
    expect(result.options).toEqual([]);
    expect(result.optionsHeading).toBeNull();
    expect(result.intro).toEqual(['Primeira frase.', 'Segunda frase sem ponto final.']);
  });

  it('separa intro, pergunta retórica e alternativas analisadas', () => {
    const raw =
      'A alternativa correta e a Opcao D. ' +
      'O melasma deriva de bases fisiologicas diretas. ' +
      'Por que as outras opcoes estao incorretas? ' +
      'Opcao A: Os androgenios fetais nao sao o efetor direto. ' +
      'Opcao B: O fenomeno nao e destrutivo. ' +
      'Opcao C: A enzima nao deriva de falha hepatica.';

    const result = parseExplanation(raw);

    expect(result.intro).toEqual([
      'A alternativa correta e a Opcao D.',
      'O melasma deriva de bases fisiologicas diretas.',
    ]);
    expect(result.optionsHeading).toBe('Por que as outras opcoes estao incorretas?');
    expect(result.options).toEqual([
      { letter: 'A', text: 'Os androgenios fetais nao sao o efetor direto.' },
      { letter: 'B', text: 'O fenomeno nao e destrutivo.' },
      { letter: 'C', text: 'A enzima nao deriva de falha hepatica.' },
    ]);
  });

  it('reconhece "Alternativa X:" além de "Opção X:"', () => {
    const result = parseExplanation('Intro. Alternativa B: Texto da análise.');
    expect(result.options).toEqual([{ letter: 'B', text: 'Texto da análise.' }]);
  });

  it('sem pergunta retórica antes das alternativas, optionsHeading fica nulo', () => {
    const result = parseExplanation('Resposta certa e a A. Opcao B: Errada porque sim.');
    expect(result.optionsHeading).toBeNull();
    expect(result.intro).toEqual(['Resposta certa e a A.']);
    expect(result.options).toEqual([{ letter: 'B', text: 'Errada porque sim.' }]);
  });
});
