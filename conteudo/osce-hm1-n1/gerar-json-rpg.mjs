// Gera o JSON de importação dos casos de RPG GUIADO (Admin → OSCE → RPG Guiado) a partir de rpg.mjs.
// Uso: node conteudo/osce-hm1-n1/gerar-json-rpg.mjs
//
// Saídas: rpg.json (os 8 casos). NÃO importar antes da revisão do usuário nos Word. Slugs fixos
// (`hm1-n1-r<N>-...`): reimportar ATUALIZA em vez de duplicar. Os campos de revisão de cada cena
// (`passo`, `fonte`, `origem`) ficam só nos Word e não vão para o banco.

import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import casos from './rpg.mjs';

const SLUGS = {
  R1: 'hm1-n1-r1-aerossois',
  R2: 'hm1-n1-r2-contato',
  R3: 'hm1-n1-r3-goticulas',
  R4: 'hm1-n1-r4-desparamentacao',
  R5: 'hm1-n1-r5-sinais-vitais-completo',
  R6: 'hm1-n1-r6-pa-hiato-auscultatorio',
  R7: 'hm1-n1-r7-pa-gestante',
  R8: 'hm1-n1-r8-sinais-vitais-inconsciente',
};

const semVazio = (obj) => Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined && v !== ''));

const paraImportacao = (caso) =>
  semVazio({
    slug: SLUGS[caso.code],
    title: caso.title,
    theme: caso.theme,
    unit: 'N1',
    setting: caso.setting,
    scenario: caso.scenario,
    task: caso.task,
    tip: caso.tip,
    scenes: caso.scenes.map((s) =>
      semVazio({
        narrative: s.narrative,
        patient: s.patient,
        prompt: s.prompt,
        choices: s.choices.map(({ action, correct, feedback }) => semVazio({ action, correct: correct ? true : undefined, feedback })),
        reveals: s.reveals,
      })
    ),
  });

const lista = casos.map(paraImportacao);
writeFileSync(join(dirname(fileURLToPath(import.meta.url)), 'rpg.json'), `${JSON.stringify(lista, null, 2)}\n`);
console.log(`${lista.length} casos → rpg.json`);
