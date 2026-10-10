// Conteúdo das estações OSCE estáticas — HM1 / N1. Fonte única: os 2 roteiros de aula prática.
// origem: 'R' = texto do roteiro (literal ou quase literal); 'D' = derivado do roteiro (recorte,
// junção ou negação de uma afirmação do roteiro) — precisa de validação docente.
//
// Revisão 2 (2026-10-10, retorno do usuário): casos no formato de enunciado de OSCE (ambiente com
// material disponível, paciente, contexto e instrução ao candidato), mais distratores, e novas
// estações com as variáveis que o próprio roteiro cita (ritmo sem alteração, ruídos de difícil
// percepção, medida em várias posições, paciente inconsciente). Nomes e idades dos pacientes
// são fictícios e não alteram a técnica.

// `pendente: true` = item que depende de resposta das professoras (perguntas do documento de
// revisão); fica fora dos lotes publicados até ser validado.

// Nomes EXATOS dos temas da HM1 em produção (config/disciplines) — a importação recusa tema
// que não exista na disciplina.
export const TEMAS = {
  biosseguranca: 'Biossegurança e Controle de IRAS',
  sinaisVitais: 'Sinais Vitais',
};

const BIO = 'Roteiro de Biossegurança (Profª Ingrid Cordeiro)';
const SV = 'Roteiro de Sinais Vitais (Prof. Michel Melo)';

const d = (action, why, origem = 'D', extra = {}) => ({ action, why, origem, ...extra });

const WHY = {
  maos: 'Principal medida de prevenção de IRAS; obrigatória antes e entre etapas (tabela de EPI, p. 8).',
  avental: 'Proteção de tronco e membros contra contato (tabela de EPI, p. 8).',
  cirurgica: 'Proteção respiratória básica; obrigatória em gotículas (tabela de EPI, p. 8).',
  pff2: 'Filtração ≥ 94–95% de partículas; obrigatória em aerossóis (tabela de EPI, p. 8).',
  oculos: 'Proteção de mucosa ocular (tabela de EPI, p. 8).',
  luvas: 'Proteção contra contato direto (tabela de EPI, p. 8).',
  touca: 'Não listada como obrigatória pela ANVISA; frequentemente exigida por protocolos hospitalares — cultura institucional / controle adicional de respingos (tabela de EPI, p. 8).',
};

const DIST = {
  propé: d('Colocar o propé', 'Não recomendado rotineiramente: evidência limitada para redução de transmissão (tabela de EPI, p. 8).', 'R'),
  maosDepoisLuvas: d('Higienizar as mãos depois de calçar as luvas', 'A higienização das mãos é o primeiro passo da paramentação, antes de tocar em qualquer EPI (p. 8).'),
};

// ---------------------------------------------------------------------------
// BIOSSEGURANÇA
// ---------------------------------------------------------------------------

const B01 = {
  code: 'B01', title: 'Higiene das mãos com água e sabão', fonte: `${BIO}, p. 3`,
  setting: 'Posto de enfermagem da enfermaria de clínica médica. Pia com torneira de acionamento manual, dispensador de sabonete líquido e dispensador de papel-toalha. Sobre o balcão, um frasco de preparação alcoólica.',
  scenario: 'Você é acadêmico(a) de Medicina em atividade prática na enfermaria. Há pouco você manuseou caixas de material e prontuários no posto de enfermagem e percebeu sujidade visível nas suas mãos. O próximo paciente a ser atendido, no leito 4, já aguarda você.',
  task: 'Realize a higiene das mãos com água e sabão, executando todas as etapas na sequência correta, até o fechamento da torneira. Nesta estação você não precisa atender o paciente.',
  steps: [
    { action: 'Molhar as mãos', origem: 'R' },
    { action: 'Aplicar sabão em quantidade suficiente para cobrir toda a palma', origem: 'R' },
    { action: 'Esfregar uma palma contra a outra', origem: 'R' },
    { action: 'Palma direita sobre o dorso esquerdo, com os dedos entrelaçados; depois inverter', origem: 'R' },
    { action: 'Palma contra palma, com os dedos entrelaçados', origem: 'R' },
    { action: 'Esfregar as costas dos dedos, uma mão contra a outra', origem: 'R' },
    { action: 'Esfregar o polegar de cada mão de forma rotacional', origem: 'R' },
    { action: 'Esfregar as palmas das mãos com as pontas dos dedos, em forma circular', origem: 'R' },
    { action: 'Enxaguar as mãos com água', origem: 'R' },
    { action: 'Secar bem as mãos', origem: 'R' },
    { action: 'Usar o papel-toalha para fechar a torneira', origem: 'R', critical: true },
  ],
  distractors: [
    d('Fechar a torneira com as mãos', 'O roteiro orienta usar o papel-toalha para fechar a torneira (passo 10, p. 3).'),
    d('Friccionar as mãos até secarem, sem enxaguar', 'Este é o final da fricção com preparação alcoólica (p. 4), não da lavagem com água e sabão.'),
    d('Aplicar preparação alcoólica nas mãos visivelmente sujas', 'Com as mãos visivelmente sujas, a higienização é com água e sabonete (p. 4); a fricção alcoólica é para mãos sem sujidade visível (p. 5).'),
    d('Aplicar uma pequena quantidade de sabão, apenas nas pontas dos dedos', 'O sabão deve ser aplicado em quantidade suficiente para cobrir toda a palma (passo 1, p. 3).'),
    d('Esfregar apenas as palmas das mãos, dispensando o dorso, os dedos e os polegares', 'A sequência inclui palma contra palma, dorso das mãos, costas dos dedos, polegares e pontas dos dedos (passos 2 a 7, p. 3).'),
  ],
  tip: 'Higienize as mãos com água e sabonete quando estiverem visivelmente sujas; nas demais situações, prefira a fricção com preparação alcoólica (p. 4).',
};

