import { describe, it, expect } from 'vitest';
import {
  calculateTutoriaPartial,
  calculateTeoricaPartial,
  calculatePraticaPartial,
  calculateUCBase,
  calculateIescBase,
  calculateUccgBase,
  calculateHabMedN1,
  calculateHabMedN2,
} from './gradeCalculations';

describe('calculateTutoriaPartial', () => {
  it('tira a média das SPs (escala 0-100) e converte para escala 0-10', () => {
    expect(calculateTutoriaPartial(['80', '90', '100'])).toBeCloseTo(9.0);
  });

  it('aceita vírgula decimal', () => {
    expect(calculateTutoriaPartial(['85,5'])).toBeCloseTo(8.55);
  });

  it('trata nota inválida/vazia como 0', () => {
    expect(calculateTutoriaPartial(['', 'abc', '100'])).toBeCloseTo(100 / 3 / 10);
  });

  it('lista vazia não gera divisão por zero', () => {
    expect(calculateTutoriaPartial([])).toBe(0);
  });
});

describe('calculateTeoricaPartial', () => {
  it('modo nota: usa o valor direto (com vírgula)', () => {
    expect(calculateTeoricaPartial({ mode: 'nota', notaDirect: '7,5', total: '30', acertos: '' })).toBeCloseTo(7.5);
  });

  it('modo acertos: acertos/total * 10', () => {
    expect(calculateTeoricaPartial({ mode: 'acertos', notaDirect: '', total: '30', acertos: '21' })).toBeCloseTo(7.0);
  });

  it('total zero/vazio não gera divisão por zero (cai para 1)', () => {
    expect(calculateTeoricaPartial({ mode: 'acertos', notaDirect: '', total: '', acertos: '5' })).toBeCloseTo(50);
  });
});

describe('calculatePraticaPartial', () => {
  it('modo nota: média simples das duas notas', () => {
    expect(
      calculatePraticaPartial({ mode: 'nota', anatomiaNota: '8', morfoNota: '6', anatomiaAcertos: '', morfoAcertos: '' }),
    ).toBeCloseTo(7.0);
  });

  it('modo acertos: (anatomia+morfo)/20 * 10, cada bloco vale até 10 acertos', () => {
    expect(
      calculatePraticaPartial({ mode: 'acertos', anatomiaNota: '', morfoNota: '', anatomiaAcertos: '8', morfoAcertos: '6' }),
    ).toBeCloseTo(7.0);
  });
});

describe('calculateUCBase', () => {
  it('aplica os pesos oficiais: teórica 42%, prática 30%, tutoria 28%', () => {
    expect(calculateUCBase(10, 10, 10)).toBeCloseTo(10);
    expect(calculateUCBase(10, 0, 0)).toBeCloseTo(4.2);
    expect(calculateUCBase(0, 10, 0)).toBeCloseTo(3.0);
    expect(calculateUCBase(0, 0, 10)).toBeCloseTo(2.8);
  });
});

describe('calculateIescBase', () => {
  const full = {
    n1_teorica: '10', n1_pratica: '10', n1_extensao: '10', n1_portfolio: '10',
    n2_teorica: '10', n2_pratica: '10', n2_extensao: '10', n2_portfolio: '10',
  };

  it('aplica os pesos oficiais por unidade (teórica 15%, prática 10%, extensão 15%, portfólio 10%) somando N1+N2', () => {
    // pesos por unidade somam 0.5 => nota máxima teórica de 10 em tudo dá 5.0 por unidade, 10 no total
    expect(calculateIescBase(full)).toBeCloseTo(10);
  });

  // Achado registrado no PLANO-REESTRUTURACAO.md (Etapa 5, item 5.2): ao contrário de UC/HabMed,
  // este cálculo usa parseFloat puro — não normaliza vírgula decimal e não trata campo vazio.
  it('QUIRK CONHECIDO: vírgula decimal é truncada (parseFloat("8,5") = 8), não convertida', () => {
    const grades = { ...full, n1_teorica: '8,5' };
    const withComma = calculateIescBase(grades);
    const withTruncatedValue = calculateIescBase({ ...full, n1_teorica: '8' });
    expect(withComma).toBeCloseTo(withTruncatedValue);
  });

  it('QUIRK CONHECIDO: campo vazio propaga NaN para o resultado inteiro (sem fallback para 0)', () => {
    // Confirmado também na UI via smoke test manual: CalculatorsView faz
    // `result ? result.toFixed(2) : "0.00"` — como NaN é falsy em JS, a tela mostra "0.00"
    // (nota zero) em vez de um erro visível, quando na verdade o cálculo não pôde ser feito.
    const grades = { ...full, n1_teorica: '' };
    expect(calculateIescBase(grades)).toBeNaN();
  });
});

describe('calculateUccgBase', () => {
  it('aplica os pesos oficiais (teórica 25%, extensão 25%, por unidade) somando N1+N2', () => {
    const full = { n1_teorica: '10', n1_extensao: '10', n2_teorica: '10', n2_extensao: '10' };
    expect(calculateUccgBase(full)).toBeCloseTo(10);
  });

  it('QUIRK CONHECIDO: mesmo comportamento de parseFloat puro do IESC (campo vazio -> NaN)', () => {
    expect(calculateUccgBase({ n1_teorica: '', n1_extensao: '10', n2_teorica: '10', n2_extensao: '10' })).toBeNaN();
  });
});

describe('calculateHabMedN1 / calculateHabMedN2', () => {
  const full = { n1_formativa: '10', n1_somativa: '10', n1_teorica: '10', n2_formativa: '10', n2_somativa: '10', n2_teorica: '10' };

  it('aplica os pesos oficiais por unidade (formativa 10%, somativa 25%, teórica 15% = 50% da nota geral)', () => {
    expect(calculateHabMedN1(full)).toBeCloseTo(5.0);
    expect(calculateHabMedN2(full)).toBeCloseTo(5.0);
  });

  it('campo vazio conta como 0 (diferente do IESC/UCCG, não propaga NaN)', () => {
    const grades = { ...full, n1_formativa: '' };
    expect(calculateHabMedN1(grades)).toBeCloseTo(10 * 0.25 + 10 * 0.15);
  });

  it('aceita vírgula decimal', () => {
    const grades = { ...full, n1_teorica: '8,5' };
    expect(calculateHabMedN1(grades)).toBeCloseTo(10 * 0.1 + 10 * 0.25 + 8.5 * 0.15);
  });
});
