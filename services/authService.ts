import { firestoreDB } from '../firebase';
import {
  doc, getDoc, setDoc, updateDoc, onSnapshot,
  collection, addDoc, query, orderBy,
} from 'firebase/firestore';

export type UserRole = 'student' | 'admin' | 'professor';

export interface UserProfile {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
  role: UserRole;
  periodId?: string;
  createdAt: string;
  lastLogin: string;
}

export interface PeriodRequest {
  id?: string;
  userId: string;
  userName: string;
  userEmail: string;
  currentPeriodId: string;
  requestedPeriodId: string;
  status: 'pending' | 'approved' | 'rejected';
  timestamp: string;
}

const profileRef = (uid: string) => doc(firestoreDB, 'users', uid);

export const subscribeToProfile = (
  uid: string,
  onData: (profile: UserProfile | null) => void,
  onError?: (error: unknown) => void
) => {
  return onSnapshot(
    profileRef(uid),
    (snap) => onData(snap.exists() ? (snap.data() as UserProfile) : null),
    (error) => onError?.(error)
  );
};

export const createProfile = async (profile: UserProfile) => {
  await setDoc(profileRef(profile.uid), profile);
};

export const stampLastLogin = async (uid: string) => {
  await updateDoc(profileRef(uid), { lastLogin: new Date().toISOString() });
};

export const updateUserPeriod = async (uid: string, periodId: string) => {
  await updateDoc(profileRef(uid), { periodId });
};

export const getProfileOnce = async (uid: string): Promise<UserProfile | null> => {
  const snap = await getDoc(profileRef(uid));
  return snap.exists() ? (snap.data() as UserProfile) : null;
};

// === SOLICITAÇÕES DE MUDANÇA DE PERÍODO (criação — lado do aluno) ===
// Leitura/aprovação fica em adminService, que é quem gerencia a fila.

const periodRequestsCollection = collection(firestoreDB, 'periodRequests');

export const submitPeriodChangeRequest = async (req: Omit<PeriodRequest, 'id'>) => {
  await addDoc(periodRequestsCollection, req);
};

export const periodRequestsQuery = () => query(periodRequestsCollection, orderBy('timestamp', 'desc'));