const B02 = {
  code: 'B02', title: 'Fricção antisséptica com preparação alcoólica', fonte: `${BIO}, p. 4`,
  setting: 'Beira do leito, na enfermaria de clínica médica. Dispensador de preparação alcoólica fixado na parede, ao lado da cama. A pia fica a alguns metros.',
  scenario: 'Você é acadêmico(a) de Medicina e vai examinar a Sra. M.S., 67 anos, internada para acompanhamento clínico. Suas mãos não têm sujidade visível e você ainda não tocou na paciente nem no leito.',
  task: 'Realize a fricção antisséptica das mãos com preparação alcoólica, na sequência correta e pelo tempo adequado (de 20 a 30 segundos). Nesta estação você não precisa examinar a paciente.',
  steps: [
    { action: 'Aplicar quantidade suficiente de preparação alcoólica em uma mão em forma de concha, para cobrir todas as superfícies das mãos', origem: 'R' },
    { action: 'Friccionar as palmas das mãos entre si', origem: 'R' },
    { action: 'Friccionar a palma direita contra o dorso da mão esquerda, entrelaçando os dedos, e vice-versa', origem: 'R' },
    { action: 'Friccionar a palma das mãos entre si, com os dedos entrelaçados', origem: 'R' },
    { action: 'Friccionar o dorso dos dedos de uma mão com a palma da mão oposta, segurando os dedos, com movimento de vai-e-vem, e vice-versa', origem: 'R' },
    { action: 'Friccionar o polegar esquerdo com o auxílio da palma da mão direita, em movimento circular, e vice-versa', origem: 'R' },
    { action: 'Friccionar as polpas digitais e unhas da mão direita contra a palma da mão esquerda, em movimento circular, e vice-versa', origem: 'R' },
    { action: 'Aguardar as mãos secarem', origem: 'R' },
  ],
  distractors: [
    d('Enxaguar as mãos com água', 'Enxágue faz parte da lavagem com água e sabão (p. 3), não da fricção alcoólica.'),
    d('Secar as mãos com papel-toalha', 'Na fricção alcoólica as mãos secam sozinhas: "quando estiverem secas, suas mãos estarão seguras" (p. 4).'),
    d('Aplicar uma pequena quantidade de preparação alcoólica, apenas na palma de uma das mãos', 'A quantidade deve ser suficiente para cobrir todas as superfícies das mãos (passo 1a/1b, p. 4).'),
    d('Encerrar a fricção após 5 segundos', 'A duração de todo o procedimento é de 20 a 30 segundos (p. 4).'),
    d('Friccionar somente as palmas das mãos', 'A fricção inclui dorso das mãos, espaços interdigitais, dedos, polegares e polpas digitais (passos 2 a 7, p. 4).'),
  ],
  tip: 'Duração de todo o procedimento: 20 a 30 segundos. Higienize com água e sabonete apenas quando as mãos estiverem visivelmente sujas (p. 4).',
};

// --- Paramentação (família P) — ordem do roteiro: p. 8 (sem touca) e p. 9 (com touca)
const PARAM_ACTIONS = {
  maos: { action: 'Higienizar as mãos', why: WHY.maos, critical: true },
  touca: { action: 'Colocar a touca', why: WHY.touca },
  avental: { action: 'Colocar o avental', why: WHY.avental },
  cirurgica: { action: 'Colocar a máscara cirúrgica', why: WHY.cirurgica },
  pff2: { action: 'Colocar a máscara PFF2/N95', why: WHY.pff2 },
  oculos: { action: 'Colocar os óculos ou o face shield', why: WHY.oculos },
  luvaProc: { action: 'Calçar as luvas de procedimento', why: WHY.luvas },
  luvaEst: { action: 'Calçar as luvas cirúrgicas (estéreis)', why: WHY.luvas },
};

const paramVariant = (code, touca, mascara, luva) => {
  const ctx = [
    touca
      ? 'O protocolo da instituição exige o uso de touca para entrar no quarto.'
      : 'O protocolo da instituição não exige o uso de touca.',
    mascara === 'pff2'
      ? 'Na porta do quarto há uma placa: PRECAUÇÃO PARA AEROSSÓIS. Durante o atendimento haverá risco de respingos de sangue ou secreções.'
      : 'Na porta do quarto não há placa de precaução por via aérea, mas durante o atendimento haverá risco de respingos de sangue ou secreções.',
    luva === 'est'
      ? 'O procedimento que será realizado exige técnica estéril.'
      : 'O procedimento que será realizado não é estéril.',
  ].join(' ');
  const seq = [
    PARAM_ACTIONS.maos,
    ...(touca ? [PARAM_ACTIONS.touca] : []),
    PARAM_ACTIONS.avental,
    mascara === 'pff2' ? PARAM_ACTIONS.pff2 : PARAM_ACTIONS.cirurgica,
    PARAM_ACTIONS.oculos,
    luva === 'est' ? PARAM_ACTIONS.luvaEst : PARAM_ACTIONS.luvaProc,
  ];
  const distractors = [
    ...(touca ? [] : [d('Colocar a touca', 'O caso informa que o protocolo da instituição não exige touca.')]),
    mascara === 'pff2'
      ? d('Colocar a máscara cirúrgica', 'Em aerossóis o profissional usa PFF2/N95; a máscara cirúrgica é do paciente durante o transporte (p. 6).', 'R')
      : d('Colocar a máscara PFF2/N95', 'PFF2/N95 é a máscara obrigatória em aerossóis (p. 8); este caso não é de aerossóis.'),
    luva === 'est'
      ? d('Calçar as luvas de procedimento', 'O caso exige técnica estéril: luva cirúrgica (estéril).')
      : d('Calçar as luvas cirúrgicas (estéreis)', 'O procedimento não é estéril: luva de procedimento.'),
    DIST.propé,
    DIST.maosDepoisLuvas,
    ...(mascara === 'pff2'
      ? [d('Entrar no quarto e só depois colocar a máscara PFF2/N95', 'A máscara deve ser colocada antes de entrar no quarto, mantendo a porta sempre fechada (p. 6).', 'R')]
      : []),
  ];
  const label = [
    touca ? 'com touca' : 'sem touca',
    mascara === 'pff2' ? 'PFF2/N95' : 'máscara cirúrgica',
    luva === 'est' ? 'luva estéril' : 'luva de procedimento',
  ].join(' · ');
  return { code, label, ctx, seq, distractors };
};

const PARAM = {
  title: 'Paramentação (8 variações)',
  fonte: `${BIO}, p. 8 (sem touca) e p. 9 (com touca); EPIs por contexto: p. 5–8`,
  setting: 'Antessala do quarto de isolamento, na enfermaria. Na bancada estão disponíveis: touca, avental, máscara cirúrgica, máscara PFF2/N95, óculos, face shield, luvas de procedimento, luvas cirúrgicas estéreis e propés. Dispensador de preparação alcoólica na parede.',
  scenario: 'Você é acadêmico(a) de Medicina em atividade prática na enfermaria e participará do atendimento do Sr. J.R., 58 anos, internado neste quarto. [CONTEXTO DA VARIAÇÃO] Você ainda não tocou em nenhum EPI.',
  task: 'Realize a paramentação completa, na ordem correta, antes de entrar no quarto. Nesta estação você não precisa realizar o atendimento.',
  variants: [
    paramVariant('P1', false, 'cirurgica', 'proc'),
    paramVariant('P2', false, 'cirurgica', 'est'),
    paramVariant('P3', false, 'pff2', 'proc'),
    paramVariant('P4', false, 'pff2', 'est'),
    paramVariant('P5', true, 'cirurgica', 'proc'),
    paramVariant('P6', true, 'cirurgica', 'est'),
    paramVariant('P7', true, 'pff2', 'proc'),
    paramVariant('P8', true, 'pff2', 'est'),
  ],
};

