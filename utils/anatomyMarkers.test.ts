import { describe, it, expect } from 'vitest';
import {
  flattenPoints,
  unflattenPoints,
  appendStrokePoint,
  isValidMarker,
  isValidCameraView,
  collectStorageUrls,
  findOrphanUrls,
  hasAny3DQuestion,
  roundVec,
  Vec3,
  computePaintAlpha,
  accumulatePaintPoint,
  estimateDocBytes,
  PAINT_MAX_ALPHA,
  questionMarkers,
  addMarkerToList,
  undoLastMarker,
  paintStrokesOf,
} from './anatomyMarkers';
import type { AnatomyMarker } from '../types';
import type { LabQuestion, LabSimulation } from '../types';

const pinQuestion = (id: string, modelUrl: string): LabQuestion => ({
  id,
  question: 'Qual estrutura está indicada?',
  answer: 'Forame magno',
  model3d: { modelUrl, modelName: 'cranio', marker: { type: 'pin', position: [0, 0, 0], direction: [0, 1, 0] } },
});

describe('flattenPoints / unflattenPoints', () => {
  it('ida e volta preserva os pontos (arredondados a 5 casas)', () => {
    const pts: Vec3[] = [[0.1234567, 1, 2], [3, 4, 5]];
    const flat = flattenPoints(pts);
    expect(flat).toEqual([0.12346, 1, 2, 3, 4, 5]);
    expect(unflattenPoints(flat)).toEqual([[0.12346, 1, 2], [3, 4, 5]]);
  });

  it('ignora sobra incompleta no fim do array achatado', () => {
    expect(unflattenPoints([1, 2, 3, 4, 5])).toEqual([[1, 2, 3]]);
  });

  it('roundVec arredonda cada coordenada', () => {
    expect(roundVec([0.000004, -0.000006, 1])).toEqual([0, -0.00001, 1]);
  });
});

describe('appendStrokePoint', () => {
  it('aceita o primeiro ponto', () => {
    expect(appendStrokePoint([], [0, 0, 0], 0.01)).toEqual([[0, 0, 0]]);
  });

  it('descarta ponto mais perto que a distância mínima', () => {
    const pts: Vec3[] = [[0, 0, 0]];
    expect(appendStrokePoint(pts, [0.005, 0, 0], 0.01)).toBe(pts);
  });

  it('aceita ponto a partir da distância mínima', () => {
    expect(appendStrokePoint([[0, 0, 0]], [0.01, 0, 0], 0.01)).toHaveLength(2);
  });
});

describe('isValidMarker', () => {
  it('alfinete precisa de posição e direção com 3 números finitos', () => {
    expect(isValidMarker({ type: 'pin', position: [0, 0, 0], direction: [0, 1, 0] })).toBe(true);
    expect(isValidMarker({ type: 'pin', position: [0, 0], direction: [0, 1, 0] })).toBe(false);
    expect(isValidMarker({ type: 'pin', position: [0, NaN, 0], direction: [0, 1, 0] })).toBe(false);
  });

  it('linha precisa de pelo menos 2 pontos completos', () => {
    expect(isValidMarker({ type: 'line', points: [0, 0, 0, 1, 1, 1] })).toBe(true);
    expect(isValidMarker({ type: 'line', points: [0, 0, 0] })).toBe(false);
    expect(isValidMarker({ type: 'line', points: [0, 0, 0, 1, 1] })).toBe(false);
  });

  it('ausente é inválido', () => {
    expect(isValidMarker(null)).toBe(false);
    expect(isValidMarker(undefined)).toBe(false);
  });
});

describe('isValidCameraView', () => {
  it('exige posição e alvo', () => {
    expect(isValidCameraView({ position: [0, 0, 1], target: [0, 0, 0] })).toBe(true);
    expect(isValidCameraView({ position: [0, 0, 1], target: [0, 0] })).toBe(false);
    expect(isValidCameraView(undefined)).toBe(false);
  });
});

describe('collectStorageUrls / findOrphanUrls', () => {
  const imageQ: LabQuestion = { id: 'img', imageUrl: 'https://x/img.jpg', question: 'q', answer: 'a' };

  it('lista cada arquivo uma vez, mesmo com várias questões na mesma peça', () => {
    const urls = collectStorageUrls([pinQuestion('a', 'https://x/cranio.glb'), pinQuestion('b', 'https://x/cranio.glb'), imageQ]);
    expect(urls.sort()).toEqual(['https://x/cranio.glb', 'https://x/img.jpg']);
  });

  it('acha só a peça que saiu do Lab depois da edição', () => {
    const before = [pinQuestion('a', 'https://x/cranio.glb'), pinQuestion('b', 'https://x/femur.glb')];
    const after = [pinQuestion('a', 'https://x/cranio.glb')];
    expect(findOrphanUrls(before, after)).toEqual(['https://x/femur.glb']);
  });

  it('peça ainda usada por outra questão não é órfã', () => {
    const before = [pinQuestion('a', 'https://x/cranio.glb'), pinQuestion('b', 'https://x/cranio.glb')];
    expect(findOrphanUrls(before, [before[0]])).toEqual([]);
  });

  it('hasAny3DQuestion distingue Lab de imagens de Lab 3D', () => {
    const base: Omit<LabSimulation, 'questions'> = { id: 's', disciplineId: 'd', title: 't', author: 'a', description: '' };
    expect(hasAny3DQuestion({ ...base, questions: [imageQ] })).toBe(false);
    expect(hasAny3DQuestion({ ...base, questions: [imageQ, pinQuestion('a', 'u')] })).toBe(true);
  });
});

