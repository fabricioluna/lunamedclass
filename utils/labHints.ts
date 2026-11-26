// O tipo da dica (Localização, Função, Origem...) vem no próprio texto, antes de uma barra
// vertical: "Localização | Fossa craniana anterior". Guardado assim, o CSV do Lab e o editor 3D
// não precisam de campo novo, e as dicas antigas (sem barra) continuam valendo.
const MAX_LABEL_LENGTH = 40;

export interface LabHint {
  label?: string;
  text: string;
}

export const parseLabHint = (raw: string): LabHint => {
  const value = raw.trim();
  const bar = value.indexOf('|');
  if (bar === -1) return { text: value };

  const label = value.slice(0, bar).trim();
  const text = value.slice(bar + 1).trim();
  // Um "rótulo" comprido é, na verdade, texto com uma barra no meio: aí vale o texto inteiro.
  if (!label || !text || label.length > MAX_LABEL_LENGTH) return { text: value };
  return { label, text };
};

export const isEmptyLabHint = (raw: string | undefined): boolean =>
  !raw || !raw.trim() || raw.trim() === 'N/A';
