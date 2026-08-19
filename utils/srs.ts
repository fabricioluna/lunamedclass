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
// ⚠️ A dinâmica DENTRO da sessão foi revista no item 6.9 (ver seção SESSÃO, mais abaixo): a
// sessão virou uma passagem linear, sem reinserção no meio do caminho. O agendamento entre
// dias — tudo que está nesta primeira metade do arquivo — continua igual.
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
//
// ⚠️ Modelo revisto no item 6.9, depois do usuário testar em produção. O 6.5 reinseria o card
// errado no meio da própria sessão (learning steps + "learn ahead" do Anki). Na prática isso
// (a) travava o card na tela quando ele era o último da fila — pickNextCard devolvia o MESMO
// card recém-respondido — e (b) confundia, porque a sessão nunca "andava" de forma previsível.
//
// O modelo agora é o que o usuário descreveu: **a sessão é uma passagem linear até o fim**.
// Nada volta no meio do caminho. O que o aluno não memorizou fica registrado numa pilha, e ao
// terminar ele escolhe se quer rodar essa pilha de novo. O agendamento entre DIAS continua
// idêntico ao Anki (answerCard não mudou) — só a dinâmica dentro da sessão ficou linear.

export interface SrsSession {
  // Fila única, consumida da frente pro fim. Card respondido sai e não volta nesta sessão.
  queue: string[];
}

// "Memorizado" tem definição única e explícita, dada pelo usuário: o card só conta como
// memorizado quando ele clica em "Lembrei fácil". Qualquer outra resposta — inclusive
// "Lembrei com esforço" — devolve o card para a pilha de não memorizados.
export function isMemorized(state: SrsCardState | undefined): boolean {
  return state?.lastRating === 'easy';
}

// Card já estudado que ainda não foi memorizado. Card nunca visto não entra: não dá para
// "não memorizar" o que ainda não foi apresentado.
export function isUnmemorized(state: SrsCardState | undefined): boolean {
  return !!state && state.reviews > 0 && !isMemorized(state);
}

export function countUnmemorizedCards(
  cardIds: string[],
  states: Record<string, SrsCardState>,
): number {
  return cardIds.filter((id) => isUnmemorized(states[id])).length;
}

export function listUnmemorizedCards(
  cardIds: string[],
  states: Record<string, SrsCardState>,
): string[] {
  return cardIds.filter((id) => isUnmemorized(states[id]));
}

// 'all' = sessão normal (revisões vencidas + novas). 'unmemorized' = rodada focada só nos cards
// que o aluno ainda não memorizou, ignorando data de revisão.
export type SessionFocus = 'all' | 'unmemorized';

export interface SessionOptions {
  order?: 'sequential' | 'random';
  rangeStart?: number; // 1-based, inclusive
  rangeEnd?: number; // 1-based, inclusive
  newLimit?: number; // undefined = sem limite (padrão escolhido pelo usuário)
  focus?: SessionFocus;
  random?: () => number; // injetável para teste determinístico
}

// Configuração da sessão sem a função `random` — é o que dá pra gravar no Firestore.
export type PersistedSessionOptions = Omit<SessionOptions, 'random'>;

// Sessão interrompida, guardada junto do progresso do aluno para ele retomar depois (item 6.6).
export interface PersistedSession {
  startedAt: number;
  updatedAt: number;
  options: PersistedSessionOptions;
  // Opcional porque sessão gravada antes do 6.9 usava mainQueue/learningQueue. queueOf resolve.
  queue?: string[];
  // cardId → memorizou (clicou "Lembrei fácil") na PRIMEIRA resposta desta sessão.
  answers: Record<string, boolean>;
  // Formato do item 6.6, antes da fila virar única (6.9). Lido para não perder sessão em voo.
  mainQueue?: string[];
  learningQueue?: string[];
}

// Depois disso, retomar deixa de fazer sentido: os cards mudaram de estado, outros venceram, e
// a fila guardada não representa mais o que o aluno tem pra estudar.
export const RESUMABLE_SESSION_MAX_AGE_MS = 24 * 60 * 60 * 1000;

// Sessão gravada antes do 6.9 tinha duas filas; junta as duas para não perder o que faltava.
const queueOf = (session: PersistedSession): string[] =>
  session.queue ?? [...(session.mainQueue ?? []), ...(session.learningQueue ?? [])];

export function isResumableSession(
  session: PersistedSession | undefined | null,
  now: number,
  maxAgeMs: number = RESUMABLE_SESSION_MAX_AGE_MS,
): boolean {
  if (!session) return false;
  if (now - session.updatedAt > maxAgeMs) return false;
  return queueOf(session).length > 0;
}

