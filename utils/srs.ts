// Motor de flashcards do Laboratório Virtual — Etapa 6, item 6.10.
//
// HISTÓRICO CURTO, porque a forma atual só faz sentido com ele:
//   6.3  — SM-2 clássico: intervalos em dias.
//   6.5  — Anki de verdade: 4 fases + degraus em minutos dentro da sessão.
//   6.9  — o usuário testou e tirou os degraus: a sessão virou passagem linear.
//   6.10 — o usuário tirou também os DIAS: "um usuário pode revisar todos os cards no mesmo
//          dia, inclusive mais de uma vez".
//
// Sem minutos e sem dias não sobra relógio nenhum para agendar nada — e um modelo que
// guardasse `intervalDays` sem nunca usar seria peso morto mentindo na tela. O que resta é um
// sistema de PILHAS (estilo Leitner), a outra família clássica de flashcard:
//
//   inédito ──estudou──► [ não memorizado ] ──"Lembrei fácil"──► [ memorizado ]
//                               ▲                                      │
//                               └──"Não lembrei" / "Lembrei com esforço"┘
//
// Quem decide quando revisar é o aluno, não o calendário: ele escolhe estudar o baralho todo ou
// só a pilha do que falta memorizar, quantas vezes quiser, no mesmo dia ou não.
//
// Puro e sem Firebase de propósito: quem persiste é services/flashcardsService.ts.

export type SrsRating = 'again' | 'good' | 'easy';

// Formato do estado persistido.
//   1 (6.3) e 2 (6.5) → tinham fase, degraus, ease e intervalo em dias.
//   3 (6.10)          → só contadores; nada de tempo como regra.
// A migração 2→3 acontece na leitura (ver normalizeCardState): o que importa — quantas vezes o
// aluno viu o card e como respondeu da última vez — sobrevive.
export const SRS_SCHEMA_VERSION = 3;

export interface SrsCardState {
  schemaVersion: number;
  cardId: string;
  answerLabel?: string; // Denormalizado: o dashboard cita o card sem baixar a simulação inteira.
  reviews: number; // Quantas vezes foi respondido, somando todas as sessões.
  againCount: number; // Quantas vezes "Não lembrei" — alimenta o ranking de pontos fracos.
  effortCount: number; // Quantas vezes "Lembrei com esforço".
  easyCount: number; // Quantas vezes "Lembrei fácil".
  lastRating?: SrsRating;
  // Informativo ("você viu isso pela última vez em..."), NUNCA usado para liberar ou bloquear
  // card. É a diferença entre registrar o tempo e agendar por ele.
  lastReviewedAt?: number;
}

export function createInitialCardState(cardId: string, answerLabel?: string): SrsCardState {
  return {
    schemaVersion: SRS_SCHEMA_VERSION,
    cardId,
    answerLabel,
    reviews: 0,
    againCount: 0,
    effortCount: 0,
    easyCount: 0,
  };
}

// Estado do formato 2 (item 6.5), para migrar sem perder o histórico do aluno.
interface LegacyV2State {
  schemaVersion?: number;
  cardId?: string;
  answerLabel?: string;
  reviews?: number;
  againCount?: number;
  lastRating?: string;
  lastReviewedAt?: number;
}

const LEGACY_RATINGS: Record<string, SrsRating> = { again: 'again', good: 'good', easy: 'easy' };

export function normalizeCardState(raw: unknown, cardId: string, answerLabel?: string): SrsCardState {
  if (!raw || typeof raw !== 'object') return createInitialCardState(cardId, answerLabel);
  const candidate = raw as LegacyV2State & Partial<SrsCardState>;

  if (candidate.schemaVersion === SRS_SCHEMA_VERSION) {
    return { ...(candidate as SrsCardState), answerLabel: candidate.answerLabel ?? answerLabel };
  }

  // Formato 2: aproveita o que ainda faz sentido. effortCount/easyCount começam quase do zero
  // porque o formato antigo não separava as respostas — só guardava a última.
  if (candidate.schemaVersion === 2) {
    const lastRating = candidate.lastRating ? LEGACY_RATINGS[candidate.lastRating] : undefined;
    return {
      schemaVersion: SRS_SCHEMA_VERSION,
      cardId: candidate.cardId ?? cardId,
      answerLabel: candidate.answerLabel ?? answerLabel,
      reviews: candidate.reviews ?? 0,
      againCount: candidate.againCount ?? 0,
      effortCount: lastRating === 'good' ? 1 : 0,
      easyCount: lastRating === 'easy' ? 1 : 0,
      lastRating,
      lastReviewedAt: candidate.lastReviewedAt,
    };
  }

  // Formato 1 ou desconhecido: não dá pra mapear com honestidade, vira card inédito.
  return createInitialCardState(cardId, answerLabel);
}

