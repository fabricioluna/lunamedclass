import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseOsceImport } from '../../utils/osceImport';
import type { StaticOsceStation } from '../../types';

// Valida TODAS as estações (publicadas ou não) com o mesmo validador da tela de importação.
const text = readFileSync(join(__dirname, 'todas.json'), 'utf8');
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

describe('conteúdo OSCE HM1/N1 — todas as estações', () => {
  it('o arquivo é uma lista válida', () => {
    expect(fileError).toBeUndefined();
    expect(items.length).toBe(30); // 19 de Biossegurança + 11 de Sinais Vitais
  });

  it('nenhuma estação tem erro de validação', () => {
    const comErro = items.filter((i) => i.errors.length > 0).map((i) => `${i.station?.title}: ${i.errors.join('; ')}`);
    expect(comErro).toEqual([]);
  });

  it('toda estação tem pelo menos 4 distratores', () => {
    const poucas = items
      .map((i) => i.station as StaticOsceStation)
      .filter((s) => (s.distractors?.length ?? 0) < 4)
      .map((s) => `${s.slug} (${s.distractors?.length ?? 0})`);
    expect(poucas).toEqual([]);
  });

  it('o caso de toda estação é um enunciado, não uma frase solta', () => {
    const curtas = items
      .map((i) => i.station as StaticOsceStation)
      .filter((s) => s.scenario.length < 150 || (s.setting?.length ?? 0) < 60)
      .map((s) => s.slug);
    expect(curtas).toEqual([]);
  });

  it('ninguém repete o texto de um passo entre gabarito e distratores', () => {
    items.forEach(({ station }) => {
      const s = station as StaticOsceStation;
      const passos = new Set(s.steps?.map((x) => x.action));
      s.distractors?.forEach((dist) => expect(passos.has(dist.action), `${s.slug}: ${dist.action}`).toBe(false));
    });
  });
});
