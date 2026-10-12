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
import SLUGS from './rpg-slugs.mjs';


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