// Ao retomar, descarta id que não existe mais no baralho (card apagado pela monitoria depois
// que o aluno parou) — sem isso a sessão retomada travaria num card sem imagem.
export function restoreSession(session: PersistedSession, validCardIds: Set<string>): SrsSession {
  return { queue: queueOf(session).filter((id) => validCardIds.has(id)) };
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
  const { order = 'sequential', rangeStart, rangeEnd, newLimit, focus = 'all', random = Math.random } = options;
  const pool = applyRange(cardIds, rangeStart, rangeEnd);
  const ordered = <T>(items: T[]) => (order === 'random' ? shuffle(items, random) : items);

  // Rodada focada: ignora data de vencimento de propósito. O aluno pediu pra praticar AGORA o
  // que ainda não memorizou, mesmo que a repetição espaçada só fosse cobrar aquilo depois.
  if (focus === 'unmemorized') {
    return { queue: ordered(listUnmemorizedCards(pool, states)) };
  }

  const newCards: string[] = [];
  const pending: string[] = [];

  for (const id of pool) {
    const state = states[id];
    if (!state || state.phase === 'new') {
      newCards.push(id);
    } else if (state.phase === 'learning' || state.phase === 'relearning') {
      // Ficou por memorizar numa sessão anterior — volta independente do relógio.
      pending.push(id);
    } else if (state.dueAt <= now) {
      pending.push(id);
    }
    // Card memorizado e ainda não vencido fica de fora: é o ponto da repetição espaçada.
  }

  const limitedNew = newLimit === undefined ? ordered(newCards) : ordered(newCards).slice(0, Math.max(0, newLimit));

  // Pendentes antes das novas: card já visto é dívida acumulada, conteúdo inédito pode esperar.
  return { queue: [...ordered(pending), ...limitedNew] };
}

export type NextCardResult =
  | { kind: 'card'; cardId: string }
  | { kind: 'done' };

// Passagem linear: o próximo é simplesmente o próximo. Sem reinserção, sem learn ahead — foi
// exatamente isso que fazia o card "não sair do lugar" ao marcar "Não lembrei" no fim da fila.
export function pickNextCard(session: SrsSession): NextCardResult {
  return session.queue.length > 0
    ? { kind: 'card', cardId: session.queue[0] }
    : { kind: 'done' };
}

// Card respondido sai da sessão, qualquer que tenha sido a resposta. Se não foi memorizado, ele
// reaparece na rodada focada (que o aluno escolhe no fim) ou numa sessão futura.
export function applyAnswerToSession(session: SrsSession, cardId: string): SrsSession {
  return { queue: session.queue.filter((id) => id !== cardId) };
}

export interface SessionCounts {
  remaining: number;
  memorized: number;
  unmemorized: number;
}

// Placar ao vivo da sessão — o usuário pediu que os não memorizados fossem contabilizados em
// tempo real, não só na tela final.
export function getSessionCounts(
  session: SrsSession,
  answers: Record<string, boolean>,
): SessionCounts {
  const values = Object.values(answers);
  return {
    remaining: session.queue.length,
    memorized: values.filter(Boolean).length,
    unmemorized: values.filter((v) => !v).length,
  };
}

export interface DeckCounts {
  newCount: number;
  unmemorizedCount: number;
  dueCount: number;
}

// Situação do baralho ANTES da sessão começar: quantos inéditos, quantos por memorizar e
// quantos memorizados já venceram e voltam hoje.
export function getDeckCounts(
  cardIds: string[],
  states: Record<string, SrsCardState>,
  now: number,
): DeckCounts {
  let newCount = 0;
  let unmemorizedCount = 0;
  let dueCount = 0;
  for (const id of cardIds) {
    const state = states[id];
    if (!state || state.reviews === 0) newCount++;
    else if (isUnmemorized(state)) unmemorizedCount++;
    else if (state.dueAt <= now) dueCount++;
  }
  return { newCount, unmemorizedCount, dueCount };
}

export interface DeckMastery {
  studied: number;
  mastered: number; // "mature" no Anki: intervalo >= 21 dias
  unmemorized: number;
  dueToday: number;
}

const MATURE_INTERVAL_DAYS = 21;

export function getDeckMastery(
  states: Record<string, SrsCardState>,
  now: number,
): DeckMastery {
  let studied = 0;
  let mastered = 0;
  let unmemorized = 0;
  let dueToday = 0;

  for (const state of Object.values(states)) {
    if (state.reviews === 0) continue;
    studied++;
    if (state.phase === 'review' && state.intervalDays >= MATURE_INTERVAL_DAYS) mastered++;
    if (isUnmemorized(state)) unmemorized++;
    if (state.dueAt <= now) dueToday++;
  }

  return { studied, mastered, unmemorized, dueToday };
}

export interface WeakCardSummary {
  cardId: string;
  answerLabel?: string;
  ease: number;
  againCount: number;
  lapses: number;
  reviews: number;
}

// Ranking de pontos fracos do dashboard: mais "não lembrei" primeiro; empate desempata pelo
// ease mais baixo. É histórico de propósito (o card que você errou muito e hoje acerta ainda
// merece atenção), diferente de isUnmemorized, que é o estado atual.
export function getWeakestCards(states: Record<string, SrsCardState>, limit: number): WeakCardSummary[] {
  return Object.values(states)
    .filter((s) => s.reviews > 0 && s.againCount > 0)
    .sort((a, b) => b.againCount - a.againCount || a.ease - b.ease)
    .slice(0, limit)
    .map(({ cardId, answerLabel, ease, againCount, lapses, reviews }) => ({
      cardId, answerLabel, ease, againCount, lapses, reviews,
    }));
}
