// Gera um .docx por caso de RPG guiado (revisão do usuário/professores) a partir de rpg.mjs.
// Uso: acrescente --novas para gerar só os casos que ainda não estão no ar (publicadas-rpg.json).
// Uso (o pacote docx não é dependência do projeto — mesmo padrão dos scripts/ com firebase-admin):
//   npm install --no-save docx
//   node conteudo/osce-hm1-n1/gerar-word-rpg.mjs "C:/Users/Luna/Documents/Casos RPG HM1 N1 - revisao"
// Cada arquivo mostra, cena a cena: o que o aluno lê, as condutas (certas marcadas), o que acontece
// em cada uma (a consequência narrada) e os valores revelados — mais os pontos de revisão do caso.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, ShadingType,
  AlignmentType, BorderStyle, LevelFormat, Footer, PageNumber,
} from 'docx';
import casos from './rpg.mjs';
import dicas from './rpg-dicas.mjs';
import SLUGS from './rpg-slugs.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT = process.argv[2];
const SO_CODIGOS = (process.argv.find((a) => a.startsWith('--codigos=')) ?? '').slice(10).split(',').filter(Boolean); // ex.: --codigos=R14,R15
const SO_NOVAS = process.argv.includes('--novas'); // só os casos que ainda não estão no ar
if (!OUT) throw new Error('Informe a pasta de saída: node conteudo/osce-hm1-n1/gerar-word-rpg.mjs <pasta>');
const NO_AR = JSON.parse(fs.readFileSync(path.join(HERE, 'publicadas-rpg.json'), 'utf8'));


const NAVY = '003366';
const GOLD = 'D4A017';
const GRAY = '666666';
const LIGHT = 'EEF3F8';
const GREEN = 'E6F4EA';
const RED = 'FDECEA';
const PURPLE = 'F1E9FB';
const CONTENT = 9638;

const run = (text, opts = {}) => new TextRun({ text, font: 'Arial', size: 20, ...opts });
const p = (children, opts = {}) =>
  new Paragraph({ children: Array.isArray(children) ? children : [run(children)], spacing: { after: 120 }, ...opts });
const small = (text) => p([run(text, { size: 17, color: GRAY })], { spacing: { after: 60 } });
const h3 = (text) => new Paragraph({ children: [run(text, { size: 21, bold: true, color: GOLD })], spacing: { before: 240, after: 80 }, keepNext: true });
const sceneTitle = (text) => new Paragraph({ children: [run(text, { size: 22, bold: true, color: NAVY })], spacing: { before: 320, after: 80 }, keepNext: true, border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: GOLD, space: 2 } } });
const numbered = (children) => new Paragraph({ numbering: { reference: 'q', level: 0 }, children, spacing: { after: 100 } });

const border = { style: BorderStyle.SINGLE, size: 4, color: 'C9D3DE' };
const borders = { top: border, bottom: border, left: border, right: border };
const cell = (content, width, { header = false, fill, bold = false, align, color, size = 18 } = {}) =>
  new TableCell({
    width: { size: width, type: WidthType.DXA },
    borders,
    margins: { top: 60, bottom: 60, left: 100, right: 100 },
    shading: header ? { type: ShadingType.CLEAR, color: 'auto', fill: NAVY } : fill ? { type: ShadingType.CLEAR, color: 'auto', fill } : undefined,
    children: [new Paragraph({ alignment: align, children: [run(String(content ?? ''), { size, bold: header || bold, color: header ? 'FFFFFF' : color })] })],
  });
const table = (widths, header, rows) =>
  new Table({
    width: { size: CONTENT, type: WidthType.DXA },
    columnWidths: widths,
    rows: [
      ...(header ? [new TableRow({ tableHeader: true, children: header.map((h, i) => cell(h, widths[i], { header: true })) })] : []),
      ...rows.map((r) => new TableRow({ cantSplit: true, children: r })),
    ],
  });

const MARK_W = 700;
const ACTION_W = 3900;
const FEED_W = CONTENT - MARK_W - ACTION_W;

const choicesTable = (choices) =>
  table(
    [MARK_W, ACTION_W, FEED_W],
    ['', 'Conduta (como aparece para o aluno)', 'O que acontece (texto exibido depois da escolha)'],
    choices.map((c) => [
      cell(c.correct ? '✔' : '✘', MARK_W, { align: AlignmentType.CENTER, fill: c.correct ? GREEN : RED, bold: true, size: 22, color: c.correct ? '1E7B34' : 'B00020' }),
      cell(c.action, ACTION_W, { bold: !!c.correct }),
      cell(c.feedback, FEED_W),
    ])
  );

