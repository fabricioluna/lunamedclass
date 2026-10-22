import app from '../firebase';

// O SDK do Storage só é usado por quem envia ou apaga arquivo (admin, materiais), mas
// ficava no pacote inicial de todo aluno. Carregado sob demanda desde o item 6.19.
const loadStorage = async () => {
  const mod = await import('firebase/storage');
  return { ...mod, storage: mod.getStorage(app) };
};

export const uploadFile = async (path: string, file: File): Promise<string> => {
  const { storage, ref, uploadBytes, getDownloadURL } = await loadStorage();
  const snap = await uploadBytes(ref(storage, path), file);
  return getDownloadURL(snap.ref);
};

export const deleteFileByUrl = async (url: string): Promise<void> => {
  if (!url.includes('firebasestorage')) return;
  try {
    const { storage, ref, deleteObject } = await loadStorage();
    await deleteObject(ref(storage, url));
  } catch {
    // arquivo já apagado ou nunca existiu no Storage — não bloqueia a exclusão do registro
  }
};
