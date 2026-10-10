// Gera o JSON de importação (Admin → OSCE → Estático) a partir de estacoes.mjs.
// Uso: node conteudo/osce-hm1-n1/gerar-json.mjs
//
// Saída: todas.json — as 30 estações da HM1/N1. NÃO importar antes da revisão do usuário nos
// Word: o conteúdo só vai ao ar depois que ele aprovar (e as estações que ele reprovar saem do
// arquivo antes). Os slugs são fixos (`hm1-n1-<código>`): reimportar ATUALIZA em vez de duplicar.
//
// O que NÃO é exportado, de propósito:
//   - a marca de "crítico" (proposta, ainda sem aval docente);
//   - distratores `pendente` (dependem de resposta docente).

import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import estacoes, { TEMAS } from './estacoes.mjs';

const familyStations = (fam, baseTitle) =>
  fam.variants.map((v) => ({
    code: v.code,
    title: `${baseTitle} — ${v.label}`,
    setting: fam.setting,
    scenario: fam.scenario.replace('[CONTEXTO DA VARIAÇÃO]', v.ctx),
    task: fam.task,
    tip: '',
    steps: v.seq,
    distractors: v.distractors,
  }));

const bio = estacoes.biosseguranca;
const todas = [
  ...[...bio.single, ...bio.precaucoes, ...bio.luvas].map((s) => ({ ...s, theme: TEMAS.biosseguranca })),
  ...familyStations(bio.param, 'Paramentação').map((s) => ({ ...s, theme: TEMAS.biosseguranca })),
  ...familyStations(bio.desp, 'Desparamentação').map((s) => ({ ...s, theme: TEMAS.biosseguranca })),
  ...estacoes.sinaisVitais.map((s) => ({ ...s, theme: TEMAS.sinaisVitais })),
];

const semVazio = (obj) => Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined && v !== ''));

const paraImportacao = (s) =>
  semVazio({
    slug: `hm1-n1-${s.code.toLowerCase()}`,
    title: s.title,
    theme: s.theme,
    unit: 'N1',
    setting: s.setting,
    scenario: s.scenario,
    task: s.task,
    tip: s.tip,
    steps: s.steps.map(({ action, why }) => semVazio({ action, why })),
    distractors: s.distractors.filter((d) => !d.pendente).map(({ action, why }) => semVazio({ action, why })),
  });

const ordem = (a, b) => a.slug.localeCompare(b.slug, 'pt', { numeric: true });
const tudo = todas.map(paraImportacao).sort(ordem);

writeFileSync(join(dirname(fileURLToPath(import.meta.url)), 'todas.json'), `${JSON.stringify(tudo, null, 2)}\n`);
console.log(`${tudo.length} estações → todas.json`);
