import { firestoreDB } from '../firebase';
import {
  collection, doc, getDocs, onSnapshot, deleteDoc,
  addDoc, query, where, writeBatch, serverTimestamp,
} from 'firebase/firestore';
import { QuizResult, AnalyticsResult, FirebaseTimestamp } from '../types';

const resultsCollection = collection(firestoreDB, 'quizResults');
const analyticsCollection = collection(firestoreDB, 'osceAnalytics');

const toResult = (d: { id: string; data: () => Record<string, unknown> }): QuizResult =>
  ({ id: d.id, ...(d.data() as Omit<QuizResult, 'id'>) });

const toAnalytics = (d: { id: string; data: () => Record<string, unknown> }): AnalyticsResult =>
  ({ ...(d.data() as AnalyticsResult), firebaseId: d.id });

// Docs do Firestore não têm a ordenação cronológica implícita das push keys do RTDB — sem
// isso, a lista "mais recente primeiro" do dashboard do aluno viraria ordem arbitrária.
// Ordena no cliente (não no query) para não exigir um índice composto que ainda não existe.
const getMillis = (ts?: FirebaseTimestamp): number => {
  if (!ts) return 0;
  if (typeof ts === 'number') return ts;
  if (typeof ts === 'string') return new Date(ts).getTime();
  return ts.seconds * 1000;
};
const sortByCreatedAtDesc = (results: QuizResult[]): QuizResult[] =>
  [...results].sort((a, b) => getMillis(b.createdAt) - getMillis(a.createdAt));

export const saveQuizResult = async (result: Omit<QuizResult, 'id' | 'createdAt'>) => {
  await addDoc(resultsCollection, { ...result, createdAt: serverTimestamp() });
};

export const subscribeToMyResults = (
  uid: string,
  onData: (results: QuizResult[]) => void,
  onError: () => void
) => {
  const q = query(resultsCollection, where('userId', '==', uid));
  return onSnapshot(q, (snap) => onData(sortByCreatedAtDesc(snap.docs.map(toResult))), onError);
};

export const subscribeToAllResults = (onData: (results: QuizResult[]) => void) => {
  return onSnapshot(resultsCollection, (snap) => onData(sortByCreatedAtDesc(snap.docs.map(toResult))));
};

export const deleteResult = async (id: string) => {
  await deleteDoc(doc(firestoreDB, 'quizResults', id));
};

export const deleteResults = async (ids: string[]) => {
  const batch = writeBatch(firestoreDB);
  ids.forEach((id) => batch.delete(doc(firestoreDB, 'quizResults', id)));
  await batch.commit();
};

export const clearAllResults = async () => {
  const snap = await getDocs(resultsCollection);
  const batch = writeBatch(firestoreDB);
  snap.docs.forEach((d) => batch.delete(d.ref));
  await batch.commit();
};

export const saveOsceAnalytics = async (analytics: Omit<AnalyticsResult, 'firebaseId' | 'createdAt'>) => {
  await addDoc(analyticsCollection, { ...analytics, createdAt: serverTimestamp() });
};

export const subscribeToOsceAnalytics = (onData: (analytics: AnalyticsResult[]) => void) => {
  return onSnapshot(analyticsCollection, (snap) => onData(snap.docs.map(toAnalytics)));
};

export const clearOsceAnalytics = async () => {
  const snap = await getDocs(analyticsCollection);
  const batch = writeBatch(firestoreDB);
  snap.docs.forEach((d) => batch.delete(d.ref));
  await batch.commit();
};
