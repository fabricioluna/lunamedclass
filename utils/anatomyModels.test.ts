import { describe, it, expect } from 'vitest';
import { modelUsage, unregisteredModels, renameModelInQuestions, formatMegabytes } from './anatomyModels';
import type { AnatomyModelAsset, LabQuestion, LabSimulation } from '../types';

const q3d = (id: string, url: string, name = 'Crânio'): LabQuestion => ({
  id, question: 'q', answer: 'a',
  model3d: { modelUrl: url, modelName: name, markers: [{ type: 'pin', position: [0, 0, 0], direction: [0, 1, 0] }] },
});
const sim = (id: string, title: string, questions: LabQuestion[]): LabSimulation => ({
  id, firebaseId: `fb_${id}`, disciplineId: 'anat', unit: 'N1', title, author: 'a', description: '', questions,
});
const asset = (url: string): AnatomyModelAsset => ({ id: url, name: 'x', url, sizeBytes: 1, createdAt: 0 });

describe('banco de peças 3D', () => {
  const sims = [
    sim('s1', 'Anatomia I', [q3d('a', 'u/cranio'), q3d('b', 'u/cranio'), { id: 'img', question: 'q', answer: 'a', imageUrl: 'u/img' }]),
    sim('s2', 'Anatomia II', [q3d('c', 'u/cranio'), q3d('d', 'u/femur', 'Fêmur')]),
  ];

  it('modelUsage conta as questões de cada Lab que usam a peça', () => {
    expect(modelUsage('u/cranio', sims)).toEqual([
      { simulationId: 'fb_s1', title: 'Anatomia I', disciplineId: 'anat', unit: 'N1', questionCount: 2 },
      { simulationId: 'fb_s2', title: 'Anatomia II', disciplineId: 'anat', unit: 'N1', questionCount: 1 },
    ]);
    expect(modelUsage('u/nada', sims)).toEqual([]);
  });

  it('unregisteredModels acha as peças dos Labs fora do banco, uma vez cada', () => {
    expect(unregisteredModels(sims, [])).toEqual([
      { url: 'u/cranio', name: 'Crânio' },
      { url: 'u/femur', name: 'Fêmur' },
    ]);
    expect(unregisteredModels(sims, [asset('u/cranio')])).toEqual([{ url: 'u/femur', name: 'Fêmur' }]);
  });

  it('renameModelInQuestions troca o nome só nas questões daquela peça', () => {
    const { questions, changed } = renameModelInQuestions(sims[1].questions, 'u/cranio', 'Crânio inteiro');
    expect(changed).toBe(true);
    expect(questions[0].model3d?.modelName).toBe('Crânio inteiro');
    expect(questions[1].model3d?.modelName).toBe('Fêmur');
  });

  it('renameModelInQuestions não marca mudança quando o Lab não usa a peça (evita regravar à toa)', () => {
    const original = sims[1].questions;
    const { questions, changed } = renameModelInQuestions(original, 'u/outra', 'X');
    expect(changed).toBe(false);
    expect(questions[0]).toBe(original[0]);
  });

  it('formatMegabytes mostra MB com vírgula', () => {
    expect(formatMegabytes(1427012)).toBe('1,4 MB');
  });
});
