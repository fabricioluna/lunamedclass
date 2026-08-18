import { describe, it, expect } from 'vitest';
import {
  createInitialCardState,
  normalizeCardState,
  normalizeProgress,
  getOrCreateCardState,
  answerCard,
  buildSession,
  pickNextCard,
  applyAnswerToSession,
  getSessionCounts,
  getDeckCounts,
  getDeckMastery,
  getWeakestCards,
  shuffle,
  applyRange,
  SRS_SCHEMA_VERSION,
  LEARNING_STEPS_MIN,
  RELEARNING_STEPS_MIN,
  GRADUATING_INTERVAL_DAYS,
  EASY_INTERVAL_DAYS,
  MIN_EASE,
  LEARN_AHEAD_LIMIT_MIN,
  isResumableSession,
  restoreSession,
  countDifficultCards,
  isDifficultCard,
  RESUMABLE_SESSION_MAX_AGE_MS,
  type SrsCardState,
} from './srs';

const NOW = new Date('2026-08-18T12:00:00Z').getTime();
const MIN = 60 * 1000;
const DAY = 24 * 60 * 60 * 1000;

// Atalho: leva uma card do zero até a fase de revisão (2 degraus de "good" = gradua em 1 dia).
const graduate = (cardId = 'c1', now = NOW): SrsCardState => {
  let state = createInitialCardState(cardId, now, 'Fêmur');
  state = answerCard(state, 'good', now); // degrau 1min → 10min
  state = answerCard(state, 'good', now); // último degrau → gradua
  return state;
};

describe('createInitialCardState', () => {
  it('nasce como card nova, devida agora, com o ease padrão do Anki', () => {
    const state = createInitialCardState('c1', NOW, 'Fêmur');
    expect(state.phase).toBe('new');
    expect(state.ease).toBe(2.5);
    expect(state.reviews).toBe(0);
    expect(state.againCount).toBe(0);
    expect(state.lapses).toBe(0);
    expect(state.dueAt).toBe(NOW);
    expect(state.schemaVersion).toBe(SRS_SCHEMA_VERSION);
  });
});

describe('normalização do formato antigo (item 6.3 → 6.5)', () => {
  it('descarta estado sem schemaVersion, devolvendo card nova', () => {
    const antigo = { cardId: 'c1', ease: 2.3, intervalDays: 5, repetitions: 2, lapses: 1, reviews: 3, dueAt: NOW };
    const normalizado = normalizeCardState(antigo, 'c1', NOW);
    expect(normalizado.phase).toBe('new');
    expect(normalizado.reviews).toBe(0);
    expect(normalizado.intervalDays).toBe(0);
  });

  it('preserva estado já no formato novo', () => {
    const novo = graduate();
    expect(normalizeCardState(novo, 'c1', NOW).intervalDays).toBe(GRADUATING_INTERVAL_DAYS);
  });

  it('normalizeProgress filtra o mapa inteiro, mantendo só o formato novo', () => {
    const progresso = {
      antiga: { cardId: 'antiga', ease: 2.3, repetitions: 4, reviews: 4, dueAt: NOW },
      nova: graduate('nova'),
    };
    const resultado = normalizeProgress(progresso);
    expect(Object.keys(resultado)).toEqual(['nova']);
  });

  it('progresso indefinido vira mapa vazio', () => {
    expect(normalizeProgress(undefined)).toEqual({});
  });
});

