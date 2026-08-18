import { firestoreDB } from '../firebase';
import { doc, getDoc, getDocs, setDoc, collection } from 'firebase/firestore';
import { SrsCardState, normalizeProgress } from '../utils/srs';

// Progresso de flashcards por aluno (Etapa 6, itens 6.3/6.5) — 1 doc por simulação em
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
}

const progressRef = (uid: string, simulationId: string) =>
  doc(firestoreDB, 'users', uid, 'flashcardProgress', simulationId);

// O Firestore recusa `undefined` numa escrita — e `answerLabel` é opcional. Limpar aqui evita
// que uma lâmina sem resposta cadastrada derrube o salvamento da sessão inteira.
const stripUndefined = (state: SrsCardState): SrsCardState => {
  const clean: Record<string, unknown> = { ...state };
  for (const key of Object.keys(clean)) {
    if (clean[key] === undefined) delete clean[key];
  }
  return clean as unknown as SrsCardState;
};

// A normalização descarta silenciosamente o formato do item 6.3 (sem fase/degraus) — decisão
// do usuário de zerar em vez de converter. Na prática o documento antigo continua no banco até
// o aluno estudar de novo, quando é sobrescrito card a card.
export const fetchFlashcardProgress = async (
  uid: string,
  simulationId: string,
): Promise<Record<string, SrsCardState>> => {
  const snap = await getDoc(progressRef(uid, simulationId));
  return normalizeProgress(snap.data()?.cards as Record<string, unknown> | undefined);
};

// Escreve só o card revisado (merge recursivo do Firestore em `cards.<cardId>`), não o mapa
// inteiro — evita reescrever uma lâmina de 150 cards a cada clique e evita corrida entre abas:
// duas revisões simultâneas em cards diferentes não se pisam.
export const upsertFlashcardCardState = async (
  uid: string,
  simulationId: string,
  cardId: string,
  state: SrsCardState,
) => {
  await setDoc(
    progressRef(uid, simulationId),
    { simulationId, cards: { [cardId]: stripUndefined(state) } },
    { merge: true },
  );
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
