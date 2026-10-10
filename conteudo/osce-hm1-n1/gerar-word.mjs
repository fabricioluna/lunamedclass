// Gera um .docx por estação (revisão docente/do usuário), a partir de estacoes.mjs e lote-1.json.
// Uso (o pacote docx não é dependência do projeto — mesmo padrão dos scripts/ com firebase-admin):
//   npm install --no-save docx
//   node conteudo/osce-hm1-n1/gerar-word.mjs "C:/Users/Luna/Documents/Estacoes OSCE HM1 N1 - revisao"
// Cada arquivo diz se a estação já está publicada (slug presente em lote-1.json) e lista só os
// pontos de revisão que se aplicam a ela.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, ShadingType,
  AlignmentType, BorderStyle, LevelFormat, Footer, PageNumber,
} from 'docx';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT = process.argv[2];
if (!OUT) throw new Error('Informe a pasta de saída: node conteudo/osce-hm1-n1/gerar-word.mjs <pasta>');
const { default: E, TEMAS } = await import(pathToFileURL(path.join(HERE, 'estacoes.mjs')).href);
const LOTE_1 = JSON.parse(fs.readFileSync(path.join(HERE, 'lote-1.json'), 'utf8')).map((s) => s.slug);

const NAVY = '003366';
const GOLD = 'D4A017';
const GRAY = '666666';
const LIGHT = 'EEF3F8';
const CONTENT = 9638;

const run = (text, opts = {}) => new TextRun({ text, font: 'Arial', size: 20, ...opts });
const p = (children, opts = {}) =>
  new Paragraph({ children: Array.isArray(children) ? children : [run(children)], spacing: { after: 120 }, ...opts });
const small = (text) => p([run(text, { size: 17, color: GRAY })], { spacing: { after: 60 } });
const h3 = (text) => new Paragraph({ children: [run(text, { size: 21, bold: true, color: GOLD })], spacing: { before: 240, after: 80 }, keepNext: true });
const numbered = (children) => new Paragraph({ numbering: { reference: 'q', level: 0 }, children, spacing: { after: 100 } });

const border = { style: BorderStyle.SINGLE, size: 4, color: 'C9D3DE' };
const borders = { top: border, bottom: border, left: border, right: border };
const cell = (content, width, { header = false, fill, bold = false, align, color } = {}) =>
  new TableCell({
    width: { size: width, type: WidthType.DXA },
    borders,
    margins: { top: 60, bottom: 60, left: 100, right: 100 },
    shading: header ? { type: ShadingType.CLEAR, color: 'auto', fill: NAVY } : fill ? { type: ShadingType.CLEAR, color: 'auto', fill } : undefined,
    children: [new Paragraph({ alignment: align, children: [run(String(content ?? ''), { size: 18, bold: header || bold, color: header ? 'FFFFFF' : color })] })],
  });
const table = (widths, header, rows) =>
  new Table({
    width: { size: CONTENT, type: WidthType.DXA },
    columnWidths: widths,
    rows: [
      ...(header ? [new TableRow({ tableHeader: true, children: header.map((h, i) => cell(h, widths[i], { header: true })) })] : []),
      ...rows.map((r) => new TableRow({ cantSplit: true, children: r.map((c, i) => (c instanceof TableCell ? c : cell(c, widths[i]))) })),
    ],
  });

// --- Estações achatadas (famílias viram uma estação por variação)
const bio = E.biosseguranca;
const fromFamily = (fam, base, fonte) => fam.variants.map((v) => ({
  code: v.code, title: `${base} — ${v.label}`, fonte, setting: fam.setting,
  scenario: fam.scenario.replace('[CONTEXTO DA VARIAÇÃO]', v.ctx), task: fam.task, tip: '',
  steps: v.seq.map((s) => ({ ...s, origem: s.origem ?? 'R' })), distractors: v.distractors,
}));
const ORDEM = [
  ...bio.single, ...fromFamily(bio.param, 'Paramentação', bio.param.fonte), ...fromFamily(bio.desp, 'Desparamentação', bio.desp.fonte),
  ...bio.precaucoes, ...bio.luvas,
].map((s) => ({ ...s, tema: TEMAS.biosseguranca, pasta: '1 - Biossegurança' }))
  .concat(E.sinaisVitais.map((s) => ({ ...s, tema: TEMAS.sinaisVitais, pasta: '2 - Sinais Vitais' })));

