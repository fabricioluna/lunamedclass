import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseOsceImport } from '../../utils/osceImport';
import type { StaticOsceStation } from '../../types';

// Valida TODAS as estações com o mesmo validador da tela de importação (Admin → OSCE), para um
// arquivo quebrado nunca chegar ao upload. Temas: nomes exatos da HM1 em produção.
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
const stations = items.map((i) => i.station as StaticOsceStation);

describe('conteúdo OSCE HM1/N1 — todas as estações', () => {
  it('o arquivo é uma lista válida', () => {
    expect(fileError).toBeUndefined();
    expect(items.length).toBe(33); // 22 de Biossegurança + 11 de Sinais Vitais
  });

  it('nenhuma estação tem erro de validação', () => {
    const comErro = items.filter((i) => i.errors.length > 0).map((i) => `${i.station?.title}: ${i.errors.join('; ')}`);
    expect(comErro).toEqual([]);
  });

  it('toda estação tem slug, unidade N1 e passos', () => {
    stations.forEach((s) => {
      expect(s.slug).toMatch(/^hm1-n1-/);
      expect(s.unit).toBe('N1');
      expect(s.steps?.length).toBeGreaterThan(0);
    });
  });

  it('toda estação tem de 4 a 6 distratores (decisão do usuário: 12 era demais)', () => {
    const fora = stations
      .filter((s) => (s.distractors?.length ?? 0) < 4 || (s.distractors?.length ?? 0) > 6)
      .map((s) => `${s.slug} (${s.distractors?.length ?? 0})`);
    expect(fora).toEqual([]);
  });

  it('o caso de toda estação é um enunciado, não uma frase solta', () => {
    const curtas = stations.filter((s) => s.scenario.length < 150 || (s.setting?.length ?? 0) < 60).map((s) => s.slug);
    expect(curtas).toEqual([]);
  });

  it('ninguém repete o texto de um passo entre gabarito e distratores', () => {
    stations.forEach((s) => {
      const passos = new Set(s.steps?.map((x) => x.action));
      s.distractors?.forEach((dist) => expect(passos.has(dist.action), `${s.slug}: ${dist.action}`).toBe(false));
    });
  });

  it('nenhuma marca de passo crítico enquanto os professores não validarem', () => {
    stations.forEach((s) => expect(s.steps?.some((x) => x.critical)).toBe(false));
  });

  it('no paciente inconsciente o pulso é na artéria carótida e a jugular é distrator', () => {
    const s11 = stations.find((s) => s.slug === 'hm1-n1-s11');
    expect(s11?.steps?.some((x) => /artéria carótida/.test(x.action))).toBe(true);
    expect(s11?.distractors?.some((x) => /veia jugular/.test(x.action))).toBe(true);
  });
});
