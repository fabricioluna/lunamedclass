import { firestoreDB } from '../firebase';
import {
  collection, doc, getDocs, onSnapshot,
  addDoc, setDoc, deleteDoc, query, where, writeBatch,
} from 'firebase/firestore';
import { Question } from '../types';

const questionsCollection = collection(firestoreDB, 'questions');

const toQuestion = (d: { id: string; data: () => Record<string, unknown> }): Question =>
  ({ ...(d.data() as unknown as Question), firebaseId: d.id });

export const fetchQuestionsOnce = async (): Promise<Question[]> => {
  const snap = await getDocs(questionsCollection);
  return snap.docs.map(toQuestion);
};

export const subscribeToQuestions = (onData: (questions: Question[]) => void) => {
  return onSnapshot(questionsCollection, (snap) => onData(snap.docs.map(toQuestion)));
};

export const addQuestions = async (questions: Question[]) => {
  await Promise.all(questions.map((q) => addDoc(questionsCollection, q)));
};

export const updateQuestion = async (question: Question) => {
  if (!question.firebaseId) return;
  await setDoc(doc(firestoreDB, 'questions', question.firebaseId), question);
};

export const removeQuestion = async (firebaseId: string) => {
  await deleteDoc(doc(firestoreDB, 'questions', firebaseId));
};

export const removeQuizByTitle = async (quizTitle: string, disciplineId?: string) => {
  const constraints = disciplineId
    ? [where('quizTitle', '==', quizTitle), where('disciplineId', '==', disciplineId)]
    : [where('quizTitle', '==', quizTitle)];
  const snap = await getDocs(query(questionsCollection, ...constraints));
  const batch = writeBatch(firestoreDB);
  snap.docs.forEach((d) => batch.delete(d.ref));
  await batch.commit();
};

export const clearQuestions = async (disciplineId?: string) => {
  const snap = await getDocs(
    disciplineId ? query(questionsCollection, where('disciplineId', '==', disciplineId)) : questionsCollection
  );
  const batch = writeBatch(firestoreDB);
  snap.docs.forEach((d) => batch.delete(d.ref));
  await batch.commit();
};
