import type { AnatomyMarker, AnatomyCameraView, LabQuestion, LabSimulation } from '../types';

export type Vec3 = [number, number, number];

// Coordenadas vêm em metros (Object Capture). 5 casas = 0,01 mm, muito abaixo do que se
// enxerga na tela, e encolhe bastante o documento do Firestore (limite de 1 MB por doc, e
// o Lab inteiro com todas as questões vive num documento só).
const round = (n: number) => Math.round(n * 1e5) / 1e5;

export const roundVec = (v: readonly number[]): number[] => v.map(round);

export const flattenPoints = (points: readonly Vec3[]): number[] =>
  points.flatMap((p) => roundVec(p));

export const unflattenPoints = (flat: readonly number[]): Vec3[] => {
  const out: Vec3[] = [];
  for (let i = 0; i + 2 < flat.length; i += 3) out.push([flat[i], flat[i + 1], flat[i + 2]]);
  return out;
};

const distance = (a: Vec3, b: Vec3) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

// O traço à mão livre dispara dezenas de eventos por segundo; sem descartar pontos muito
// próximos, uma sutura viraria milhares de coordenadas sem ganho visual nenhum.
export const appendStrokePoint = (points: Vec3[], p: Vec3, minDistance: number): Vec3[] => {
  const last = points[points.length - 1];
  if (last && distance(last, p) < minDistance) return points;
  return [...points, p];
};

const isFiniteVec3 = (v: unknown): v is number[] =>
  Array.isArray(v) && v.length === 3 && v.every((n) => typeof n === 'number' && Number.isFinite(n));

export const isValidMarker = (marker: AnatomyMarker | null | undefined): marker is AnatomyMarker => {
  if (!marker) return false;
  if (marker.type === 'pin') return isFiniteVec3(marker.position) && isFiniteVec3(marker.direction);
  return (
    Array.isArray(marker.points) &&
    marker.points.length >= 6 &&
    marker.points.length % 3 === 0 &&
    marker.points.every((n) => Number.isFinite(n))
  );
};

export const isValidCameraView = (view: AnatomyCameraView | null | undefined): view is AnatomyCameraView =>
  !!view && isFiniteVec3(view.position) && isFiniteVec3(view.target);

export const is3DQuestion = (q: LabQuestion): boolean => !!q.model3d;

export const hasAny3DQuestion = (sim: LabSimulation): boolean => sim.questions.some(is3DQuestion);

// Várias questões apontam para a mesma peça: ao apagar o Lab, cada arquivo sai uma vez só.
export const collectStorageUrls = (questions: readonly LabQuestion[]): string[] => {
  const urls = new Set<string>();
  for (const q of questions) {
    if (q.imageUrl) urls.add(q.imageUrl);
    if (q.model3d?.modelUrl) urls.add(q.model3d.modelUrl);
  }
  return [...urls];
};

// Arquivos que deixaram de ser usados depois de editar um Lab (peça removida no editor).
export const findOrphanUrls = (before: readonly LabQuestion[], after: readonly LabQuestion[]): string[] => {
  const kept = new Set(collectStorageUrls(after));
  return collectStorageUrls(before).filter((url) => !kept.has(url));
};
