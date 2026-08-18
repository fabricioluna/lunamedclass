import { describe, it, expect } from 'vitest';
import {
  createInitialCardState,
  getOrCreateCardState,
  reviewCard,
  formatDueLabel,
  buildSessionQueue,
  getSessionCounts,
  reinsertForRetry,
  getWeakestCards,
  type SrsCardState,
} from './srs';

const NOW = new Date('2026-08-18T12:00:00Z').getTime();
const DAY = 24 * 60 * 60 * 1000;

describe('createInitialCardState / getOrCreateCardState', () => {
  it('cria estado inicial com ease padrão e devido imediatamente', () => {
    const state = createInitialCardState('c1', NOW, 'Fêmur');
    expect(state.ease).toBe(2.5);
    expect(state.reviews).toBe(0);
    expect(state.lapses).toBe(0);
    expect(state.dueAt).toBe(NOW);
    expect(state.answerLabel).toBe('Fêmur');
  });

  it('getOrCreateCardState reaproveita estado existente sem recriar', () => {
    const existing = createInitialCardState('c1', NOW - DAY);
    const reviewed = reviewCard(existing, 'medium', NOW - DAY);
    const states = { c1: reviewed };
    expect(getOrCreateCardState(states, 'c1', NOW)).toBe(reviewed);
  });

  it('getOrCreateCardState cria novo estado para card nunca visto', () => {
    const state = getOrCreateCardState({}, 'novo', NOW);
    expect(state.reviews).toBe(0);
  });
});

describe('reviewCard — "Difícil"', () => {
  it('zera o intervalo e marca devido agora (reaparece na mesma sessão)', () => {
    const state = createInitialCardState('c1', NOW);
    const reviewed = reviewCard(state, 'hard', NOW);
    expect(reviewed.intervalDays).toBe(0);
    expect(reviewed.dueAt).toBe(NOW);
    expect(reviewed.repetitions).toBe(0);
  });

  it('incrementa lapses e reduz o ease', () => {
    const state = createInitialCardState('c1', NOW);
    const reviewed = reviewCard(state, 'hard', NOW);
    expect(reviewed.lapses).toBe(1);
    expect(reviewed.ease).toBeCloseTo(2.3, 5);
  });

  it('ease nunca cai abaixo do piso de 1.3, mesmo com muitos "Difícil" seguidos', () => {
    let state = createInitialCardState('c1', NOW);
    for (let i = 0; i < 20; i++) {
      state = reviewCard(state, 'hard', NOW);
    }
    expect(state.ease).toBe(1.3);
    expect(state.lapses).toBe(20);
  });
});

describe('reviewCard — "Médio"', () => {
  it('primeira revisão agenda para o dia seguinte', () => {
    const state = createInitialCardState('c1', NOW);
    const reviewed = reviewCard(state, 'medium', NOW);
    expect(reviewed.intervalDays).toBe(1);
    expect(reviewed.dueAt).toBe(NOW + DAY);
    expect(reviewed.repetitions).toBe(1);
  });

  it('revisões seguintes multiplicam o intervalo pelo ease', () => {
    let state = createInitialCardState('c1', NOW);
    state = reviewCard(state, 'medium', NOW); // interval 1
    const before = { ...state };
    state = reviewCard(state, 'medium', NOW + DAY);
    expect(state.intervalDays).toBe(Math.round(before.intervalDays * before.ease));
  });
});

describe('reviewCard — "Fácil"', () => {
  it('primeira revisão salta mais longe que "Médio" (4 dias vs 1)', () => {
    const state = createInitialCardState('c1', NOW);
    const reviewed = reviewCard(state, 'easy', NOW);
    expect(reviewed.intervalDays).toBe(4);
  });

  it('aumenta o ease a cada acerto fácil', () => {
    const state = createInitialCardState('c1', NOW);
    const reviewed = reviewCard(state, 'easy', NOW);
    expect(reviewed.ease).toBeCloseTo(2.65, 5);
  });

  it('3 "Fácil" seguidos levam o intervalo à casa de semanas', () => {
    let state = createInitialCardState('c1', NOW);
    let now = NOW;
    for (let i = 0; i < 3; i++) {
      state = reviewCard(state, 'easy', now);
      now = state.dueAt;
    }
    expect(state.intervalDays).toBeGreaterThanOrEqual(14);
  });

  it('um "Difícil" depois de vários "Fácil" derruba o intervalo de volta a zero', () => {
    let state = createInitialCardState('c1', NOW);
    let now = NOW;
    for (let i = 0; i < 3; i++) {
      state = reviewCard(state, 'easy', now);
      now = state.dueAt;
    }
    expect(state.intervalDays).toBeGreaterThan(0);
    state = reviewCard(state, 'hard', now);
    expect(state.intervalDays).toBe(0);
    expect(state.repetitions).toBe(0);
  });
});

describe('formatDueLabel', () => {
  it('intervalo 0 vira "agora"', () => {
    expect(formatDueLabel(0)).toBe('agora');
  });
  it('1 dia é singular', () => {
    expect(formatDueLabel(1)).toBe('1 d');
  });
  it('N dias', () => {
    expect(formatDueLabel(8)).toBe('8 d');
  });
});

