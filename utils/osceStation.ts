import type { StaticOsceDistractor, StaticOsceStation, StaticOsceStep } from '../types';

export interface NormalizedStaticStation {
  steps: StaticOsceStep[];
  distractors: StaticOsceDistractor[];
}

// Estações cadastradas antes do item 6.17 só têm actionCloud + correctOrderIndices. O player
// trabalha sempre com passos/distratores, então o formato antigo é convertido aqui.
export const normalizeStaticStation = (
  station: Pick<StaticOsceStation, 'steps' | 'distractors' | 'actionCloud' | 'correctOrderIndices'>
): NormalizedStaticStation => {
  if (station.steps && station.steps.length > 0) {
    return { steps: station.steps, distractors: station.distractors ?? [] };
  }

  const cloud = station.actionCloud ?? [];
  const order = (station.correctOrderIndices ?? []).filter((idx) => cloud[idx] !== undefined);
  const usedIndices = new Set(order);

  return {
    steps: order.map((idx) => ({ action: cloud[idx] })),
    distractors: cloud.flatMap((action, idx) => (usedIndices.has(idx) ? [] : [{ action }])),
  };
};

// Um botão por ação distinta (o passo repetido no gabarito aparece uma vez só), em ordem
// aleatória a cada tentativa — se a nuvem saísse na ordem do cadastro, entregaria o gabarito.
export const buildActionCloud = (
  { steps, distractors }: NormalizedStaticStation,
  random: () => number = Math.random
): string[] => {
  const actions = Array.from(new Set([...steps.map((s) => s.action), ...distractors.map((d) => d.action)]));
  for (let i = actions.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [actions[i], actions[j]] = [actions[j], actions[i]];
  }
  return actions;
};

// "Por quê" de uma ação, procurando primeiro nos passos e depois nos distratores.
export const explanationFor = ({ steps, distractors }: NormalizedStaticStation, action: string): string | undefined =>
  steps.find((s) => s.action === action && s.why)?.why ?? distractors.find((d) => d.action === action)?.why;