describe('answerCard — card NOVA e em aprendizado (degraus em minutos)', () => {
  it('"não lembrei" numa card nova agenda o primeiro degrau, em minutos — não em dias', () => {
    const state = answerCard(createInitialCardState('c1', NOW), 'again', NOW);
    expect(state.phase).toBe('learning');
    expect(state.stepIndex).toBe(0);
    expect(state.dueAt).toBe(NOW + LEARNING_STEPS_MIN[0] * MIN);
    expect(state.againCount).toBe(1);
  });

  it('"lembrei" avança um degrau sem graduar', () => {
    const state = answerCard(createInitialCardState('c1', NOW), 'good', NOW);
    expect(state.phase).toBe('learning');
    expect(state.stepIndex).toBe(1);
    expect(state.dueAt).toBe(NOW + LEARNING_STEPS_MIN[1] * MIN);
  });

  it('"lembrei" no último degrau gradua a card para revisão em 1 dia', () => {
    const state = graduate();
    expect(state.phase).toBe('review');
    expect(state.intervalDays).toBe(GRADUATING_INTERVAL_DAYS);
    expect(state.dueAt).toBe(NOW + DAY);
  });

  it('"lembrei fácil" pula os degraus e gradua direto em 4 dias', () => {
    const state = answerCard(createInitialCardState('c1', NOW), 'easy', NOW);
    expect(state.phase).toBe('review');
    expect(state.intervalDays).toBe(EASY_INTERVAL_DAYS);
  });

  it('"não lembrei" no meio do aprendizado volta pro primeiro degrau', () => {
    let state = answerCard(createInitialCardState('c1', NOW), 'good', NOW); // stepIndex 1
    state = answerCard(state, 'again', NOW);
    expect(state.stepIndex).toBe(0);
    expect(state.dueAt).toBe(NOW + LEARNING_STEPS_MIN[0] * MIN);
  });

  it('card nova não conta lapso (lapso é só de card já graduada, como no Anki)', () => {
    const state = answerCard(createInitialCardState('c1', NOW), 'again', NOW);
    expect(state.lapses).toBe(0);
    expect(state.againCount).toBe(1); // mas conta pro ranking de pontos fracos
  });
});

describe('answerCard — card em REVISÃO (intervalos em dias)', () => {
  it('"lembrei" multiplica o intervalo pelo ease', () => {
    const state = answerCard(graduate(), 'good', NOW + DAY);
    expect(state.intervalDays).toBe(Math.round(GRADUATING_INTERVAL_DAYS * 2.5));
  });

  it('"lembrei fácil" aumenta o ease e aplica o bônus de 1.3', () => {
    const state = answerCard(graduate(), 'easy', NOW + DAY);
    expect(state.ease).toBeCloseTo(2.65, 5);
    expect(state.intervalDays).toBe(Math.round(1 * 2.65 * 1.3));
  });

  it('"não lembrei" derruba a card para reaprendizado, em minutos', () => {
    const state = answerCard(graduate(), 'again', NOW + DAY);
    expect(state.phase).toBe('relearning');
    expect(state.dueAt).toBe(NOW + DAY + RELEARNING_STEPS_MIN[0] * MIN);
    expect(state.lapses).toBe(1);
    expect(state.ease).toBeCloseTo(2.3, 5);
  });

  it('3 "lembrei" seguidos levam o intervalo à casa de semanas', () => {
    let state = graduate();
    let now = state.dueAt;
    for (let i = 0; i < 3; i++) {
      state = answerCard(state, 'good', now);
      now = state.dueAt;
    }
    expect(state.intervalDays).toBeGreaterThanOrEqual(14);
  });

  it('ease nunca cai abaixo do piso de 1.3', () => {
    let state = graduate();
    for (let i = 0; i < 20; i++) {
      state = answerCard(state, 'again', NOW); // derruba
      state = answerCard(state, 'good', NOW); // regradua pra poder cair de novo
    }
    expect(state.ease).toBe(MIN_EASE);
  });
});

describe('answerCard — REAPRENDIZADO', () => {
  it('"lembrei" no reaprendizado regradua a card para revisão', () => {
    const lapsed = answerCard(graduate(), 'again', NOW + DAY);
    const state = answerCard(lapsed, 'good', NOW + DAY);
    expect(state.phase).toBe('review');
    expect(state.intervalDays).toBeGreaterThanOrEqual(1);
  });

  it('"não lembrei" no reaprendizado mantém a card nos minutos, sem novo lapso', () => {
    const lapsed = answerCard(graduate(), 'again', NOW + DAY);
    const state = answerCard(lapsed, 'again', NOW + DAY);
    expect(state.phase).toBe('relearning');
    expect(state.lapses).toBe(1); // o lapso já foi contado na queda
    expect(state.againCount).toBe(2); // mas o "errei de novo" conta
  });
});

