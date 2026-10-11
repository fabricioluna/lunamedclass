import type {
  AcademicUnit, ClinicalState, DynamicOsceStation, GuidedChoice, GuidedOsceStation, GuidedReveal,
  GuidedScene, OsceStation, SimulationPhase, StaticOsceDistractor, StaticOsceStation, StaticOsceStep,
} from '../types';
import { sceneHasValidChoices } from './guidedStation';

// Leitura + validação do JSON de importação de estações OSCE (aba OSCE do admin). Regra pura,
// testada em osceImport.test.ts — antes vivia como closure dentro de AdminOsce.tsx, sem
// validação nenhuma: a prévia só mostrava a contagem, e um gabarito apontando para ação
// inexistente só aparecia quando o aluno abria a estação.

export type OsceImportMode = 'clinical' | 'rpg' | 'ai' | 'guided';

export interface OsceImportContext {
  mode: OsceImportMode;
  disciplineId: string;
  defaultUnit: AcademicUnit;
  forceUnitN1: boolean; // UCs não têm N1/N2 — sempre gravadas como N1
  defaultTheme: string; // '' quando o admin não escolheu tema padrão
  allowedThemes: string[];
  existingIds: string[]; // ids de documento já salvos, para avisar "vai atualizar"
  now: number; // base do id gerado quando a estação não tem slug
}

export interface ParsedOsceItem {
  station: OsceStation | null;
  errors: string[];
  warnings: string[];
  isUpdate: boolean;
}

export interface ParsedOsceImport {
  fileError?: string;
  items: ParsedOsceItem[];
}

const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const asText = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');

const asTextList = (value: unknown): string[] =>
  Array.isArray(value) ? value.map(asText).filter(Boolean) : [];

const parseSteps = (value: unknown, errors: string[]): StaticOsceStep[] => {
  if (!Array.isArray(value)) {
    errors.push('"steps" precisa ser uma lista.');
    return [];
  }
  return value.flatMap((raw, idx) => {
    const action = isRecord(raw) ? asText(raw.action) : asText(raw);
    if (!action) {
      errors.push(`Passo ${idx + 1} sem "action".`);
      return [];
    }
    const step: StaticOsceStep = { action };
    if (isRecord(raw)) {
      const why = asText(raw.why);
      if (why) step.why = why;
      if (raw.critical === true) step.critical = true;
    }
    return [step];
  });
};

const parseDistractors = (value: unknown, errors: string[]): StaticOsceDistractor[] => {
  if (value === undefined) return [];
  if (!Array.isArray(value)) {
    errors.push('"distractors" precisa ser uma lista.');
    return [];
  }
  return value.flatMap((raw, idx) => {
    const action = isRecord(raw) ? asText(raw.action) : asText(raw);
    if (!action) {
      errors.push(`Distrator ${idx + 1} sem "action".`);
      return [];
    }
    const why = isRecord(raw) ? asText(raw.why) : '';
    return [why ? { action, why } : { action }];
  });
};

const parseStaticFields = (item: Record<string, unknown>, errors: string[], warnings: string[]) => {
  if (item.steps !== undefined) {
    const steps = parseSteps(item.steps, errors);
    const distractors = parseDistractors(item.distractors, errors);
    if (steps.length === 0) errors.push('A estação não tem nenhum passo no gabarito.');

    const stepActions = new Set(steps.map((s) => s.action));
    const seenDistractors = new Set<string>();
    distractors.forEach((d) => {
      if (stepActions.has(d.action)) errors.push(`"${d.action}" está ao mesmo tempo no gabarito e nos distratores.`);
      if (seenDistractors.has(d.action)) errors.push(`Distrator repetido: "${d.action}".`);
      seenDistractors.add(d.action);
    });
    if (distractors.length === 0) warnings.push('Sem distratores — a nuvem só terá ações corretas.');

    return { steps, distractors };
  }

  const actionCloud = asTextList(item.actionCloud);
  const rawOrder = Array.isArray(item.correctOrderIndices) ? item.correctOrderIndices : [];
  const correctOrderIndices = rawOrder.filter((idx): idx is number => Number.isInteger(idx));

  if (actionCloud.length === 0) errors.push('Sem "steps" e sem "actionCloud" — não há ações.');
  if (correctOrderIndices.length === 0) errors.push('Sem gabarito ("correctOrderIndices" vazio).');
  if (correctOrderIndices.length !== rawOrder.length) errors.push('"correctOrderIndices" tem valores que não são números inteiros.');
  correctOrderIndices.forEach((idx) => {
    if (idx < 0 || idx >= actionCloud.length) errors.push(`Gabarito aponta para a ação ${idx}, que não existe na nuvem.`);
  });
  if (new Set(correctOrderIndices).size !== correctOrderIndices.length) errors.push('"correctOrderIndices" repete o mesmo índice.');
  warnings.push('Formato antigo (actionCloud/correctOrderIndices) — prefira "steps" + "distractors".');

  return { actionCloud, correctOrderIndices };
};

