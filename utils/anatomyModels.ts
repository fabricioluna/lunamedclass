import type { AnatomyModelAsset, LabQuestion, LabSimulation } from '../types';

// Banco de peças 3D (item 6.24). A ligação entre o banco e as questões dos Labs é a URL do
// arquivo: cada upload gera uma URL única, e as questões já guardam `model3d.modelUrl`.

export interface ModelUsage {
  simulationId: string;
  title: string;
  disciplineId: string;
  unit?: string;
  questionCount: number;
}

const simulationKey = (sim: LabSimulation) => sim.firebaseId || sim.id;

export const modelUsage = (url: string, simulations: readonly LabSimulation[]): ModelUsage[] =>
  simulations
    .map((sim) => ({
      simulationId: simulationKey(sim),
      title: sim.title,
      disciplineId: sim.disciplineId,
      unit: sim.unit,
      questionCount: sim.questions.filter((q) => q.model3d?.modelUrl === url).length,
    }))
    .filter((u) => u.questionCount > 0);

// Peças já usadas em Labs que ainda não estão no banco — as que foram subidas antes do banco
// existir. Entram no banco sozinhas, sem o admin refazer nada.
export const unregisteredModels = (
  simulations: readonly LabSimulation[],
  assets: readonly AnatomyModelAsset[],
): { url: string; name: string }[] => {
  const known = new Set(assets.map((a) => a.url));
  const found = new Map<string, string>();
  for (const sim of simulations) {
    for (const q of sim.questions) {
      const model = q.model3d;
      if (model && !known.has(model.modelUrl) && !found.has(model.modelUrl)) found.set(model.modelUrl, model.modelName);
    }
  }
  return [...found].map(([url, name]) => ({ url, name }));
};

// Renomear no banco atualiza o nome que o aluno vê em todos os Labs que usam a peça.
export const renameModelInQuestions = (
  questions: readonly LabQuestion[],
  url: string,
  name: string,
): { questions: LabQuestion[]; changed: boolean } => {
  let changed = false;
  const next = questions.map((q) => {
    if (q.model3d?.modelUrl !== url || q.model3d.modelName === name) return q;
    changed = true;
    return { ...q, model3d: { ...q.model3d, modelName: name } };
  });
  return { questions: next, changed };
};

export const formatMegabytes = (bytes: number) => `${(bytes / 1024 / 1024).toFixed(1).replace('.', ',')} MB`;
