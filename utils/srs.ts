// Motor de repetição espaçada do Laboratório Virtual — Etapa 6, item 6.5 (reescrita do 6.3).
//
// O 6.3 só tinha os intervalos em DIAS. Faltava a metade em MINUTOS — os "degraus de
// aprendizado" — que é justamente a que o aluno sente: sem eles, marcar "não lembrei" não
// trazia a lâmina de volta de um jeito perceptível. Aqui o modelo é o do Anki de verdade:
// cada card anda por 4 fases, e só depois de vencer os degraus curtos é que passa a ser
// agendado em dias.
//
//   nova  ──"lembrei"──►  aprendendo (1min → 10min)  ──graduou──►  revisão (1d → 3d → 8d...)
//                              ▲                                        │
//                              └──────── reaprendendo (10min) ◄──"não lembrei"
//
// Puro e sem Firebase de propósito: quem persiste é services/flashcardsService.ts.
//
// São 3 botões, não os 4 do Anki: `again`/`good`/`easy` (o "Hard" do Anki fica deliberadamente
// de fora — com 3 níveis, "não lembrei" já cobre o caso do erro).

export type SrsRating = 'again' | 'good' | 'easy';

// Fases do Anki. `new` nunca foi vista; `learning` está subindo os degraus curtos; `review` já
// graduou e é agendada em dias; `relearning` é uma card de revisão que caiu e voltou pros
// degraus curtos.
export type SrsPhase = 'new' | 'learning' | 'review' | 'relearning';

// Versão do formato do estado persistido. O formato 1 (item 6.3) não tinha fase nem degraus e
// usava outros nomes de rating — é descartado na leitura em vez de convertido (decisão do
// usuário em 2026-08-18: era só o progresso do teste dele, não vale carregar código de
// compatibilidade pra sempre). Ver normalizeCardState.
export const SRS_SCHEMA_VERSION = 2;

export interface SrsCardState {
  schemaVersion: number;
  cardId: string;
  answerLabel?: string; // Denormalizado: o dashboard cita a lâmina sem baixar a simulação inteira.
  phase: SrsPhase;
  stepIndex: number; // Posição nos degraus de aprendizado/reaprendizado.
  ease: number;
  intervalDays: number;
  lapses: number; // Só conta queda de card JÁ graduada — é a métrica de "lapso" do Anki.
  againCount: number; // Conta todo "não lembrei", inclusive em card nova. É o que ranqueia os pontos fracos.
  reviews: number;
  dueAt: number; // epoch ms — minutos nas fases curtas, dias na revisão.
  lastRating?: SrsRating;
  lastReviewedAt?: number;
}

// === PARÂMETROS (os padrões do próprio Anki) ===
export const LEARNING_STEPS_MIN = [1, 10];
export const RELEARNING_STEPS_MIN = [10];
export const GRADUATING_INTERVAL_DAYS = 1;
export const EASY_INTERVAL_DAYS = 4;
export const DEFAULT_EASE = 2.5;
export const MIN_EASE = 1.3; // Piso do Anki: abaixo disso o card nunca sai de "sempre difícil".
export const EASE_PENALTY_AGAIN = 0.2;
export const EASE_BONUS_EASY = 0.15;
export const EASY_BONUS = 1.3;
export const MINIMUM_INTERVAL_DAYS = 1;
// Se só sobram cards de aprendizado e nenhuma venceu ainda, o Anki adianta as que vencem
// dentro desta janela em vez de encerrar a sessão. Sem isso, o aluno que erra a última lâmina
// ficaria olhando pra uma tela de "acabou" com card pendente.
export const LEARN_AHEAD_LIMIT_MIN = 20;

const ONE_MINUTE_MS = 60 * 1000;
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

const clampEase = (ease: number) => Math.max(MIN_EASE, ease);
const daysToMs = (days: number) => days * ONE_DAY_MS;
const minutesToMs = (minutes: number) => minutes * ONE_MINUTE_MS;

export function createInitialCardState(cardId: string, now: number, answerLabel?: string): SrsCardState {
  return {
    schemaVersion: SRS_SCHEMA_VERSION,
    cardId,
    answerLabel,
    phase: 'new',
    stepIndex: 0,
    ease: DEFAULT_EASE,
    intervalDays: 0,
    lapses: 0,
    againCount: 0,
    reviews: 0,
    dueAt: now,
  };
}

