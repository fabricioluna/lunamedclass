import { describe, it, expect, beforeAll, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import GuidedRpgView from './GuidedRpgView';
import { MatchError } from '../../utils/typedMatch';
import type { MatchResult } from '../../utils/typedMatch';
import type { GuidedOsceStation } from '../../types';

// Escolhas (índices originais): 0 = certa, 1 e 2 = erradas, 3 = errada.
const station: GuidedOsceStation = {
  mode: 'guided',
  id: 'rpg-digitado-teste',
  disciplineId: 'hm1',
  theme: 'Sinais Vitais',
  title: 'Caso digitado',
  scenario: 'Paciente aguardando a aferição.',
  setting: 'Consultório da UBS.',
  task: 'Afira a pressão arterial.',
  scenes: [
    {
      narrative: 'O paciente está sentado e olha para o esfigmomanômetro.',
      patient: 'Sr. A.P.: "Vai demorar?"',
      hint: 'Pense no que o paciente precisa saber antes de você começar.',
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
        { action: 'Desinsuflar lentamente', correct: true, feedback: 'Os sons aparecem com clareza.' },
        { action: 'Desinsuflar de uma vez', feedback: 'Você perde os ruídos.' },
        { action: 'Baixar a cabeça', feedback: 'A ausculta piora.' },
        { action: 'Soltar o manguito', feedback: 'A medida se perde.' },
      ],
      reveals: [{ label: 'PA', value: '132/84 mmHg' }],
    },
  ],
};

beforeAll(() => {
  window.scrollTo = () => {};
});

const matcher = (...results: Array<MatchResult | Error>) => {
  const fn = vi.fn();
  results.forEach((result) => (result instanceof Error ? fn.mockRejectedValueOnce(result) : fn.mockResolvedValueOnce(result)));
  return fn;
};

const renderTyped = (matchAction: ReturnType<typeof matcher>, onSaveResult?: () => void) =>
  render(<GuidedRpgView station={station} onBack={() => {}} interaction="typed" matchAction={matchAction} onSaveResult={onSaveResult} />);

const send = async (text: string) => {
  fireEvent.change(screen.getByRole('textbox'), { target: { value: text } });
  fireEvent.click(screen.getByRole('button', { name: 'Enviar conduta' }));
};

