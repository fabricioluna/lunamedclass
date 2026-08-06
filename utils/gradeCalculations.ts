// Fórmulas de média usadas em views/CalculatorsView.tsx (Unidade Curricular, IESC, UCCG e
// Habilidades Médicas). Extraído do componente para permitir teste unitário — mesmo
// comportamento que já rodava embutido no JSX.

const toNumberComma = (value: string): number => parseFloat(value.replace(',', '.')) || 0;

// === UNIDADE CURRICULAR (UC) ===
export function calculateTutoriaPartial(spGrades: string[]): number {
  const sps = spGrades.map(toNumberComma);
  const average100 = sps.reduce((a, b) => a + b, 0) / (sps.length || 1);
  return average100 / 10;
}

export interface TeoricaPartialInput {
  mode: 'acertos' | 'nota';
  notaDirect: string;
  total: string;
  acertos: string;
}

export function calculateTeoricaPartial({ mode, notaDirect, total, acertos }: TeoricaPartialInput): number {
  if (mode === 'nota') return toNumberComma(notaDirect);
  const totalQ = parseFloat(total) || 1;
  return (toNumberComma(acertos) / totalQ) * 10;
}

export interface PraticaPartialInput {
  mode: 'acertos' | 'nota';
  anatomiaNota: string;
  morfoNota: string;
  anatomiaAcertos: string;
  morfoAcertos: string;
}

export function calculatePraticaPartial({
  mode,
  anatomiaNota,
  morfoNota,
  anatomiaAcertos,
  morfoAcertos,
}: PraticaPartialInput): number {
  if (mode === 'nota') {
    return (toNumberComma(anatomiaNota) + toNumberComma(morfoNota)) / 2;
  }
  const a = toNumberComma(anatomiaAcertos);
  const m = toNumberComma(morfoAcertos);
  return ((a + m) / 20) * 10;
}

export function calculateUCBase(teorica: number, pratica: number, tutoria: number): number {
  return teorica * 0.42 + pratica * 0.3 + tutoria * 0.28;
}

// === IESC ===
export interface IescGrades {
  n1_teorica: string;
  n1_pratica: string;
  n1_extensao: string;
  n1_portfolio: string;
  n2_teorica: string;
  n2_pratica: string;
  n2_extensao: string;
  n2_portfolio: string;
}

export function calculateIescBase(g: IescGrades): number {
  const n1 =
    toNumberComma(g.n1_teorica) * 0.15 +
    toNumberComma(g.n1_pratica) * 0.1 +
    toNumberComma(g.n1_extensao) * 0.15 +
    toNumberComma(g.n1_portfolio) * 0.1;
  const n2 =
    toNumberComma(g.n2_teorica) * 0.15 +
    toNumberComma(g.n2_pratica) * 0.1 +
    toNumberComma(g.n2_extensao) * 0.15 +
    toNumberComma(g.n2_portfolio) * 0.1;
  return n1 + n2;
}

// === UCCG ===
export interface UccgGrades {
  n1_teorica: string;
  n1_extensao: string;
  n2_teorica: string;
  n2_extensao: string;
}

export function calculateUccgBase(g: UccgGrades): number {
  const n1 = toNumberComma(g.n1_teorica) * 0.25 + toNumberComma(g.n1_extensao) * 0.25;
  const n2 = toNumberComma(g.n2_teorica) * 0.25 + toNumberComma(g.n2_extensao) * 0.25;
  return n1 + n2;
}

// === HABILIDADES MÉDICAS (HABMED) ===
export interface HabMedGrades {
  n1_formativa: string;
  n1_somativa: string;
  n1_teorica: string;
  n2_formativa: string;
  n2_somativa: string;
  n2_teorica: string;
}

export function calculateHabMedN1(g: HabMedGrades): number {
  return toNumberComma(g.n1_formativa) * 0.1 + toNumberComma(g.n1_somativa) * 0.25 + toNumberComma(g.n1_teorica) * 0.15;
}

export function calculateHabMedN2(g: HabMedGrades): number {
  return toNumberComma(g.n2_formativa) * 0.1 + toNumberComma(g.n2_somativa) * 0.25 + toNumberComma(g.n2_teorica) * 0.15;
}
