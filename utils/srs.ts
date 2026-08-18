// Motor de repetição espaçada (SM-2 simplificado, "estilo Anki") para o Laboratório Virtual —
// Etapa 6, item 6.3. Cada card guarda `ease` (fator de facilidade), `intervalDays` (dias até
// reaparecer) e `dueAt`. Puro e sem Firebase de propósito: quem persiste é
// services/flashcardsService.ts, um doc por simulação em users/{uid}/flashcardProgress/{simId}.
//
// Só 3 botões (o Anki tem 4 — "Again"/"Hard"/"Good"/"Easy"). "Difícil" aqui acumula o papel do
// "Again": volta na mesma sessão, não só amanhã, porque com 3 níveis não há um degrau
// intermediário de "quase errei" para absorver esse caso.

export type SrsRating = 'hard' | 'medium' | 'easy';

export interface SrsCardState {
  cardId: string;
  answerLabel?: string; // Denormalizado para listar "pontos fracos" sem baixar a simulação inteira.
  ease: number;
  intervalDays: number;
  repetitions: number; // Zera a cada "Difícil" — é o que faz o card recomeçar a progressão.
  lapses: number; // Só cresce — histórico de vezes que o aluno marcou "Difícil".
  reviews: number;
  dueAt: number; // epoch ms
  lastRating?: SrsRating;
  lastReviewedAt?: number;
}

const DEFAULT_EASE = 2.5;
const MIN_EASE = 1.3; // Piso do próprio Anki — abaixo disso o card nunca sai do modo "sempre difícil".
const EASE_PENALTY_HARD = 0.2;
const EASE_BONUS_EASY = 0.15;
const EASY_INTERVAL_MULTIPLIER = 1.3; // Bônus extra do Anki para respostas "Easy" além do fator de facilidade.
const FIRST_INTERVAL_MEDIUM_DAYS = 1;
const FIRST_INTERVAL_EASY_DAYS = 4;
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

export function createInitialCardState(cardId: string, now: number, answerLabel?: string): SrsCardState {
  return {
    cardId,
    answerLabel,
    ease: DEFAULT_EASE,
    intervalDays: 0,
    repetitions: 0,
    lapses: 0,
    reviews: 0,
    dueAt: now, // Nunca revisado = devido imediatamente, entra na fila como inédito (ver buildSessionQueue).
  };
}

export function getOrCreateCardState(
  states: Record<string, SrsCardState>,
  cardId: string,
  now: number,
  answerLabel?: string,
): SrsCardState {
  return states[cardId] ?? createInitialCardState(cardId, now, answerLabel);
}

export function reviewCard(state: SrsCardState, rating: SrsRating, now: number): SrsCardState {
  const reviews = state.reviews + 1;
  const base = { ...state, reviews, lastRating: rating, lastReviewedAt: now };

  if (rating === 'hard') {
    return {
      ...base,
      ease: Math.max(MIN_EASE, state.ease - EASE_PENALTY_HARD),
      intervalDays: 0,
      repetitions: 0,
      lapses: state.lapses + 1,
      dueAt: now, // Reaparece na mesma sessão — buildSessionQueue/reinsertForRetry cuidam do "quando".
    };
  }

  if (rating === 'medium') {
    const intervalDays = state.repetitions === 0
      ? FIRST_INTERVAL_MEDIUM_DAYS
      : Math.max(1, Math.round(state.intervalDays * state.ease));
    return {
      ...base,
      intervalDays,
      repetitions: state.repetitions + 1,
      dueAt: now + intervalDays * ONE_DAY_MS,
    };
  }

  // easy
  const intervalDays = state.repetitions === 0
    ? FIRST_INTERVAL_EASY_DAYS
    : Math.max(1, Math.round(state.intervalDays * state.ease * EASY_INTERVAL_MULTIPLIER));
  return {
    ...base,
    ease: state.ease + EASE_BONUS_EASY,
    intervalDays,
    repetitions: state.repetitions + 1,
    dueAt: now + intervalDays * ONE_DAY_MS,
  };
}

// Rótulo curto pro botão mostrar "quando volta" antes do aluno clicar (Difícil · agora / Médio
// · 3 d / Fácil · 8 d) — é esse feedback que faz a repetição espaçada fazer sentido pra quem usa.
export function formatDueLabel(intervalDays: number): string {
  if (intervalDays <= 0) return 'agora';
  if (intervalDays === 1) return '1 d';
  return `${intervalDays} d`;
}

export function previewInterval(state: SrsCardState, rating: SrsRating, now: number): number {
  return reviewCard(state, rating, now).intervalDays;
}

// Fila da sessão: vencidos primeiro (mais atrasado primeiro — quem devia ter sido revisado há
// mais tempo é o que mais precisa de atenção), depois os inéditos, na ordem original. Cards já
// vistos e ainda não vencidos ficam de fora — é o comportamento normal de revisão espaçada,
// não uma omissão.
export function buildSessionQueue(
  cardIds: string[],
  states: Record<string, SrsCardState>,
  now: number,
): string[] {
  const due: string[] = [];
  const unseen: string[] = [];

  for (const id of cardIds) {
    const state = states[id];
    if (!state || state.reviews === 0) {
      unseen.push(id);
    } else if (state.dueAt <= now) {
      due.push(id);
    }
  }

  due.sort((a, b) => states[a].dueAt - states[b].dueAt);
  return [...due, ...unseen];
}

export interface SessionCounts {
  dueCount: number;
  newCount: number;
}

// Mesmo critério do buildSessionQueue, mas só contando — usado na tela de setup para mostrar
// "X para revisar hoje · Y inéditas" antes do aluno decidir começar a sessão.
export function getSessionCounts(
  cardIds: string[],
  states: Record<string, SrsCardState>,
  now: number,
): SessionCounts {
  let dueCount = 0;
  let newCount = 0;
  for (const id of cardIds) {
    const state = states[id];
    if (!state || state.reviews === 0) newCount++;
    else if (state.dueAt <= now) dueCount++;
  }
  return { dueCount, newCount };
}

const RETRY_OFFSET = 4;

// Reinsere o card marcado "Difícil" ~4 posições à frente na fila da sessão em andamento — sem
// isso, `dueAt: now` só faria diferença numa sessão futura, e o aluno nunca sentiria o card
// "aparecer de novo" na prática.
export function reinsertForRetry(queue: string[], currentIndex: number, offset = RETRY_OFFSET): string[] {
  if (currentIndex < 0 || currentIndex >= queue.length) return queue;
  const cardId = queue[currentIndex];
  const withoutCurrent = [...queue.slice(0, currentIndex), ...queue.slice(currentIndex + 1)];
  const insertAt = Math.min(currentIndex + offset, withoutCurrent.length);
  return [...withoutCurrent.slice(0, insertAt), cardId, ...withoutCurrent.slice(insertAt)];
}

export interface WeakCardSummary {
  cardId: string;
  answerLabel?: string;
  ease: number;
  lapses: number;
  reviews: number;
}

// Ranking de "pontos fracos": mais vezes marcado Difícil primeiro; empate desempata pelo ease
// mais baixo (facilidade menor = mais penalizado ao longo do tempo, mesmo com poucos lapsos).
export function getWeakestCards(states: Record<string, SrsCardState>, limit: number): WeakCardSummary[] {
  return Object.values(states)
    .filter((s) => s.reviews > 0)
    .sort((a, b) => b.lapses - a.lapses || a.ease - b.ease)
    .slice(0, limit)
    .map(({ cardId, answerLabel, ease, lapses, reviews }) => ({ cardId, answerLabel, ease, lapses, reviews }));
}