// --- Desparamentação (família D) — p. 8 (sem touca) e p. 9 (com touca)
const despVariant = (code, touca, mascara) => {
  const mascaraNome = mascara === 'pff2' ? 'máscara PFF2/N95' : 'máscara cirúrgica';
  const uso = ['avental', mascaraNome, 'óculos ou face shield', 'luvas de procedimento', ...(touca ? ['touca'] : [])].join(', ');
  const hig = { action: 'Higienizar as mãos', why: WHY.maos, critical: true };
  const seq = [
    { action: 'Retirar as luvas' },
    hig,
    { action: 'Retirar o avental' },
    hig,
    { action: 'Retirar os óculos ou o face shield' },
    ...(touca ? [{ action: 'Retirar a touca' }] : []),
    { action: `Retirar a ${mascaraNome}` },
    { ...hig, why: 'Higienização final das mãos (p. 8–9).' },
  ];
  const distractors = [
    ...(touca ? [] : [d('Retirar a touca', 'O caso informa que você não está usando touca.')]),
    mascara === 'pff2'
      ? d('Retirar a máscara cirúrgica', 'Você está usando a máscara PFF2/N95 (precaução para aerossóis).')
      : d('Retirar a máscara PFF2/N95', 'Você está usando máscara cirúrgica; a PFF2/N95 é da precaução para aerossóis (p. 6).'),
    d('Retirar o propé', 'O propé não é recomendado rotineiramente (p. 8) e o caso não informa que você o esteja usando.'),
    d('Higienizar as mãos apenas depois de retirar todos os EPIs', 'A desparamentação é a fase de maior risco: as mãos são higienizadas após retirar as luvas e após retirar o avental, além da higienização final (p. 8–9).'),
    d('Descartar as luvas no lixo comum', 'Luvas são descartadas em lixo infectante (p. 10).'),
  ];
  const label = `${touca ? 'com touca' : 'sem touca'} · ${mascara === 'pff2' ? 'PFF2/N95' : 'máscara cirúrgica'}`;
  return { code, label, ctx: `Você está usando: ${uso}.`, seq, distractors };
};

const DESP = {
  title: 'Desparamentação (4 variações)',
  fonte: `${BIO}, p. 8 (sem touca) e p. 9 (com touca)`,
  setting: 'Saída do quarto de isolamento. Há dispensador de preparação alcoólica ao lado da porta e lixeira para resíduos infectantes.',
  scenario: 'Você é acadêmico(a) de Medicina e participou do atendimento do Sr. J.R., 58 anos, internado neste quarto. O procedimento acaba de terminar e é preciso sair sem se contaminar e sem contaminar o ambiente. [CONTEXTO DA VARIAÇÃO]',
  task: 'Realize a desparamentação na ordem correta, com a higienização das mãos nos momentos adequados — esta é a fase de maior risco.',
  variants: [
    despVariant('D1', false, 'cirurgica'),
    despVariant('D2', false, 'pff2'),
    despVariant('D3', true, 'cirurgica'),
    despVariant('D4', true, 'pff2'),
  ],
};

// --- Precauções específicas (família C) — cards da p. 6 e resumo da p. 7
const C1 = {
  code: 'C1', title: 'Precaução de contato — entrar e sair do quarto', fonte: `${BIO}, p. 6–7`,
  setting: 'Corredor da enfermaria, em frente ao quarto de isolamento. Na bancada ao lado da porta há EPIs e um dispensador de preparação alcoólica; na saída do quarto, lixeira para resíduos infectantes.',
  scenario: 'Você é acadêmico(a) de Medicina e acompanhará a visita ao Sr. A.L., 71 anos, internado há 4 dias com infecção por microrganismo multirresistente. Na porta do quarto está a placa: PRECAUÇÃO DE CONTATO. Você fará o exame físico do paciente, sem risco de respingos de sangue ou secreções. Você ainda não entrou no quarto.',
  task: 'Realize, na ordem correta, a paramentação para entrar no quarto e, ao final do exame, a desparamentação. Nesta estação você não precisa realizar o exame.',
  steps: [
    { action: 'Higienizar as mãos', why: WHY.maos, critical: true, origem: 'R' },
    { action: 'Colocar o avental', why: 'Precaução de contato: avental e luvas durante toda a manipulação do paciente, colocados imediatamente antes do contato (p. 6).', origem: 'R' },
    { action: 'Calçar as luvas de procedimento', why: 'Precaução de contato: luvas (p. 6).', origem: 'R' },
    { action: 'Retirar as luvas', origem: 'D' },
    { action: 'Higienizar as mãos', why: WHY.maos, critical: true, origem: 'D' },
    { action: 'Retirar o avental', origem: 'D' },
    { action: 'Higienizar as mãos', why: 'Retirar luvas e avental logo após o uso, higienizando as mãos em seguida (p. 6).', critical: true, origem: 'D' },
  ],
  distractors: [
    d('Colocar a máscara PFF2/N95', 'PFF2/N95 é da precaução para aerossóis (p. 6).'),
    d('Colocar a máscara cirúrgica', 'Não faz parte da precaução de contato (p. 6–7) e o caso não tem risco de respingos.'),
    d('Colocar os óculos ou o face shield', 'Óculos/face shield são indicados quando há risco de respingos (p. 7); o caso informa que não há.'),
    DIST.propé,
    d('Manter o avental e as luvas calçados depois de sair do quarto', 'Avental e luvas são retirados logo após o uso, higienizando as mãos em seguida (p. 6).'),
    d('Examinar o paciente com o estetoscópio de uso coletivo da enfermaria', 'Na precaução de contato, termômetro, esfigmomanômetro e estetoscópio devem ser de uso exclusivo do paciente (p. 6).'),
  ],
  tip: 'Na precaução de contato, termômetro, esfigmomanômetro e estetoscópio devem ser de uso exclusivo do paciente (p. 6).',
};

const C2 = {
  code: 'C2', title: 'Precaução para gotículas — entrar e sair do quarto', fonte: `${BIO}, p. 6–7`,
  setting: 'Corredor da enfermaria, em frente ao quarto privativo. Na bancada ao lado da porta há EPIs e um dispensador de preparação alcoólica.',
  scenario: 'Você é acadêmico(a) de Medicina e vai conversar com a Sra. M.F., 34 anos, internada com suspeita de influenza, para colher a história clínica. Na porta do quarto está a placa: PRECAUÇÃO PARA GOTÍCULAS. Você ficará a mais de um braço de distância da paciente e não haverá contato com sangue ou secreções. Você ainda não entrou no quarto.',
  task: 'Realize, na ordem correta, a paramentação para entrar no quarto e, ao sair, a desparamentação. Nesta estação você não precisa realizar a entrevista.',
  steps: [
    { action: 'Higienizar as mãos', why: WHY.maos, critical: true, origem: 'R' },
    { action: 'Colocar a máscara cirúrgica', why: 'Gotículas: máscara cirúrgica para o profissional (p. 6–7).', origem: 'R' },
    { action: 'Retirar a máscara cirúrgica', origem: 'D' },
    { action: 'Higienizar as mãos', why: 'Higienização final das mãos (p. 8).', critical: true, origem: 'D' },
  ],
  distractors: [
    d('Colocar a máscara PFF2/N95', 'PFF2/N95 é a máscara da precaução para aerossóis; em gotículas o profissional usa máscara cirúrgica (p. 6–7).'),
    d('Colocar o avental', 'Não faz parte da precaução para gotículas (p. 6–7) e não haverá contato com sangue ou secreções.'),
    d('Calçar as luvas de procedimento', 'Luvas só quando há risco de contato com sangue, secreções ou mucosas (p. 5).'),
    d('Colocar os óculos ou o face shield', 'Óculos/máscara/avental são indicados quando há risco de contato com sangue ou secreções (p. 5); o caso informa que não haverá.'),
    DIST.propé,
  ],
  tip: 'Na falta de quarto privativo, distância mínima de 1 metro entre os leitos; no transporte, o paciente usa máscara cirúrgica (p. 6–7).',
};