const parseReveals = (value: unknown, sceneNumber: number, errors: string[]): GuidedReveal[] => {
  if (value === undefined) return [];
  if (!Array.isArray(value)) {
    errors.push(`Cena ${sceneNumber}: "reveals" precisa ser uma lista.`);
    return [];
  }
  return value.flatMap((raw) => {
    const label = isRecord(raw) ? asText(raw.label) : '';
    const text = isRecord(raw) ? asText(raw.value) : '';
    if (!label || !text) {
      errors.push(`Cena ${sceneNumber}: cada item de "reveals" precisa de "label" e "value".`);
      return [];
    }
    return [{ label, value: text }];
  });
};

const parseChoices = (value: unknown, sceneNumber: number, errors: string[]): GuidedChoice[] => {
  const rawChoices = Array.isArray(value) ? value : [];
  return rawChoices.flatMap((raw, idx) => {
    if (!isRecord(raw)) {
      errors.push(`Cena ${sceneNumber}, opção ${idx + 1}: não é um objeto.`);
      return [];
    }
    const action = asText(raw.action);
    const feedback = asText(raw.feedback);
    if (!action) {
      errors.push(`Cena ${sceneNumber}, opção ${idx + 1}: sem "action".`);
      return [];
    }
    if (!feedback) errors.push(`Cena ${sceneNumber}, opção "${action}": sem "feedback" (a consequência ou o desfecho da conduta).`);
    return [{ action, ...(raw.correct === true ? { correct: true } : {}), feedback }];
  });
};

const parseScenes = (value: unknown, errors: string[], warnings: string[]): GuidedScene[] => {
  if (!Array.isArray(value) || value.length === 0) {
    errors.push('A estação não tem nenhuma cena ("scenes").');
    return [];
  }
  return value.flatMap((raw, idx) => {
    const n = idx + 1;
    if (!isRecord(raw)) {
      errors.push(`Cena ${n}: não é um objeto.`);
      return [];
    }
    const narrative = asText(raw.narrative);
    if (!narrative) errors.push(`Cena ${n}: sem "narrative".`);

    const choices = parseChoices(raw.choices, n, errors);
    if (!sceneHasValidChoices(choices)) errors.push(`Cena ${n}: precisa de pelo menos uma conduta certa ("correct": true) e uma errada.`);
    if (new Set(choices.map((c) => c.action)).size !== choices.length) errors.push(`Cena ${n}: há opções com o mesmo texto.`);
    if (choices.length < 4 || choices.length > 6) warnings.push(`Cena ${n}: ${choices.length} opções — o recomendado é de 4 a 6.`);

    const scene: GuidedScene = { narrative, choices };
    const patient = asText(raw.patient);
    const prompt = asText(raw.prompt);
    const hint = asText(raw.hint);
    const reveals = parseReveals(raw.reveals, n, errors);
    if (patient) scene.patient = patient;
    if (prompt) scene.prompt = prompt;
    if (hint) scene.hint = hint;
    if (reveals.length > 0) scene.reveals = reveals;
    return [scene];
  });
};

const parsePhases = (value: unknown): Record<string, SimulationPhase> =>
  isRecord(value) ? (value as Record<string, SimulationPhase>) : {};

const validatePhases = (
  phases: Record<string, SimulationPhase>,
  initialPhaseId: string,
  errors: string[],
  warnings: string[]
) => {
  const phaseIds = Object.keys(phases);
  if (phaseIds.length === 0) {
    errors.push('A estação não tem nenhuma fase ("phases").');
    return;
  }
  if (!phases[initialPhaseId]) errors.push(`A fase inicial "${initialPhaseId}" não existe em "phases".`);

  phaseIds.forEach((phaseId) => {
    const transitions = phases[phaseId]?.transitions;
    if (!Array.isArray(transitions)) return;
    transitions.forEach((t) => {
      if (t?.nextPhaseId && t.nextPhaseId !== 'FINISH' && !phases[t.nextPhaseId]) {
        warnings.push(`Fase "${phaseId}" leva a "${t.nextPhaseId}", que não existe (a simulação vai terminar ali).`);
      }
    });
  });
};

