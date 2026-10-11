// Gera o JSON de importação dos casos de RPG GUIADO (Admin → OSCE → RPG Guiado) a partir de rpg.mjs.
// Uso: node conteudo/osce-hm1-n1/gerar-json-rpg.mjs
//
// Saídas: rpg.json (todos os casos) e rpg-novos.json (só os que ainda NÃO estão no ar, conforme publicadas-rpg.json). NÃO importar antes da revisão do usuário nos Word. Slugs fixos
// (`hm1-n1-r<N>-...`): reimportar ATUALIZA em vez de duplicar. Os campos de revisão de cada cena
// (`passo`, `fonte`, `origem`) ficam só nos Word e não vão para o banco. A dica de nível 1 do
// modo digitado vem de rpg-dicas.mjs (uma por cena, na ordem).

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import casos from './rpg.mjs';
import dicas from './rpg-dicas.mjs';

const SLUGS = {
  R1: 'hm1-n1-r1-aerossois',
  R2: 'hm1-n1-r2-contato',
  R3: 'hm1-n1-r3-goticulas',
  R4: 'hm1-n1-r4-desparamentacao',
  R5: 'hm1-n1-r5-sinais-vitais-completo',
  R6: 'hm1-n1-r6-pa-hiato-auscultatorio',
  R7: 'hm1-n1-r7-pa-gestante',
  R8: 'hm1-n1-r8-sinais-vitais-inconsciente',
  R9: 'hm1-n1-r9-cinco-momentos',
  R10: 'hm1-n1-r10-precaucao-padrao-agulha',
  R11: 'hm1-n1-r11-higiene-maos-tecnicas',
  R12: 'hm1-n1-r12-luvas-procedimento',
  R13: 'hm1-n1-r13-luvas-cirurgicas',
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
    scenes: caso.scenes.map((s, i) =>
      semVazio({
        narrative: s.narrative,
        patient: s.patient,
        prompt: s.prompt,
        hint: dicas[caso.code]?.[i],
        choices: s.choices.map(({ action, correct, feedback }) => semVazio({ action, correct: correct ? true : undefined, feedback })),
        reveals: s.reveals,
      })
    ),
  });

const pasta = dirname(fileURLToPath(import.meta.url));
const publicadas = JSON.parse(readFileSync(join(pasta, 'publicadas-rpg.json'), 'utf8'));
const grava = (nome, lista) => {
  writeFileSync(join(pasta, nome), `${JSON.stringify(lista, null, 2)}\n`);
  console.log(`${lista.length} casos → ${nome}`);
};

const lista = casos.map(paraImportacao);
grava('rpg.json', lista);
grava('rpg-novos.json', lista.filter((c) => !publicadas.includes(c.slug)));
