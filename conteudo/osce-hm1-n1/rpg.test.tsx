import { describe, it, expect, beforeAll } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import GuidedRpgView from '../../features/osce/GuidedRpgView';
import { parseOsceImport } from '../../utils/osceImport';
import casosFonte from './rpg.mjs';
import dicas from './rpg-dicas.mjs';
import type { TypedMatchInput } from '../../features/osce/GuidedRpgView';
import type { GuidedOsceStation } from '../../types';

// Valida os casos de RPG guiado com o mesmo parser da tela de importação e joga cada um no
// player, para um caso quebrado nunca chegar ao upload.
const text = readFileSync(join(__dirname, 'rpg.json'), 'utf8');
const { fileError, items } = parseOsceImport(text, {
  mode: 'guided',
  disciplineId: 'hm1',
  defaultUnit: 'N1',
  forceUnitN1: false,
  defaultTheme: '',
  allowedThemes: ['Biossegurança e Controle de IRAS', 'Sinais Vitais'],
  existingIds: [],
  now: 0,
});
const stations = items.map((i) => i.station as GuidedOsceStation);

beforeAll(() => {
  window.scrollTo = () => {};
});

describe('conteúdo RPG guiado HM1/N1', () => {
  it('o arquivo é uma lista válida de 13 casos', () => {
    expect(fileError).toBeUndefined();
    expect(items).toHaveLength(13);
  });

  it('nenhum caso tem erro nem aviso de validação (toda cena com 4 a 6 opções)', () => {
    expect(items.flatMap((i) => i.errors.map((e) => `${i.station?.slug}: ${e}`))).toEqual([]);
    expect(items.flatMap((i) => i.warnings.map((w) => `${i.station?.slug}: ${w}`))).toEqual([]);
  });

  it('todo caso tem slug, unidade N1, ambiente, cenário e missão', () => {
    stations.forEach((s) => {
      expect(s.slug).toMatch(/^hm1-n1-r\d+-/);
      expect(s.unit).toBe('N1');
      expect(s.setting?.length ?? 0).toBeGreaterThan(60);
      expect(s.scenario.length).toBeGreaterThan(150);
      expect(s.task.length).toBeGreaterThan(40);
    });
  });

  it('toda opção errada narra uma consequência e toda cena tem exatamente uma ou duas condutas certas', () => {
    stations.forEach((s) =>
      s.scenes.forEach((scene, i) => {
        const certas = scene.choices.filter((c) => c.correct);
        expect(certas.length, `${s.slug} cena ${i + 1}`).toBeGreaterThanOrEqual(1);
        expect(certas.length, `${s.slug} cena ${i + 1}`).toBeLessThanOrEqual(2);
        scene.choices.filter((c) => !c.correct).forEach((c) => expect(c.feedback.length, `${s.slug} cena ${i + 1}: ${c.action}`).toBeGreaterThan(30));
      })
    );
  });

  it('valores aferidos só são revelados em cenas cujo desfecho é a técnica certa (reveals nunca em cena sem conduta certa)', () => {
    stations.forEach((s) =>
      s.scenes.filter((scene) => scene.reveals).forEach((scene) => expect(scene.choices.some((c) => c.correct)).toBe(true))
    );
    // Os casos de sinais vitais têm de revelar valores; os de biossegurança, nenhum.
    const comValores = stations.filter((s) => s.scenes.some((scene) => scene.reveals));
    expect(comValores.map((s) => s.slug).sort()).toEqual([
      'hm1-n1-r5-sinais-vitais-completo',
      'hm1-n1-r6-pa-hiato-auscultatorio',
      'hm1-n1-r7-pa-gestante',
      'hm1-n1-r8-sinais-vitais-inconsciente',
    ]);
  });

  it('o paciente inconsciente tem o pulso na carótida e a jugular é uma opção errada', () => {
    const r8 = stations.find((s) => s.slug === 'hm1-n1-r8-sinais-vitais-inconsciente');
    const cenaPulso = r8?.scenes.find((scene) => scene.choices.some((c) => /veia jugular/.test(c.action)));
    expect(cenaPulso?.choices.find((c) => c.correct)?.action).toMatch(/artéria carótida/);
    expect(cenaPulso?.choices.find((c) => /veia jugular/.test(c.action))?.correct).toBeFalsy();
  });

  it('o hiato auscultatório tem consequência numérica coerente: 168 mmHg é a sistólica em todo o caso', () => {
    const r6 = stations.find((s) => s.slug === 'hm1-n1-r6-pa-hiato-auscultatorio');
    const reveals = r6?.scenes.flatMap((scene) => scene.reveals ?? []) ?? [];
    expect(reveals.find((r) => /palpat/i.test(r.label))?.value).toBe('168 mmHg');
    expect(reveals.find((r) => /arterial/i.test(r.label))?.value).toBe('168/96 mmHg');
  });
});