const C3 = {
  code: 'C3', title: 'Precaução para aerossóis — entrar e sair do quarto', fonte: `${BIO}, p. 6–7`,
  setting: 'Corredor da enfermaria, em frente ao quarto privativo. Na bancada ao lado da porta há EPIs e um dispensador de preparação alcoólica.',
  scenario: 'Você é acadêmico(a) de Medicina e vai conversar com o Sr. R.C., 47 anos, internado com suspeita de tuberculose, para colher a história clínica. Na porta do quarto está a placa: PRECAUÇÃO PARA AEROSSÓIS. Não haverá contato com sangue ou secreções. Você ainda não entrou no quarto.',
  task: 'Realize, na ordem correta, a paramentação para entrar no quarto e, ao sair, a desparamentação. Nesta estação você não precisa realizar a entrevista.',
  steps: [
    { action: 'Higienizar as mãos', why: WHY.maos, critical: true, origem: 'R' },
    { action: 'Colocar a máscara PFF2/N95 antes de entrar no quarto', why: 'Coloque a máscara antes de entrar no quarto (p. 6); PFF2/N95: filtração ≥ 94–95% (p. 8).', critical: true, origem: 'R' },
    { action: 'Entrar e manter a porta do quarto fechada', why: 'Mantenha a porta do quarto SEMPRE fechada (p. 6).', origem: 'R' },
    { action: 'Retirar a máscara PFF2/N95', origem: 'D' },
    { action: 'Higienizar as mãos', why: 'Higienização final das mãos (p. 8).', critical: true, origem: 'D' },
  ],
  distractors: [
    d('Colocar a máscara cirúrgica', 'Em aerossóis a máscara cirúrgica é do paciente durante o transporte; o profissional usa PFF2/N95 (p. 6).', 'R'),
    d('Deixar a porta do quarto aberta', 'A porta deve ficar SEMPRE fechada (p. 6).'),
    d('Colocar o avental', 'Não faz parte da precaução para aerossóis (p. 6–7) e não haverá contato com sangue ou secreções.'),
    d('Entrar no quarto e só depois colocar a máscara PFF2/N95', 'Coloque a máscara antes de entrar no quarto (p. 6).', 'R'),
    d('Calçar as luvas de procedimento', 'Luvas só quando há risco de contato com sangue, secreções ou mucosas (p. 5).'),
    DIST.propé,
  ],
  tip: 'Na falta de quarto privativo, o paciente pode ficar com outros infectados pelo mesmo microrganismo; suspeita de tuberculose resistente não divide quarto (p. 6).',
};

// --- Luvas (família L) — p. 9–10
const L1 = {
  code: 'L1', title: 'Calçar e retirar luvas de procedimento', fonte: `${BIO}, p. 9–10`,
  setting: 'Beira do leito, na enfermaria. Caixa de luvas de procedimento sobre a mesa auxiliar e recipiente para lixo infectante ao lado da cama.',
  scenario: 'Você é acadêmico(a) de Medicina e fará, no paciente S.T., 45 anos, um procedimento de assistência não estéril, com risco de contato com secreções. Você usa um relógio e uma pulseira no punho e acaba de higienizar as mãos.',
  task: 'Calce as luvas de procedimento e, ao final do procedimento, retire-as corretamente e finalize a técnica. Nesta estação você não precisa realizar o procedimento no paciente.',
  steps: [
    { action: 'Remover joias e outros artefatos das mãos e pulsos', origem: 'R' },
    { action: 'Calçar a luva cuidadosamente, ajustando-a até o pulso', origem: 'R' },
    { action: 'Segurar uma luva pela parte externa, na altura do punho, e puxar em direção à ponta dos dedos (a luva sai do avesso)', origem: 'R' },
    { action: 'Segurar a luva removida com a outra mão enluvada', origem: 'R' },
    { action: 'Colocar os dedos da mão sem luva na parte interna da segunda luva, entre a luva e o punho', origem: 'R', critical: true },
    { action: 'Remover a segunda luva, arrastando-a em direção à ponta dos dedos e da outra luva', origem: 'R' },
    { action: 'Descartar as luvas em lixo infectante', origem: 'R' },
    { action: 'Higienizar as mãos', why: 'Retire as luvas logo após o uso, higienizando as mãos em seguida (p. 5).', critical: true, origem: 'R' },
  ],
  distractors: [
    d('Segurar a segunda luva pela parte externa com a mão sem luva', 'A mão sem luva entra pela parte interna da segunda luva, entre a luva e o punho (p. 10).'),
    d('Descartar as luvas no lixo comum', 'Luvas são descartadas em lixo infectante (p. 10).'),
    d('Calçar as luvas mantendo o relógio e a pulseira', 'Antes de calçar as luvas, remova joias e outros artefatos das mãos e pulsos (p. 9).'),
    d('Retirar a primeira luva puxando-a pela ponta dos dedos', 'A luva é segurada pela parte externa, na altura do punho, e puxada em direção à ponta dos dedos (p. 10).'),
    d('Sair da sala sem higienizar as mãos depois de descartar as luvas', 'Descarte as luvas em lixo infectante e higienize as mãos (p. 10).'),
    d('Manter as luvas calçadas para atender o próximo paciente', 'As luvas são retiradas logo após o uso, higienizando as mãos em seguida (p. 5).'),
  ],
  tip: 'Calce as luvas imediatamente antes do contato com o paciente e retire-as logo após o uso (p. 5).',
};

const L2 = {
  code: 'L2', title: 'Calçar luvas cirúrgicas (estéreis)', fonte: `${BIO}, p. 10`,
  setting: 'Sala de procedimentos do ambulatório. O pacote de luvas cirúrgicas estéreis está aberto sobre a mesa auxiliar. Ao lado, caixa de luvas de procedimento.',
  scenario: 'Você é acadêmico(a) de Medicina e vai auxiliar um procedimento que exige técnica estéril, em paciente do ambulatório. Você precisa calçar as luvas cirúrgicas antes de começar. Você ainda não tocou nas luvas.',
  task: 'Calce as luvas cirúrgicas, na sequência correta. Nesta estação você não precisa realizar o procedimento.',
  steps: [
    { action: 'Pegar uma luva com o polegar e o indicador', origem: 'R' },
    { action: 'Puxar a luva na mão', origem: 'R' },
    { action: 'Deslizar a mão parcialmente enluvada sob a borda da segunda luva', origem: 'R' },
    { action: 'Puxar a outra luva pelo lado de dentro e puxá-la até o pulso', origem: 'R' },
    { action: 'Deslizar os dedos da mão completamente enluvada sob a borda da primeira luva e puxá-la até o pulso', origem: 'R' },
  ],
  distractors: [
    d('Pegar a luva com a palma da mão aberta', 'A primeira luva é pega com o polegar e o indicador (passo 1, p. 10).'),
    d('Pegar a segunda luva pela parte externa com a mão ainda sem luva', 'A segunda luva é puxada pelo lado de dentro, deslizando a mão parcialmente enluvada sob a borda dela (passos 3 e 4, p. 10).'),
    d('Calçar as luvas de procedimento', 'O procedimento exige técnica estéril: luva cirúrgica (estéril).'),
    d('Puxar a luva apenas até a metade da mão', 'As luvas são puxadas até o pulso (passos 4 e 5, p. 10).'),
    d('Calçar as duas luvas ao mesmo tempo', 'A técnica é sequencial: uma mão primeiro, depois a outra com a mão parcialmente enluvada (passos 1 a 5, p. 10).'),
  ],
  tip: '',
};

