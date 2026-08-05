import { firestoreDB } from '../firebase';
import { doc, getDoc, setDoc, onSnapshot, updateDoc, deleteField } from 'firebase/firestore';
import { Period, SimulationInfo, FeatureFlag, ReferenceMaterial } from '../types';

// Coleção "config": docs únicos (config/periods, config/disciplines, config/featureFlags) —
// 1 leitura por app em vez de N. Ver PLANO-REESTRUTURACAO.md, item 3.1.
const periodsDocRef = doc(firestoreDB, 'config', 'periods');
const disciplinesDocRef = doc(firestoreDB, 'config', 'disciplines');
const featureFlagsDocRef = doc(firestoreDB, 'config', 'featureFlags');

export const subscribeToPeriods = (
  onData: (periods: Period[]) => void,
  onError: () => void
) => {
  return onSnapshot(
    periodsDocRef,
    (snap) => onData((snap.data()?.items as Period[]) || []),
    onError
  );
};

export const subscribeToDisciplines = (
  onData: (disciplines: SimulationInfo[]) => void,
  onError: () => void
) => {
  return onSnapshot(
    disciplinesDocRef,
    (snap) => onData((snap.data()?.items as SimulationInfo[]) || []),
    onError
  );
};

export const subscribeToFeatureFlags = (onData: (flags: FeatureFlag[]) => void) => {
  return onSnapshot(featureFlagsDocRef, (snap) => {
    const items = (snap.data()?.items as Record<string, FeatureFlag>) || {};
    onData(Object.keys(items).map((id) => ({ ...items[id], firebaseId: id })));
  });
};

// === ESCRITA (ADMIN) ===

export const seedBaseStructure = async (periods: Period[], disciplines: SimulationInfo[]) => {
  await Promise.all([
    setDoc(periodsDocRef, { items: periods }),
    setDoc(disciplinesDocRef, { items: disciplines }),
  ]);
};

const getDisciplinesArray = async (): Promise<SimulationInfo[]> => {
  const snap = await getDoc(disciplinesDocRef);
  return (snap.data()?.items as SimulationInfo[]) || [];
};

const updateDisciplineField = async <K extends keyof SimulationInfo>(
  disciplineId: string,
  field: K,
  value: SimulationInfo[K]
) => {
  const items = await getDisciplinesArray();
  const updated = items.map((d) => (d.id === disciplineId ? { ...d, [field]: value } : d));
  await setDoc(disciplinesDocRef, { items: updated });
};

export const updateDisciplineThemes = (disciplineId: string, themes: string[]) =>
  updateDisciplineField(disciplineId, 'themes', themes);

export const updateDisciplineReferences = (disciplineId: string, references: ReferenceMaterial[]) =>
  updateDisciplineField(disciplineId, 'references', references);

export const toggleDisciplineStatus = async (disciplineId: string, currentStatus: string) => {
  const newStatus = currentStatus === 'active' ? 'locked' : 'active';
  await updateDisciplineField(disciplineId, 'status', newStatus as SimulationInfo['status']);
};

export const toggleDisciplineFeature = async (
  disciplineId: string,
  featureId: string,
  isCurrentlyLocked: boolean
) => {
  const items = await getDisciplinesArray();
  const target = items.find((d) => d.id === disciplineId);
  if (!target) return;
  let lockedFeatures = target.lockedFeatures ? [...target.lockedFeatures] : [];
  if (isCurrentlyLocked) lockedFeatures = lockedFeatures.filter((id) => id !== featureId);
  else if (!lockedFeatures.includes(featureId)) lockedFeatures.push(featureId);
  await updateDisciplineField(disciplineId, 'lockedFeatures', lockedFeatures);
};

const DEFAULT_FLAGS: Record<string, FeatureFlag> = {
  pesquisa_institucional: { name: 'pesquisa_institucional', description: 'Libera o botão de pesquisa de satisfação (NPS) no portal do aluno.', isEnabled: false },
  osce_ia_paciente: { name: 'osce_ia_paciente', description: 'Ativa o motor de Inteligência Artificial para o Paciente Virtual.', isEnabled: true },
  osce_rpg_dinamico: { name: 'osce_rpg_dinamico', description: 'Ativa a Luna Engine 2.0 para cenários de RPG interativo.', isEnabled: true },
  lab_virtual_microscopia: { name: 'lab_virtual_microscopia', description: 'Libera o laboratório de identificação visual (Histologia/Anatomia).', isEnabled: true },
  modo_semana_provas: { name: 'modo_semana_provas', description: 'Trava conteúdos práticos e foca a plataforma apenas em quizzes teóricos.', isEnabled: false },
  central_materiais: { name: 'central_materiais', description: 'Ativa a visualização da nuvem de resumos e scripts.', isEnabled: true },
};

export const seedDefaultFlags = async () => {
  const updates: Record<string, FeatureFlag> = {};
  for (const [id, flag] of Object.entries(DEFAULT_FLAGS)) {
    updates[`items.${id}`] = flag;
  }
  // setDoc com merge garante que o doc existe mesmo na primeira vez (updateDoc falharia se
  // config/featureFlags ainda não tivesse sido criado).
  await setDoc(featureFlagsDocRef, {}, { merge: true });
  await updateDoc(featureFlagsDocRef, updates);
};

export const createFeatureFlag = async (name: string, description: string) => {
  await setDoc(featureFlagsDocRef, {}, { merge: true });
  await updateDoc(featureFlagsDocRef, {
    [`items.${name}`]: { name, description, isEnabled: false },
  });
};

export const toggleFeatureFlag = (id: string, isEnabled: boolean) =>
  updateDoc(featureFlagsDocRef, { [`items.${id}.isEnabled`]: isEnabled });

export const deleteFeatureFlag = (id: string) =>
  updateDoc(featureFlagsDocRef, { [`items.${id}`]: deleteField() });

export const resetConfigCollections = async () => {
  await Promise.all([
    setDoc(periodsDocRef, { items: [] }),
    setDoc(disciplinesDocRef, { items: [] }),
    setDoc(featureFlagsDocRef, { items: {} }),
  ]);
};