const parseItem = (
  raw: unknown,
  idx: number,
  ctx: OsceImportContext,
  slugsInFile: Map<string, number>
): ParsedOsceItem => {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!isRecord(raw)) {
    return { station: null, errors: ['Item não é um objeto { }.'], warnings, isUpdate: false };
  }

  const slug = asText(raw.slug);
  if (slug) {
    if (!SLUG_PATTERN.test(slug)) errors.push(`Slug "${slug}" inválido — use só letras minúsculas, números e hífen.`);
    const firstIdx = slugsInFile.get(slug);
    if (firstIdx !== undefined && firstIdx !== idx) errors.push(`Slug "${slug}" repetido no arquivo (já usado no item ${firstIdx + 1}).`);
  } else {
    warnings.push('Sem "slug" — reimportar este arquivo vai criar uma cópia em vez de atualizar.');
  }

  const title = asText(raw.title) || asText(raw.tema);
  if (!title) errors.push('Sem "title".');

  const theme = asText(raw.theme) || ctx.defaultTheme;
  if (!theme) errors.push('Sem tema — escolha um tema padrão na tela ou informe "theme" na estação.');
  else if (!ctx.allowedThemes.includes(theme)) errors.push(`O tema "${theme}" não existe nesta disciplina.`);

  const rawUnit = asText(raw.unit);
  if (rawUnit && rawUnit !== 'N1' && rawUnit !== 'N2') errors.push(`Unidade "${rawUnit}" inválida — use N1 ou N2.`);
  const unit: AcademicUnit = ctx.forceUnitN1 ? 'N1' : rawUnit === 'N1' || rawUnit === 'N2' ? rawUnit : ctx.defaultUnit;

  const scenario = asText(raw.scenario) || asText(raw.cenario_inicial);
  const task = asText(raw.task);
  if (!scenario) warnings.push('Sem "scenario" (caso clínico).');
  if (!task) warnings.push('Sem "task" (ação que o aluno deve realizar).');

  const base = {
    id: slug || `osce_${ctx.now}_${idx}`,
    ...(slug ? { slug } : {}),
    disciplineId: ctx.disciplineId,
    unit,
    theme,
    title: title || 'Estação sem título',
    scenario,
    task,
    tip: asText(raw.tip),
  };
  const setting = asText(raw.setting);

  let station: OsceStation;
  if (ctx.mode === 'clinical') {
    station = {
      ...base,
      mode: 'clinical',
      ...(setting ? { setting } : {}),
      checklist: asTextList(raw.checklist),
      ...parseStaticFields(raw, errors, warnings),
    } satisfies StaticOsceStation;
  } else if (ctx.mode === 'guided') {
    station = {
      ...base,
      mode: 'guided',
      ...(setting ? { setting } : {}),
      checklist: asTextList(raw.checklist),
      scenes: parseScenes(raw.scenes, errors, warnings),
    } satisfies GuidedOsceStation;
  } else {
    const initialPhaseId = asText(raw.initialPhaseId) || asText(raw.no_inicial) || 'fase_1';
    const phases = parsePhases(raw.phases);
    validatePhases(phases, initialPhaseId, errors, warnings);
    station = {
      ...base,
      mode: ctx.mode,
      initialPhaseId,
      phases,
      ...(ctx.mode === 'ai' ? { checklist: asTextList(raw.checklist) } : {}),
      ...(isRecord(raw.initialVitals) ? { initialVitals: raw.initialVitals as unknown as ClinicalState } : {}),
      ...(Array.isArray(raw.inventory) ? { inventory: asTextList(raw.inventory) } : {}),
      setting: setting || (ctx.mode === 'ai' ? 'Consultório para anamnese.' : 'Cenário de emergência.'),
    } satisfies DynamicOsceStation;
  }

  return { station, errors, warnings, isUpdate: !!slug && ctx.existingIds.includes(slug) };
};

export const parseOsceImport = (text: string, ctx: OsceImportContext): ParsedOsceImport => {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch (err) {
    return { fileError: `JSON inválido: ${err instanceof Error ? err.message : String(err)}`, items: [] };
  }
  if (!Array.isArray(data)) return { fileError: 'O JSON deve ser uma lista [ ] de estações.', items: [] };

  const slugsInFile = new Map<string, number>();
  data.forEach((raw, idx) => {
    const slug = isRecord(raw) ? asText(raw.slug) : '';
    if (slug && !slugsInFile.has(slug)) slugsInFile.set(slug, idx);
  });

  return { items: data.map((raw, idx) => parseItem(raw, idx, ctx, slugsInFile)) };
};
