import { describe, it, expect } from 'vitest';
import {
  createInitialCardState,
  normalizeCardState,
  normalizeProgress,
  getOrCreateCardState,
  answerCard,
  isMemorized,
  isUnmemorized,
  countUnmemorizedCards,
  listUnmemorizedCards,
  buildSession,
  pickNextCard,
  applyAnswerToSession,
  getSessionCounts,
  getDeckCounts,
  getDeckMastery,
  getWeakestCards,
  shuffle,
  applyRange,
  isResumableSession,
  restoreSession,
  RESUMABLE_SESSION_MAX_AGE_MS,
  SRS_SCHEMA_VERSION,
  type SrsCardState,
  type SrsRating,
} from './srs';

const NOW = new Date('2026-08-18T12:00:00Z').getTime();
const DAY = 24 * 60 * 60 * 1000;

// Atalho: cria um card já respondido com a nota indicada.
const answered = (cardId: string, rating: SrsRating, now = NOW): SrsCardState =>
  answerCard(createInitialCardState(cardId, 'Fêmur'), rating, now);

describe('createInitialCardState', () => {
  it('nasce sem nenhuma resposta registrada', () => {
    const state = createInitialCardState('c1', 'Fêmur');
    expect(state.reviews).toBe(0);
    expect(state.againCount).toBe(0);
    expect(state.effortCount).toBe(0);
    expect(state.easyCount).toBe(0);
    expect(state.lastRating).toBeUndefined();
    expect(state.schemaVersion).toBe(SRS_SCHEMA_VERSION);
  });

  it('não guarda nenhum campo de agendamento (nem dias, nem vencimento)', () => {
    const state = createInitialCardState('c1');
    expect(state).not.toHaveProperty('dueAt');
    expect(state).not.toHaveProperty('intervalDays');
    expect(state).not.toHaveProperty('ease');
    expect(state).not.toHaveProperty('phase');
  });
});

describe('answerCard — só contadores, sem agendamento', () => {
  it('cada resposta incrementa o contador certo e vira a última nota', () => {
    let state = createInitialCardState('c1');
    state = answerCard(state, 'again', NOW);
    expect(state).toMatchObject({ reviews: 1, againCount: 1, effortCount: 0, easyCount: 0, lastRating: 'again' });
    state = answerCard(state, 'good', NOW);
    expect(state).toMatchObject({ reviews: 2, againCount: 1, effortCount: 1, easyCount: 0, lastRating: 'good' });
    state = answerCard(state, 'easy', NOW);
    expect(state).toMatchObject({ reviews: 3, againCount: 1, effortCount: 1, easyCount: 1, lastRating: 'easy' });
  });

  it('registra quando o card foi visto, mas isso é informativo — não vira trava', () => {
    const state = answerCard(createInitialCardState('c1'), 'easy', NOW);
    expect(state.lastReviewedAt).toBe(NOW);
    // Estudar de novo no mesmo instante é permitido: o baralho não olha o relógio.
    expect(buildSession(['c1'], { c1: state }).queue).toEqual(['c1']);
  });

  it('não muta o estado de entrada', () => {
    const original = createInitialCardState('c1');
    answerCard(original, 'again', NOW);
    expect(original.reviews).toBe(0);
  });
});

describe('pilhas: memorizado vs não memorizado', () => {
  it('card só é memorizado quando o aluno clica em "Lembrei fácil"', () => {
    expect(isMemorized(answered('c', 'easy'))).toBe(true);
    expect(isMemorized(answered('c', 'good'))).toBe(false);
    expect(isMemorized(answered('c', 'again'))).toBe(false);
  });

  it('"lembrei com esforço" numa rodada seguinte devolve o card à pilha', () => {
    const memorizado = answered('c', 'easy');
    expect(isUnmemorized(memorizado)).toBe(false);
    expect(isUnmemorized(answerCard(memorizado, 'good', NOW + DAY))).toBe(true);
  });

  it('"não lembrei" numa rodada seguinte também devolve o card à pilha', () => {
    const memorizado = answered('c', 'easy');
    expect(isUnmemorized(answerCard(memorizado, 'again', NOW + DAY))).toBe(true);
  });

  it('card nunca estudado não conta como não memorizado', () => {
    expect(isUnmemorized(createInitialCardState('c'))).toBe(false);
    expect(isUnmemorized(undefined)).toBe(false);
  });

  it('lista e conta só os que faltam memorizar', () => {
    const states = { a: answered('a', 'again'), b: answered('b', 'good'), c: answered('c', 'easy') };
    expect(listUnmemorizedCards(['a', 'b', 'c'], states)).toEqual(['a', 'b']);
    expect(countUnmemorizedCards(['a', 'b', 'c', 'inedito'], states)).toBe(2);
  });
});

