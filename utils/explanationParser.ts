export interface ExplanationOption {
  letter: string;
  text: string;
}

export interface ParsedExplanation {
  intro: string[];
  optionsHeading: string | null;
  options: ExplanationOption[];
}

const OPTION_MARKER = /(?:Op(?:ç|c)[ãa]o|Alternativa)\s*([A-E])\s*:\s*/gi;

const toSentences = (text: string): string[] =>
  text
    .split('. ')
    .map(s => s.trim())
    .filter(Boolean)
    .map(s => (s.endsWith('.') || s.endsWith('?') ? s : `${s}.`));

// Explicações costumam seguir o padrão "resposta correta + justificativa, depois uma
// pergunta retórica introduzindo a análise das demais alternativas (Opção A: ..., Opção B: ...)".
// Isolar esse bloco por alternativa em vez de tratar tudo como parágrafos soltos é o que dá
// hierarquia visual ao feedback. Texto que não segue o padrão cai no fallback (só `intro`).
export const parseExplanation = (raw: string): ParsedExplanation => {
  const text = (raw || '').trim();
  if (!text) return { intro: [], optionsHeading: null, options: [] };

  const matches = Array.from(text.matchAll(OPTION_MARKER));
  if (matches.length === 0) {
    return { intro: toSentences(text), optionsHeading: null, options: [] };
  }

  const beforeOptions = text.slice(0, matches[0].index).trim();
  const introSentences = toSentences(beforeOptions);

  let optionsHeading: string | null = null;
  if (introSentences.length > 0 && introSentences[introSentences.length - 1].endsWith('?')) {
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