export function normalizeProgress(raw: Record<string, unknown> | undefined): Record<string, SrsCardState> {
  if (!raw) return {};
  const result: Record<string, SrsCardState> = {};
  for (const [cardId, state] of Object.entries(raw)) {
    const normalized = normalizeCardState(state, cardId);
    // Card que virou inédito na migração não precisa ocupar espaço no mapa.
    if (normalized.reviews > 0) result[cardId] = normalized;
  }
  return result;
}

export function getOrCreateCardState(
  states: Record<string, SrsCardState>,
  cardId: string,
  answerLabel?: string,
): SrsCardState {
  return states[cardId] ?? createInitialCardState(cardId, answerLabel);
}

// Registra a resposta. Sem agendamento: o que muda é a pilha em que o card está (via
// `lastRating`) e os contadores que alimentam as estatísticas.
export function answerCard(state: SrsCardState, rating: SrsRating, now: number): SrsCardState {
  return {
    ...state,
    reviews: state.reviews + 1,
    againCount: state.againCount + (rating === 'again' ? 1 : 0),
    effortCount: state.effortCount + (rating === 'good' ? 1 : 0),
    easyCount: state.easyCount + (rating === 'easy' ? 1 : 0),
    lastRating: rating,
    lastReviewedAt: now,
  };
}

// === PILHAS ===
//
// Definição dada pelo usuário: "o card é memorizado a partir de quando o usuário clica que
// lembrou com facilidade". Qualquer outra resposta o devolve para a pilha de não memorizados.

export function isMemorized(state: SrsCardState | undefined): boolean {
  return state?.lastRating === 'easy';
}

// Card já estudado que ainda não foi memorizado. Card nunca visto não entra: não dá para "não
// memorizar" o que ainda não foi apresentado.
export function isUnmemorized(state: SrsCardState | undefined): boolean {
  return !!state && state.reviews > 0 && !isMemorized(state);
}

export function listUnmemorizedCards(
  cardIds: string[],
  states: Record<string, SrsCardState>,
): string[] {
  return cardIds.filter((id) => isUnmemorized(states[id]));
}

export function countUnmemorizedCards(
  cardIds: string[],
  states: Record<string, SrsCardState>,
): number {
  return listUnmemorizedCards(cardIds, states).length;
}

// === SESSÃO ===

export interface SrsSession {
  // Fila única, consumida da frente pro fim. Card respondido sai e não volta nesta sessão.
  queue: string[];
}

// 'all' = baralho inteiro, inclusive o que já foi memorizado (o aluno pode querer repassar tudo
// no mesmo dia). 'unmemorized' = só a pilha do que falta memorizar.
export type SessionFocus = 'all' | 'unmemorized';

export interface SessionOptions {
  order?: 'sequential' | 'random';
  rangeStart?: number; // 1-based, inclusive
  rangeEnd?: number; // 1-based, inclusive
  newLimit?: number; // undefined = sem limite. Só limita card INÉDITO.
  focus?: SessionFocus;
  random?: () => number; // injetável para teste determinístico
}

// Configuração da sessão sem a função `random` — é o que dá pra gravar no Firestore.
export type PersistedSessionOptions = Omit<SessionOptions, 'random'>;

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

