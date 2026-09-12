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

  // Segundo template de CSV em uso: rótulo "ALTERNATIVA X - " no início, quebras "\n\n"
  // literais entre parágrafos, e lista de erradas em "Alternativa x) texto" (parêntese,
  // minúscula, sem "?" retórico antes). Caso real reportado (arquivo "Morfofisiologia 1.csv").
  it('trata o template "ALTERNATIVA X - " com marcadores em parêntese e quebras \\n\\n literais', () => {
    const raw =
      'ALTERNATIVA A - Na ausência de hCG (que seria produzido pelo blastocisto após a implantação), ' +
      'o corpo lúteo atrofia, provocando queda nos níveis de progesterona e estradiol. \\n\\n ' +
      'Essa privação hormonal causa vasoespasmo das artérias espiraladas do endométrio, levando à isquemia, ' +
      'necrose tecidual e liberação de prostaglandinas (PGF2a), culminando na descamação endometrial e fluxo menstrual. \\n\\n ' +
      'Por que as outras estão ERRADAS: Alternativa b) O hCG é secretado na gravidez para manter o corpo lúteo, ' +
      'na sua ausência o corpo lúteo degrada-se. Alternativa c) O pico de LH ocorre na metade do ciclo para induzir ' +
      'a ovulação, e não no final do ciclo. Alternativa d) A progesterona não se converte em prolactina, e a ' +
      'desestruturação endometrial gera o sangramento menstrual, não a sua absorção.';

    const result = parseExplanation(raw);

    expect(result.intro).toEqual([
      'Na ausência de hCG (que seria produzido pelo blastocisto após a implantação), o corpo lúteo atrofia, provocando queda nos níveis de progesterona e estradiol.',
      'Essa privação hormonal causa vasoespasmo das artérias espiraladas do endométrio, levando à isquemia, necrose tecidual e liberação de prostaglandinas (PGF2a), culminando na descamação endometrial e fluxo menstrual.',
    ]);
    expect(result.optionsHeading).toBe('Por que as outras estão ERRADAS:');
    expect(result.options).toEqual([
      { letter: 'B', text: 'O hCG é secretado na gravidez para manter o corpo lúteo, na sua ausência o corpo lúteo degrada-se.' },
      { letter: 'C', text: 'O pico de LH ocorre na metade do ciclo para induzir a ovulação, e não no final do ciclo.' },
      { letter: 'D', text: 'A progesterona não se converte em prolactina, e a desestruturação endometrial gera o sangramento menstrual, não a sua absorção.' },
    ]);
  });

  it('normaliza quebras de linha reais (não só "\\n" literal) dentro do texto', () => {
    const raw = 'ALTERNATIVA C)\nPrimeira parte.\n\nSegunda parte. Alternativa a) Texto errado.';
    const result = parseExplanation(raw);
    expect(result.intro).toEqual(['Primeira parte.', 'Segunda parte.']);
    expect(result.options).toEqual([{ letter: 'A', text: 'Texto errado.' }]);
  });
});
