import { firestoreDB } from '../firebase';
import {
  collection, doc, getDocs, onSnapshot,
  addDoc, deleteDoc, query, where, writeBatch,
} from 'firebase/firestore';
import { LabSimulation } from '../types';
import { deleteFileByUrl } from './storageService';

const labCollection = collection(firestoreDB, 'labSimulations');

const toSimulation = (d: { id: string; data: () => Record<string, unknown> }): LabSimulation =>
  ({ ...(d.data() as unknown as LabSimulation), firebaseId: d.id });

export const fetchLabSimulationsOnce = async (): Promise<LabSimulation[]> => {
  const snap = await getDocs(labCollection);
  return snap.docs.map(toSimulation);
};

export const subscribeToLabSimulations = (onData: (simulations: LabSimulation[]) => void) => {
  return onSnapshot(labCollection, (snap) => onData(snap.docs.map(toSimulation)));
};

export const addLabSimulation = async (simulation: LabSimulation) => {
  await addDoc(labCollection, simulation);
};

export const removeLabSimulation = async (simulation: LabSimulation) => {
  if (!simulation.firebaseId) return;
  await deleteDoc(doc(firestoreDB, 'labSimulations', simulation.firebaseId));
  await Promise.all(simulation.questions.map((q) => deleteFileByUrl(q.imageUrl)));
};

export const clearLabSimulations = async (disciplineId?: string) => {
  const snap = await getDocs(
    disciplineId ? query(labCollection, where('disciplineId', '==', disciplineId)) : labCollection
  );
  const batch = writeBatch(firestoreDB);
  snap.docs.forEach((d) => batch.delete(d.ref));
  await batch.commit();
};