describe('marca-texto', () => {
  // 4 vértices numa linha no eixo X, todos com a normal para cima (+Y)
  const positions = [0, 0, 0, 0.005, 0, 0, 0.009, 0, 0, 0.05, 0, 0];
  const up = [0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0];
  const stroke = { radius: 0.01, points: [0, 0, 0], normals: [0, 1, 0] };

  it('pinta cheio perto do pincel, esmaece na borda e não alcança fora do raio', () => {
    const alpha = computePaintAlpha(positions, up, [stroke]);
    expect(alpha[0]).toBeCloseTo(PAINT_MAX_ALPHA);
    expect(alpha[1]).toBeCloseTo(PAINT_MAX_ALPHA); // 5 mm < 60% de 10 mm
    expect(alpha[2]).toBeGreaterThan(0);
    expect(alpha[2]).toBeLessThan(PAINT_MAX_ALPHA); // 9 mm: na faixa que esmaece
    expect(alpha[3]).toBe(0); // 5 cm: fora do raio
  });

  it('não atravessa para o outro lado de um osso fino (normal oposta)', () => {
    const down = [0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0];
    expect(Array.from(computePaintAlpha(positions, down, [stroke]))).toEqual([0, 0, 0, 0]);
  });

  it('traços sobrepostos não escurecem: fica o maior valor, não a soma', () => {
    const alpha = computePaintAlpha(positions, up, [stroke, stroke, stroke]);
    expect(alpha[0]).toBeCloseTo(PAINT_MAX_ALPHA);
  });

  it('accumulatePaintPoint mantém o que já estava pintado', () => {
    const alpha = new Float32Array([0.3, 0, 0, 0]);
    accumulatePaintPoint(alpha, positions, up, [0.05, 0, 0], [0, 1, 0], 0.01);
    expect(alpha[0]).toBeCloseTo(0.3);
    expect(alpha[3]).toBeCloseTo(PAINT_MAX_ALPHA);
  });

  it('isValidMarker valida traços do marca-texto', () => {
    expect(isValidMarker({ type: 'paint', strokes: [stroke] })).toBe(true);
    expect(isValidMarker({ type: 'paint', strokes: [] })).toBe(false);
    expect(isValidMarker({ type: 'paint', strokes: [{ ...stroke, radius: 0 }] })).toBe(false);
    expect(isValidMarker({ type: 'paint', strokes: [{ ...stroke, normals: [0, 1] }] })).toBe(false);
  });

  it('estimateDocBytes mede o tamanho em bytes do JSON (acentos contam 2)', () => {
    expect(estimateDocBytes({ a: 'é' })).toBe(10);
  });
});

describe('várias marcas por questão', () => {
  const pinA: AnatomyMarker = { type: 'pin', position: [0, 0, 0], direction: [0, 1, 0] };
  const pinB: AnatomyMarker = { type: 'pin', position: [1, 0, 0], direction: [0, 1, 0] };
  const line: AnatomyMarker = { type: 'line', points: [0, 0, 0, 1, 1, 1] };
  const s1 = { radius: 0.01, points: [0, 0, 0], normals: [0, 1, 0] };
  const s2 = { radius: 0.02, points: [1, 0, 0], normals: [0, 1, 0] };

  it('questionMarkers entende o formato antigo (marker único) e o novo (lista)', () => {
    expect(questionMarkers({ modelUrl: 'u', modelName: 'n', marker: pinA })).toEqual([pinA]);
    const markers = [pinA, pinB];
    expect(questionMarkers({ modelUrl: 'u', modelName: 'n', markers })).toBe(markers);
    expect(questionMarkers(undefined)).toEqual([]);
  });

  it('alfinetes e linhas somam à lista', () => {
    expect(addMarkerToList(addMarkerToList([pinA], pinB), line)).toEqual([pinA, pinB, line]);
  });

  it('marca-texto substitui a pintura anterior e vai para o fim', () => {
    const withPaint = addMarkerToList([pinA], { type: 'paint', strokes: [s1] });
    const next = addMarkerToList([...withPaint, pinB], { type: 'paint', strokes: [s1, s2] });
    expect(next).toEqual([pinA, pinB, { type: 'paint', strokes: [s1, s2] }]);
  });

  it('desfazer tira o último traço da pintura, depois a pintura, depois a marca anterior', () => {
    let list: AnatomyMarker[] = [pinA, { type: 'paint', strokes: [s1, s2] }];
    list = undoLastMarker(list);
    expect(list).toEqual([pinA, { type: 'paint', strokes: [s1] }]);
    list = undoLastMarker(list);
    expect(list).toEqual([pinA]);
    expect(undoLastMarker(list)).toEqual([]);
    expect(undoLastMarker([])).toEqual([]);
  });

  it('paintStrokesOf junta os traços de todas as pinturas da lista', () => {
    expect(paintStrokesOf([pinA, { type: 'paint', strokes: [s1] }, { type: 'paint', strokes: [s2] }])).toEqual([s1, s2]);
  });
});
