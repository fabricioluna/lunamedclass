import { firestoreDB } from '../firebase';
import {
  collection, doc, getDocs, onSnapshot, deleteDoc,
  addDoc, query, where, serverTimestamp, writeBatch,
} from 'firebase/firestore';
import { Summary, AcademicUnit } from '../types';
import { uploadFile, deleteFileByUrl } from './storageService';

const materialsCollection = collection(firestoreDB, 'materials');

const toMaterial = (d: { id: string; data: () => Record<string, unknown> }): Summary =>
  ({ id: d.id, ...(d.data() as Omit<Summary, 'id'>) });

export const subscribeToMaterials = (
  disciplineId: string,
  unit: AcademicUnit,
  onData: (materials: Summary[]) => void,
  onError: () => void
) => {
  const q = query(
    materialsCollection,
    where('disciplineId', '==', disciplineId),
    where('unit', '==', unit)
  );
  return onSnapshot(q, (snap) => onData(snap.docs.map(toMaterial)), onError);
};

export const subscribeToAllMaterials = (onData: (materials: Summary[]) => void) => {
  return onSnapshot(materialsCollection, (snap) => onData(snap.docs.map(toMaterial)));
};

interface NewMaterialMeta {
  title: string;
  author: string;
  description: string;
  type: 'summary' | 'script' | 'other';
  disciplineId: string;
  unit: AcademicUnit;
  isVerified: boolean;
}

const storagePath = (disciplineId: string, unit: AcademicUnit, fileName: string) =>
  `materials/${disciplineId}/${unit}/${Date.now()}_${fileName}`;

export const addMaterialFile = async (meta: NewMaterialMeta, file: File, formatFileSize: (bytes: number) => string) => {
  const url = await uploadFile(storagePath(meta.disciplineId, meta.unit, file.name), file);
  await addDoc(materialsCollection, {
    ...meta,
    url,
    label: file.name.split('.').pop()?.toUpperCase() || 'ARQUIVO',
    size: formatFileSize(file.size),
    date: new Date().toLocaleDateString('pt-BR'),
    createdAt: serverTimestamp(),
  });
};

export const addMaterialLink = async (meta: NewMaterialMeta, url: string) => {
  await addDoc(materialsCollection, {
    ...meta,
    url,
    label: 'LINK',
    size: 'Nuvem Externa',
    date: new Date().toLocaleDateString('pt-BR'),
    createdAt: serverTimestamp(),
  });
};

export const deleteMaterial = async (material: Summary) => {
  await deleteDoc(doc(firestoreDB, 'materials', material.id));
  await deleteFileByUrl(material.url);
};

export const clearMaterials = async (materials: Summary[]) => {
  const batch = writeBatch(firestoreDB);
  materials.forEach((m) => batch.delete(doc(firestoreDB, 'materials', m.id)));
  await batch.commit();
  await Promise.all(materials.map((m) => deleteFileByUrl(m.url)));
};

export const fetchAllMaterialsOnce = async (): Promise<Summary[]> => {
  const snap = await getDocs(materialsCollection);
  return snap.docs.map(toMaterial);
};
