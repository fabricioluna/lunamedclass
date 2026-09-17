import { firestoreDB } from '../firebase';
import { doc, getDoc, setDoc, onSnapshot, updateDoc, deleteField } from 'firebase/firestore';
import { Period, SimulationInfo, FeatureFlag, ReferenceMaterial, AreaConhecimento, SubareaConhecimento, AcademicUnit, SimulatorLocks } from '../types';
import { setItemField, removeItemField } from '../utils/configItems';
import { setFeatureLock } from '../utils/featureLocks';

// Coleção "config": docs únicos (config/periods, config/disciplines, config/featureFlags) —
// 1 leitura por app em vez de N. Ver PLANO-REESTRUTURACAO.md, item 3.1.
const periodsDocRef = doc(firestoreDB, 'config', 'periods');
const disciplinesDocRef = doc(firestoreDB, 'config', 'disciplines');
const featureFlagsDocRef = doc(firestoreDB, 'config', 'featureFlags');
// config/areasConhecimento e config/subareasConhecimento têm leitura pública nas Security
// Rules (Etapa 6) — as demais acima exigem login. Ver firestore.rules.
const areasConhecimentoDocRef = doc(firestoreDB, 'config', 'areasConhecimento');
const subareasConhecimentoDocRef = doc(firestoreDB, 'config', 'subareasConhecimento');
// Mesma exceção de leitura pública, pro slug de cada tipo de simulador (AVAILABLE_SIMULATOR_TYPES)
// aparecer travado/liberado em /simulators sem exigir login. Ver firestore.rules.
const simulatorAccessDocRef = doc(firestoreDB, 'config', 'simulatorAccess');

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
    (snap) => {
      const items = (snap.data()?.items as SimulationInfo[]) || [];
      // Documentos gravados antes do campo `themes` existir (ou criados fora do seed)
      // podem não ter o array — normaliza aqui para evitar `undefined` propagando para
      // todo consumidor (`[...disc.themes]`, `disc.themes.map`, etc.).
      onData(items.map(d => ({ ...d, themes: d.themes || [] })));
    },
    onError
  );
};

export const subscribeToFeatureFlags = (
  onData: (flags: FeatureFlag[]) => void,
  onError?: (error: unknown) => void
) => {
  return onSnapshot(
    featureFlagsDocRef,
    (snap) => {
      const items = (snap.data()?.items as Record<string, FeatureFlag>) || {};
      onData(Object.keys(items).map((id) => ({ ...items[id], firebaseId: id })));
    },
    (error) => onError?.(error)
  );
};

// Área e Subárea são dois eixos independentes (sem cascata), mas com o mesmo formato
// { id, label } e o mesmo padrão de leitura/escrita — generalizado aqui em vez de duplicado.
const subscribeToTagList = <T extends { id: string; label: string }>(
  docRef: ReturnType<typeof doc>,
  onData: (items: T[]) => void,
  onError?: (error: unknown) => void
) => {
  return onSnapshot(
    docRef,
    (snap) => onData((snap.data()?.items as T[]) || []),
    (error) => onError?.(error)
  );
};

export const subscribeToAreasConhecimento = (
  onData: (areas: AreaConhecimento[]) => void,
  onError?: (error: unknown) => void
) => subscribeToTagList<AreaConhecimento>(areasConhecimentoDocRef, onData, onError);

export const subscribeToSubareasConhecimento = (
  onData: (subareas: SubareaConhecimento[]) => void,
  onError?: (error: unknown) => void
) => subscribeToTagList<SubareaConhecimento>(subareasConhecimentoDocRef, onData, onError);

// Doc é o próprio mapa slug → travado (sem `items`, ao contrário das listas acima) — não há
// metadado por entrada além do booleano, então um wrapper só complicaria a leitura no admin.
export const subscribeToSimulatorAccess = (
  onData: (locks: SimulatorLocks) => void,
  onError?: (error: unknown) => void
) => {
  return onSnapshot(
    simulatorAccessDocRef,
    (snap) => onData((snap.data() as SimulatorLocks) || {}),
    (error) => onError?.(error)
  );
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
  await setDoc(disciplinesDocRef, { items: setItemField(items, disciplineId, field, value) });
};

const getPeriodsArray = async (): Promise<Period[]> => {
  const snap = await getDoc(periodsDocRef);
  return (snap.data()?.items as Period[]) || [];
};

// Escrita pontual em config/periods (item 6.2). Existe justamente para NÃO precisar de
// `seedBaseStructure()` para trocar um brasão: aquele regrava periods e disciplines inteiros
// a partir dos arquivos locais, apagando tudo que o admin editou pelo painel.
const updatePeriodField = async <K extends keyof Period>(
  periodId: string,
  field: K,
  value: Period[K]
) => {
  const items = await getPeriodsArray();
  await setDoc(periodsDocRef, { items: setItemField(items, periodId, field, value) });
};

