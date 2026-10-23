import { firestoreDB } from '../firebase';
import {
  collection, doc, addDoc, deleteDoc, onSnapshot, orderBy, query, writeBatch,
} from 'firebase/firestore';
import type { AnatomyModelAsset, LabSimulation } from '../types';
import { uploadFile, deleteFileByUrl } from './storageService';
import { modelUsage, renameModelInQuestions } from '../utils/anatomyModels';

// Banco de peças 3D (item 6.24). Só o admin lê e grava (firestore.rules); o aluno nunca
// precisa daqui — a URL da peça já vem dentro da questão do Lab.
const modelsCollection = collection(firestoreDB, 'anatomyModels');

export const subscribeToAnatomyModels = (
  onData: (models: AnatomyModelAsset[]) => void,
  onError?: (error: unknown) => void,
) =>
  onSnapshot(
    query(modelsCollection, orderBy('name')),
    (snap) => onData(snap.docs.map((d) => ({ ...(d.data() as Omit<AnatomyModelAsset, 'id'>), id: d.id }))),
    (error) => onError?.(error),
  );

export const uploadAnatomyModel = async (file: File, name: string): Promise<AnatomyModelAsset> => {
  const safeName = file.name.replace(/[^\w.-]+/g, '_');
  const url = await uploadFile(`lab_models/banco/${Date.now()}_${safeName}`, file);
  const data = { name, url, sizeBytes: file.size, createdAt: Date.now() };
  const ref = await addDoc(modelsCollection, data);
  return { ...data, id: ref.id };
};

// Peças subidas antes do banco existir: o arquivo já está no Storage, só falta o registro.
export const registerExistingAnatomyModel = async (url: string, name: string) => {
  let sizeBytes = 0;
  try {
    const head = await fetch(url, { method: 'HEAD' });
    sizeBytes = Number(head.headers.get('content-length')) || 0;
  } catch {
    // tamanho é só informativo — sem ele a peça entra no banco do mesmo jeito
  }
  await addDoc(modelsCollection, { name, url, sizeBytes, createdAt: Date.now() });
};

// Renomeia no banco e em todas as questões que usam a peça (é o nome que o aluno vê), numa
// gravação só: ou tudo muda, ou nada.
export const renameAnatomyModel = async (model: AnatomyModelAsset, name: string, simulations: readonly LabSimulation[]) => {
  const batch = writeBatch(firestoreDB);
  batch.update(doc(modelsCollection, model.id), { name });
  for (const sim of simulations) {
    if (!sim.firebaseId) continue;
    const { questions, changed } = renameModelInQuestions(sim.questions, model.url, name);
    if (changed) batch.update(doc(firestoreDB, 'labSimulations', sim.firebaseId), { questions });
  }
  await batch.commit();
};

export class ModelInUseError extends Error {}

// Só apaga peça que nenhum Lab usa — senão as questões desses Labs ficariam sem a peça.
export const deleteAnatomyModel = async (model: AnatomyModelAsset, simulations: readonly LabSimulation[]) => {
  const usage = modelUsage(model.url, simulations);
  if (usage.length > 0) {
    throw new ModelInUseError(`A peça está em uso em: ${usage.map((u) => u.title).join(', ')}.`);
  }
  await deleteDoc(doc(modelsCollection, model.id));
  await deleteFileByUrl(model.url);
};