describe('GuidedRpgView — modo digitado', () => {
  it('não mostra alternativas: só a narração, o campo de texto e a dica', () => {
    renderTyped(matcher());

    expect(screen.getByText(/O paciente está sentado/)).toBeInTheDocument();
    expect(screen.getByRole('textbox')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Dica \(0\/2\)/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Começar sem avisar' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Explicar o procedimento e pedir o consentimento' })).not.toBeInTheDocument();
    expect(screen.getByText(/modo digitado/i)).toBeInTheDocument();
  });

  it('conduta certa digitada: aparece o que o aluno escreveu, o desfecho e o botão de continuar', async () => {
    const matchAction = matcher({ kind: 'match', index: 0 });
    renderTyped(matchAction);

    await send('me apresento, explico e peço permissão');

    expect(await screen.findByText('Ele concorda e relaxa o braço.')).toBeInTheDocument();
    expect(screen.getByText('me apresento, explico e peço permissão')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Continuar' })).toBeInTheDocument();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    // o classificador recebeu a narrativa, a lista de condutas e o texto — nunca qual é a certa
    expect(matchAction).toHaveBeenCalledWith({
      narrative: [station.scenes[0].narrative, station.scenes[0].patient, station.scenes[0].prompt].filter(Boolean).join('\n'),
      options: station.scenes[0].choices.map((c) => c.action),
      text: 'me apresento, explico e peço permissão',
    });
  });

  it('conduta errada: mostra a consequência, não avança e o aluno pode digitar de novo', async () => {
    renderTyped(matcher({ kind: 'match', index: 1 }, { kind: 'match', index: 0 }));

    await send('já vou medindo');
    expect(await screen.findByText('O paciente se assusta e retira o braço.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Continuar' })).not.toBeInTheDocument();
    expect(screen.getByRole('textbox')).toBeInTheDocument();

    await send('explico antes');
    expect(await screen.findByRole('button', { name: 'Continuar' })).toBeInTheDocument();
  });

  it('repetir uma conduta errada que já foi vista avisa e não conta nova tentativa', async () => {
    renderTyped(matcher({ kind: 'match', index: 1 }, { kind: 'match', index: 1 }));

    await send('já vou medindo');
    await screen.findByText('O paciente se assusta e retira o braço.');
    await send('começo logo');

    expect(await screen.findByText(/Você já tentou isso nesta cena/)).toBeInTheDocument();
  });

  it('"não entendi": orienta, não dá consequência e na 2ª vez sugere a dica', async () => {
    renderTyped(matcher({ kind: 'none' }, { kind: 'none' }));

    await send('hmm');
    expect(await screen.findByText(/Nada muda na cena com isso/)).toBeInTheDocument();
    expect(screen.queryByText(/botão "Dica"/)).not.toBeInTheDocument();

    await send('sei lá');
    await waitFor(() => expect(screen.getAllByText(/Nada muda na cena com isso/)).toHaveLength(2));
    expect(screen.getByText(/botão "Dica"/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Continuar' })).not.toBeInTheDocument();
  });

  it('várias ações no mesmo texto: pede uma por vez', async () => {
    renderTyped(matcher({ kind: 'multiple' }));
    await send('explico e depois começo a medir');
    expect(await screen.findByText('Uma ação por vez: qual delas você faz primeiro?')).toBeInTheDocument();
  });

  it('enquanto interpreta, mostra o aviso e trava o campo', async () => {
    let resolver: (r: MatchResult) => void = () => {};
    const pendente = new Promise<MatchResult>((resolve) => { resolver = resolve; });
    renderTyped(vi.fn().mockReturnValue(pendente));

    await send('explico o procedimento');
    expect(await screen.findByText(/Interpretando a sua ação/)).toBeInTheDocument();
    expect(screen.getByRole('textbox')).toBeDisabled();

    resolver({ kind: 'match', index: 0 });
    expect(await screen.findByRole('button', { name: 'Continuar' })).toBeInTheDocument();
  });

  it('dica nível 1 usa a pista do caso e o nível 2 mostra a conduta esperada; o botão esgota em 2', async () => {
    renderTyped(matcher());

    fireEvent.click(screen.getByRole('button', { name: /Dica \(0\/2\)/ }));
    expect(screen.getByText('Dica: Pense no que o paciente precisa saber antes de você começar.')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Dica \(1\/2\)/ }));
    expect(screen.getByText('Conduta esperada: Explicar o procedimento e pedir o consentimento')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Dica \(2\/2\)/ })).toBeDisabled();
  });

  it('sem pista cadastrada, a dica nível 1 usa um texto genérico (que não entrega a resposta)', () => {
    render(<GuidedRpgView station={{ ...station, scenes: [{ ...station.scenes[1] }] }} onBack={() => {}} interaction="typed" matchAction={matcher()} />);
    fireEvent.click(screen.getByRole('button', { name: /Dica \(0\/2\)/ }));
    expect(screen.getByText(/Releia a narração e pense/)).toBeInTheDocument();
    expect(screen.queryByText(/Desinsuflar lentamente/)).not.toBeInTheDocument();
  });

  it('falha da interpretação cai no plano B: mostra as alternativas da cena e o jogo continua', async () => {
    renderTyped(matcher(new MatchError('unavailable')));

    await send('explico o procedimento');
    expect(await screen.findByText(/Não consegui interpretar a sua ação agora/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Explicar o procedimento e pedir o consentimento' }));
    expect(await screen.findByRole('button', { name: 'Continuar' })).toBeInTheDocument();
  });

  it('sem login também cai no plano B, com a mensagem certa', async () => {
    renderTyped(matcher(new MatchError('login')));
    await send('explico');
    expect(await screen.findByText(/Entre na sua conta para jogar digitando/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Começar sem avisar' })).toBeInTheDocument();
  });

  it('"muitas ações" não troca de modo: o campo continua disponível', async () => {
    renderTyped(matcher(new MatchError('busy')));
    await send('explico');
    expect(await screen.findByText(/Muitas ações em pouco tempo/)).toBeInTheDocument();
    expect(screen.getByRole('textbox')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Começar sem avisar' })).not.toBeInTheDocument();
  });

  it('tudo certo de primeira e sem dica dá 10; o resumo mostra o que o aluno escreveu e os valores', async () => {
    const onSaveResult = vi.fn();
    renderTyped(matcher({ kind: 'match', index: 0 }, { kind: 'match', index: 0 }), onSaveResult);

    await send('me apresento e peço permissão');
    fireEvent.click(await screen.findByRole('button', { name: 'Continuar' }));
    await send('solto o ar devagar');
    fireEvent.click(await screen.findByRole('button', { name: 'Concluir caso' }));

    expect(screen.getByText('10.0')).toBeInTheDocument();
    expect(screen.getByText('Você escreveu: “me apresento e peço permissão”')).toBeInTheDocument();
    expect(screen.getAllByText('132/84 mmHg').length).toBeGreaterThan(0);
    expect(onSaveResult).toHaveBeenCalledWith(10, 10, expect.any(Number), expect.objectContaining({
      interaction: 'typed', attemptsByScene: [1, 1], hintsByScene: [0, 0], totalWrong: 0,
    }));
  });

  it('erro e dica descontam pontos: cena 1 na 2ª tentativa (0,5) + cena 2 com dica nível 2 (0,5) = 5.0', async () => {
    renderTyped(matcher({ kind: 'match', index: 1 }, { kind: 'match', index: 0 }, { kind: 'match', index: 0 }));

    await send('já vou medindo');
    await screen.findByText('O paciente se assusta e retira o braço.');
    await send('explico antes');
    fireEvent.click(await screen.findByRole('button', { name: 'Continuar' }));

    fireEvent.click(screen.getByRole('button', { name: /Dica \(0\/2\)/ }));
    fireEvent.click(screen.getByRole('button', { name: /Dica \(1\/2\)/ }));
    await send('solto devagar');
    fireEvent.click(await screen.findByRole('button', { name: 'Concluir caso' }));

    expect(screen.getByText('5.0')).toBeInTheDocument();
    expect(screen.getByText('2 dicas usadas')).toBeInTheDocument();
  });

  it('sem a função de interpretação, o modo digitado não liga: volta às alternativas', () => {
    render(<GuidedRpgView station={station} onBack={() => {}} interaction="typed" />);
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Começar sem avisar' })).toBeInTheDocument();
  });
});