// Estado gravado no formato antigo (item 6.3) é DESCARTADO, virando card nova. Não é conversão:
// o formato 1 não guardava fase nem degrau, então qualquer mapeamento seria chute.
export function normalizeCardState(raw: unknown, cardId: string, now: number, answerLabel?: string): SrsCardState {
  if (!raw || typeof raw !== 'object') return createInitialCardState(cardId, now, answerLabel);
  const candidate = raw as Partial<SrsCardState>;
  if (candidate.schemaVersion !== SRS_SCHEMA_VERSION) {
    return createInitialCardState(cardId, now, answerLabel);
  }
  return { ...(candidate as SrsCardState), answerLabel: candidate.answerLabel ?? answerLabel };
}

export function normalizeProgress(
  raw: Record<string, unknown> | undefined,
): Record<string, SrsCardState> {
  if (!raw) return {};
  const result: Record<string, SrsCardState> = {};
  for (const [cardId, state] of Object.entries(raw)) {
    const candidate = state as Partial<SrsCardState> | null;
    // Descarta o formato antigo em silêncio: vira card nova na próxima sessão.
    if (candidate && typeof candidate === 'object' && candidate.schemaVersion === SRS_SCHEMA_VERSION) {
      result[cardId] = candidate as SrsCardState;
    }
  }
  return result;
}

export function getOrCreateCardState(
  states: Record<string, SrsCardState>,
  cardId: string,
  now: number,
  answerLabel?: string,
): SrsCardState {
  return states[cardId] ?? createInitialCardState(cardId, now, answerLabel);
}

const stepsFor = (phase: SrsPhase) => (phase === 'relearning' ? RELEARNING_STEPS_MIN : LEARNING_STEPS_MIN);

// Aplica a resposta do aluno e devolve o novo estado. Espelha a tabela do Anki; o único desvio
// consciente é não ter o botão "Hard".
export function answerCard(state: SrsCardState, rating: SrsRating, now: number): SrsCardState {
  const base: SrsCardState = {
    ...state,
    reviews: state.reviews + 1,
    lastRating: rating,
    lastReviewedAt: now,
    againCount: state.againCount + (rating === 'again' ? 1 : 0),
  };

  // --- Card já graduada (revisão) ---
  if (state.phase === 'review') {
    if (rating === 'again') {
      return {
        ...base,
        phase: 'relearning',
        stepIndex: 0,
        ease: clampEase(state.ease - EASE_PENALTY_AGAIN),
        lapses: state.lapses + 1,
        // O Anki usa "new interval 0%" por padrão: a card volta pro piso quando regraduar.
        intervalDays: MINIMUM_INTERVAL_DAYS,
        dueAt: now + minutesToMs(RELEARNING_STEPS_MIN[0]),
      };
    }

    if (rating === 'good') {
      const intervalDays = Math.max(MINIMUM_INTERVAL_DAYS, Math.round(state.intervalDays * state.ease));
      return { ...base, intervalDays, dueAt: now + daysToMs(intervalDays) };
    }

    const ease = state.ease + EASE_BONUS_EASY;
    const intervalDays = Math.max(MINIMUM_INTERVAL_DAYS, Math.round(state.intervalDays * ease * EASY_BONUS));
    return { ...base, ease, intervalDays, dueAt: now + daysToMs(intervalDays) };
  }

  // --- Card nova, em aprendizado ou em reaprendizado (degraus curtos) ---
  const isRelearning = state.phase === 'relearning';
  const steps = stepsFor(state.phase);

  if (rating === 'again') {
    return {
      ...base,
      phase: isRelearning ? 'relearning' : 'learning',
      stepIndex: 0,
      dueAt: now + minutesToMs(steps[0]),
    };
  }

  if (rating === 'easy') {
    // "Lembrei fácil" pula os degraus restantes e gradua na hora.
    const intervalDays = isRelearning
      ? Math.max(MINIMUM_INTERVAL_DAYS, Math.round(state.intervalDays * EASY_BONUS))
      : EASY_INTERVAL_DAYS;
    return {
      ...base,
      phase: 'review',
      stepIndex: 0,
      intervalDays,
      dueAt: now + daysToMs(intervalDays),
    };
  }

  // rating === 'good': avança um degrau; se era o último, gradua.
  const nextStep = state.stepIndex + 1;
  if (nextStep < steps.length) {
    return {
      ...base,
      phase: isRelearning ? 'relearning' : 'learning',
      stepIndex: nextStep,
      dueAt: now + minutesToMs(steps[nextStep]),
    };
  }

  const intervalDays = isRelearning
    ? Math.max(MINIMUM_INTERVAL_DAYS, state.intervalDays)
    : GRADUATING_INTERVAL_DAYS;
  return {
    ...base,
    phase: 'review',
    stepIndex: 0,
    intervalDays,
    dueAt: now + daysToMs(intervalDays),
  };
}