describe('buildSession — ordem, intervalo e limite de novas', () => {
  const deck = ['a', 'b', 'c', 'd', 'e'];

  it('baralho zerado entra inteiro como cards novas, na ordem original', () => {
    const session = buildSession(deck, {}, NOW);
    expect(session.mainQueue).toEqual(deck);
    expect(session.learningQueue).toEqual([]);
  });

  it('ordem aleatória embaralha de verdade (mesmos cards, ordem diferente)', () => {
    // random determinístico: sempre devolve 0 → inverte a ordem de forma previsível
    const session = buildSession(deck, {}, NOW, { order: 'random', random: () => 0 });
    expect([...session.mainQueue].sort()).toEqual([...deck].sort());
    expect(session.mainQueue).not.toEqual(deck);
  });

  it('intervalo específico recorta o baralho (lâminas 2 a 4)', () => {
    const session = buildSession(deck, {}, NOW, { rangeStart: 2, rangeEnd: 4 });
    expect(session.mainQueue).toEqual(['b', 'c', 'd']);
  });

  it('limite de novas corta a fila; undefined significa SEM limite (padrão do usuário)', () => {
    expect(buildSession(deck, {}, NOW, { newLimit: 2 }).mainQueue).toEqual(['a', 'b']);
    expect(buildSession(deck, {}, NOW, { newLimit: undefined }).mainQueue).toEqual(deck);
  });

  it('card de revisão ainda não vencida fica FORA da sessão', () => {
    const states = { a: { ...graduate('a'), dueAt: NOW + 5 * DAY } };
    const session = buildSession(['a'], states, NOW);
    expect(session.mainQueue).toEqual([]);
  });

  it('revisões vencidas entram antes das novas', () => {
    const states = { e: { ...graduate('e'), dueAt: NOW - DAY } };
    const session = buildSession(deck, states, NOW);
    expect(session.mainQueue[0]).toBe('e');
  });

  it('card que ficou em aprendizado numa sessão anterior volta pela fila de aprendizado', () => {
    const states = { a: answerCard(createInitialCardState('a', NOW - DAY), 'again', NOW - DAY) };
    const session = buildSession(deck, states, NOW);
    expect(session.learningQueue).toEqual(['a']);
    expect(session.mainQueue).not.toContain('a');
  });
});

describe('pickNextCard — prioridade da sessão', () => {
  it('card de aprendizado já vencida tem precedência sobre a fila principal', () => {
    const states = { z: { ...answerCard(createInitialCardState('z', NOW), 'again', NOW), dueAt: NOW - MIN } };
    const session = { mainQueue: ['a'], learningQueue: ['z'] };
    expect(pickNextCard(session, states, NOW)).toEqual({ kind: 'card', cardId: 'z' });
  });

  it('sem card de aprendizado vencida, segue a fila principal', () => {
    const states = { z: { ...answerCard(createInitialCardState('z', NOW), 'again', NOW), dueAt: NOW + 5 * MIN } };
    const session = { mainQueue: ['a'], learningQueue: ['z'] };
    expect(pickNextCard(session, states, NOW)).toEqual({ kind: 'card', cardId: 'a' });
  });

  it('learn ahead: fila principal vazia adianta a card que vence dentro da janela', () => {
    const states = { z: { ...answerCard(createInitialCardState('z', NOW), 'again', NOW), dueAt: NOW + 5 * MIN } };
    const session = { mainQueue: [], learningQueue: ['z'] };
    expect(pickNextCard(session, states, NOW)).toEqual({ kind: 'card', cardId: 'z' });
  });

  it('card que só vence depois da janela de learn ahead deixa a sessão em espera', () => {
    const dueAt = NOW + (LEARN_AHEAD_LIMIT_MIN + 10) * MIN;
    const states = { z: { ...answerCard(createInitialCardState('z', NOW), 'again', NOW), dueAt } };
    const session = { mainQueue: [], learningQueue: ['z'] };
    expect(pickNextCard(session, states, NOW)).toEqual({ kind: 'waiting', cardId: 'z', dueAt });
  });

  it('nada em lugar nenhum encerra a sessão', () => {
    expect(pickNextCard({ mainQueue: [], learningQueue: [] }, {}, NOW)).toEqual({ kind: 'done' });
  });
});

