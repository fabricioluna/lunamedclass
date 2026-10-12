import { describe, it, expect, beforeAll, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import type { GuidedOsceStation } from '../../types';

// A <ProtectedRoute> real exige os contextos do app; aqui ela vira uma casca que marca "área protegida".
vi.mock('../auth/ProtectedRoute', () => ({
  default: ({ children }: { children: React.ReactNode }) => <div data-testid="area-protegida">{children}</div>,
}));

const authState = vi.hoisted(() => ({ currentUser: null as null | { uid: string } }));
vi.mock('../../contexts/AuthContext', () => ({ useAuth: () => authState }));
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
  it('começa perguntando como o aluno quer jogar, sem iniciar o caso', () => {
    authState.currentUser = null;
    render(<GuidedRpgGate station={station} onBack={() => {}} />);

    expect(screen.getByText('Como você quer jogar?')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Com alternativas/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Digitando a ação/ })).toBeInTheDocument();
    expect(screen.queryByText('Você está diante da porta.')).not.toBeInTheDocument();
  });

  it('com alternativas: abre o caso com as opções, sem login e fora da área protegida', () => {
    authState.currentUser = null;
    render(<GuidedRpgGate station={station} onBack={() => {}} />);

    fireEvent.click(screen.getByRole('button', { name: /Com alternativas/ }));

    expect(screen.getByRole('button', { name: 'Higienizar as mãos' })).toBeInTheDocument();
    expect(screen.queryByTestId('area-protegida')).not.toBeInTheDocument();
  });

  it('digitando: abre o caso DENTRO da área protegida (login), sem as alternativas', () => {
    authState.currentUser = { uid: 'aluno-1' };
    render(<GuidedRpgGate station={station} onBack={() => {}} />);

    fireEvent.click(screen.getByRole('button', { name: /Digitando a ação/ }));

    expect(screen.getByTestId('area-protegida')).toBeInTheDocument();
    expect(screen.getByRole('textbox')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Higienizar as mãos' })).not.toBeInTheDocument();
  });

  it('quem não está logado vê o aviso de login no cartão do modo digitado; quem está, não', () => {
    authState.currentUser = null;
    const { unmount } = render(<GuidedRpgGate station={station} onBack={() => {}} />);
    expect(screen.getByText(/Exige login/)).toBeInTheDocument();
    unmount();

    authState.currentUser = { uid: 'aluno-1' };
    render(<GuidedRpgGate station={station} onBack={() => {}} />);
    expect(screen.queryByText(/Exige login/)).not.toBeInTheDocument();
  });

  it('o modo digitado usa a função de interpretação recebida', async () => {
    authState.currentUser = { uid: 'aluno-1' };
    const matchAction = vi.fn().mockResolvedValue({ kind: 'match', index: 0 });
    render(<GuidedRpgGate station={station} onBack={() => {}} matchAction={matchAction} />);

    fireEvent.click(screen.getByRole('button', { name: /Digitando a ação/ }));
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'lavo as mãos' } });
    fireEvent.click(screen.getByRole('button', { name: 'Enviar conduta' }));

    expect(await screen.findByRole('button', { name: 'Concluir caso' })).toBeInTheDocument();
    expect(matchAction).toHaveBeenCalledTimes(1);
  });

  it('com a interação já escolhida no menu, pula a tela de escolha', () => {
    authState.currentUser = { uid: 'aluno-1' };
    const { unmount } = render(<GuidedRpgGate station={station} onBack={() => {}} interaction="choices" />);
    expect(screen.queryByText('Como você quer jogar?')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Higienizar as mãos' })).toBeInTheDocument();
    unmount();

    render(<GuidedRpgGate station={station} onBack={() => {}} interaction="typed" />);
    expect(screen.queryByText('Como você quer jogar?')).not.toBeInTheDocument();
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('"Sair do Caso" na escolha de modo volta', () => {
    const onBack = vi.fn();
    render(<GuidedRpgGate station={station} onBack={onBack} />);
    fireEvent.click(screen.getByRole('button', { name: /Sair do Caso/ }));
    expect(onBack).toHaveBeenCalled();
  });
});