describe('buildSessionQueue', () => {
  it('inéditos entram na fila (nunca revisados)', () => {
    const queue = buildSessionQueue(['a', 'b'], {}, NOW);
    expect(queue).toEqual(['a', 'b']);
  });

  it('vencidos vêm antes dos inéditos', () => {
    const overdue = reviewCard(createInitialCardState('overdue', NOW - 2 * DAY), 'medium', NOW - 2 * DAY);
    const states: Record<string, SrsCardState> = { overdue };
    const queue = buildSessionQueue(['inedito', 'overdue'], states, NOW);
    expect(queue).toEqual(['overdue', 'inedito']);
  });

  it('entre vencidos, o mais atrasado (dueAt menor) vem primeiro', () => {
    const veryOverdue = reviewCard(createInitialCardState('very', NOW - 5 * DAY), 'medium', NOW - 5 * DAY);
    const slightlyOverdue = reviewCard(createInitialCardState('slight', NOW - DAY), 'medium', NOW - DAY);
    const states: Record<string, SrsCardState> = { very: veryOverdue, slight: slightlyOverdue };
    const queue = buildSessionQueue(['slight', 'very'], states, NOW);
    expect(queue).toEqual(['very', 'slight']);
  });

  it('card já revisado mas ainda não vencido fica de fora da sessão', () => {
    const notDueYet = reviewCard(createInitialCardState('c1', NOW), 'easy', NOW); // due em +4 dias
    const states: Record<string, SrsCardState> = { c1: notDueYet };
    const queue = buildSessionQueue(['c1'], states, NOW + DAY);
    expect(queue).toEqual([]);
  });
});

describe('getSessionCounts', () => {
  it('conta inéditos e vencidos separadamente', () => {
    const overdue = reviewCard(createInitialCardState('overdue', NOW - 2 * DAY), 'medium', NOW - 2 * DAY);
    const notDueYet = reviewCard(createInitialCardState('future', NOW), 'easy', NOW);
    const states: Record<string, SrsCardState> = { overdue, future: notDueYet };
    const counts = getSessionCounts(['overdue', 'future', 'inedito'], states, NOW);
    expect(counts).toEqual({ dueCount: 1, newCount: 1 });
  });

  it('baralho totalmente em dia (nada vencido, nada inédito) conta zero', () => {
    const notDueYet = reviewCard(createInitialCardState('c1', NOW), 'easy', NOW);
    const counts = getSessionCounts(['c1'], { c1: notDueYet }, NOW);
    expect(counts).toEqual({ dueCount: 0, newCount: 0 });
  });
});

describe('reinsertForRetry', () => {
  it('move o card ~4 posições à frente da posição atual', () => {
    const queue = ['a', 'b', 'c', 'd', 'e', 'f', 'g'];
    const result = reinsertForRetry(queue, 0);
    expect(result.indexOf('a')).toBe(4);
    expect(result).toHaveLength(queue.length);
  });

  it('não perde nem duplica cards quando o deslocamento estoura o fim da fila', () => {
    const queue = ['a', 'b', 'c'];
    const result = reinsertForRetry(queue, 1); // 'b' com offset 4 numa fila de 3
    expect([...result].sort()).toEqual(['a', 'b', 'c']); // sort() muta — nunca ordenar o próprio result
    expect(result[result.length - 1]).toBe('b');
  });

  it('índice inválido retorna a fila intacta', () => {
    const queue = ['a', 'b'];
    expect(reinsertForRetry(queue, 99)).toEqual(queue);
  });
});

describe('getWeakestCards', () => {
  it('rankeia por número de lapses, do maior para o menor', () => {
    const states: Record<string, SrsCardState> = {
      a: { ...createInitialCardState('a', NOW), reviews: 3, lapses: 1 },
      b: { ...createInitialCardState('b', NOW), reviews: 5, lapses: 4 },
      c: { ...createInitialCardState('c', NOW), reviews: 2, lapses: 2 },
    };
    const weakest = getWeakestCards(states, 2);
    expect(weakest.map((w) => w.cardId)).toEqual(['b', 'c']);
  });

  it('empate em lapses desempata pelo ease mais baixo', () => {
    const states: Record<string, SrsCardState> = {
      a: { ...createInitialCardState('a', NOW), reviews: 3, lapses: 2, ease: 2.1 },
      b: { ...createInitialCardState('b', NOW), reviews: 3, lapses: 2, ease: 1.5 },
    };
    const weakest = getWeakestCards(states, 2);
    expect(weakest[0].cardId).toBe('b');
  });

  it('ignora cards nunca revisados', () => {
    const states: Record<string, SrsCardState> = {
      a: createInitialCardState('a', NOW), // reviews: 0
      b: { ...createInitialCardState('b', NOW), reviews: 1, lapses: 1 },
    };
    const weakest = getWeakestCards(states, 10);
    expect(weakest.map((w) => w.cardId)).toEqual(['b']);
  });
});