describe('applyAnswerToSession', () => {
  it('card que graduou sai da sessão', () => {
    const session = { mainQueue: ['a', 'b'], learningQueue: [] };
    const novo = answerCard(createInitialCardState('a', NOW), 'easy', NOW); // gradua
    const depois = applyAnswerToSession(session, 'a', novo, {});
    expect(depois.mainQueue).toEqual(['b']);
    expect(depois.learningQueue).toEqual([]);
  });

  it('card ainda em aprendizado migra da fila principal para a de aprendizado', () => {
    const session = { mainQueue: ['a', 'b'], learningQueue: [] };
    const novo = answerCard(createInitialCardState('a', NOW), 'again', NOW);
    const depois = applyAnswerToSession(session, 'a', novo, {});
    expect(depois.mainQueue).toEqual(['b']);
    expect(depois.learningQueue).toEqual(['a']);
  });

  it('fila de aprendizado fica ordenada por horário de retorno', () => {
    const cedo = { ...answerCard(createInitialCardState('cedo', NOW), 'again', NOW), dueAt: NOW + MIN };
    const tarde = { ...answerCard(createInitialCardState('tarde', NOW), 'again', NOW), dueAt: NOW + 10 * MIN };
    const session = { mainQueue: ['cedo'], learningQueue: ['tarde'] };
    const depois = applyAnswerToSession(session, 'cedo', cedo, { tarde });
    expect(depois.learningQueue).toEqual(['cedo', 'tarde']);
  });

  // Regressão do bug do item 6.3: `reinsertForRetry` devolvia o card na MESMA posição da fila
  // plana enquanto o índice não andava, então "não lembrei" podia mostrar a mesma lâmina de
  // novo na hora, mesmo havendo outras esperando.
  it('REGRESSÃO 6.3: com outras lâminas na fila, "não lembrei" mostra a PRÓXIMA, não a mesma', () => {
    const states: Record<string, SrsCardState> = {};
    let session = { mainQueue: ['a', 'b', 'c'], learningQueue: [] as string[] };

    const novo = answerCard(getOrCreateCardState(states, 'a', NOW), 'again', NOW);
    states.a = novo;
    session = applyAnswerToSession(session, 'a', novo, states);

    expect(pickNextCard(session, states, NOW)).toEqual({ kind: 'card', cardId: 'b' });
    expect(session.mainQueue).toEqual(['b', 'c']); // não ficou duplicada
    expect(session.learningQueue).toEqual(['a']); // mas volta ainda nesta sessão
  });

  it('a lâmina errada volta sozinha quando o degrau vence', () => {
    const states: Record<string, SrsCardState> = {};
    let session = { mainQueue: ['a', 'b'], learningQueue: [] as string[] };

    const errada = answerCard(getOrCreateCardState(states, 'a', NOW), 'again', NOW);
    states.a = errada;
    session = applyAnswerToSession(session, 'a', errada, states);

    const graduada = answerCard(getOrCreateCardState(states, 'b', NOW), 'easy', NOW);
    states.b = graduada;
    session = applyAnswerToSession(session, 'b', graduada, states);

    // Passado o degrau de 1 minuto, ela é a próxima da vez.
    expect(pickNextCard(session, states, NOW + 2 * MIN)).toEqual({ kind: 'card', cardId: 'a' });
  });
});