// ---------------------------------------------------------------------------
// SINAIS VITAIS
// ---------------------------------------------------------------------------

const S01 = {
  code: 'S01', title: 'Preparo do material e abordagem do paciente', fonte: `${SV}, p. 1`,
  setting: 'Consultório de uma Unidade Básica de Saúde, silencioso. Sobre a mesa há uma bandeja vazia; no armário estão: estetoscópio, esfigmomanômetro, termômetro, relógio ou cronômetro, bloco de anotações, caneta, luvas de procedimento, álcool 70% e algodão.',
  scenario: 'Você é acadêmico(a) de Medicina em atividade prática na UBS. O Sr. G.M., 52 anos, aguarda na sala ao lado para ter os sinais vitais avaliados antes da consulta. Você ainda não iniciou nenhum preparo.',
  task: 'Prepare o material e aborde o paciente, na ordem correta, antes de iniciar a avaliação. Nesta estação você não precisa aferir nenhum sinal vital.',
  steps: [
    { action: 'Higienizar as mãos', why: 'O roteiro inicia a prática com a lavagem das mãos (p. 1).', critical: true, origem: 'R' },
    { action: 'Organizar na bandeja: estetoscópio, esfigmomanômetro, termômetro, relógio, bloco, caneta, luvas de procedimento, álcool 70% e algodão', origem: 'R' },
    { action: 'Higienizar o termômetro com algodão e álcool 70%, em movimentos unidirecionais do display para o bulbo', origem: 'R' },
    { action: 'Higienizar a braçadeira do esfigmomanômetro em movimentos unidirecionais', origem: 'R' },
    { action: 'Higienizar o diafragma do estetoscópio em movimentos circulares', origem: 'R' },
    { action: 'Apresentar-se ao paciente', origem: 'R' },
    { action: 'Explicar o procedimento', origem: 'R' },
    { action: 'Pedir o consentimento do paciente', origem: 'R' },
  ],
  distractors: [
    d('Higienizar o termômetro do bulbo para o display', 'O movimento é unidirecional do display para o bulbo (p. 1).'),
    d('Higienizar a braçadeira em movimentos circulares', 'A braçadeira é higienizada em movimentos unidirecionais (p. 1).'),
    d('Higienizar o diafragma do estetoscópio em movimentos unidirecionais', 'O diafragma é higienizado em movimentos circulares (p. 1).'),
    d('Higienizar o material com água e sabão', 'Todo o material é higienizado com algodão embebido em álcool 70% (p. 1).'),
    d('Iniciar a aferição sem pedir o consentimento do paciente', 'O discente deve se apresentar, explicar o procedimento e pedir o consentimento do paciente (p. 1).'),
    d('Levar o material solto nas mãos, sem organizá-lo na bandeja', 'O material é organizado na bandeja antes de iniciar a avaliação (p. 1).'),
  ],
  tip: 'Todo o material é higienizado com algodão embebido em álcool 70% (p. 1).',
};

// Variação com alteração de ritmo: o roteiro é taxativo (contar 1 minuto). A variação sem
// alteração está em S06.
const S02 = {
  code: 'S02', title: 'Pulso e respiração — alteração de ritmo nos primeiros 30 segundos', fonte: `${SV}, p. 2–3`,
  setting: 'Consultório da UBS. O Sr. G.M. está sentado, com o antebraço apoiado sobre a mesa. Você já preparou o material e abordou o paciente, que consentiu. Sobre a mesa: relógio ou cronômetro e bloco de anotações.',
  scenario: 'Você é acadêmico(a) de Medicina e avaliará o pulso e a respiração do Sr. G.M., 52 anos. Ao palpar o pulso radial, você percebe, nos primeiros 30 segundos, que o ritmo está alterado.',
  task: 'Avalie o pulso e, em seguida, a respiração, na ordem correta. Nesta estação você não precisa classificar os achados.',
  steps: [
    { action: 'Palpar o pulso radial', origem: 'R' },
    { action: 'Contar as pulsações por 30 segundos, observando ritmo, força e amplitude', origem: 'R' },
    { action: 'Manter a contagem até completar 1 minuto', why: 'Com alteração de ritmo ou amplitude nos primeiros 30 s, a contagem vai até 1 minuto (p. 2).', critical: true, origem: 'R' },
    { action: 'Continuar palpando o pulso e começar a observar discretamente o tórax', why: 'A respiração é avaliada logo após o pulso, continuando a palpar o mesmo (p. 3).', origem: 'R' },
    { action: 'Contar a respiração durante 1 minuto, sem informar o paciente', why: 'Informar o paciente leva ao controle voluntário do padrão respiratório (p. 2).', critical: true, origem: 'R' },
    { action: 'Avaliar ritmo, amplitude e tiragem da respiração', origem: 'R' },
  ],
  distractors: [
    d('Multiplicar o valor de 30 segundos por 2', 'Só se multiplica por 2 quando não há alteração de ritmo ou amplitude nos primeiros 30 s (p. 2).'),
    d('Avisar o paciente de que a respiração será contada', 'O observador não deve informar o paciente, para que não ocorra controle voluntário do padrão respiratório (p. 2).'),
    d('Soltar o pulso para observar o tórax', 'Continue palpando o pulso enquanto observa discretamente o tórax (p. 3).'),
    d('Contar as pulsações por apenas 15 segundos e multiplicar por 4', 'A avaliação do pulso é feita em 1 minuto (ou 30 segundos multiplicado por 2, se não houver alteração) (p. 2).'),
    d('Contar a respiração por 15 segundos e multiplicar por 4', 'A respiração é avaliada em um intervalo de 1 minuto (p. 2).'),
    d('Pedir ao paciente que respire profundamente enquanto você conta', 'O paciente não deve ser informado, para não ocorrer controle voluntário do padrão respiratório (p. 2).'),
  ],
  tip: 'Sem alteração de ritmo ou amplitude nos primeiros 30 s, pode-se multiplicar o valor por 2. Principais artérias: radial, carotídea e femoral (p. 2).',
};

