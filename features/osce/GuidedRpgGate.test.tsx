import { describe, it, expect, beforeAll, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import type { GuidedOsceStation } from '../../types';

// A <ProtectedRoute> real exige os contextos do app; aqui ela vira uma casca que marca "área protegida".
vi.mock('../auth/ProtectedRoute', () => ({
  default: ({ children }: { children: React.ReactNode }) => <div data-testid="area-protegida">{children}</div>,
}));
vi.mock('../../services/rpgMatchService', () => ({ matchTypedAction: vi.fn() }));

import GuidedRpgGate from './GuidedRpgGate';

const station: GuidedOsceStation = {
  mode: 'guided',
  id: 'rpg-gate',
  disciplineId: 'hm1',
  theme: 'Biossegurança e Controle de IRAS',
  title: 'Caso de teste',
  scenario: 'Cenário do caso.',
  setting: 'Ambiente do caso.',
  task: 'Missão do caso.',
  scenes: [
    {
      narrative: 'Você está diante da porta.',
      choices: [
        { action: 'Higienizar as mãos', correct: true, feedback: 'Correto.' },
        { action: 'Abrir a porta', feedback: 'Errado.' },
        { action: 'Calçar luvas', feedback: 'Errado.' },
        { action: 'Colocar o avental', feedback: 'Errado.' },
      ],
    },
  ],
};

beforeAll(() => {
  window.scrollTo = () => {};
});

describe('GuidedRpgGate', () => {
  it('"RPG Guiado": abre com as alternativas, sem login e fora da área protegida', () => {
    render(<GuidedRpgGate station={station} onBack={() => {}} interaction="choices" />);

    expect(screen.getByRole('button', { name: 'Higienizar as mãos' })).toBeInTheDocument();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(screen.queryByTestId('area-protegida')).not.toBeInTheDocument();
  });

  it('sem formato informado, abre com as alternativas (nunca digitando)', () => {
    render(<GuidedRpgGate station={station} onBack={() => {}} />);

    expect(screen.getByRole('button', { name: 'Higienizar as mãos' })).toBeInTheDocument();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });

  it('"RPG com IA": abre DENTRO da área protegida (login), sem as alternativas', () => {
    render(<GuidedRpgGate station={station} onBack={() => {}} interaction="typed" />);

    expect(screen.getByTestId('area-protegida')).toBeInTheDocument();
    expect(screen.getByRole('textbox')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Higienizar as mãos' })).not.toBeInTheDocument();
  });

  it('o modo digitado usa a função de interpretação recebida', async () => {
    const matchAction = vi.fn().mockResolvedValue({ kind: 'match', index: 0 });
    render(<GuidedRpgGate station={station} onBack={() => {}} interaction="typed" matchAction={matchAction} />);

    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'lavo as mãos' } });
    fireEvent.click(screen.getByRole('button', { name: 'Enviar conduta' }));

    expect(await screen.findByRole('button', { name: 'Concluir caso' })).toBeInTheDocument();
    expect(matchAction).toHaveBeenCalledTimes(1);
  });
});