describe('contadores', () => {
  it('getSessionCounts separa novas de revisão na fila principal', () => {
    const states = { rev: graduate('rev') };
    const session = { mainQueue: ['rev', 'nova'], learningQueue: ['apr'] };
    expect(getSessionCounts(session, states)).toEqual({ newCount: 1, learningCount: 1, reviewCount: 1 });
  });

  it('getDeckCounts classifica o baralho antes da sessão começar', () => {
    const states: Record<string, SrsCardState> = {
      vencida: { ...graduate('vencida'), dueAt: NOW - DAY },
      futura: { ...graduate('futura'), dueAt: NOW + 10 * DAY },
      aprendendo: answerCard(createInitialCardState('aprendendo', NOW), 'again', NOW),
    };
    expect(getDeckCounts(['vencida', 'futura', 'aprendendo', 'nova'], states, NOW))
      .toEqual({ newCount: 1, learningCount: 1, reviewCount: 1 });
  });
});

describe('getDeckMastery', () => {
  it('conta como dominada só a card com intervalo maduro (21+ dias)', () => {
    const states: Record<string, SrsCardState> = {
      madura: { ...graduate('madura'), intervalDays: 30 },
      verde: { ...graduate('verde'), intervalDays: 3 },
      intacta: createInitialCardState('intacta', NOW),
    };
    const mastery = getDeckMastery(states, NOW);
    expect(mastery.studied).toBe(2); // a intacta nunca foi revisada
    expect(mastery.mastered).toBe(1);
  });
});

describe('getWeakestCards', () => {
  it('rankeia por número de "não lembrei"', () => {
    const states: Record<string, SrsCardState> = {
      a: { ...graduate('a'), againCount: 1 },
      b: { ...graduate('b'), againCount: 4 },
      c: { ...graduate('c'), againCount: 2 },
    };
    expect(getWeakestCards(states, 2).map((w) => w.cardId)).toEqual(['b', 'c']);
  });

  it('empate desempata pelo ease mais baixo', () => {
    const states: Record<string, SrsCardState> = {
      a: { ...graduate('a'), againCount: 2, ease: 2.1 },
      b: { ...graduate('b'), againCount: 2, ease: 1.5 },
    };
    expect(getWeakestCards(states, 2)[0].cardId).toBe('b');
  });

  it('ignora card que o aluno nunca errou', () => {
    const states: Record<string, SrsCardState> = {
      perfeita: { ...graduate('perfeita'), againCount: 0 },
      errada: { ...graduate('errada'), againCount: 1 },
    };
    expect(getWeakestCards(states, 10).map((w) => w.cardId)).toEqual(['errada']);
  });
});

