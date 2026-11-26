import { describe, it, expect } from 'vitest';
import { parseLabHint, isEmptyLabHint } from './labHints';

describe('parseLabHint', () => {
  it('separa o rótulo do texto pela barra vertical', () => {
    expect(parseLabHint('Localização | Fossa craniana anterior')).toEqual({
      label: 'Localização',
      text: 'Fossa craniana anterior',
    });
  });

  it('dica antiga, sem barra, fica só com o texto', () => {
    expect(parseLabHint('Massa com giros e sulcos')).toEqual({ text: 'Massa com giros e sulcos' });
  });

  it('aceita espaços irregulares em volta da barra', () => {
    expect(parseLabHint('  Origem|Epicôndilo medial  ')).toEqual({ label: 'Origem', text: 'Epicôndilo medial' });
  });

  it('só a primeira barra separa; as demais ficam no texto', () => {
    expect(parseLabHint('Função | Flexão | extensão')).toEqual({ label: 'Função', text: 'Flexão | extensão' });
  });

  it('rótulo ou texto vazio: devolve tudo como texto', () => {
    expect(parseLabHint('| Fossa craniana')).toEqual({ text: '| Fossa craniana' });
    expect(parseLabHint('Localização |')).toEqual({ text: 'Localização |' });
  });

  it('trecho longo antes da barra não é rótulo', () => {
    const raw = 'Este é um trecho de texto bem comprido que passa do limite | e continua';
    expect(parseLabHint(raw)).toEqual({ text: raw });
  });
});

describe('isEmptyLabHint', () => {
  it('trata ausente, vazio e N/A como sem dica', () => {
    expect(isEmptyLabHint(undefined)).toBe(true);
    expect(isEmptyLabHint('  ')).toBe(true);
    expect(isEmptyLabHint('N/A')).toBe(true);
    expect(isEmptyLabHint('Localização | x')).toBe(false);
  });
});
