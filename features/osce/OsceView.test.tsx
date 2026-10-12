import { describe, it, expect, beforeAll } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import OsceView from './OsceView';
import { parseOsceImport } from '../../utils/osceImport';
import type { StaticOsceStation } from '../../types';

// Usa o conteúdo real das estações (conteudo/osce-hm1-n1) para garantir que o player roda o
// formato de autoria do item 6.17 de ponta a ponta — inclusive passo repetido.
const loadStation = (slug: string): StaticOsceStation => {
  const text = readFileSync(join(__dirname, '../../conteudo/osce-hm1-n1/todas.json'), 'utf8');
  const { items } = parseOsceImport(text, {
    mode: 'clinical', disciplineId: 'hm1', defaultUnit: 'N1', forceUnitN1: false, defaultTheme: '',
    allowedThemes: ['Biossegurança e Controle de IRAS', 'Sinais Vitais'], existingIds: [], now: 0,
  });
  const station = items.find((i) => i.station?.slug === slug)?.station;
  if (!station) throw new Error(`Estação ${slug} não está em todas.json`);
  return station as StaticOsceStation;
};

// Botão da nuvem pelo texto da ação (o nome pode ganhar o contador ×N depois do 1º clique).
const clickAction = (action: string) => {
  const escaped = action.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  fireEvent.click(screen.getByRole('button', { name: new RegExp(`^${escaped}(×\\d+)?$`) }));
};

beforeAll(() => {
  window.scrollTo = () => {};
});

// Garantia de prontidão: em CADA estação do arquivo de importação, fazer o gabarito na ordem
// dá 10 e nenhum passo esquecido. Também pega botão duplicado na nuvem (getByRole falharia se
// duas ações tivessem o mesmo texto) e passo cujo texto some do player.
const todasAsEstacoes = (): StaticOsceStation[] => {
  const text = readFileSync(join(__dirname, '../../conteudo/osce-hm1-n1/todas.json'), 'utf8');
  return parseOsceImport(text, {
    mode: 'clinical', disciplineId: 'hm1', defaultUnit: 'N1', forceUnitN1: false, defaultTheme: '',
    allowedThemes: ['Biossegurança e Controle de IRAS', 'Sinais Vitais'], existingIds: [], now: 0,
  }).items.map((i) => i.station as StaticOsceStation);
};

describe('as estações do arquivo de importação no player', () => {
  it.each(todasAsEstacoes().map((s) => [s.slug, s] as const))('%s: o gabarito na ordem dá nota 10', (_slug, station) => {
    render(<OsceView station={station} onBack={() => {}} />);

    station.steps!.forEach((step) => clickAction(step.action));
    fireEvent.click(screen.getByRole('button', { name: /Encerrar Simulação/ }));

    expect(screen.getByText('10.0')).toBeInTheDocument();
    expect(screen.queryByText('Passos que você esqueceu')).not.toBeInTheDocument();
    // O primeiro caso paga o custo de carregar o componente; com a suíte inteira em paralelo passava de 5 s.
  }, 20000);
});

describe('OsceView com estação no formato de autoria', () => {
  it('desparamentação feita na ordem do roteiro, com as 3 higienizações, dá nota 10', () => {
    const station = loadStation('hm1-n1-d1');
    render(<OsceView station={station} onBack={() => {}} />);

    station.steps!.forEach((step) => clickAction(step.action));
    fireEvent.click(screen.getByRole('button', { name: /Encerrar Simulação/ }));

    expect(screen.getByText('10.0')).toBeInTheDocument();
    expect(screen.queryByText('Passos que você esqueceu')).not.toBeInTheDocument();
  });

  it('distrator escolhido aparece como conduta incorreta, com o porquê do roteiro', () => {
    const station = loadStation('hm1-n1-b01');
    render(<OsceView station={station} onBack={() => {}} />);

    clickAction('Molhar as mãos');
    clickAction('Fechar a torneira com as mãos');
    fireEvent.click(screen.getByRole('button', { name: /Encerrar Simulação/ }));

    expect(screen.getByText(/Conduta Incorreta/)).toBeInTheDocument();
    expect(screen.getByText(/usar o papel-toalha para fechar a torneira/)).toBeInTheDocument();
    expect(screen.getByText('Passos que você esqueceu')).toBeInTheDocument();
  });
});
