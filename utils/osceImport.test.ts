import { describe, it, expect } from 'vitest';
import { parseOsceImport, OsceImportContext } from './osceImport';
import type { DynamicOsceStation, GuidedOsceStation, StaticOsceStation } from '../types';

const ctx: OsceImportContext = {
  mode: 'clinical',
  disciplineId: 'hm1',
  defaultUnit: 'N1',
  forceUnitN1: false,
  defaultTheme: 'Biossegurança',
  allowedThemes: ['Biossegurança', 'Sinais Vitais'],
  existingIds: ['ja-existe'],
  now: 1000,
};

const staticItem = {
  slug: 'biosseg-teste',
  title: 'Paramentação',
  scenario: 'Caso',
  task: 'Realize a paramentação',
  steps: [{ action: 'Higienizar as mãos', why: 'Antes de tocar EPI', critical: true }, { action: 'Avental' }],
  distractors: [{ action: 'Propé', why: 'Não recomendado' }],
};

const parseOne = (item: unknown, context: OsceImportContext = ctx) =>
  parseOsceImport(JSON.stringify([item]), context).items[0];

describe('parseOsceImport — arquivo', () => {
  it('rejeita JSON inválido', () => {
    expect(parseOsceImport('{', ctx).fileError).toMatch(/JSON inválido/);
  });

  it('rejeita JSON que não é lista', () => {
    expect(parseOsceImport('{}', ctx).fileError).toMatch(/lista/);
  });
});

describe('parseOsceImport — estático', () => {
  it('lê o formato de autoria com slug como id', () => {
    const { station, errors } = parseOne(staticItem);
    const s = station as StaticOsceStation;
    expect(errors).toEqual([]);
    expect(s.id).toBe('biosseg-teste');
    expect(s.slug).toBe('biosseg-teste');
    expect(s.theme).toBe('Biossegurança');
    expect(s.unit).toBe('N1');
    expect(s.steps).toEqual([
      { action: 'Higienizar as mãos', why: 'Antes de tocar EPI', critical: true },
      { action: 'Avental' },
    ]);
    expect(s.distractors).toEqual([{ action: 'Propé', why: 'Não recomendado' }]);
  });

  it('tema e unidade por estação sobrepõem o padrão da tela', () => {
    const s = parseOne({ ...staticItem, theme: 'Sinais Vitais', unit: 'N2' }).station as StaticOsceStation;
    expect(s.theme).toBe('Sinais Vitais');
    expect(s.unit).toBe('N2');
  });

  it('UC sempre grava N1, mesmo com unit no JSON', () => {
    const s = parseOne({ ...staticItem, unit: 'N2' }, { ...ctx, forceUnitN1: true }).station as StaticOsceStation;
    expect(s.unit).toBe('N1');
  });

  it('erro quando o tema não existe na disciplina', () => {
    expect(parseOne({ ...staticItem, theme: 'Inexistente' }).errors.join()).toMatch(/não existe nesta disciplina/);
  });

  it('erro quando não há tema padrão nem tema na estação', () => {
    expect(parseOne(staticItem, { ...ctx, defaultTheme: '' }).errors.join()).toMatch(/Sem tema/);
  });

  it('erro quando a mesma ação está no gabarito e nos distratores', () => {
    const item = { ...staticItem, distractors: [{ action: 'Avental' }] };
    expect(parseOne(item).errors.join()).toMatch(/ao mesmo tempo no gabarito e nos distratores/);
  });

  it('erro quando não há passos', () => {
    expect(parseOne({ ...staticItem, steps: [] }).errors.join()).toMatch(/nenhum passo/);
  });

  it('erro de slug inválido e de slug repetido no arquivo', () => {
    expect(parseOne({ ...staticItem, slug: 'Com Espaço' }).errors.join()).toMatch(/inválido/);
    const { items } = parseOsceImport(JSON.stringify([staticItem, staticItem]), ctx);
    expect(items[0].errors).toEqual([]);
    expect(items[1].errors.join()).toMatch(/repetido no arquivo/);
  });

  it('marca como atualização quando o slug já existe no banco', () => {
    expect(parseOne({ ...staticItem, slug: 'ja-existe' }).isUpdate).toBe(true);
    expect(parseOne(staticItem).isUpdate).toBe(false);
  });

  it('sem slug: gera id pela hora e avisa que reimportar duplica', () => {
    const { slug: _slug, ...semSlug } = staticItem;
    const result = parseOne(semSlug);
    expect(result.station?.id).toBe('osce_1000_0');
    expect(result.warnings.join()).toMatch(/cópia/);
  });

  it('formato antigo: valida índice fora da nuvem', () => {
    const result = parseOne({ title: 'Antiga', actionCloud: ['A', 'B'], correctOrderIndices: [0, 7] });
    expect(result.errors.join()).toMatch(/ação 7/);
  });

  it('formato antigo válido continua sendo aceito', () => {
    const result = parseOne({ title: 'Antiga', actionCloud: ['A', 'B'], correctOrderIndices: [1, 0] });
    expect(result.errors).toEqual([]);
    expect((result.station as StaticOsceStation).correctOrderIndices).toEqual([1, 0]);
  });
});

