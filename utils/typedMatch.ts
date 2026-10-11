// Interpretação do que o aluno digita no RPG digitado. Regra pura, testada em typedMatch.test.ts.
//
// A checagem local só resolve o ÓBVIO (o texto é praticamente igual a uma conduta, como quando o
// aluno copia a conduta mostrada pela dica). Todo o resto vai para o classificador de IA
// (/api/rpg-match). Ser conservadora aqui é de propósito: um falso "acerto" local daria nota
// indevida, enquanto mandar para a IA só custa uma chamada.

export type MatchResult =
  | { kind: 'match'; index: number }
  | { kind: 'multiple' }
  | { kind: 'none' };

export const MAX_TYPED_LENGTH = 300;

// Por que a interpretação falhou — a tela decide o que dizer ao aluno (e cai no plano B).
export type MatchFailure = 'login' | 'busy' | 'unavailable';

export class MatchError extends Error {
  constructor(public readonly reason: MatchFailure) {
    super(reason);
  }
}

export const normalizeText = (text: string): string =>
  text
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '') // tira os acentos (marcas combinantes depois do NFD)
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const STOPWORDS = new Set(['a', 'o', 'as', 'os', 'de', 'da', 'do', 'das', 'dos', 'e', 'em', 'na', 'no', 'nas', 'nos', 'um', 'uma', 'para', 'por', 'com', 'que', 'se', 'ao', 'aos', 'pelo', 'pela']);

const tokenSet = (text: string): Set<string> =>
  new Set(normalizeText(text).split(' ').filter((token) => token && !STOPWORDS.has(token)));

const sameSet = (a: Set<string>, b: Set<string>): boolean => a.size === b.size && [...a].every((token) => b.has(token));

// Devolve a conduta quando o texto digitado é igual a EXATAMENTE uma delas (ignorando
// maiúsculas, acentos, pontuação, ordem e palavras de ligação). Qualquer dúvida → 'none'.
export function localMatch(typed: string, options: string[]): MatchResult {
  const typedTokens = tokenSet(typed);
  if (typedTokens.size === 0) return { kind: 'none' };

  const equal = options.flatMap((option, index) => (sameSet(tokenSet(option), typedTokens) ? [index] : []));
  return equal.length === 1 ? { kind: 'match', index: equal[0] } : { kind: 'none' };
}

// Lê a resposta da API sem confiar nela (o servidor já valida; aqui é a segunda barreira).
export function parseMatchApiResult(data: unknown, optionCount: number): MatchResult {
  if (typeof data !== 'object' || data === null) return { kind: 'none' };
  const { index, multiple } = data as Record<string, unknown>;

  if (multiple === true) return { kind: 'multiple' };
  if (typeof index === 'number' && Number.isInteger(index) && index >= 0 && index < optionCount) {
    return { kind: 'match', index };
  }
  return { kind: 'none' };
}