export const updatePeriodIcon = (periodId: string, icon: string) =>
  updatePeriodField(periodId, 'icon', icon);

// `crest` é opcional: sem brasão, PeriodSelectionView cai no emoji de `icon` (é o estado de
// 11 dos 12 períodos). Passar null remove a chave em vez de gravar undefined, que o Firestore
// recusaria.
export const updatePeriodCrest = async (periodId: string, crest: string | null) => {
  const items = await getPeriodsArray();
  const updated = crest
    ? setItemField(items, periodId, 'crest', crest)
    : removeItemField(items, periodId, 'crest');
  await setDoc(periodsDocRef, { items: updated });
};

export const updateDisciplineThemes = (disciplineId: string, themes: string[]) =>
  updateDisciplineField(disciplineId, 'themes', themes);

export const updateDisciplineReferences = (disciplineId: string, references: ReferenceMaterial[]) =>
  updateDisciplineField(disciplineId, 'references', references);

export const toggleDisciplineStatus = async (disciplineId: string, currentStatus: string) => {
  const newStatus = currentStatus === 'active' ? 'locked' : 'active';
  await updateDisciplineField(disciplineId, 'status', newStatus as SimulationInfo['status']);
};

// Escopo 'all' mexe nas duas unidades; N1/N2 preserva a outra (item 6.8). A regra de como isso
// vira entrada no array vive em utils/featureLocks.ts, testada isoladamente.
export const setDisciplineFeatureLock = async (
  disciplineId: string,
  featureId: string,
  scope: AcademicUnit | 'all',
  shouldLock: boolean
) => {
  const items = await getDisciplinesArray();
  const target = items.find((d) => d.id === disciplineId);
  if (!target) return;
  await updateDisciplineField(
    disciplineId,
    'lockedFeatures',
    setFeatureLock(target.lockedFeatures, featureId, scope, shouldLock)
  );
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

const getTagListArray = async <T extends { id: string; label: string }>(
  docRef: ReturnType<typeof doc>
): Promise<T[]> => {
  const snap = await getDoc(docRef);
  return (snap.data()?.items as T[]) || [];
};

const createTagListEntry = async <T extends { id: string; label: string }>(
  docRef: ReturnType<typeof doc>,
  idPrefix: string,
  label: string
) => {
  const items = await getTagListArray<T>(docRef);
  const newItem = { id: `${idPrefix}_${Date.now()}`, label } as T;
  await setDoc(docRef, { items: [...items, newItem] });
};

const renameTagListEntry = async <T extends { id: string; label: string }>(
  docRef: ReturnType<typeof doc>,
  id: string,
  label: string
) => {
  const items = await getTagListArray<T>(docRef);
  const updated = items.map((item) => (item.id === id ? { ...item, label } : item));
  await setDoc(docRef, { items: updated });
};

const deleteTagListEntry = async <T extends { id: string; label: string }>(
  docRef: ReturnType<typeof doc>,
  id: string
) => {
  const items = await getTagListArray<T>(docRef);
  await setDoc(docRef, { items: items.filter((item) => item.id !== id) });
};

// setDoc com merge: o doc pode ainda não existir na primeira vez que o admin trava um tipo.
export const setSimulatorLocked = (slug: string, isLocked: boolean) =>
  setDoc(simulatorAccessDocRef, { [slug]: isLocked }, { merge: true });

export const createAreaConhecimento = (label: string) =>
  createTagListEntry<AreaConhecimento>(areasConhecimentoDocRef, 'area', label);
export const renameAreaConhecimento = (id: string, label: string) =>
  renameTagListEntry<AreaConhecimento>(areasConhecimentoDocRef, id, label);
export const deleteAreaConhecimento = (id: string) =>
  deleteTagListEntry<AreaConhecimento>(areasConhecimentoDocRef, id);

export const createSubareaConhecimento = (label: string) =>
  createTagListEntry<SubareaConhecimento>(subareasConhecimentoDocRef, 'subarea', label);
export const renameSubareaConhecimento = (id: string, label: string) =>
  renameTagListEntry<SubareaConhecimento>(subareasConhecimentoDocRef, id, label);
export const deleteSubareaConhecimento = (id: string) =>
  deleteTagListEntry<SubareaConhecimento>(subareasConhecimentoDocRef, id);

export const resetConfigCollections = async () => {
  await Promise.all([
    setDoc(periodsDocRef, { items: [] }),
    setDoc(disciplinesDocRef, { items: [] }),
    setDoc(featureFlagsDocRef, { items: {} }),
  ]);
};
