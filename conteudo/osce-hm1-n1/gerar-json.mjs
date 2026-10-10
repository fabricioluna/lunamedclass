// Gera o JSON de importação (Admin → OSCE → Estático) a partir de estacoes.mjs.
// Uso: node conteudo/osce-hm1-n1/gerar-json.mjs
//
// LOTE 1 (publicado antes do retorno das professoras, a pedido do usuário em 2026-10-10):
// só as estações cuja sequência é inteira do roteiro e que não dependem de nenhuma pergunta
// aberta do documento de revisão. Ficam de fora até a resposta:
//   - P1–P8 (paramentação): touca como distrator, PFF2 fora de aerossóis e o gatilho da luva
//     estéril (perguntas 3, 4 e 5);
//   - C1–C3 (precauções): a desparamentação de cada precaução foi derivada da ordem geral
//     (pergunta 6).
// Em todas as estações do lote: sem a marca de "crítico" (pergunta 1) e sem itens `pendente`.
// Distratores de origem D entram quando negam diretamente uma frase do roteiro.

import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import estacoes, { TEMAS } from './estacoes.mjs';

const LOTE_1 = ['B01', 'B02', 'D1', 'D2', 'D3', 'D4', 'L1', 'L2', 'S01', 'S02', 'S03', 'S04', 'S05'];

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

const lote = LOTE_1.map((code) => {
  const station = todas.find((s) => s.code === code);
  if (!station) throw new Error(`Estação ${code} não encontrada em estacoes.mjs`);
  return paraImportacao(station);
});

const saida = join(dirname(fileURLToPath(import.meta.url)), 'lote-1.json');
writeFileSync(saida, `${JSON.stringify(lote, null, 2)}\n`);
console.log(`${lote.length} estações → ${saida}`);
