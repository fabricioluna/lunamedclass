import type { AnatomyMarker, AnatomyCameraView, AnatomyPaintStroke, LabModel3D, LabQuestion, LabSimulation } from '../types';

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

const isValidStroke = (stroke: AnatomyPaintStroke): boolean =>
  Number.isFinite(stroke.radius) &&
  stroke.radius > 0 &&
  Array.isArray(stroke.points) &&
  stroke.points.length >= 3 &&
  stroke.points.length % 3 === 0 &&
  Array.isArray(stroke.normals) &&
  stroke.normals.length === stroke.points.length &&
  [...stroke.points, ...stroke.normals].every((n) => Number.isFinite(n));

export const isValidMarker = (marker: AnatomyMarker | null | undefined): marker is AnatomyMarker => {
  if (!marker) return false;
  if (marker.type === 'pin') return isFiniteVec3(marker.position) && isFiniteVec3(marker.direction);
  if (marker.type === 'paint') return Array.isArray(marker.strokes) && marker.strokes.length > 0 && marker.strokes.every(isValidStroke);
  if (marker.radius !== undefined && !(Number.isFinite(marker.radius) && marker.radius > 0)) return false;
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

// === VÁRIAS MARCAS POR QUESTÃO (item 6.22) ===

const EMPTY_MARKERS: AnatomyMarker[] = [];

// Lê as marcas de uma questão nos dois formatos (lista nova ou `marker` único das questões
// antigas). Devolve a MESMA lista quando já está no formato novo — o visualizador refaz a
// cena quando a identidade muda, e recalcular o marca-texto a cada render custa caro.
export const questionMarkers = (model: LabModel3D | undefined): AnatomyMarker[] => {
  if (!model) return EMPTY_MARKERS;
  if (model.markers) return model.markers;
  return model.marker ? [model.marker] : EMPTY_MARKERS;
};

// Alfinete/linha somam à lista. O marca-texto é uma área só por questão: o traço novo chega
// já com todos os traços anteriores e substitui a pintura que existia, indo para o fim da
// lista — assim "desfazer" sempre age sobre o que foi feito por último.
export const addMarkerToList = (list: readonly AnatomyMarker[], marker: AnatomyMarker): AnatomyMarker[] => {
  if (marker.type !== 'paint') return [...list, marker];
  return [...list.filter((m) => m.type !== 'paint'), marker];
};

export const undoLastMarker = (list: readonly AnatomyMarker[]): AnatomyMarker[] => {
  const last = list[list.length - 1];
  if (!last) return [];
  if (last.type === 'paint' && last.strokes.length > 1) {
    return [...list.slice(0, -1), { type: 'paint', strokes: last.strokes.slice(0, -1) }];
  }
  return list.slice(0, -1);
};

export const paintStrokesOf = (list: readonly AnatomyMarker[]): AnatomyPaintStroke[] =>
  list.flatMap((m) => (m.type === 'paint' ? m.strokes : []));

export const hasAny3DQuestion = (sim: LabSimulation): boolean => sim.questions.some(is3DQuestion);

// Arquivos que PERTENCEM ao Lab: só as imagens das lâminas. As peças 3D pertencem ao banco de
// peças (item 6.24) e podem estar em outros Labs — apagar ou editar um Lab nunca apaga peça.
export const collectStorageUrls = (questions: readonly LabQuestion[]): string[] => {
  const urls = new Set<string>();
  for (const q of questions) {
    if (q.imageUrl) urls.add(q.imageUrl);
  }
  return [...urls];
};

// Imagens que deixaram de ser usadas depois de editar um Lab.
export const findOrphanUrls = (before: readonly LabQuestion[], after: readonly LabQuestion[]): string[] => {
  const kept = new Set(collectStorageUrls(after));
  return collectStorageUrls(before).filter((url) => !kept.has(url));
};

// === MARCA-TEXTO ===

// Tinta cheia até 60% do raio e esmaecendo até a borda: sem isso a borda sai serrilhada no
// tamanho dos triângulos da malha.
const PAINT_SOLID_FRACTION = 0.6;
// Vértice voltado para o lado oposto ao do pincel não recebe tinta — é o outro lado de um osso
// fino (arco zigomático, lâminas do etmoide), que a distância 3D sozinha pintaria junto.
const PAINT_MIN_FACING = 0;

export const PAINT_MAX_ALPHA = 0.45;

// Espessura do marca-texto: escala 1–10 do editor → raio proporcional ao tamanho da peça
// (1 ≈ 0,4% da diagonal, 10 ≈ 4%). Proporcional porque a mesma escala serve para um crânio e
// para uma falange.
export const PAINT_SIZE_MIN = 1;
export const PAINT_SIZE_MAX = 10;
export const paintRadiusFor = (diag: number, size: number) => diag * 0.004 * size;

// Espessura da linha (livre e reta), mesma escala 1–10. O padrão 3 reproduz a espessura das
// linhas salvas antes de existir a regulagem (0,35% da diagonal).
export const LINE_SIZE_DEFAULT = 3;
export const lineRadiusFor = (diag: number, size: number) => diag * (0.0035 / LINE_SIZE_DEFAULT) * size;
export const lineRadiusOf = (marker: { radius?: number }, diag: number) =>
  marker.radius ?? lineRadiusFor(diag, LINE_SIZE_DEFAULT);

// Pinta um ponto do pincel sobre os vértices, em `alpha` (0..maxAlpha por vértice). Usa o
// MAIOR valor, não soma: traços sobrepostos não escurecem — é uma área marcada, não camadas.
export const accumulatePaintPoint = (
  alpha: Float32Array,
  positions: ArrayLike<number>,
  normals: ArrayLike<number> | null,
  point: readonly number[],
  normal: readonly number[],
  radius: number,
  maxAlpha: number = PAINT_MAX_ALPHA,
): void => {
  const solid = radius * PAINT_SOLID_FRACTION;
  const r2 = radius * radius;
  for (let v = 0; v < alpha.length; v++) {
    const dx = positions[v * 3] - point[0];
    const dy = positions[v * 3 + 1] - point[1];
    const dz = positions[v * 3 + 2] - point[2];
    const d2 = dx * dx + dy * dy + dz * dz;
    if (d2 > r2) continue;
    if (normals) {
      const facing = normals[v * 3] * normal[0] + normals[v * 3 + 1] * normal[1] + normals[v * 3 + 2] * normal[2];
      if (facing < PAINT_MIN_FACING) continue;
    }
    const d = Math.sqrt(d2);
    const a = d <= solid ? maxAlpha : maxAlpha * (1 - (d - solid) / (radius - solid));
    if (a > alpha[v]) alpha[v] = a;
  }
};

export const computePaintAlpha = (
  positions: ArrayLike<number>,
  normals: ArrayLike<number> | null,
  strokes: readonly AnatomyPaintStroke[],
  maxAlpha: number = PAINT_MAX_ALPHA,
): Float32Array => {
  const alpha = new Float32Array(positions.length / 3);
  for (const stroke of strokes) {
    for (let i = 0; i + 2 < stroke.points.length; i += 3) {
      accumulatePaintPoint(
        alpha, positions, normals,
        [stroke.points[i], stroke.points[i + 1], stroke.points[i + 2]],
        [stroke.normals[i], stroke.normals[i + 1], stroke.normals[i + 2]],
        stroke.radius, maxAlpha,
      );
    }
  }
  return alpha;
};

// Firestore: limite de 1 MB por documento, e o Lab inteiro (todas as questões) é um documento
// só. Marca-texto é a marcação que mais ocupa; o editor avisa antes de estourar.
export const FIRESTORE_DOC_SAFE_BYTES = 900_000;
export const estimateDocBytes = (data: unknown): number => new TextEncoder().encode(JSON.stringify(data)).length;