describe('treino focado nas lâminas difíceis (item 6.7)', () => {
  const deck = ['a', 'b', 'c', 'd'];
  // 'a' errada 2x e ainda por vencer; 'b' errada 1x; 'c' nunca errada; 'd' nunca estudada.
  const states: Record<string, SrsCardState> = {
    a: { ...graduate('a'), againCount: 2, dueAt: NOW + 30 * DAY },
    b: { ...graduate('b'), againCount: 1, dueAt: NOW + 5 * DAY },
    c: { ...graduate('c'), againCount: 0, dueAt: NOW + DAY },
  };

  it('conta como difícil só a lâmina que o aluno já marcou "Não lembrei"', () => {
    expect(countDifficultCards(deck, states)).toBe(2); // a e b
  });

  it('lâmina nunca estudada não entra na conta (não dá pra errar o que não se viu)', () => {
    expect(isDifficultCard(states.d)).toBe(false);
    expect(isDifficultCard(undefined)).toBe(false);
  });

  it('limiar maior restringe às lâminas erradas mais vezes', () => {
    expect(countDifficultCards(deck, states, 2)).toBe(1); // só 'a'
  });

  it('sessão focada traz as difíceis IGNORANDO a data de revisão', () => {
    // 'a' e 'b' só venceriam daqui a semanas; numa sessão normal não apareceriam.
    expect(buildSession(deck, states, NOW).mainQueue).not.toContain('a');
    const focada = buildSession(deck, states, NOW, { focus: 'difficult' });
    expect(focada.mainQueue).toEqual(['a', 'b']);
    expect(focada.learningQueue).toEqual([]);
  });

  it('sessão focada respeita ordem aleatória e intervalo', () => {
    const soPrimeira = buildSession(deck, states, NOW, { focus: 'difficult', rangeStart: 1, rangeEnd: 1 });
    expect(soPrimeira.mainQueue).toEqual(['a']);
  });

  it('baralho sem nenhuma lâmina errada devolve sessão focada vazia', () => {
    const semErros = { c: { ...graduate('c'), againCount: 0 } };
    expect(buildSession(deck, semErros, NOW, { focus: 'difficult' }).mainQueue).toEqual([]);
  });
});

describe('retomar sessão interrompida (item 6.6)', () => {
  const sessaoBase = {
    startedAt: NOW - 10 * 60 * 1000,
    updatedAt: NOW - 5 * 60 * 1000,
    options: { order: 'sequential' as const },
    mainQueue: ['b', 'c'],
    learningQueue: ['a'],
    answers: { a: false, d: true },
  };

  it('sessão recente com lâminas restantes é retomável', () => {
    expect(isResumableSession(sessaoBase, NOW)).toBe(true);
  });

  it('sessão sem nada restante NÃO é retomável (já tinha acabado)', () => {
    expect(isResumableSession({ ...sessaoBase, mainQueue: [], learningQueue: [] }, NOW)).toBe(false);
  });

  it('sessão velha demais NÃO é retomável — as lâminas já mudaram de estado', () => {
    const antiga = { ...sessaoBase, updatedAt: NOW - RESUMABLE_SESSION_MAX_AGE_MS - 1000 };
    expect(isResumableSession(antiga, NOW)).toBe(false);
  });

  it('ausência de sessão não quebra', () => {
    expect(isResumableSession(undefined, NOW)).toBe(false);
    expect(isResumableSession(null, NOW)).toBe(false);
  });

  it('restoreSession devolve as filas exatamente como estavam', () => {
    const restaurada = restoreSession(sessaoBase, new Set(['a', 'b', 'c']));
    expect(restaurada).toEqual({ mainQueue: ['b', 'c'], learningQueue: ['a'] });
  });

  it('restoreSession descarta lâmina apagada do baralho depois que o aluno parou', () => {
    const restaurada = restoreSession(sessaoBase, new Set(['b'])); // 'a' e 'c' sumiram
    expect(restaurada).toEqual({ mainQueue: ['b'], learningQueue: [] });
  });
});

describe('helpers de fila', () => {
  it('shuffle preserva todos os itens', () => {
    const items = ['a', 'b', 'c', 'd'];
    expect([...shuffle(items, () => 0.5)].sort()).toEqual([...items].sort());
  });

  it('shuffle não muta a entrada', () => {
    const items = ['a', 'b', 'c'];
    shuffle(items, () => 0);
    expect(items).toEqual(['a', 'b', 'c']);
  });

  it('applyRange sem limites devolve tudo', () => {
    expect(applyRange(['a', 'b', 'c'])).toEqual(['a', 'b', 'c']);
  });

  it('applyRange tolera limites fora do baralho', () => {
    expect(applyRange(['a', 'b', 'c'], 0, 99)).toEqual(['a', 'b', 'c']);
  });

  it('applyRange com fim antes do início devolve vazio (não estoura)', () => {
    expect(applyRange(['a', 'b', 'c'], 3, 1)).toEqual([]);
  });
});