const paSteps = (posicao) => [
  { action: 'Garantir repouso de 3 a 5 minutos, em local tranquilo', origem: 'R' },
  posicao,
  { action: 'Manter a artéria braquial ao nível do coração (4º espaço intercostal), braço ligeiramente fletido, apoiado em superfície firme, palma da mão para cima', origem: 'R' },
  { action: 'Localizar as pulsações da artéria braquial', origem: 'R' },
  { action: 'Colocar o manguito 2 cm acima da fossa cubital', origem: 'R' },
  { action: 'Palpar o pulso radial', origem: 'R' },
  { action: 'Inflar o manguito até o desaparecimento do pulso radial', origem: 'R' },
  { action: 'Desinsuflar lentamente: o reaparecimento do pulso é a pressão sistólica pelo método palpatório', why: 'O método palpatório evita subestimar a sistólica quando há hiato auscultatório (Imagem 1, p. 5).', critical: true, origem: 'R' },
  { action: 'Colocar o estetoscópio sobre a artéria braquial', origem: 'R' },
  { action: 'Insuflar o manguito cerca de 30 mmHg acima da sistólica palpatória', origem: 'R' },
  { action: 'Soltar o ar de maneira contínua, a 2–3 mmHg por segundo, até o completo esvaziamento', origem: 'R' },
  { action: 'Registrar a sistólica no aparecimento do primeiro ruído (fase I de Korotkoff)', origem: 'R' },
  { action: 'Registrar a diastólica no desaparecimento dos sons (fase V de Korotkoff)', origem: 'R' },
];

// Banco de distratores de PA. Cada estação escolhe de 4 a 6 — mais que isso dilui o exercício
// (decisão do usuário, 2026-10-10): entram os erros mais prováveis para o caso daquela estação.
const PA = {
  cubital: d('Colocar o manguito sobre a fossa cubital', 'O manguito fica 2 cm acima da fossa cubital (p. 3).'),
  rapido: d('Desinsuflar rapidamente o manguito', 'O ar é solto de maneira contínua, a 2–3 mmHg por segundo (p. 4).'),
  fase4: d('Registrar a diastólica no abafamento dos sons (fase IV de Korotkoff)', 'A diastólica é o desaparecimento dos sons, fase V (p. 4).'),
  cabeca: d('Baixar a cabeça para auscultar melhor', 'O observador deve evitar baixar a cabeça: a congestão dos vasos do ouvido prejudica a ausculta (p. 3).'),
  semPalpar: d('Inflar o manguito até um valor fixo, sem palpar o pulso radial antes', 'Primeiro se estima a sistólica pelo método palpatório (pulso radial) e só então se insufla 30 mmHg acima desse valor (p. 3–4).'),
  bracoAbaixo: d('Posicionar o braço do paciente abaixo do nível do coração', 'A artéria braquial deve ficar ao nível do coração, no 4º espaço intercostal (p. 3).'),
  radial: d('Colocar o estetoscópio sobre a artéria radial', 'Na ausculta, o estetoscópio vai sobre a artéria braquial (p. 4); a radial é usada no método palpatório.'),
  semRepouso: d('Aferir a pressão arterial logo que o paciente chega, sem repouso', 'O paciente deve ter repouso mínimo de 3 a 5 minutos, em local tranquilo (p. 3).'),
};

const S03 = {
  code: 'S03', title: 'Pressão arterial — método indireto (paciente sentado)', fonte: `${SV}, p. 3–5`,
  setting: 'Consultório da UBS, silencioso. A Sra. L.A. está sentada em uma cadeira com apoio para o braço. Sobre a mesa: esfigmomanômetro, estetoscópio, relógio e bloco de anotações. O material já foi higienizado.',
  scenario: 'Você é acadêmico(a) de Medicina e vai aferir a pressão arterial da Sra. L.A., 49 anos, que veio a uma consulta de rotina. Ela já foi abordada, entendeu o procedimento e consentiu. Acabou de chegar à sala e ainda não está em repouso.',
  task: 'Realize a medida da pressão arterial pelo método indireto, desde a preparação do paciente até o registro dos valores. Nesta estação você não precisa classificar o resultado.',
  steps: paSteps({ action: 'Posicionar o paciente sentado, confortável', origem: 'R' }),
  distractors: [PA.cubital, PA.rapido, PA.fase4, PA.semPalpar, PA.bracoAbaixo, PA.semRepouso],
  tip: 'Se os ruídos estiverem difíceis de ouvir, aumente o ângulo entre o braço e o tórax, retificando a artéria (p. 4).',
};

const S04 = {
  code: 'S04', title: 'Pressão arterial — método indireto (gestante)', fonte: `${SV}, p. 3–5`,
  setting: 'Consultório de pré-natal da UBS. A paciente está em uma maca com apoio para o braço. Sobre a mesa: esfigmomanômetro, estetoscópio, relógio e bloco de anotações. O material já foi higienizado.',
  scenario: 'Você é acadêmico(a) de Medicina e vai aferir a pressão arterial da Sra. C.B., 28 anos, gestante, em consulta de pré-natal. Ela já foi abordada, entendeu o procedimento e consentiu. Acabou de chegar à sala e ainda não está em repouso.',
  task: 'Realize a medida da pressão arterial pelo método indireto, na posição preferencial para gestantes, até o registro dos valores. Nesta estação você não precisa classificar o resultado.',
  steps: paSteps({ action: 'Posicionar a gestante em decúbito lateral esquerdo ou decúbito dorsal', why: 'No caso de gestantes, preferir o decúbito lateral esquerdo ou o decúbito dorsal (p. 3).', critical: true, origem: 'R' }),
  distractors: [
    d('Posicionar a gestante em decúbito lateral direito', 'O roteiro indica decúbito lateral esquerdo ou dorsal para gestantes (p. 3).', 'D', { pendente: true }),
    PA.cubital, PA.rapido, PA.fase4, PA.semPalpar, PA.bracoAbaixo,
  ],
  tip: 'Se os ruídos estiverem difíceis de ouvir, aumente o ângulo entre o braço e o tórax, retificando a artéria (p. 4).',
};

const SV_COMPLETA = [
  { action: 'Higienizar as mãos', critical: true, origem: 'R' },
  { action: 'Organizar e higienizar o material da bandeja com algodão e álcool 70%', origem: 'R' },
  { action: 'Apresentar-se, explicar o procedimento e pedir o consentimento', origem: 'R' },
  { action: 'Avaliar a temperatura corporal', origem: 'R' },
  { action: 'Avaliar o pulso', origem: 'R' },
  { action: 'Avaliar a respiração, sem informar o paciente', critical: true, origem: 'R' },
  { action: 'Aferir a pressão arterial', origem: 'R' },
  { action: 'Informar os achados ao paciente e perguntar se ele tem alguma dúvida', origem: 'R' },
];

const SV_COMPLETA_DISTRACTORS = [
  d('Avisar o paciente de que a respiração será observada', 'O observador não deve informar o paciente sobre a coleta, para evitar controle voluntário da respiração (p. 2).'),
  d('Higienizar o material com água e sabão', 'Todo o material é higienizado com algodão embebido em álcool 70% (p. 1).'),
  d('Iniciar a avaliação sem pedir o consentimento do paciente', 'O discente deve se apresentar, explicar o procedimento e pedir o consentimento (p. 1).'),
  d('Registrar os achados sem informá-los ao paciente', 'Ao final da avaliação, informar os achados ao paciente e perguntar se ele tem alguma dúvida (p. 6).'),
  d('Aferir a pressão arterial sem repouso prévio', 'A pressão arterial exige repouso mínimo de 3 a 5 minutos (p. 3).'),
  d('Contar o pulso por 15 segundos e multiplicar por 4', 'O pulso é avaliado em 1 minuto (ou 30 segundos multiplicado por 2, se não houver alteração de ritmo ou amplitude) (p. 2).'),
];

