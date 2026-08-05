import { firestoreDB } from '../firebase';
import {
  collection, doc, getDocs, onSnapshot, deleteDoc,
  addDoc, query, where, writeBatch,
} from 'firebase/firestore';
import { QuizResult, AnalyticsResult } from '../types';

const resultsCollection = collection(firestoreDB, 'quizResults');
const analyticsCollection = collection(firestoreDB, 'osceAnalytics');

const toResult = (d: { id: string; data: () => Record<string, unknown> }): QuizResult =>
  ({ id: d.id, ...(d.data() as Omit<QuizResult, 'id'>) });

const toAnalytics = (d: { id: string; data: () => Record<string, unknown> }): AnalyticsResult =>
  ({ ...(d.data() as AnalyticsResult), firebaseId: d.id });

export const saveQuizResult = async (result: Omit<QuizResult, 'id'>) => {
  await addDoc(resultsCollection, result);
};

export const subscribeToMyResults = (
  uid: string,
  onData: (results: QuizResult[]) => void,
  onError: () => void
) => {
  const q = query(resultsCollection, where('userId', '==', uid));
  return onSnapshot(q, (snap) => onData(snap.docs.map(toResult)), onError);
};

export const subscribeToAllResults = (onData: (results: QuizResult[]) => void) => {
  return onSnapshot(resultsCollection, (snap) => onData(snap.docs.map(toResult)));
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

export const saveOsceAnalytics = async (analytics: Omit<AnalyticsResult, 'firebaseId'>) => {
  await addDoc(analyticsCollection, analytics);
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