// === SESSÃO ===

export interface SrsSession {
  // Novas + revisões devidas, já na ordem escolhida pelo aluno. Consumida da frente pro fim.
  mainQueue: string[];
  // Cards nos degraus curtos, esperando a hora de voltar. Ordenada por dueAt.
  learningQueue: string[];
}

// 'all' = sessão normal de repetição espaçada. 'difficult' = treino focado só nas lâminas que
// o aluno já errou, ignorando a data de revisão — é o "Custom Study"/baralho filtrado do Anki,
// para quem quer martelar o ponto fraco antes da prova (item 6.7).
export type SessionFocus = 'all' | 'difficult';

// Uma lâmina é "difícil" quando o aluno já marcou "Não lembrei" nela. Deliberadamente NÃO
// inclui "Lembrei com esforço": esse botão é o caminho normal de quem acertou (o "Good" do
// Anki), então usá-lo como sinal de dificuldade jogaria o baralho inteiro no filtro.
export const DEFAULT_MIN_AGAIN_COUNT = 1;

export interface SessionOptions {
  order?: 'sequential' | 'random';
  rangeStart?: number; // 1-based, inclusive
  rangeEnd?: number; // 1-based, inclusive
  newLimit?: number; // undefined = sem limite (padrão escolhido pelo usuário)
  focus?: SessionFocus;
  minAgainCount?: number; // só com focus 'difficult'; default DEFAULT_MIN_AGAIN_COUNT
  random?: () => number; // injetável para teste determinístico
}

export function isDifficultCard(state: SrsCardState | undefined, minAgainCount = DEFAULT_MIN_AGAIN_COUNT): boolean {
  return !!state && state.reviews > 0 && state.againCount >= minAgainCount;
}

// Quantas lâminas do baralho o aluno já errou — o "você tem N lâminas que não memorizou" que
// aparece na tela de configuração.
export function countDifficultCards(
  cardIds: string[],
  states: Record<string, SrsCardState>,
  minAgainCount = DEFAULT_MIN_AGAIN_COUNT,
): number {
  return cardIds.filter((id) => isDifficultCard(states[id], minAgainCount)).length;
}

// Configuração da sessão sem a função `random` — é o que dá pra gravar no Firestore.
export type PersistedSessionOptions = Omit<SessionOptions, 'random'>;

// Sessão interrompida, guardada junto do progresso do aluno para ele retomar depois (item 6.6).
// O progresso de cada lâmina já era salvo a cada clique; o que faltava era a SESSÃO em si — a
// configuração, a posição na fila e o placar parcial, que sumiam se o aluno fechasse a aba.
export interface PersistedSession {
  startedAt: number;
  updatedAt: number;
  options: PersistedSessionOptions;
  mainQueue: string[];
  learningQueue: string[];
  // cardId → acertou de primeira nesta sessão. Vira o `details[]` do resultado ao encerrar.
  answers: Record<string, boolean>;
}

// Depois disso, retomar deixa de fazer sentido: as lâminas mudaram de estado, outras venceram,
// e a fila guardada não representa mais o que o aluno tem pra estudar. A sessão velha é
// contabilizada e uma nova é montada do zero.
export const RESUMABLE_SESSION_MAX_AGE_MS = 24 * 60 * 60 * 1000;

export function isResumableSession(
  session: PersistedSession | undefined | null,
  now: number,
  maxAgeMs: number = RESUMABLE_SESSION_MAX_AGE_MS,
): boolean {
  if (!session) return false;
  if (now - session.updatedAt > maxAgeMs) return false;
  return session.mainQueue.length + session.learningQueue.length > 0;
}