const S05 = {
  code: 'S05', title: 'Sequência completa de sinais vitais', fonte: `${SV}, p. 1–6`,
  setting: 'Consultório da UBS. Sobre a mesa: bandeja, estetoscópio, esfigmomanômetro, termômetro, relógio, bloco de anotações, caneta, luvas de procedimento, álcool 70% e algodão.',
  scenario: 'Você é acadêmico(a) de Medicina em atividade prática na UBS. O Sr. A.P., 60 anos, aguarda na sala ao lado para a avaliação dos sinais vitais antes da consulta. Ele está consciente e colaborativo. Você ainda não iniciou nenhum preparo.',
  task: 'Realize a avaliação completa dos sinais vitais, do preparo à comunicação dos achados, na ordem correta. Nesta estação você não precisa detalhar a técnica de cada sinal vital.',
  steps: SV_COMPLETA,
  distractors: SV_COMPLETA_DISTRACTORS,
  tip: 'A técnica de avaliação dos sinais vitais é a mesma, independente do estado de consciência do paciente (p. 1).',
};

// --- Variáveis que o próprio roteiro cita (novas estações) -----------------------------------

// Sem alteração de ritmo ou amplitude nos primeiros 30 s, o roteiro diz que "pode-se" multiplicar
// por 2 — é opcional. O passo é escrito de forma a aceitar as duas contagens (1 minuto, ou 30 s ×
// 2), para não punir quem contar o minuto inteiro.
const S06 = {
  code: 'S06', title: 'Pulso e respiração — sem alteração de ritmo nos primeiros 30 segundos', fonte: `${SV}, p. 2–3`,
  setting: 'Consultório da UBS. A Sra. R.D. está sentada, com o antebraço apoiado sobre a mesa. Você já preparou o material e abordou a paciente, que consentiu. Sobre a mesa: relógio ou cronômetro e bloco de anotações.',
  scenario: 'Você é acadêmico(a) de Medicina e avaliará o pulso e a respiração da Sra. R.D., 38 anos. Ao palpar o pulso radial, você não percebe alteração de ritmo nem de amplitude nos primeiros 30 segundos.',
  task: 'Avalie o pulso e, em seguida, a respiração, na ordem correta. Nesta estação você não precisa classificar os achados.',
  steps: [
    { action: 'Palpar o pulso radial', origem: 'R' },
    { action: 'Obter a frequência do pulso em 1 minuto, ou em 30 segundos multiplicando o valor por 2, observando ritmo, força e amplitude', why: 'O pulso é avaliado em 1 minuto; se nos primeiros 30 s não houver alteração de ritmo ou amplitude, pode-se multiplicar o valor por 2 (p. 2).', origem: 'R' },
    { action: 'Continuar palpando o pulso e começar a observar discretamente o tórax', why: 'A respiração é avaliada logo após o pulso, continuando a palpar o mesmo (p. 3).', origem: 'R' },
    { action: 'Contar a respiração durante 1 minuto, sem informar o paciente', why: 'Informar o paciente leva ao controle voluntário do padrão respiratório (p. 2).', critical: true, origem: 'R' },
    { action: 'Avaliar ritmo, amplitude e tiragem da respiração', origem: 'R' },
  ],
  distractors: [
    d('Avisar o paciente de que a respiração será contada', 'O observador não deve informar o paciente, para que não ocorra controle voluntário do padrão respiratório (p. 2).'),
    d('Soltar o pulso para observar o tórax', 'Continue palpando o pulso enquanto observa discretamente o tórax (p. 3).'),
    d('Contar as pulsações por apenas 15 segundos e multiplicar por 4', 'A avaliação do pulso é feita em 1 minuto (ou 30 segundos multiplicado por 2, se não houver alteração) (p. 2).'),
    d('Contar a respiração por 15 segundos e multiplicar por 4', 'A respiração é avaliada em um intervalo de 1 minuto (p. 2).'),
    d('Pedir ao paciente que respire profundamente enquanto você conta', 'O paciente não deve ser informado, para não ocorrer controle voluntário do padrão respiratório (p. 2).'),
    d('Avaliar apenas a frequência do pulso, sem observar o ritmo', 'No pulso devem ser avaliados a frequência e o ritmo (p. 2).'),
  ],
  tip: 'Principais artérias para avaliação do pulso: radial, carotídea e femoral (p. 2).',
};

const S07 = {
  code: 'S07', title: 'Pressão arterial — ruídos de difícil percepção', fonte: `${SV}, p. 3–5`,
  setting: 'Consultório da UBS, silencioso. O Sr. P.N. está sentado em uma cadeira com apoio para o braço. Sobre a mesa: esfigmomanômetro, estetoscópio, relógio e bloco de anotações. O material já foi higienizado.',
  scenario: 'Você é acadêmico(a) de Medicina e vai aferir a pressão arterial do Sr. P.N., 63 anos, que veio a uma consulta de rotina. Ele já foi abordado, entendeu o procedimento e consentiu. Durante a ausculta, você percebe que os ruídos estão sendo percebidos com dificuldade.',
  task: 'Realize a medida da pressão arterial pelo método indireto, incluindo a conduta para facilitar a ausculta, até o registro dos valores. Nesta estação você não precisa classificar o resultado.',
  steps: [
    ...paSteps({ action: 'Posicionar o paciente sentado, confortável', origem: 'R' }).slice(0, 11),
    { action: 'Aumentar o ângulo entre o braço e o tórax, retificando a artéria, para facilitar a ausculta dos sons', why: 'Se os ruídos forem percebidos com dificuldade, aumentar o ângulo entre o braço e o tórax, retificando a artéria, facilita a ausculta (p. 4).', origem: 'R' },
    ...paSteps({ action: 'Posicionar o paciente sentado, confortável', origem: 'R' }).slice(11),
  ],
  distractors: [
    d('Diminuir o ângulo entre o braço e o tórax', 'Para facilitar a ausculta, aumenta-se o ângulo entre o braço e o tórax, retificando a artéria (p. 4).'),
    PA.rapido, PA.cabeca, PA.radial, PA.fase4, PA.cubital,
  ],
  tip: 'Se os ruídos estiverem difíceis de ouvir, aumente o ângulo entre o braço e o tórax, retificando a artéria (p. 4).',
};

