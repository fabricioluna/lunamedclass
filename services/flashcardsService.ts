import { firestoreDB } from '../firebase';
import { doc, getDoc, getDocs, setDoc, collection, deleteField } from 'firebase/firestore';
import { SrsCardState, PersistedSession, normalizeProgress } from '../utils/srs';

// Progresso de flashcards por aluno (Etapa 6, itens 6.3/6.5/6.6) — 1 doc por simulação em
// users/{uid}/flashcardProgress/{simulationId}, não 1 doc por card: uma lâmina com 150 imagens
// viraria 150 leituras por sessão; um mapa de 150 estados fica na casa de ~30 KB, longe do
// limite de 1 MB por doc do Firestore.
//
// Fica sob users/{uid} de propósito — o isolamento por aluno vem da ROTA do documento, não de
// um `where('userId','==',uid)` que uma tela nova pode esquecer (regra 3 do CLAUDE.md, por
// construção). Atenção ao editar firestore.rules: regras não são recursivas, então
// `match /users/{uid}` não cobre esta subcoleção — precisa de um match próprio.
export interface FlashcardProgressDoc {
  simulationId: string;
  cards: Record<string, SrsCardState>;
  // Sessão interrompida, para o aluno retomar de onde parou (item 6.6).
  activeSession?: PersistedSession;
}

const progressRef = (uid: string, simulationId: string) =>
  doc(firestoreDB, 'users', uid, 'flashcardProgress', simulationId);

// O Firestore recusa `undefined` numa escrita — e vários campos aqui são opcionais
// (`answerLabel`, `rangeStart`, `newLimit`...). Limpar antes evita que uma lâmina sem resposta
// cadastrada, ou uma sessão sem intervalo escolhido, derrube o salvamento inteiro.
const stripUndefined = <T>(value: T): T => {
  if (Array.isArray(value)) return value.map(stripUndefined) as unknown as T;
  if (value === null || typeof value !== 'object') return value;
  const clean: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
    if (item !== undefined) clean[key] = stripUndefined(item);
  }
  return clean as unknown as T;
};

// A normalização descarta silenciosamente o formato do item 6.3 (sem fase/degraus) — decisão
// do usuário de zerar em vez de converter. Na prática o documento antigo continua no banco até
// o aluno estudar de novo, quando é sobrescrito card a card.
export const fetchFlashcardProgressDoc = async (
  uid: string,
  simulationId: string,
): Promise<{ cards: Record<string, SrsCardState>; activeSession?: PersistedSession }> => {
  const snap = await getDoc(progressRef(uid, simulationId));
  const data = snap.data();
  return {
    cards: normalizeProgress(data?.cards as Record<string, unknown> | undefined),
    activeSession: data?.activeSession as PersistedSession | undefined,
  };
};

// Escreve só o card revisado (merge recursivo do Firestore em `cards.<cardId>`), não o mapa
// inteiro — evita reescrever uma lâmina de 150 cards a cada clique e evita corrida entre abas:
// duas revisões simultâneas em cards diferentes não se pisam.
//
// A sessão em andamento pega carona NESTA MESMA escrita: retomar de onde parou não custa
// nenhuma operação a mais no banco.
export const upsertFlashcardCardState = async (
  uid: string,
  simulationId: string,
  cardId: string,
  state: SrsCardState,
  activeSession?: PersistedSession,
) => {
  const payload: Record<string, unknown> = {
    simulationId,
    cards: { [cardId]: stripUndefined(state) },
  };
  if (activeSession) payload.activeSession = stripUndefined(activeSession);

  await setDoc(progressRef(uid, simulationId), payload, { merge: true });
};

// Chamado ao encerrar a sessão (ou ao descartar uma sessão velha demais para retomar).
export const clearActiveSession = async (uid: string, simulationId: string) => {
  await setDoc(progressRef(uid, simulationId), { activeSession: deleteField() }, { merge: true });
};

// Lista TODOS os docs de progresso do aluno de uma vez (sem precisar saber os IDs das
// simulações de antemão) — é o que alimenta "seus pontos fracos" no dashboard: 1 leitura de
// coleção em vez de 1 leitura por simulação existente no banco.
export const fetchAllFlashcardProgressDocs = async (uid: string): Promise<FlashcardProgressDoc[]> => {
  const snap = await getDocs(collection(firestoreDB, 'users', uid, 'flashcardProgress'));
  return snap.docs.map((d) => {
    const data = d.data();
    return {
      simulationId: (data.simulationId as string) || d.id,
      cards: normalizeProgress(data.cards as Record<string, unknown> | undefined),
    };
  });
};