// Ao retomar, descarta id que não existe mais no baralho (lâmina apagada pela monitoria depois
// que o aluno parou) — sem isso a sessão retomada travaria num card sem imagem.
export function restoreSession(session: PersistedSession, validCardIds: Set<string>): SrsSession {
  return {
    mainQueue: session.mainQueue.filter((id) => validCardIds.has(id)),
    learningQueue: session.learningQueue.filter((id) => validCardIds.has(id)),
  };
}

export function shuffle<T>(items: T[], random: () => number = Math.random): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function applyRange<T>(items: T[], rangeStart?: number, rangeEnd?: number): T[] {
  if (rangeStart === undefined && rangeEnd === undefined) return items;
  const start = Math.max(1, rangeStart ?? 1);
  const end = Math.min(items.length, rangeEnd ?? items.length);
  if (end < start) return [];
  return items.slice(start - 1, end);
}

export function buildSession(
  cardIds: string[],
  states: Record<string, SrsCardState>,
  now: number,
  options: SessionOptions = {},
): SrsSession {
  const {
    order = 'sequential', rangeStart, rangeEnd, newLimit,
    focus = 'all', minAgainCount = DEFAULT_MIN_AGAIN_COUNT, random = Math.random,
  } = options;
  const pool = applyRange(cardIds, rangeStart, rangeEnd);

  // Treino focado: ignora data de vencimento de propósito. O aluno pediu pra praticar AGORA o
  // que ele erra, mesmo que a repetição espaçada só fosse cobrar aquilo semana que vem.
  if (focus === 'difficult') {
    const difficult = pool.filter((id) => isDifficultCard(states[id], minAgainCount));
    return {
      mainQueue: order === 'random' ? shuffle(difficult, random) : difficult,
      learningQueue: [],
    };
  }

  const newCards: string[] = [];
  const dueReviews: string[] = [];
  const learning: string[] = [];

  for (const id of pool) {
    const state = states[id];
    if (!state || state.phase === 'new') {
      newCards.push(id);
    } else if (state.phase === 'learning' || state.phase === 'relearning') {
      // Ficou pela metade numa sessão anterior — volta pros degraus, na hora marcada.
      learning.push(id);
    } else if (state.dueAt <= now) {
      dueReviews.push(id);
    }
    // Card de revisão ainda não vencida fica de fora: é o ponto da repetição espaçada.
  }

  const orderedNew = order === 'random' ? shuffle(newCards, random) : newCards;
  const limitedNew = newLimit === undefined ? orderedNew : orderedNew.slice(0, Math.max(0, newLimit));
  const orderedReviews = order === 'random' ? shuffle(dueReviews, random) : dueReviews;

  // Revisões antes das novas: card já vista e vencida é prioridade sobre conteúdo inédito
  // (mesma lógica do Anki, que trata a revisão como dívida acumulada).
  const mainQueue = [...orderedReviews, ...limitedNew];

  return {
    mainQueue,
    learningQueue: sortLearningQueue(learning, states),
  };
}

const sortLearningQueue = (queue: string[], states: Record<string, SrsCardState>): string[] =>
  [...queue].sort((a, b) => (states[a]?.dueAt ?? 0) - (states[b]?.dueAt ?? 0));

export type NextCardResult =
  | { kind: 'card'; cardId: string }
  // Só restam cards de aprendizado, e a próxima só vence depois da janela de learn ahead.
  | { kind: 'waiting'; cardId: string; dueAt: number }
  | { kind: 'done' };

// Escolhe o próximo card da sessão, na mesma ordem de prioridade do Anki.
export function pickNextCard(
  session: SrsSession,
  states: Record<string, SrsCardState>,
  now: number,
): NextCardResult {
  const nextLearning = session.learningQueue[0];
  const nextLearningDue = nextLearning ? (states[nextLearning]?.dueAt ?? 0) : undefined;

  // 1. Card de aprendizado que já venceu tem precedência sobre tudo.
  if (nextLearning && nextLearningDue !== undefined && nextLearningDue <= now) {
    return { kind: 'card', cardId: nextLearning };
  }

  // 2. Fila principal (revisões vencidas + novas).
  if (session.mainQueue.length > 0) {
    return { kind: 'card', cardId: session.mainQueue[0] };
  }

  // 3. Learn ahead: nada mais a fazer, então adianta a card de aprendizado que está por vencer.
  if (nextLearning && nextLearningDue !== undefined) {
    if (nextLearningDue - now <= minutesToMs(LEARN_AHEAD_LIMIT_MIN)) {
      return { kind: 'card', cardId: nextLearning };
    }
    return { kind: 'waiting', cardId: nextLearning, dueAt: nextLearningDue };
  }

  return { kind: 'done' };
}

