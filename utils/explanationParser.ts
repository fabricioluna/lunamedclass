export interface ExplanationOption {
  letter: string;
  text: string;
}

export interface ParsedExplanation {
  intro: string[];
  optionsHeading: string | null;
  options: ExplanationOption[];
}

// Aceita tanto "Opção A:" / "Alternativa A:" (dois-pontos) quanto "Alternativa a)" (parêntese) —
// os dois templates de CSV em uso na plataforma marcam a análise de cada alternativa de um
// jeito diferente. A flag "i" cobre maiúscula/minúscula na letra e na palavra.
const OPTION_MARKER = /(?:Op(?:ç|c)[ãa]o|Alternativa)\s*([A-E])\s*[:)]\s*/gi;

// "ALTERNATIVA C - texto..." é um rótulo redundante: a resposta certa já aparece destacada na
// própria pergunta (opção em verde) e no cabeçalho "Acerto Técnico". Remove-lo evita abrir o
// feedback com um fragmento em caixa alta colado à frase seguinte.
const LEADING_LABEL = /^ALTERNATIVA\s+[A-E]\s*[-–—)]\s*/i;

const OPTIONS_HEADING_HINT = /\b(outras?|demais)\b.*\b(incorret|errad|equivocad)/i;

// Alguns CSVs usam "\n\n" (literal, escapado) como separador visual de parágrafo dentro do
// campo de explicação; outros usam quebras de linha reais dentro de um campo entre aspas. Os
// dois casos viram espaço simples aqui — o texto já tem pontuação de frase própria, então
// achatar a quebra não perde estrutura nenhuma para o split por frases logo depois.
const normalizeWhitespace = (text: string): string =>
  text
    .replace(/\\n/g, '\n')
    .replace(/\s*\n+\s*/g, ' ')
    .replace(/ {2,}/g, ' ')
    .trim();

const toSentences = (text: string): string[] =>
  text
    .split('. ')
    .map(s => s.trim())
    .filter(Boolean)
    .map(s => (/[.:?]$/.test(s) ? s : `${s}.`));

// Explicações costumam seguir o padrão "resposta correta + justificativa, depois uma frase
// introduzindo a análise das demais alternativas (uma por opção)". Isolar esse bloco em vez de
// tratar tudo como parágrafos soltos é o que dá hierarquia visual ao feedback. Texto que não
// segue o padrão cai no fallback (só `intro`, como antes).
export const parseExplanation = (raw: string): ParsedExplanation => {
  const text = normalizeWhitespace((raw || '').replace(LEADING_LABEL, ''));
  if (!text) return { intro: [], optionsHeading: null, options: [] };

  const matches = Array.from(text.matchAll(OPTION_MARKER));
  if (matches.length === 0) {
    return { intro: toSentences(text), optionsHeading: null, options: [] };
  }

  const beforeOptions = text.slice(0, matches[0].index).trim();
  const introSentences = toSentences(beforeOptions);

  let optionsHeading: string | null = null;
  const lastIntro = introSentences[introSentences.length - 1];
  if (lastIntro && OPTIONS_HEADING_HINT.test(lastIntro)) {
    optionsHeading = introSentences.pop()!;
  }

  const options: ExplanationOption[] = matches.map((match, idx) => {
    const start = (match.index ?? 0) + match[0].length;
    const end = idx + 1 < matches.length ? matches[idx + 1].index : text.length;
    return {
      letter: match[1].toUpperCase(),
      text: text.slice(start, end).trim(),
    };
  });

  return { intro: introSentences, optionsHeading, options };
};