// Joga cada caso escolhendo a conduta certa em todas as cenas: a nota tem de ser 10 e os valores
// aferidos aparecem no painel. Pega botão duplicado (getByRole falharia) e cena sem saída.
const jogar = (station: GuidedOsceStation, escolherSempre: 'certa' | 'erradaPrimeiro') => {
  render(<GuidedRpgView station={station} onBack={() => {}} />);
  station.scenes.forEach((scene, i) => {
    if (escolherSempre === 'erradaPrimeiro') {
      const errada = scene.choices.find((c) => !c.correct)!;
      fireEvent.click(screen.getByRole('button', { name: errada.action }));
    }
    const certa = scene.choices.find((c) => c.correct)!;
    fireEvent.click(screen.getByRole('button', { name: certa.action }));
    // Nome exato: algumas condutas começam com "Continuar" (ex.: "Continuar palpando o pulso…").
    fireEvent.click(screen.getByRole('button', { name: i === station.scenes.length - 1 ? 'Concluir caso' : 'Continuar' }));
  });
};

describe('os casos de RPG guiado no player', () => {
  it.each(stations.map((s) => [s.slug, s] as const))('%s: acertar tudo de primeira dá 10', (_slug, station) => {
    jogar(station, 'certa');
    expect(screen.getByText('10.0')).toBeInTheDocument();
    const revelados = station.scenes.flatMap((scene) => scene.reveals ?? []);
    revelados.forEach((r) => expect(screen.getAllByText(r.value).length).toBeGreaterThan(0));
  });

  it.each(stations.map((s) => [s.slug, s] as const))('%s: errar uma vez em cada cena dá 5 e mostra as consequências', (_slug, station) => {
    jogar(station, 'erradaPrimeiro');
    expect(screen.getByText('5.0')).toBeInTheDocument();
    expect(screen.getByText(`${station.scenes.length} escolhas erradas`)).toBeInTheDocument();
  });
});

describe('modo digitado: dicas e partida completa', () => {
  it('cada caso tem exatamente uma dica por cena e nenhuma dica repete uma conduta certa por inteiro', () => {
    casosFonte.forEach((caso) => {
      expect((dicas as Record<string, string[]>)[caso.code], caso.code).toHaveLength(caso.scenes.length);
    });
    expect(Object.keys(dicas).sort()).toEqual(casosFonte.map((c) => c.code).sort());
    stations.forEach((s) =>
      s.scenes.forEach((scene, i) => {
        expect(scene.hint, `${s.slug} cena ${i + 1}`).toBeTruthy();
        scene.choices.filter((c) => c.correct).forEach((c) => expect(scene.hint!.includes(c.action)).toBe(false));
      })
    );
  });

  it.each(stations.map((s) => [s.slug, s] as const))('%s: digitando a conduta certa em todas as cenas dá 10', async (_slug, station) => {
    // Interpretador de teste: o aluno digita o texto exato de uma opção e ela é devolvida pelo índice.
    const matchAction = async ({ options, text }: TypedMatchInput) => ({ kind: 'match' as const, index: options.indexOf(text) });
    render(<GuidedRpgView station={station} onBack={() => {}} interaction="typed" matchAction={matchAction} />);
    for (let i = 0; i < station.scenes.length; i++) {
      const certa = station.scenes[i].choices.find((c) => c.correct)!;
      fireEvent.change(screen.getByRole('textbox'), { target: { value: certa.action } });
      fireEvent.click(screen.getByRole('button', { name: 'Enviar conduta' }));
      const proximo = await screen.findByRole('button', { name: i === station.scenes.length - 1 ? 'Concluir caso' : 'Continuar' });
      fireEvent.click(proximo);
    }
    expect(screen.getByText('10.0')).toBeInTheDocument();
  });
});