// Recoloca o card na sessão conforme a fase em que ficou depois da resposta.
export function applyAnswerToSession(
  session: SrsSession,
  cardId: string,
  newState: SrsCardState,
  states: Record<string, SrsCardState>,
): SrsSession {
  const mainQueue = session.mainQueue.filter((id) => id !== cardId);
  const learningQueue = session.learningQueue.filter((id) => id !== cardId);

  const stillLearning = newState.phase === 'learning' || newState.phase === 'relearning';
  if (!stillLearning) {
    // Graduou: sai da sessão e volta só daqui a dias.
    return { mainQueue, learningQueue };
  }

  return {
    mainQueue,
    learningQueue: sortLearningQueue([...learningQueue, cardId], { ...states, [cardId]: newState }),
  };
}

export interface SessionCounts {
  newCount: number;
  learningCount: number;
  reviewCount: number;
}

// Os 3 contadores que o Anki mostra o tempo todo (novas / aprendendo / revisão) — é a resposta
// visual pra "não entendi como fica a repetição".
export function getSessionCounts(
  session: SrsSession,
  states: Record<string, SrsCardState>,
): SessionCounts {
  let newCount = 0;
  let reviewCount = 0;
  for (const id of session.mainQueue) {
    const state = states[id];
    if (!state || state.phase === 'new') newCount++;
    else reviewCount++;
  }
  return { newCount, learningCount: session.learningQueue.length, reviewCount };
}

// Contagem para a tela de configuração e para o badge da lista, ANTES de montar a sessão.
export function getDeckCounts(
  cardIds: string[],
  states: Record<string, SrsCardState>,
  now: number,
): SessionCounts {
  let newCount = 0;
  let learningCount = 0;
  let reviewCount = 0;
  for (const id of cardIds) {
    const state = states[id];
    if (!state || state.phase === 'new') newCount++;
    else if (state.phase === 'learning' || state.phase === 'relearning') learningCount++;
    else if (state.dueAt <= now) reviewCount++;
  }
  return { newCount, learningCount, reviewCount };
}

export interface DeckMastery {
  studied: number;
  mastered: number; // "mature" no Anki: intervalo >= 21 dias
  learning: number;
  dueToday: number;
}

const MATURE_INTERVAL_DAYS = 21;

export function getDeckMastery(
  states: Record<string, SrsCardState>,
  now: number,
): DeckMastery {
  let studied = 0;
  let mastered = 0;
  let learning = 0;
  let dueToday = 0;

  for (const state of Object.values(states)) {
    if (state.reviews === 0) continue;
    studied++;
    if (state.phase === 'review' && state.intervalDays >= MATURE_INTERVAL_DAYS) mastered++;
    if (state.phase === 'learning' || state.phase === 'relearning') learning++;
    if (state.dueAt <= now) dueToday++;
  }

  return { studied, mastered, learning, dueToday };
}

export interface WeakCardSummary {
  cardId: string;
  answerLabel?: string;
  ease: number;
  againCount: number;
  lapses: number;
  reviews: number;
}

// Ranking de pontos fracos: mais "não lembrei" primeiro; empate desempata pelo ease mais baixo
// (facilidade menor = card que vem penalizando ao longo do tempo, mesmo com poucos erros).
export function getWeakestCards(states: Record<string, SrsCardState>, limit: number): WeakCardSummary[] {
  return Object.values(states)
    .filter((s) => s.reviews > 0 && s.againCount > 0)
    .sort((a, b) => b.againCount - a.againCount || a.ease - b.ease)
    .slice(0, limit)
    .map(({ cardId, answerLabel, ease, againCount, lapses, reviews }) => ({
      cardId, answerLabel, ease, againCount, lapses, reviews,
    }));
}
