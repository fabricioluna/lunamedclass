import { firestoreDB } from '../firebase';
import {
  collection, doc, getDocs, onSnapshot,
  addDoc, deleteDoc, query, where, writeBatch,
} from 'firebase/firestore';
import { OsceStation } from '../types';

const osceCollection = collection(firestoreDB, 'osceStations');

const toStation = (d: { id: string; data: () => Record<string, unknown> }): OsceStation =>
  ({ ...(d.data() as unknown as OsceStation), firebaseId: d.id });

export const fetchOsceStationsOnce = async (): Promise<OsceStation[]> => {
  const snap = await getDocs(osceCollection);
  return snap.docs.map(toStation);
};

export const subscribeToOsceStations = (onData: (stations: OsceStation[]) => void) => {
  return onSnapshot(osceCollection, (snap) => onData(snap.docs.map(toStation)));
};

export const addOsceStations = async (stations: OsceStation[]) => {
  await Promise.all(stations.map((s) => addDoc(osceCollection, s)));
};

export const removeOsceStation = async (firebaseId: string) => {
  await deleteDoc(doc(firestoreDB, 'osceStations', firebaseId));
};

export const clearOsceStations = async (disciplineId?: string) => {
  const snap = await getDocs(
    disciplineId ? query(osceCollection, where('disciplineId', '==', disciplineId)) : osceCollection
  );
  const batch = writeBatch(firestoreDB);
  snap.docs.forEach((d) => batch.delete(d.ref));
  await batch.commit();
};
