import { firestoreDB } from '../firebase';
import {
  collection, doc, getDoc, getDocs, onSnapshot,
  addDoc, deleteDoc, query, setDoc, where, writeBatch,
} from 'firebase/firestore';
import { OsceStation } from '../types';

const osceCollection = collection(firestoreDB, 'osceStations');

// Mesmo gap da migração RTDB→Firestore documentado em questionsService.ts: `id` pode faltar
// nos dados de estações migradas. `d.id` é o valor original antes da migração.
const toStation = (d: { id: string; data: () => Record<string, unknown> }): OsceStation => {
  const data = d.data() as unknown as OsceStation;
  return { ...data, id: data.id ?? d.id, firebaseId: d.id };
};

export const fetchOsceStationsOnce = async (): Promise<OsceStation[]> => {
  const snap = await getDocs(osceCollection);
  return snap.docs.map(toStation);
};

export const fetchOsceStationById = async (firebaseId: string): Promise<OsceStation | null> => {
  const snap = await getDoc(doc(firestoreDB, 'osceStations', firebaseId));
  return snap.exists() ? toStation(snap) : null;
};

export const subscribeToOsceStations = (onData: (stations: OsceStation[]) => void) => {
  return onSnapshot(osceCollection, (snap) => onData(snap.docs.map(toStation)));
};

// Estação com `slug` usa o slug como id do documento: reimportar o arquivo corrigido substitui
// a versão anterior em vez de criar uma cópia, e a URL da estação (que usa o id do documento)
// não muda entre versões. Sem slug, mantém o comportamento antigo de id automático.
export const saveOsceStations = async (stations: OsceStation[]) => {
  await Promise.all(
    stations.map((s) => (s.slug ? setDoc(doc(firestoreDB, 'osceStations', s.slug), s) : addDoc(osceCollection, s)))
  );
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
