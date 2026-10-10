import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseOsceImport } from '../../utils/osceImport';
import type { StaticOsceStation } from '../../types';

// Passa o JSON gerado pelo mesmo validador da tela de importação (Admin → OSCE), para um
// arquivo quebrado nunca chegar ao upload. Temas: nomes exatos da HM1 em produção.
const text = readFileSync(join(__dirname, 'lote-1.json'), 'utf8');
const { fileError, items } = parseOsceImport(text, {
  mode: 'clinical',
  disciplineId: 'hm1',
  defaultUnit: 'N1',
  forceUnitN1: false,
  defaultTheme: '',
  allowedThemes: ['Biossegurança e Controle de IRAS', 'Sinais Vitais'],
  existingIds: [],
  now: 0,
});

describe('conteúdo OSCE HM1/N1 — lote 1', () => {
  it('o arquivo é uma lista válida', () => {
    expect(fileError).toBeUndefined();
    expect(items.length).toBeGreaterThan(0);
  });

  it('nenhuma estação tem erro de validação', () => {
    const comErro = items.filter((i) => i.errors.length > 0).map((i) => `${i.station?.title}: ${i.errors.join('; ')}`);
    expect(comErro).toEqual([]);
  });

  it('toda estação tem slug, unidade N1 e passos', () => {
    items.forEach(({ station }) => {
      const s = station as StaticOsceStation;
      expect(s.slug).toMatch(/^hm1-n1-/);
      expect(s.unit).toBe('N1');
      expect(s.steps?.length).toBeGreaterThan(0);
    });
  });

  it('nenhuma marca de passo crítico enquanto as professoras não validarem', () => {
    items.forEach(({ station }) => {
      expect((station as StaticOsceStation).steps?.some((s) => s.critical)).toBe(false);
    });
  });
});
