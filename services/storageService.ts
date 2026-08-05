import { storage } from '../firebase';
import { ref as storageRef, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';

export const uploadFile = async (path: string, file: File): Promise<string> => {
  const sRef = storageRef(storage, path);
  const snap = await uploadBytes(sRef, file);
  return getDownloadURL(snap.ref);
};

export const deleteFileByUrl = async (url: string): Promise<void> => {
  if (!url.includes('firebasestorage')) return;
  try {
    await deleteObject(storageRef(storage, url));
  } catch {
    // arquivo já apagado ou nunca existiu no Storage — não bloqueia a exclusão do registro
  }
};
