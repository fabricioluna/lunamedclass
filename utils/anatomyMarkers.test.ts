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
} from './anatomyMarkers';
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