// --- Pontos de revisão por estação (mesmas perguntas do documento geral, só as que se aplicam)
const pontosDa = (s) => {
  const pts = [];
  const hasD = s.distractors.some((d) => d.origem === 'D');
  if (s.steps.some((x) => x.critical)) pts.push(['Passos críticos. ', 'Os passos marcados como críticos são proposta (não estão definidos no roteiro). Esquecido, um passo crítico só aparece destacado em vermelho — não altera a nota. Confirmar, retirar ou acrescentar.']);
  if (hasD) pts.push(['Distratores de origem D. ', 'São negações de frases do roteiro ou itens que o caso não pede. Confirmar que cada um está de fato errado neste contexto.']);
  if (['P1', 'P2', 'P3', 'P4'].includes(s.code)) pts.push(['Touca como erro. ', 'O caso diz que o protocolo não exige touca, e ela entrou como distrator. O roteiro diz que a touca não é obrigatória pela ANVISA, mas é frequentemente exigida. Manter como erro?']);
  if (['P1', 'P2', 'P5', 'P6', 'C2'].includes(s.code)) pts.push(['PFF2 fora de aerossóis. ', 'Usar PFF2 onde o roteiro indica máscara cirúrgica foi tratado como erro. Concorda?']);
  if (['P2', 'P4', 'P6', 'P8', 'L2'].includes(s.code)) pts.push(['Quando usar luva estéril. ', 'O roteiro ensina a técnica, mas não diz quando usá-la. O gatilho usado no caso é "o procedimento exige técnica estéril". Está adequado?']);
  if (['C1', 'C2', 'C3'].includes(s.code)) pts.push(['Desparamentação derivada. ', 'O roteiro dá a ordem completa de desparamentação (p. 8). Aqui ela foi aplicada só aos EPIs desta precaução (passos com origem D). Em C1, a higienização após o avental e a final viraram uma só. Está correto?']);
  if (s.distractors.length === 0) pts.push(['Sem distratores. ', 'O roteiro não traz erros típicos desta técnica; o desafio é só a ordem. Quer sugerir algum?']);
  if (s.code === 'S02') pts.push(['Pulso com ritmo regular. ', 'Sem alteração nos primeiros 30 s o roteiro diz que se "pode" multiplicar por 2 (opcional), então não foi criada uma estação de ritmo regular — o atalho aparece só na dica. Concorda?']);
  if (s.code === 'S05') pts.push(['Higiene das mãos ao final. ', 'O roteiro de Sinais Vitais não menciona higienização ao final, então ela não entrou. Deve entrar?']);
  if (s.distractors.some((d) => d.pendente)) pts.push(['Distrator não publicado. ', 'O distrator marcado como "não publicado" ficou fora do ar porque o roteiro só diz "preferir" o decúbito lateral esquerdo ou dorsal. Manter como erro?']);
  return pts;
};