describe('buildSession — nada é bloqueado por tempo', () => {
  const deck = ['a', 'b', 'c', 'd', 'e'];

  it('baralho zerado entra inteiro, na ordem original', () => {
    expect(buildSession(deck, {}).queue).toEqual(deck);
  });

  // O ponto do item 6.10: o aluno pode repassar tudo quantas vezes quiser, no mesmo dia.
  it('card memorizado AGORA continua disponível numa sessão iniciada em seguida', () => {
    const states = { a: answered('a', 'easy'), b: answered('b', 'easy') };
    expect(buildSession(['a', 'b'], states).queue).toEqual(['a', 'b']);
  });

  it('rodar a mesma sessão várias vezes seguidas devolve sempre o mesmo baralho', () => {
    const states = { a: answered('a', 'easy') };
    expect(buildSession(['a'], states).queue).toEqual(['a']);
    expect(buildSession(['a'], states).queue).toEqual(['a']);
  });

  it('ordem aleatória embaralha de verdade', () => {
    const session = buildSession(deck, {}, { order: 'random', random: () => 0 });
    expect([...session.queue].sort()).toEqual([...deck].sort());
    expect(session.queue).not.toEqual(deck);
  });

  it('intervalo específico recorta o baralho', () => {
    expect(buildSession(deck, {}, { rangeStart: 2, rangeEnd: 4 }).queue).toEqual(['b', 'c', 'd']);
  });

  it('limite corta só os inéditos; undefined = sem limite', () => {
    expect(buildSession(deck, {}, { newLimit: 2 }).queue).toEqual(['a', 'b']);
    expect(buildSession(deck, {}, { newLimit: undefined }).queue).toEqual(deck);
  });

  it('limite de inéditos não corta card já estudado', () => {
    const states = { a: answered('a', 'good'), b: answered('b', 'good'), c: answered('c', 'good') };
    const session = buildSession(deck, states, { newLimit: 1 });
    expect(session.queue).toEqual(['a', 'b', 'c', 'd']); // 3 já vistos + 1 inédito
  });

  // "Sequencial" promete "ordem cadastrada" na tela: tem que ser a ordem do baralho mesmo,
  // sem jogar os já estudados para a frente.
  it('sequencial segue a ordem cadastrada, misturando já vistos e inéditos', () => {
    const states = { e: answered('e', 'again'), b: answered('b', 'good') };
    expect(buildSession(deck, states).queue).toEqual(['a', 'b', 'c', 'd', 'e']);
  });

  it('rodada focada traz só os não memorizados', () => {
    const states = { a: answered('a', 'good'), b: answered('b', 'easy'), c: answered('c', 'again') };
    expect(buildSession(deck, states, { focus: 'unmemorized' }).queue).toEqual(['a', 'c']);
  });

  it('rodada focada num baralho todo memorizado devolve fila vazia', () => {
    const states = { a: answered('a', 'easy') };
    expect(buildSession(['a'], states, { focus: 'unmemorized' }).queue).toEqual([]);
  });
});


describe('qualidade do embaralhamento', () => {
  // PRNG determinístico: o teste mede distribuição sem depender de Math.random, então não
  // pode ficar intermitente.
  const seeded = (seed: number) => () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };

  it('cada card cai em cada posição com a mesma frequência (Fisher-Yates sem viés)', () => {
    const rnd = seeded(42);
    const deck = ['a', 'b', 'c', 'd'];
    const RODADAS = 12000;
    const esperado = RODADAS / deck.length;
    const freq: Record<string, number[]> = {
      a: [0, 0, 0, 0], b: [0, 0, 0, 0], c: [0, 0, 0, 0], d: [0, 0, 0, 0],
    };

    for (let n = 0; n < RODADAS; n++) {
      shuffle(deck, rnd).forEach((card, pos) => { freq[card][pos]++; });
    }

    // 3σ para n=12000, p=0,25 fica em ~4,7%. Uma implementação enviesada (o clássico
    // `sort(() => Math.random() - 0.5)`, que este projeto usava antes do item 6.5) estoura
    // isso com folga.
    for (const card of deck) {
      for (const pos of [0, 1, 2, 3]) {
        expect(Math.abs(freq[card][pos] - esperado) / esperado).toBeLessThan(0.06);
      }
    }
  });

  it('modo aleatório mistura já vistos com inéditos, sem separar em blocos', () => {
    const rnd = seeded(7);
    const deck = ['v1', 'v2', 'n1', 'n2'];
    const states = { v1: answered('v1', 'good'), v2: answered('v2', 'good') };

    // Se os grupos fossem embaralhados separadamente e concatenados, TODA rodada começaria
    // por um card já visto. Basta uma rodada começando por inédito para provar a mistura.
    const comecouPorInedito = Array.from({ length: 50 }, () =>
      buildSession(deck, states, { order: 'random', random: rnd }).queue[0]
    ).some((primeiro) => primeiro.startsWith('n'));

    expect(comecouPorInedito).toBe(true);
  });
});