// Medida nas várias posições — o roteiro (p. 3) manda medir "por ocasião da primeira avaliação e em
// alguns casos (idosos, controle de terapêutica, suspeita de hipotensão postural)". Ele não define
// a ordem das posições nem tempos de espera; a ordem sentado → em pé é derivada (origem D) e está
// nos pontos de revisão.
const paPosicoes = ({ code, title, scenario }) => ({
  code, title, fonte: `${SV}, p. 3–5`,
  setting: 'Consultório da UBS, silencioso. Há uma cadeira com apoio para o braço e espaço para o paciente ficar em pé ao lado da mesa. Sobre a mesa: esfigmomanômetro, estetoscópio, relógio e bloco de anotações. O material já foi higienizado.',
  scenario,
  task: 'Realize a medida da pressão arterial pelo método indireto nas posições sentado e em pé, até o registro dos valores de cada posição. Nesta estação você não precisa classificar o resultado.',
  steps: [
    ...paSteps({ action: 'Posicionar o paciente sentado, confortável', origem: 'R' }),
    { action: 'Posicionar o paciente em pé', why: 'Nestes casos a medida deve ser feita nas várias posições: sentado, deitado ou em pé (p. 3).', critical: true, origem: 'D' },
    { action: 'Manter a artéria braquial ao nível do coração (4º espaço intercostal) também com o paciente em pé, com o braço apoiado', why: 'Em qualquer posição, a artéria braquial deve ficar ao nível do coração (p. 3).', origem: 'R' },
    { action: 'Repetir a medida da pressão arterial, com a mesma técnica', origem: 'D' },
    { action: 'Registrar as pressões obtidas em cada posição', origem: 'D' },
  ],
  distractors: [
    d('Aferir a pressão arterial somente na posição sentada', 'Nestes casos a medida deve ser feita nas várias posições (p. 3).'),
    d('Medir em pé com o braço pendente ao lado do corpo', 'Em qualquer posição, a artéria braquial deve ficar ao nível do coração (4º espaço intercostal), com o braço apoiado (p. 3).'),
    PA.semRepouso, PA.rapido, PA.fase4, PA.semPalpar,
  ],
  tip: 'Por ocasião da primeira avaliação e em alguns casos (idosos, controle de terapêutica, suspeita de hipotensão postural), deve-se efetuar a medida nas várias posições (p. 3).',
});

const S08 = paPosicoes({
  code: 'S08', title: 'Pressão arterial em várias posições — idoso, primeira avaliação',
  scenario: 'Você é acadêmico(a) de Medicina e vai aferir a pressão arterial do Sr. J.A., 74 anos, que comparece pela primeira vez à UBS. Ele já foi abordado, entendeu o procedimento e consentiu. Esta é a primeira avaliação da pressão arterial dele na unidade. Acabou de chegar à sala e ainda não está em repouso.',
});

const S09 = paPosicoes({
  code: 'S09', title: 'Pressão arterial em várias posições — controle de terapêutica',
  scenario: 'Você é acadêmico(a) de Medicina e vai aferir a pressão arterial da Sra. E.M., 66 anos, em acompanhamento na UBS para controle do tratamento da pressão arterial. Ela já foi abordada, entendeu o procedimento e consentiu. Acabou de chegar à sala e ainda não está em repouso.',
});

const S10 = paPosicoes({
  code: 'S10', title: 'Pressão arterial em várias posições — suspeita de hipotensão postural',
  scenario: 'Você é acadêmico(a) de Medicina e vai aferir a pressão arterial do Sr. W.C., 69 anos, que refere tontura quando se levanta da cama. Há suspeita de hipotensão postural. Ele já foi abordado, entendeu o procedimento e consentiu. Acabou de chegar à sala e ainda não está em repouso.',
});

// O roteiro (p. 1) diz que a técnica é a mesma independente do estado de consciência. O pulso é
// verificado na artéria CARÓTIDA (instrução do usuário: "paciente inconsciente verifica a pulsação
// no pescoço"; o roteiro lista a carotídea entre as principais artérias, p. 2, mas não diz qual
// usar no inconsciente — origem D). A veia jugular entra como distrator: é confusão comum.
const S11 = {
  code: 'S11', title: 'Sequência completa de sinais vitais — paciente inconsciente', fonte: `${SV}, p. 1–6`,
  setting: 'Sala de observação do pronto atendimento. O paciente está em uma maca, com acesso livre aos dois braços e ao pescoço. Sobre a bancada: bandeja, estetoscópio, esfigmomanômetro, termômetro, relógio, bloco de anotações, caneta, luvas de procedimento, álcool 70% e algodão.',
  scenario: 'Você é acadêmico(a) de Medicina em estágio no pronto atendimento. Um paciente adulto foi acomodado na maca da sala de observação, inconsciente, sem acompanhante e sem informações prévias. A equipe médica já o avaliou e pediu que você afira os sinais vitais enquanto aguarda os exames. Você ainda não iniciou nenhum preparo.',
  task: 'Realize a avaliação completa dos sinais vitais deste paciente, do preparo à comunicação dos achados, na ordem correta. Nesta estação você não precisa classificar os achados nem conduzir o caso.',
  steps: [
    { action: 'Higienizar as mãos', why: 'O roteiro inicia a prática com a lavagem das mãos (p. 1).', critical: true, origem: 'R' },
    { action: 'Organizar e higienizar o material da bandeja com algodão e álcool 70%', origem: 'R' },
    { action: 'Apresentar-se, explicar o procedimento e pedir o consentimento', why: 'A avaliação dos sinais vitais segue a mesma técnica independente do estado de consciência do paciente (p. 1).', origem: 'R' },
    { action: 'Avaliar a temperatura corporal', origem: 'R' },
    { action: 'Palpar o pulso na artéria carótida, avaliando frequência, ritmo e força', why: 'As principais artérias para avaliação do pulso são radial, carotídea e femoral (p. 2); no paciente inconsciente, o pulso é verificado na carótida.', critical: true, origem: 'D' },
    { action: 'Continuar palpando o pulso e começar a observar discretamente o tórax', why: 'A respiração é avaliada logo após o pulso, continuando a palpar o mesmo (p. 3).', origem: 'R' },
    { action: 'Contar a respiração durante 1 minuto, avaliando ritmo, amplitude e tiragem', origem: 'R' },
    { action: 'Aferir a pressão arterial', origem: 'R' },
    { action: 'Informar os achados ao paciente e perguntar se ele tem alguma dúvida', origem: 'R' },
  ],
  distractors: [
    d('Palpar o pulso na veia jugular', 'O pulso é palpado em artérias — radial, carotídea e femoral (p. 2). A jugular é uma veia.'),
    d('Dispensar a apresentação e a explicação do procedimento porque o paciente está inconsciente', 'A avaliação dos sinais vitais deve seguir a mesma técnica independente do estado de consciência do paciente (p. 1).'),
    d('Não avaliar a respiração, pois o paciente está inconsciente', 'Todos os sinais vitais são avaliados com a mesma técnica, independente do estado de consciência (p. 1).'),
    d('Higienizar o material com água e sabão', 'Todo o material é higienizado com algodão embebido em álcool 70% (p. 1).'),
    d('Registrar os achados sem informá-los ao paciente', 'Ao final da avaliação, informar os achados ao paciente e perguntar se ele tem alguma dúvida (p. 6).'),
    d('Contar o pulso por 15 segundos e multiplicar por 4', 'O pulso é avaliado em 1 minuto (ou 30 segundos multiplicado por 2, se não houver alteração de ritmo ou amplitude) (p. 2).'),
  ],
  tip: 'A técnica de avaliação dos sinais vitais é a mesma, independente do estado de consciência do paciente (p. 1). Principais artérias para avaliação do pulso: radial, carotídea e femoral (p. 2).',
};

export default {
  biosseguranca: { single: [B01, B02], param: PARAM, desp: DESP, precaucoes: [C1, C2, C3], luvas: [L1, L2] },
  sinaisVitais: [S01, S02, S03, S04, S05, S06, S07, S08, S09, S10, S11],
};