const doc = (s) => {
  const slug = `hm1-n1-${s.code.toLowerCase()}`;
  const publicada = LOTE_1.includes(slug);
  const anyCritical = s.steps.some((x) => x.critical);
  const pontos = pontosDa(s);
  const statusText = publicada
    ? 'PUBLICADA — já disponível para os alunos (lote 1, 10/10/2026).'
    : 'AINDA NÃO PUBLICADA — aguarda revisão.';
  const statusFill = publicada ? 'E6F4EA' : 'FFF4E0';

  const children = [
    p([run('LUNA MEDCLASS · ESTAÇÃO OSCE ESTÁTICA · HM1 · UNIDADE N1', { size: 16, bold: true, color: GOLD, characterSpacing: 30 })], { spacing: { after: 80 } }),
    p([run(`${s.code} · ${s.title}`, { size: 34, bold: true, color: NAVY })], { spacing: { after: 120 } }),
    table([CONTENT], null, [[cell(statusText, CONTENT, { fill: statusFill, bold: true })]]),
    p('', { spacing: { after: 60 } }),
    small(`Tema no sistema: "${s.tema}" · Identificador: ${slug}`),
    small(`Fonte: ${s.fonte}`),

    h3('O que o aluno lê'),
    table([1800, CONTENT - 1800], null, [
      [cell('Ambiente', 1800, { fill: LIGHT, bold: true }), s.setting],
      [cell('Caso', 1800, { fill: LIGHT, bold: true }), s.scenario],
      [cell('Missão', 1800, { fill: LIGHT, bold: true }), s.task],
    ]),

    h3('Sequência correta (gabarito)'),
    table(
      [550, 3900, 3588, 800, 800],
      ['Nº', 'Ação (como aparece na nuvem)', 'Por quê (exibido no resultado)', anyCritical && publicada ? 'Crítico*' : 'Crítico', 'Origem'],
      s.steps.map((x, i) => [
        cell(String(i + 1), 550, { align: AlignmentType.CENTER }),
        x.action,
        x.why || '—',
        cell(x.critical ? 'Sim' : '', 800, { align: AlignmentType.CENTER }),
        cell(x.origem || 'R', 800, { align: AlignmentType.CENTER }),
      ])
    ),
    ...(anyCritical && publicada ? [small('* Marca de crítico é proposta: ainda não aparece para os alunos.')] : []),

    h3('Distratores (ações erradas na nuvem)'),
    s.distractors.length === 0
      ? p([run('Sem distratores', { bold: true }), run(' — o desafio é a ordem.', { italics: true })])
      : table(
          [3500, 5338, 800],
          ['Ação errada', 'Por que está errada (exibido no resultado)', 'Origem'],
          s.distractors.map((d) => [
            d.pendente ? `${d.action}  (não publicado)` : d.action,
            d.why,
            cell(d.origem, 800, { align: AlignmentType.CENTER }),
          ])
        ),

    ...(s.tip ? [h3('Dica exibida ao aluno'), p(s.tip)] : []),

    ...(pontos.length ? [h3('Pontos para revisar nesta estação'), ...pontos.map(([t, d]) => numbered([run(t, { bold: true }), run(d)]))] : []),

    small('Origem: R = texto do roteiro (literal ou quase literal, com a página) · D = derivado do roteiro (recorte, junção ou negação) — validar.'),
    new Paragraph({
      spacing: { before: 240, after: 60 },
      border: { top: { style: BorderStyle.SINGLE, size: 6, color: GOLD, space: 6 } },
      children: [run('Parecer:   ', { bold: true, color: NAVY }), run('☐ Aprovada      ☐ Aprovada com ajustes      ☐ Refazer')],
    }),
    p([run('Revisado por: ', { bold: true, color: NAVY }), run('______________________________    ', { color: 'BBBBBB' }), run('Data: ', { bold: true, color: NAVY }), run('____/____/______', { color: 'BBBBBB' })]),
    p([run('Observações: ', { bold: true, color: NAVY }), run('_______________________________________________________________________', { color: 'BBBBBB' })]),
  ];

  return new Document({
    creator: 'Luna MedClass',
    title: `${s.code} · ${s.title}`,
    styles: { default: { document: { run: { font: 'Arial', size: 20 } } } },
    numbering: { config: [{ reference: 'q', levels: [{ level: 0, format: LevelFormat.DECIMAL, text: '%1.', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 500, hanging: 360 } } } }] }] },
    sections: [{
      properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 1134, bottom: 1134, left: 1134, right: 1134 } } },
      footers: {
        default: new Footer({
          children: [new Paragraph({
            alignment: AlignmentType.RIGHT,
            children: [
              run(`${s.code} · revisão de estação OSCE HM1 N1   ·   página `, { size: 16, color: GRAY }),
              new TextRun({ children: [PageNumber.CURRENT], font: 'Arial', size: 16, color: GRAY }),
              run(' de ', { size: 16, color: GRAY }),
              new TextRun({ children: [PageNumber.TOTAL_PAGES], font: 'Arial', size: 16, color: GRAY }),
            ],
          })],
        }),
      },
      children,
    }],
  });
};

const safe = (t) => t.replace(/[\\/:*?"<>|]/g, '-');
let n = 0;
const porPasta = {};
for (const s of ORDEM) {
  const dir = path.join(OUT, s.pasta);
  fs.mkdirSync(dir, { recursive: true });
  porPasta[s.pasta] = (porPasta[s.pasta] ?? 0) + 1;
  const nome = `${String(porPasta[s.pasta]).padStart(2, '0')} - ${s.code} - ${safe(s.title)}.docx`;
  fs.writeFileSync(path.join(dir, nome), await Packer.toBuffer(doc(s)));
  console.log(`${LOTE_1.includes(`hm1-n1-${s.code.toLowerCase()}`) ? 'PUBLICADA ' : 'pendente  '} ${s.pasta}/${nome}`);
  n++;
}
console.log(`${n} arquivos`);