describe('pickNextCard e applyAnswerToSession — nada volta no meio da sessão', () => {
  it('o próximo card é sempre o primeiro da fila', () => {
    expect(pickNextCard({ queue: ['a', 'b'] })).toEqual({ kind: 'card', cardId: 'a' });
  });

  it('fila vazia encerra a sessão', () => {
    expect(pickNextCard({ queue: [] })).toEqual({ kind: 'done' });
  });

  it('card respondido sai da fila, qualquer que tenha sido a resposta', () => {
    expect(applyAnswerToSession({ queue: ['a', 'b', 'c'] }, 'a').queue).toEqual(['b', 'c']);
  });

  // REGRESSÃO 6.5: o learn-ahead devolvia o MESMO card recém-respondido quando ele era o
  // último da fila, e a tela não saía do lugar.
  it('REGRESSÃO: "não lembrei" no ÚLTIMO card encerra a sessão, não repete o card', () => {
    const depois = applyAnswerToSession({ queue: ['ultimo'] }, 'ultimo');
    expect(depois.queue).toEqual([]);
    expect(pickNextCard(depois)).toEqual({ kind: 'done' });
  });

  it('REGRESSÃO: "não lembrei" no meio da fila avança para o próximo card', () => {
    const depois = applyAnswerToSession({ queue: ['a', 'b', 'c'] }, 'a');
    expect(pickNextCard(depois)).toEqual({ kind: 'card', cardId: 'b' });
  });
});

describe('migração de formato', () => {
  it('formato 2 (com fase e intervalo em dias) é convertido, preservando o histórico', () => {
    const v2 = {
      schemaVersion: 2, cardId: 'c1', answerLabel: 'Fêmur', phase: 'review', stepIndex: 0,
      ease: 2.3, intervalDays: 8, lapses: 2, againCount: 3, reviews: 7,
      dueAt: NOW + 8 * DAY, lastRating: 'easy', lastReviewedAt: NOW,
    };
    const migrado = normalizeCardState(v2, 'c1');
    expect(migrado.schemaVersion).toBe(SRS_SCHEMA_VERSION);
    expect(migrado.reviews).toBe(7);
    expect(migrado.againCount).toBe(3);
    expect(migrado.lastRating).toBe('easy');
    expect(isMemorized(migrado)).toBe(true); // a pilha é preservada
    expect(migrado).not.toHaveProperty('intervalDays');
  });

  it('formato 2 com última resposta "good" continua na pilha de não memorizados', () => {
    const v2 = { schemaVersion: 2, cardId: 'c1', reviews: 4, againCount: 1, lastRating: 'good' };
    expect(isUnmemorized(normalizeCardState(v2, 'c1'))).toBe(true);
  });

  it('formato 1 (sem schemaVersion) não tem como ser mapeado — vira card inédito', () => {
    const v1 = { cardId: 'c1', ease: 2.3, repetitions: 2, reviews: 3 };
    expect(normalizeCardState(v1, 'c1').reviews).toBe(0);
  });

  it('normalizeProgress descarta o que virou inédito e mantém o resto', () => {
    const progresso = {
      antiga: { cardId: 'antiga', ease: 2.3, repetitions: 4 }, // formato 1
      migravel: { schemaVersion: 2, cardId: 'migravel', reviews: 2, againCount: 1, lastRating: 'easy' },
      atual: answered('atual', 'good'),
    };
    expect(Object.keys(normalizeProgress(progresso)).sort()).toEqual(['atual', 'migravel']);
  });

  it('progresso indefinido vira mapa vazio', () => {
    expect(normalizeProgress(undefined)).toEqual({});
  });

  it('getOrCreateCardState devolve o estado existente ou cria um novo', () => {
    const existente = answered('c1', 'good');
    expect(getOrCreateCardState({ c1: existente }, 'c1')).toBe(existente);
    expect(getOrCreateCardState({}, 'novo').reviews).toBe(0);
  });
});

