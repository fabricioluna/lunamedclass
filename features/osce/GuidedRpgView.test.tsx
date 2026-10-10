import { describe, it, expect, beforeAll, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import GuidedRpgView from './GuidedRpgView';
import type { GuidedOsceStation } from '../../types';

const station: GuidedOsceStation = {
  mode: 'guided',
  id: 'rpg-teste',
  disciplineId: 'hm1',
  theme: 'Sinais Vitais',
  title: 'Caso de teste',
  scenario: 'Paciente aguardando a aferição.',
  setting: 'Consultório da UBS.',
  task: 'Afira a pressão arterial.',
  tip: 'Dica final do caso.',
  scenes: [
    {
      narrative: 'O paciente está sentado.',
      patient: 'Posso ficar com o braço assim?',
      prompt: 'Como você começa?',
      choices: [
        { action: 'Explicar o procedimento e pedir o consentimento', correct: true, feedback: 'Ele concorda e relaxa o braço.' },
        { action: 'Começar sem avisar', feedback: 'O paciente se assusta e retira o braço.' },
        { action: 'Pedir que ele cruze as pernas', feedback: 'A posição prejudica a medida.' },
        { action: 'Calçar luvas cirúrgicas', feedback: 'Não é necessário aqui.' },
      ],
    },
    {
      narrative: 'O manguito está no braço.',
      choices: [
        { action: 'Desinsuflar lentamente', correct: true, feedback: 'Os sons aparecem com clareza.', },
        { action: 'Desinsuflar de uma vez', feedback: 'Você perde os ruídos.' },
        { action: 'Baixar a cabeça', feedback: 'A ausculta piora.' },
        { action: 'Soltar o manguito', feedback: 'A medida se perde.' },
      ],
      reveals: [{ label: 'PA', value: '132/84 mmHg' }],
    },
  ],
  checklist: ['Explicou o procedimento'],
};

beforeAll(() => {
  window.scrollTo = () => {};
});

const choose = (text: string) => fireEvent.click(screen.getByRole('button', { name: text }));

describe('GuidedRpgView', () => {
  it('mostra o ambiente, a cena, a fala do paciente e opções sem a resposta destacada', () => {
    render(<GuidedRpgView station={station} onBack={() => {}} />);

    expect(screen.getByText('Consultório da UBS.')).toBeInTheDocument();
    expect(screen.getByText('O paciente está sentado.')).toBeInTheDocument();
    expect(screen.getByText(/Posso ficar com o braço assim\?/)).toBeInTheDocument();
    expect(screen.getByText('Como você começa?')).toBeInTheDocument();
    expect(screen.getAllByRole('button').filter((b) => /Explicar|Começar|cruze|luvas/.test(b.textContent ?? ''))).toHaveLength(4);
    expect(screen.queryByText('Conduta correta')).not.toBeInTheDocument();
  });

  it('o valor aferido NÃO aparece de graça: só depois da escolha correta da cena que o revela', () => {
    render(<GuidedRpgView station={station} onBack={() => {}} />);

    expect(screen.queryByText('132/84 mmHg')).not.toBeInTheDocument();
    choose('Explicar o procedimento e pedir o consentimento');
    fireEvent.click(screen.getByRole('button', { name: /Continuar/ }));
    expect(screen.queryByText('132/84 mmHg')).not.toBeInTheDocument();

    choose('Desinsuflar de uma vez'); // errada: nada é revelado
    expect(screen.queryByText('132/84 mmHg')).not.toBeInTheDocument();
    choose('Desinsuflar lentamente');
    expect(screen.getByText('132/84 mmHg')).toBeInTheDocument();
  });

  it('escolha errada mostra a consequência, trava aquela opção e não avança a cena', () => {
    render(<GuidedRpgView station={station} onBack={() => {}} />);

    choose('Começar sem avisar');

    expect(screen.getByText('O paciente se assusta e retira o braço.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Começar sem avisar' })).toBeDisabled();
    expect(screen.getByText('O paciente está sentado.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Continuar/ })).not.toBeInTheDocument();
  });

  it('escolha correta mostra o desfecho e libera o botão de continuar', () => {
    render(<GuidedRpgView station={station} onBack={() => {}} />);

    choose('Explicar o procedimento e pedir o consentimento');

    expect(screen.getByText('Ele concorda e relaxa o braço.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Continuar/ }));
    expect(screen.getByText('O manguito está no braço.')).toBeInTheDocument();
  });

  it('acertar tudo de primeira dá 10 e a última cena pede "Concluir caso"', () => {
    const onSaveResult = vi.fn();
    render(<GuidedRpgView station={station} onBack={() => {}} onSaveResult={onSaveResult} />);

    choose('Explicar o procedimento e pedir o consentimento');
    fireEvent.click(screen.getByRole('button', { name: /Continuar/ }));
    choose('Desinsuflar lentamente');
    fireEvent.click(screen.getByRole('button', { name: /Concluir caso/ }));

    expect(screen.getByText('10.0')).toBeInTheDocument();
    expect(screen.getByText('Dica final do caso.')).toBeInTheDocument();
    expect(screen.getByText('Explicou o procedimento')).toBeInTheDocument();
    expect(onSaveResult).toHaveBeenCalledWith(10, 10, expect.any(Number), expect.objectContaining({ mode: 'guided', attemptsByScene: [1, 1], totalWrong: 0 }));
  });

  it('errar uma vez desconta meio ponto daquela cena e o resumo mostra a consequência vivida', () => {
    render(<GuidedRpgView station={station} onBack={() => {}} />);

    choose('Começar sem avisar');
    choose('Explicar o procedimento e pedir o consentimento');
    fireEvent.click(screen.getByRole('button', { name: /Continuar/ }));
    choose('Desinsuflar lentamente');
    fireEvent.click(screen.getByRole('button', { name: /Concluir caso/ }));

    // cena 1 na segunda tentativa (0,5) + cena 2 de primeira (1) = 1,5 de 2 → 7,5
    expect(screen.getByText('7.5')).toBeInTheDocument();
    expect(screen.getByText('1 escolha errada')).toBeInTheDocument();
    expect(screen.getByText('O paciente se assusta e retira o braço.')).toBeInTheDocument();
  });

  it('estação sem cenas não quebra a tela', () => {
    render(<GuidedRpgView station={{ ...station, scenes: [] }} onBack={() => {}} />);
    expect(screen.getByText('Este caso não tem cenas cadastradas.')).toBeInTheDocument();
  });
});