const sceneBlock = (scene, i, total, caso) => [
  sceneTitle(`Cena ${i + 1} de ${total} · ${scene.passo}`),
  small(`Passo do roteiro: ${scene.fonte} · origem ${scene.origem} ${scene.origem === 'D' ? '(derivado — validar)' : '(roteiro)'}`),
  table([1500, CONTENT - 1500], null, [
    [cell('Narrativa', 1500, { fill: LIGHT, bold: true }), cell(scene.narrative, CONTENT - 1500)],
    ...(scene.patient ? [[cell('Fala', 1500, { fill: PURPLE, bold: true }), cell(scene.patient, CONTENT - 1500)]] : []),
    [cell('Pergunta', 1500, { fill: LIGHT, bold: true }), cell(scene.prompt || 'O que você faz agora?', CONTENT - 1500)],
    ...(dicas[caso.code]?.[i] ? [[cell('Dica (modo digitado)', 1500, { fill: 'FFF4E0', bold: true }), cell(dicas[caso.code][i], CONTENT - 1500)]] : []),
  ]),
  p('', { spacing: { after: 40 } }),
  choicesTable(scene.choices),
  ...(scene.reveals
    ? [p([run('Valores revelados SÓ depois da conduta correta: ', { bold: true, color: NAVY }), run(scene.reveals.map((r) => `${r.label} = ${r.value}`).join('  ·  '))], { spacing: { before: 100, after: 60 } })]
    : []),
];