// Sem parâmetro `now`: nada aqui depende de que horas são. Um card nunca fica de fora por causa
// de data — só por escolha do aluno (foco, intervalo, limite de inéditos).
export function buildSession(
  cardIds: string[],
  states: Record<string, SrsCardState>,
  options: SessionOptions = {},
): SrsSession {
  const { order = 'sequential', rangeStart, rangeEnd, newLimit, focus = 'all', random = Math.random } = options;
  const pool = applyRange(cardIds, rangeStart, rangeEnd);
  const ordered = <T>(items: T[]) => (order === 'random' ? shuffle(items, random) : items);

  if (focus === 'unmemorized') {
    return { queue: ordered(listUnmemorizedCards(pool, states)) };
  }

  const novos: string[] = [];
  const jaVistos: string[] = [];
  for (const id of pool) {
    const state = states[id];
    if (!state || state.reviews === 0) novos.push(id);
    else jaVistos.push(id);
  }

  const limitados = newLimit === undefined ? ordered(novos) : ordered(novos).slice(0, Math.max(0, newLimit));

  // Já vistos antes dos inéditos: o que o aluno começou a estudar tem prioridade sobre conteúdo
  // que ele ainda nem abriu.
  return { queue: [...ordered(jaVistos), ...limitados] };
}

export type NextCardResult =
  | { kind: 'card'; cardId: string }
  | { kind: 'done' };

// Passagem linear: o próximo é simplesmente o próximo.
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

// === SESSÃO INTERROMPIDA (item 6.6) ===

export interface PersistedSession {
  startedAt: number;
  updatedAt: number;
  options: PersistedSessionOptions;
  // Opcional porque sessão gravada antes do 6.9 usava mainQueue/learningQueue. queueOf resolve.
  queue?: string[];
  // cardId → memorizou (clicou "Lembrei fácil") nesta sessão.
  answers: Record<string, boolean>;
  mainQueue?: string[];
  learningQueue?: string[];
}

// Janela para OFERECER a retomada. Não é agendamento de card: passado esse tempo, a sessão
// guardada provavelmente não reflete mais a intenção do aluno, e ele começa uma nova.
export const RESUMABLE_SESSION_MAX_AGE_MS = 24 * 60 * 60 * 1000;

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

// === CONTADORES ===

export interface SessionCounts {
  remaining: number;
  memorized: number;
  unmemorized: number;
}

// Placar ao vivo da sessão — os não memorizados são contabilizados a cada clique, não só no fim.
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
  memorizedCount: number;
}

// Situação do baralho, sem nenhuma noção de "hoje".
export function getDeckCounts(
  cardIds: string[],
  states: Record<string, SrsCardState>,
): DeckCounts {
  let newCount = 0;
  let unmemorizedCount = 0;
  let memorizedCount = 0;
  for (const id of cardIds) {
    const state = states[id];
    if (!state || state.reviews === 0) newCount++;
    else if (isMemorized(state)) memorizedCount++;
    else unmemorizedCount++;
  }
  return { newCount, unmemorizedCount, memorizedCount };
}

export interface DeckMastery {
  studied: number;
  memorized: number;
  unmemorized: number;
}

// Visão consolidada de todos os baralhos do aluno, para o dashboard.
export function getDeckMastery(states: Record<string, SrsCardState>): DeckMastery {
  let studied = 0;
  let memorized = 0;
  let unmemorized = 0;

  for (const state of Object.values(states)) {
    if (state.reviews === 0) continue;
    studied++;
    if (isMemorized(state)) memorized++;
    else unmemorized++;
  }

  return { studied, memorized, unmemorized };
}

export interface WeakCardSummary {
  cardId: string;
  answerLabel?: string;
  againCount: number;
  effortCount: number;
  reviews: number;
}

// Ranking de pontos fracos do dashboard: mais "Não lembrei" primeiro; empate desempata por
// "Lembrei com esforço". É histórico de propósito — o card que você errou muito e hoje acerta
// ainda merece atenção —, diferente de isUnmemorized, que é o estado atual.
export function getWeakestCards(states: Record<string, SrsCardState>, limit: number): WeakCardSummary[] {
  return Object.values(states)
    .filter((s) => s.reviews > 0 && s.againCount > 0)
    .sort((a, b) => b.againCount - a.againCount || b.effortCount - a.effortCount)
    .slice(0, limit)
    .map(({ cardId, answerLabel, againCount, effortCount, reviews }) => ({
      cardId, answerLabel, againCount, effortCount, reviews,
    }));
}