describe('contadores', () => {
  it('getSessionCounts é o placar ao vivo da sessão', () => {
    expect(getSessionCounts({ queue: ['d', 'e'] }, { a: true, b: false, c: false }))
      .toEqual({ remaining: 2, memorized: 1, unmemorized: 2 });
  });

  it('sessão recém-iniciada tem placar zerado', () => {
    expect(getSessionCounts({ queue: ['a'] }, {})).toEqual({ remaining: 1, memorized: 0, unmemorized: 0 });
  });

  it('getDeckCounts classifica o baralho sem nenhuma noção de "hoje"', () => {
    const states = { a: answered('a', 'good'), b: answered('b', 'easy') };
    expect(getDeckCounts(['a', 'b', 'inedito'], states))
      .toEqual({ newCount: 1, unmemorizedCount: 1, memorizedCount: 1 });
  });

  it('getDeckMastery consolida todos os baralhos do aluno', () => {
    const states = { a: answered('a', 'again'), b: answered('b', 'easy'), c: createInitialCardState('c') };
    expect(getDeckMastery(states)).toEqual({ studied: 2, memorized: 1, unmemorized: 1 });
  });
});

describe('getWeakestCards', () => {
  it('rankeia por número de "não lembrei"', () => {
    const states: Record<string, SrsCardState> = {
      a: { ...answered('a', 'good'), againCount: 1 },
      b: { ...answered('b', 'good'), againCount: 4 },
      c: { ...answered('c', 'good'), againCount: 2 },
    };
    expect(getWeakestCards(states, 2).map(w => w.cardId)).toEqual(['b', 'c']);
  });

  it('empate desempata por "lembrei com esforço"', () => {
    const states: Record<string, SrsCardState> = {
      a: { ...answered('a', 'good'), againCount: 2, effortCount: 1 },
      b: { ...answered('b', 'good'), againCount: 2, effortCount: 5 },
    };
    expect(getWeakestCards(states, 2)[0].cardId).toBe('b');
  });

  it('ignora card que o aluno nunca errou, mesmo que ainda não esteja memorizado', () => {
    const states = { perfeito: answered('perfeito', 'easy'), errado: { ...answered('errado', 'good'), againCount: 1 } };
    expect(getWeakestCards(states, 10).map(w => w.cardId)).toEqual(['errado']);
  });
});

describe('retomar sessão interrompida (item 6.6)', () => {
  const sessaoBase = {
    startedAt: NOW - 10 * 60 * 1000,
    updatedAt: NOW - 5 * 60 * 1000,
    options: { order: 'sequential' as const },
    queue: ['b', 'c'],
    answers: { a: false, d: true },
  };

  it('sessão recente com cards restantes é retomável', () => {
    expect(isResumableSession(sessaoBase, NOW)).toBe(true);
  });

  it('sessão sem nada restante NÃO é retomável', () => {
    expect(isResumableSession({ ...sessaoBase, queue: [] }, NOW)).toBe(false);
  });

  it('sessão velha demais NÃO é retomável', () => {
    expect(isResumableSession({ ...sessaoBase, updatedAt: NOW - RESUMABLE_SESSION_MAX_AGE_MS - 1000 }, NOW)).toBe(false);
  });

  it('ausência de sessão não quebra', () => {
    expect(isResumableSession(undefined, NOW)).toBe(false);
    expect(isResumableSession(null, NOW)).toBe(false);
  });

  it('restoreSession devolve a fila como estava', () => {
    expect(restoreSession(sessaoBase, new Set(['b', 'c']))).toEqual({ queue: ['b', 'c'] });
  });

  it('restoreSession descarta card apagado do baralho depois que o aluno parou', () => {
    expect(restoreSession(sessaoBase, new Set(['b']))).toEqual({ queue: ['b'] });
  });

  it('sessão no formato antigo (mainQueue/learningQueue) ainda é retomável', () => {
    const antiga = {
      startedAt: NOW - 10 * 60 * 1000,
      updatedAt: NOW - 60 * 1000,
      options: { order: 'sequential' as const },
      mainQueue: ['b', 'c'],
      learningQueue: ['a'],
      answers: {},
    };
    expect(isResumableSession(antiga, NOW)).toBe(true);
    expect(restoreSession(antiga, new Set(['a', 'b', 'c']))).toEqual({ queue: ['b', 'c', 'a'] });
  });
});

describe('helpers de fila', () => {
  it('shuffle preserva todos os itens e não muta a entrada', () => {
    const items = ['a', 'b', 'c', 'd'];
    expect([...shuffle(items, () => 0.5)].sort()).toEqual([...items].sort());
    expect(items).toEqual(['a', 'b', 'c', 'd']);
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