const pontosDo = (caso) => {
  const pts = [
    ['Consequências narradas. ', 'Cada erro mostra o que ele provoca. Parte do texto é consequência lógica da ordem (ex.: "leva a contaminação para o rosto") e não frase literal do roteiro. Confirmar que nenhuma está exagerada ou incorreta.'],
    ['Cenas derivadas (origem D). ', 'Passos que o roteiro não escreve exatamente assim (recorte, junção ou aplicação a um contexto). Confirmar cada um.'],
  ];
  if (['R1', 'R3'].includes(caso.code)) {
    pts.push(['Desparamentação só com os EPIs da precaução. ', 'O roteiro dá a ordem completa (p. 8). Aqui ela foi aplicada apenas ao EPI desta precaução (a máscara). Está correto?']);
    pts.push(['Paciente sair do quarto. ', 'A cena usa a regra do roteiro (p. 6): evitar o transporte e, se necessário, máscara cirúrgica durante toda a permanência fora do quarto. Está adequado como diálogo com o paciente?']);
  }
  if (caso.code === 'R2') {
    pts.push(['Desparamentação da precaução de contato (origem D). ', 'Luvas → higienizar → avental → higienizar, derivado da ordem geral (p. 8). Confirmar.']);
    pts.push(['Equipamento exclusivo. ', 'A cena do estetoscópio traz a regra do roteiro (p. 6). Mantém, ou prefere cobrir termômetro e esfigmomanômetro também?']);
  }
  if (caso.code === 'R4') {
    pts.push(['Só a variação com touca e PFF2/N95. ', 'É a sequência mais completa (p. 9). As demais variações (sem touca, máscara cirúrgica) existem nas estações estáticas D1 a D4. Deseja casos RPG para elas também?']);
  }
  if (caso.code === 'R5') {
    pts.push(['Temperatura. ', 'O roteiro cita os termômetros (digital simples ou infravermelho) e os locais de aferição, mas não a técnica passo a passo. A cena aceita os dois termômetros e revela 36,7 °C, sem detalhar o local.']);
    pts.push(['Pulso. ', 'A cena aceita contar 1 minuto ou 30 s × 2 (o roteiro diz que "pode" multiplicar). Valores fictícios: pulso 76 bpm, FR 16 irpm, PA 124/78 mmHg.']);
  }
  if (caso.code === 'R6') {
    pts.push(['Valores do hiato auscultatório. ', 'O roteiro mostra o hiato só na Imagem 1 (p. 5), sem números. Os valores deste caso (sistólica 168 mmHg; sons somem em 150 e voltam em 132; diastólica 96) são fictícios e coerentes entre as cenas. Aceitável como exemplo?']);
    pts.push(['Sem classificação. ', 'O caso não nomeia o estágio da pressão (a Imagem 2 do roteiro classifica, mas a unidade avalia técnica).']);
  }
  if (caso.code === 'R7') {
    pts.push(['Duas posições aceitas. ', 'Decúbito lateral esquerdo OU dorsal (p. 3). O erro cobrado na cena é o nível do braço, não a posição do corpo, porque o roteiro só diz "preferir" essas duas.']);
    pts.push(['Valor fictício. ', 'PA 128/74 mmHg; sistólica palpatória 128 mmHg.']);
  }
  if (caso.code === 'R8') {
    pts.push(['Artéria do pulso (origem D). ', 'Foi usada a artéria CARÓTIDA no paciente inconsciente. O roteiro lista a carotídea entre as principais (p. 2) mas não diz qual usar neste caso. A veia jugular entra como opção errada: o pulso se palpa em artéria. Confirmar.']);
    pts.push(['Mesma técnica no inconsciente. ', 'Por isso o caso mantém apresentar-se, explicar o procedimento e informar os achados (p. 1 e 6). Está correto, ou algum passo muda (ex.: comunicar à equipe)?']);
  }
  if (caso.code === 'R9') {
    pts.push(['Os 5 momentos em ordem de história. ', 'O roteiro numera os momentos mas não define a ordem em que ocorrem. Aqui a história fixa: exame → procedimento com risco de exposição → ajeitar o paciente → mesa de cabeceira. Está adequado?']);
    pts.push(['Cenas do paciente. ', 'As falas do paciente ("não precisa lavar a mão por causa da mesinha") são o tipo de pressão real que o aluno enfrenta. Confirmar que o tom é adequado.']);
  }
  if (caso.code === 'R10') {
    pts.push(['Colega sugerindo reencapar a agulha. ', 'Reproduz uma fala comum no plantão para o aluno aprender a recusar. O roteiro diz "sem desconectá-las ou reencapá-las" (p. 5); a explicação do risco (mão perto da ponta) é consequência lógica, não texto do roteiro.']);
    pts.push(['Procedimento sem risco de respingos. ', 'O caso usa só luvas, como a precaução padrão prevê quando não há risco de respingos. A versão com avental, máscara e óculos existe na estação estática B04.']);
  }
  if (caso.code === 'R11') {
    pts.push(['Duas situações no mesmo caso. ', 'Mãos sujas (água e sabonete) e mãos limpas (fricção alcoólica). Em mãos limpas o roteiro admite também água e sabonete; por isso a cena cobra só a execução da fricção, não a escolha.']);
    pts.push(['Só as etapas mais erradas. ', 'O caso não percorre os 11 passos da lavagem nem os 8 da fricção (isso está nas estações estáticas B01 e B02). Está adequado?']);
  }
  if (caso.code === 'R12') {
    pts.push(['Retirada em 4 cenas. ', 'A retirada é a sequência do roteiro (p. 10) dividida em cenas: primeira luva, segurá-la, dedos por dentro, segunda luva. Está adequado, ou prefere menos cenas?']);
  }
  if (caso.code === 'R13') {
    pts.push(['Só calçar. ', 'O roteiro mostra apenas como calçar a luva cirúrgica; a retirada dela não consta, por isso não foi criada.']);
    pts.push(['Quando usar luva estéril. ', 'O roteiro ensina a técnica, mas não diz quando usá-la. O caso diz que o procedimento exige técnica estéril. Está adequado?']);
  }
  pts.push(['Enunciado, nomes e valores. ', 'Fictícios; não alteram a técnica. Ajuste o texto ao estilo das suas provas.']);
  return pts;
};

