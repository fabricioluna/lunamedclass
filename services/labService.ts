import { firestoreDB } from '../firebase';
import {
  collection, doc, getDoc, getDocs, onSnapshot,
  addDoc, deleteDoc, setDoc, query, where, writeBatch,
} from 'firebase/firestore';
import { LabSimulation } from '../types';
import { deleteFileByUrl } from './storageService';
import { collectStorageUrls, findOrphanUrls } from '../utils/anatomyMarkers';

const labCollection = collection(firestoreDB, 'labSimulations');

// Mesmo gap da migração RTDB→Firestore documentado em questionsService.ts: `id` pode faltar
// nos dados de simulações migradas. `d.id` é o valor original antes da migração.
const toSimulation = (d: { id: string; data: () => Record<string, unknown> }): LabSimulation => {
  const data = d.data() as unknown as LabSimulation;
  return { ...data, id: data.id ?? d.id, firebaseId: d.id };
};

export const fetchLabSimulationsOnce = async (): Promise<LabSimulation[]> => {
  const snap = await getDocs(labCollection);
  return snap.docs.map(toSimulation);
};

export const fetchLabSimulationById = async (firebaseId: string): Promise<LabSimulation | null> => {
  const snap = await getDoc(doc(firestoreDB, 'labSimulations', firebaseId));
  return snap.exists() ? toSimulation(snap) : null;
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
  await Promise.all(collectStorageUrls(simulation.questions).map(deleteFileByUrl));
};

// Edição do Lab 3D (adicionar/remover alfinetes depois): regrava o documento inteiro e só
// então apaga imagens que saíram — se a gravação falhar, nenhum arquivo em uso some. Peças 3D
// não entram nessa limpeza: pertencem ao banco de peças (item 6.24).
export const updateLabSimulation = async (previous: LabSimulation, next: LabSimulation) => {
  if (!previous.firebaseId) throw new Error('Simulado sem identificador no banco.');
  const { firebaseId: _firebaseId, ...data } = next;
  await setDoc(doc(firestoreDB, 'labSimulations', previous.firebaseId), data);
  await Promise.all(findOrphanUrls(previous.questions, next.questions).map(deleteFileByUrl));
};

export const clearLabSimulations = async (disciplineId?: string) => {
  const snap = await getDocs(
    disciplineId ? query(labCollection, where('disciplineId', '==', disciplineId)) : labCollection
  );
  const batch = writeBatch(firestoreDB);
  snap.docs.forEach((d) => batch.delete(d.ref));
  await batch.commit();
};