describe('parseOsceImport — RPG guiado', () => {
  const guidedCtx: OsceImportContext = { ...ctx, mode: 'guided' };
  const scene = {
    narrative: 'Você está diante da porta do quarto.',
    patient: 'Pode entrar, doutor(a).',
    choices: [
      { action: 'Higienizar as mãos', correct: true, feedback: 'Correto.' },
      { action: 'Entrar direto', feedback: 'Você contaminou o ambiente.' },
      { action: 'Calçar luvas primeiro', feedback: 'Antes, higienize as mãos.' },
      { action: 'Colocar a touca', feedback: 'Não é o primeiro passo.' },
    ],
    reveals: [{ label: 'PA', value: '120/80 mmHg' }],
  };
  const guidedItem = { slug: 'rpg-teste', title: 'Visita', scenario: 'Caso', task: 'Tarefa', scenes: [scene] };

  it('lê as cenas, a fala do paciente e os valores revelados', () => {
    const { station, errors, warnings } = parseOne(guidedItem, guidedCtx);
    const g = station as GuidedOsceStation;
    expect(errors).toEqual([]);
    expect(warnings).toEqual([]);
    expect(g.mode).toBe('guided');
    expect(g.scenes).toHaveLength(1);
    expect(g.scenes[0].patient).toBe('Pode entrar, doutor(a).');
    expect(g.scenes[0].reveals).toEqual([{ label: 'PA', value: '120/80 mmHg' }]);
    expect(g.scenes[0].choices.filter((c) => c.correct)).toHaveLength(1);
  });

  it('lê a dica da cena (modo digitado) e ela é opcional', () => {
    const comDica = parseOne({ ...guidedItem, scenes: [{ ...scene, hint: 'Pense no primeiro passo.' }] }, guidedCtx).station as GuidedOsceStation;
    expect(comDica.scenes[0].hint).toBe('Pense no primeiro passo.');
    const semDica = parseOne(guidedItem, guidedCtx).station as GuidedOsceStation;
    expect(semDica.scenes[0].hint).toBeUndefined();
  });

  it('erro quando não há cenas', () => {
    expect(parseOne({ ...guidedItem, scenes: [] }, guidedCtx).errors.join()).toMatch(/nenhuma cena/);
  });

  it('erro quando a cena não tem conduta certa', () => {
    const semCerta = { ...scene, choices: scene.choices.map(({ action, feedback }) => ({ action, feedback })) };
    expect(parseOne({ ...guidedItem, scenes: [semCerta] }, guidedCtx).errors.join()).toMatch(/uma conduta certa/);
  });

  it('erro quando uma opção não tem feedback', () => {
    const semFeedback = { ...scene, choices: [...scene.choices.slice(0, 3), { action: 'Sem feedback' }] };
    expect(parseOne({ ...guidedItem, scenes: [semFeedback] }, guidedCtx).errors.join()).toMatch(/sem "feedback"/);
  });

  it('erro quando duas opções têm o mesmo texto', () => {
    const repetida = { ...scene, choices: [...scene.choices, { action: 'Entrar direto', feedback: 'x' }] };
    expect(parseOne({ ...guidedItem, scenes: [repetida] }, guidedCtx).errors.join()).toMatch(/mesmo texto/);
  });

  it('erro quando "reveals" está malformado', () => {
    const ruim = { ...scene, reveals: [{ label: 'PA' }] };
    expect(parseOne({ ...guidedItem, scenes: [ruim] }, guidedCtx).errors.join()).toMatch(/reveals/);
  });

  it('aviso (não erro) quando a cena foge de 4 a 6 opções', () => {
    const curta = { ...scene, choices: scene.choices.slice(0, 3) };
    const result = parseOne({ ...guidedItem, scenes: [curta] }, guidedCtx);
    expect(result.errors).toEqual([]);
    expect(result.warnings.join()).toMatch(/4 a 6/);
  });

  it('aceita mais de uma conduta certa na mesma cena', () => {
    const duas = { ...scene, choices: scene.choices.map((c, i) => (i === 1 ? { ...c, correct: true } : c)) };
    expect(parseOne({ ...guidedItem, scenes: [duas] }, guidedCtx).errors).toEqual([]);
  });
});

describe('parseOsceImport — RPG', () => {
  const rpgCtx: OsceImportContext = { ...ctx, mode: 'rpg' };
  const phases = {
    fase_1: { phaseId: 'fase_1', narrative: 'Início', vitals: {}, transitions: [{ triggers: ['x'], nextPhaseId: 'FINISH', feedbackText: '' }] },
  };

  it('aceita estação com fase inicial existente', () => {
    const result = parseOne({ slug: 'rpg-1', title: 'RPG', initialPhaseId: 'fase_1', phases }, rpgCtx);
    expect(result.errors).toEqual([]);
    expect((result.station as DynamicOsceStation).mode).toBe('rpg');
  });

  it('erro quando a fase inicial não existe', () => {
    const result = parseOne({ slug: 'rpg-1', title: 'RPG', initialPhaseId: 'nao_existe', phases }, rpgCtx);
    expect(result.errors.join()).toMatch(/fase inicial/);
  });

  it('aviso quando uma transição leva a fase inexistente', () => {
    const broken = {
      fase_1: { ...phases.fase_1, transitions: [{ triggers: ['x'], nextPhaseId: 'fase_9', feedbackText: '' }] },
    };
    const result = parseOne({ slug: 'rpg-1', title: 'RPG', phases: broken }, rpgCtx);
    expect(result.warnings.join()).toMatch(/fase_9/);
  });
});