const doc = (caso) => {
  const slug = SLUGS[caso.code];
  const publicada = NO_AR.includes(slug);
  const total = caso.scenes.length;
  const children = [
    p([run('LUNA MEDCLASS · RPG GUIADO · HM1 · UNIDADE N1', { size: 16, bold: true, color: GOLD, characterSpacing: 30 })], { spacing: { after: 80 } }),
    p([run(`${caso.code} · ${caso.title}`, { size: 34, bold: true, color: NAVY })], { spacing: { after: 120 } }),
    table([CONTENT], null, [[cell(publicada ? 'JÁ NO AR (versão anterior). Este documento é a versão REVISADA.' : 'AINDA NÃO PUBLICADO — aguarda a sua revisão.', CONTENT, { fill: publicada ? GREEN : 'FFF4E0', bold: true })]]),
    p('', { spacing: { after: 60 } }),
    small(`Tema no sistema: "${caso.theme}" · Identificador: ${slug} · ${total} cenas`),
    small(`Fonte: ${caso.fonte}`),

    h3('Como o aluno joga'),
    p('A cada cena o aluno lê a situação e escolhe uma conduta entre 4 opções (a ordem é embaralhada). Se erra, vê o que acontece, aquela opção fica bloqueada e ele escolhe de novo; só acerta para avançar. Os valores aferidos (pressão, pulso etc.) só aparecem no painel depois da conduta certa. Nota: acertar de primeira vale 1 ponto por cena, na segunda tentativa 0,5, da terceira em diante 0. Não há IA: tudo o que aparece está neste documento.'),

    h3('O que o aluno lê no início'),
    table([1800, CONTENT - 1800], null, [
      [cell('Ambiente', 1800, { fill: LIGHT, bold: true }), cell(caso.setting, CONTENT - 1800)],
      [cell('Caso', 1800, { fill: LIGHT, bold: true }), cell(caso.scenario, CONTENT - 1800)],
      [cell('Missão', 1800, { fill: LIGHT, bold: true }), cell(caso.task, CONTENT - 1800)],
    ]),

    ...caso.scenes.flatMap((scene, i) => sceneBlock(scene, i, total, caso)),

    ...(caso.tip ? [h3('Dica exibida ao aluno no resultado'), p(caso.tip)] : []),

    h3('Pontos para revisar neste caso'),
    ...pontosDo(caso).map(([t, d]) => numbered([run(t, { bold: true }), run(d)])),
    small('Origem: R = texto do roteiro (literal ou quase literal, com a página) · D = derivado do roteiro (recorte, junção ou aplicação a um contexto) — validar.'),
    new Paragraph({
      spacing: { before: 240, after: 60 },
      border: { top: { style: BorderStyle.SINGLE, size: 6, color: GOLD, space: 6 } },
      children: [run('Parecer:   ', { bold: true, color: NAVY }), run('☐ Aprovado      ☐ Aprovado com ajustes      ☐ Refazer')],
    }),
    p([run('Revisado por: ', { bold: true, color: NAVY }), run('______________________________    ', { color: 'BBBBBB' }), run('Data: ', { bold: true, color: NAVY }), run('____/____/______', { color: 'BBBBBB' })]),
    p([run('Observações: ', { bold: true, color: NAVY }), run('_______________________________________________________________________', { color: 'BBBBBB' })]),
  ];

  return new Document({
    creator: 'Luna MedClass',
    title: `${caso.code} · ${caso.title}`,
    styles: { default: { document: { run: { font: 'Arial', size: 20 } } } },
    numbering: { config: [{ reference: 'q', levels: [{ level: 0, format: LevelFormat.DECIMAL, text: '%1.', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 500, hanging: 360 } } } }] }] },
    sections: [{
      properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 1134, bottom: 1134, left: 1134, right: 1134 } } },
      footers: {
        default: new Footer({
          children: [new Paragraph({
            alignment: AlignmentType.RIGHT,
            children: [
              run(`${caso.code} · revisão de caso RPG guiado HM1 N1   ·   página `, { size: 16, color: GRAY }),
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
const contagem = {};
let gerados = 0;
for (const caso of casos) {
  if (SO_NOVAS && NO_AR.includes(SLUGS[caso.code])) continue;
  if (SO_CODIGOS.length && !SO_CODIGOS.includes(caso.code)) continue;
  const pasta = caso.theme === 'Sinais Vitais' ? '2 - Sinais Vitais' : '1 - Biossegurança';
  const dir = path.join(OUT, pasta);
  fs.mkdirSync(dir, { recursive: true });
  contagem[pasta] = (contagem[pasta] ?? 0) + 1;
  const nome = `${String(contagem[pasta]).padStart(2, '0')} - ${caso.code} - ${safe(caso.title)}.docx`;
  fs.writeFileSync(path.join(dir, nome), await Packer.toBuffer(doc(caso)));
  console.log(`${pasta}/${nome}`);
  gerados += 1;
}
console.log(`${gerados} arquivos`);
