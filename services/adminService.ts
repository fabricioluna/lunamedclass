import { firestoreDB } from '../firebase';
import { collection, doc, getDocs, onSnapshot, updateDoc, writeBatch } from 'firebase/firestore';
import { PeriodRequest, periodRequestsQuery, updateUserPeriod } from './authService';
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
