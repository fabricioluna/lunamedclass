import { firestoreDB } from '../firebase';
import { collection, doc, getDocs, onSnapshot, query, updateDoc, where, writeBatch } from 'firebase/firestore';
import { PeriodRequest, periodRequestsQuery, updateUserPeriod, UserProfile } from './authService';
import { clearQuestions } from './questionsService';
import { clearOsceStations } from './osceService';
import { clearLabSimulations } from './labService';
import { clearOsceAnalytics } from './resultsService';
import { resetConfigCollections } from './configService';

const periodRequestsCollection = collection(firestoreDB, 'periodRequests');

export const subscribeToPeriodRequests = (onData: (requests: PeriodRequest[]) => void) => {
  return onSnapshot(periodRequestsQuery(), (snap) =>
    onData(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<PeriodRequest, 'id'>) })))
  );
};

export const approvePeriodRequest = async (req: PeriodRequest) => {
  if (!req.id) return;
  await updateUserPeriod(req.userId, req.requestedPeriodId);
  await updateDoc(doc(firestoreDB, 'periodRequests', req.id), { status: 'approved' });
};

export const rejectPeriodRequest = async (req: PeriodRequest) => {
  if (!req.id) return;
  await updateDoc(doc(firestoreDB, 'periodRequests', req.id), { status: 'rejected' });
};

const clearPeriodRequests = async () => {
  const snap = await getDocs(periodRequestsCollection);
  const batch = writeBatch(firestoreDB);
  snap.docs.forEach((d) => batch.delete(d.ref));
  await batch.commit();
};

// === BUSCA DE USUÁRIO POR E-MAIL (aba "Usuários" — liberar período extra) ===
// Cross-user por natureza (é o admin procurando outra pessoa), então mora aqui e não em
// authService (que é sempre o perfil do próprio usuário logado). A Security Rule
// (users/{uid}: allow read if isOwner(uid) || isAdmin()) já cobre cada doc individualmente —
// esta busca não abre nada que a regra não deixasse um admin ler documento por documento.

const usersCollection = collection(firestoreDB, 'users');

export const findUserByEmail = async (email: string): Promise<UserProfile | null> => {
  const trimmed = email.trim();
  if (!trimmed) return null;

  const exact = await getDocs(query(usersCollection, where('email', '==', trimmed)));
  if (!exact.empty) return exact.docs[0].data() as UserProfile;

  // Fallback só por capitalização diferente da gravada (Google normaliza e-mail para
  // minúsculo; cadastro manual às vezes não). Turma piloto é pequena — varrer a coleção
  // inteira aqui é aceitável só porque é uma ação de admin, nunca alcançável por aluno
  // (regra 3 do CLAUDE.md é sobre dado de aluno em tela de aluno, não sobre isto).
  const all = await getDocs(usersCollection);
  const found = all.docs.find(
    (d) => (d.data() as UserProfile).email?.toLowerCase() === trimmed.toLowerCase()
  );
  return found ? (found.data() as UserProfile) : null;
};

export interface UserEmailSuggestion {
  email: string;
  displayName: string | null;
}

// Alimenta o autocompletar do campo de e-mail em AdminUserAccess — mesmo raciocínio do
// fallback acima (turma piloto pequena, ação só alcançável por admin): trazer a coleção
// inteira de uma vez é aceitável aqui.
export const listUserEmails = async (): Promise<UserEmailSuggestion[]> => {
  const snap = await getDocs(usersCollection);
  return snap.docs
    .map((d) => d.data() as UserProfile)
    .filter((u): u is UserProfile & { email: string } => !!u.email)
    .map((u) => ({ email: u.email, displayName: u.displayName }));
};

// Reset total: mesmo escopo do antigo handleGlobalReset (RTDB) — questões, OSCE, lab,
// analytics, estrutura base (períodos/disciplinas/flags) e fila de solicitações. Não inclui
// `materials` nem `quizResults`, que sempre tiveram botões de limpeza separados.
export const globalDatabaseReset = async () => {
  await Promise.all([
    clearQuestions(),
    clearOsceStations(),
    clearLabSimulations(),
    clearOsceAnalytics(),
    resetConfigCollections(),
    clearPeriodRequests(),
  ]);
};
