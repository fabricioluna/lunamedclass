import { describe, it, expect } from 'vitest';
import { parseResilientCSV } from './csvHelper';

describe('parseResilientCSV', () => {
  it('separa colunas por ; e linhas por quebra de linha', () => {
    const csv = 'nome;idade\nAna;30\nBruno;25';
    expect(parseResilientCSV(csv)).toEqual([
      ['nome', 'idade'],
      ['Ana', '30'],
      ['Bruno', '25'],
    ]);
  });

  it('lida com aspas escapadas e CRLF', () => {
    const csv = 'nome;obs\r\n"Ana ""A""";ok\r\n';
    expect(parseResilientCSV(csv)).toEqual([
      ['nome', 'obs'],
      ['Ana "A"', 'ok'],
    ]);
  });
});
