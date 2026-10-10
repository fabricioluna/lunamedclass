// Conteúdo das estações OSCE estáticas — HM1 / N1. Fonte única: os 2 roteiros de aula prática.
// origem: 'R' = texto do roteiro (literal ou quase literal); 'D' = derivado do roteiro (recorte,
// junção ou negação de uma afirmação do roteiro) — precisa de validação docente.

const BIO = 'Roteiro de Biossegurança (Profª Ingrid Cordeiro)';
const SV = 'Roteiro de Sinais Vitais (Prof. Michel Melo)';

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
  propé: { action: 'Colocar o propé', why: 'Não recomendado rotineiramente: evidência limitada para redução de transmissão (tabela de EPI, p. 8).', origem: 'R' },
};

// ---------------------------------------------------------------------------
// BIOSSEGURANÇA
// ---------------------------------------------------------------------------

const B01 = {
  code: 'B01', title: 'Higiene das mãos com água e sabão', fonte: `${BIO}, p. 3`,
  setting: 'Pia do posto de enfermagem, com sabão líquido e papel-toalha.',
  scenario: 'Você acabou de chegar ao plantão e suas mãos estão visivelmente sujas.',
  task: 'Realize a higiene das mãos com água e sabão.',
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
    { action: 'Fechar a torneira com as mãos', why: 'O roteiro orienta usar o papel-toalha para fechar a torneira (passo 10, p. 3).', origem: 'D' },
    { action: 'Friccionar as mãos até secarem, sem enxaguar', why: 'Este é o final da fricção com preparação alcoólica (p. 4), não da lavagem com água e sabão.', origem: 'D' },
  ],
  tip: 'Higienize as mãos com água e sabonete quando estiverem visivelmente sujas; nas demais situações, prefira a fricção com preparação alcoólica (p. 4).',
};

const B02 = {
  code: 'B02', title: 'Fricção antisséptica com preparação alcoólica', fonte: `${BIO}, p. 4`,
  setting: 'Beira do leito, com dispensador de preparação alcoólica.',
  scenario: 'Você vai tocar o paciente. Suas mãos não estão visivelmente sujas e há preparação alcoólica disponível.',
  task: 'Realize a fricção antisséptica das mãos com preparação alcoólica (duração de 20 a 30 segundos).',
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
    { action: 'Enxaguar as mãos com água', why: 'Enxágue faz parte da lavagem com água e sabão (p. 3), não da fricção alcoólica.', origem: 'D' },
    { action: 'Secar as mãos com papel-toalha', why: 'Na fricção alcoólica as mãos secam sozinhas: "quando estiverem secas, suas mãos estarão seguras" (p. 4).', origem: 'D' },
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
    touca ? 'O protocolo da instituição exige touca.' : 'O protocolo da instituição não exige touca.',
    mascara === 'pff2'
      ? 'O paciente está em precaução para aerossóis e há risco de respingos de sangue ou secreções.'
      : 'Há risco de respingos de sangue ou secreções.',
    luva === 'est' ? 'O procedimento exige técnica estéril.' : 'O procedimento não é estéril.',
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
    ...(touca ? [] : [{ action: 'Colocar a touca', why: 'O caso informa que o protocolo da instituição não exige touca.', origem: 'D' }]),
    mascara === 'pff2'
      ? { action: 'Colocar a máscara cirúrgica', why: 'Em aerossóis o profissional usa PFF2/N95; a máscara cirúrgica é do paciente durante o transporte (p. 6).', origem: 'R' }
      : { action: 'Colocar a máscara PFF2/N95', why: 'PFF2/N95 é a máscara obrigatória em aerossóis (p. 8); este caso não é de aerossóis.', origem: 'D' },
    luva === 'est'
      ? { action: 'Calçar as luvas de procedimento', why: 'O caso exige técnica estéril: luva cirúrgica (estéril).', origem: 'D' }
      : { action: 'Calçar as luvas cirúrgicas (estéreis)', why: 'O procedimento não é estéril: luva de procedimento.', origem: 'D' },
    DIST.propé,
  ];
  return { code, ctx, seq, distractors };
};

const PARAM = {
  title: 'Paramentação (8 variações)',
  fonte: `${BIO}, p. 8 (sem touca) e p. 9 (com touca); EPIs por contexto: p. 5–8`,
  setting: 'Antessala do quarto. Os EPIs estão disponíveis na bancada.',
  scenario: 'Você vai realizar um atendimento ao paciente deste quarto. [CONTEXTO DA VARIAÇÃO]',
  task: 'Realize a paramentação na ordem correta.',
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
  const uso = ['avental', mascaraNome, 'óculos ou face shield', 'luvas', ...(touca ? ['touca'] : [])].join(', ');
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
  return { code, ctx: `Você está usando: ${uso}.`, seq, distractors: [] };
};

const DESP = {
  title: 'Desparamentação (4 variações)',
  fonte: `${BIO}, p. 8 (sem touca) e p. 9 (com touca)`,
  setting: 'Saída do quarto, logo após o atendimento.',
  scenario: 'Você terminou o atendimento. [CONTEXTO DA VARIAÇÃO]',
  task: 'Realize a desparamentação na ordem correta — é a fase de maior risco.',
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
  setting: 'Corredor da enfermaria. Na porta do quarto, a placa: PRECAUÇÃO DE CONTATO.',
  scenario: 'Você vai examinar o paciente deste quarto. Não há risco de respingos.',
  task: 'Realize a paramentação para entrar no quarto e, ao final do atendimento, a desparamentação.',
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
    { action: 'Colocar a máscara PFF2/N95', why: 'PFF2/N95 é da precaução para aerossóis (p. 6).', origem: 'D' },
    { action: 'Colocar a máscara cirúrgica', why: 'Não faz parte da precaução de contato (p. 6–7) e o caso não tem risco de respingos.', origem: 'D' },
    { action: 'Colocar os óculos ou o face shield', why: 'Óculos/face shield são indicados quando há risco de respingos (p. 7); o caso informa que não há.', origem: 'D' },
    DIST.propé,
  ],
  tip: 'Na precaução de contato, termômetro, esfigmomanômetro e estetoscópio devem ser de uso exclusivo do paciente (p. 6).',
};

const C2 = {
  code: 'C2', title: 'Precaução para gotículas — entrar e sair do quarto', fonte: `${BIO}, p. 6–7`,
  setting: 'Corredor da enfermaria. Na porta do quarto, a placa: PRECAUÇÃO PARA GOTÍCULAS.',
  scenario: 'Você vai conversar com o paciente deste quarto. Não haverá contato com sangue ou secreções.',
  task: 'Realize a paramentação para entrar no quarto e, ao sair, a desparamentação.',
  steps: [
    { action: 'Higienizar as mãos', why: WHY.maos, critical: true, origem: 'R' },
    { action: 'Colocar a máscara cirúrgica', why: 'Gotículas: máscara cirúrgica para o profissional (p. 6–7).', origem: 'R' },
    { action: 'Retirar a máscara cirúrgica', origem: 'D' },
    { action: 'Higienizar as mãos', why: 'Higienização final das mãos (p. 8).', critical: true, origem: 'D' },
  ],
  distractors: [
    { action: 'Colocar a máscara PFF2/N95', why: 'PFF2/N95 é a máscara da precaução para aerossóis; em gotículas o profissional usa máscara cirúrgica (p. 6–7).', origem: 'D' },
    { action: 'Colocar o avental', why: 'Não faz parte da precaução para gotículas (p. 6–7) e não haverá contato com sangue ou secreções.', origem: 'D' },
    { action: 'Calçar as luvas de procedimento', why: 'Luvas só quando há risco de contato com sangue, secreções ou mucosas (p. 5).', origem: 'D' },
    DIST.propé,
  ],
  tip: 'Na falta de quarto privativo, distância mínima de 1 metro entre os leitos; no transporte, o paciente usa máscara cirúrgica (p. 6–7).',
};

const C3 = {
  code: 'C3', title: 'Precaução para aerossóis — entrar e sair do quarto', fonte: `${BIO}, p. 6–7`,
  setting: 'Corredor da enfermaria. Na porta do quarto, a placa: PRECAUÇÃO PARA AEROSSÓIS.',
  scenario: 'Você vai conversar com o paciente deste quarto. Não haverá contato com sangue ou secreções.',
  task: 'Realize a paramentação para entrar no quarto e, ao sair, a desparamentação.',
  steps: [
    { action: 'Higienizar as mãos', why: WHY.maos, critical: true, origem: 'R' },
    { action: 'Colocar a máscara PFF2/N95 antes de entrar no quarto', why: 'Coloque a máscara antes de entrar no quarto (p. 6); PFF2/N95: filtração ≥ 94–95% (p. 8).', critical: true, origem: 'R' },
    { action: 'Entrar e manter a porta do quarto fechada', why: 'Mantenha a porta do quarto SEMPRE fechada (p. 6).', origem: 'R' },
    { action: 'Retirar a máscara PFF2/N95', origem: 'D' },
    { action: 'Higienizar as mãos', why: 'Higienização final das mãos (p. 8).', critical: true, origem: 'D' },
  ],
  distractors: [
    { action: 'Colocar a máscara cirúrgica', why: 'Em aerossóis a máscara cirúrgica é do paciente durante o transporte; o profissional usa PFF2/N95 (p. 6).', origem: 'R' },
    { action: 'Deixar a porta do quarto aberta', why: 'A porta deve ficar SEMPRE fechada (p. 6).', origem: 'D' },
    { action: 'Colocar o avental', why: 'Não faz parte da precaução para aerossóis (p. 6–7) e não haverá contato com sangue ou secreções.', origem: 'D' },
    DIST.propé,
  ],
  tip: 'Na falta de quarto privativo, o paciente pode ficar com outros infectados pelo mesmo microrganismo; suspeita de tuberculose resistente não divide quarto (p. 6).',
};

// --- Luvas (família L) — p. 9–10
const L1 = {
  code: 'L1', title: 'Calçar e retirar luvas de procedimento', fonte: `${BIO}, p. 9–10`,
  setting: 'Beira do leito. Caixa de luvas de procedimento e lixo infectante ao lado.',
  scenario: 'Você vai realizar um procedimento não estéril com risco de contato com secreções.',
  task: 'Calce as luvas de procedimento e, ao final, retire-as corretamente.',
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
    { action: 'Segurar a segunda luva pela parte externa com a mão sem luva', why: 'A mão sem luva entra pela parte interna da segunda luva, entre a luva e o punho (p. 10).', origem: 'D' },
    { action: 'Descartar as luvas no lixo comum', why: 'Luvas são descartadas em lixo infectante (p. 10).', origem: 'D' },
  ],
  tip: 'Calce as luvas imediatamente antes do contato com o paciente e retire-as logo após o uso (p. 5).',
};

const L2 = {
  code: 'L2', title: 'Calçar luvas cirúrgicas (estéreis)', fonte: `${BIO}, p. 10`,
  setting: 'Sala de procedimentos. Pacote de luvas estéreis aberto sobre a mesa.',
  scenario: 'Você vai realizar um procedimento que exige técnica estéril.',
  task: 'Calce as luvas cirúrgicas na sequência correta.',
  steps: [
    { action: 'Pegar uma luva com o polegar e o indicador', origem: 'R' },
    { action: 'Puxar a luva na mão', origem: 'R' },
    { action: 'Deslizar a mão parcialmente enluvada sob a borda da segunda luva', origem: 'R' },
    { action: 'Puxar a outra luva pelo lado de dentro e puxá-la até o pulso', origem: 'R' },
    { action: 'Deslizar os dedos da mão completamente enluvada sob a borda da primeira luva e puxá-la até o pulso', origem: 'R' },
  ],
  distractors: [],
  tip: '',
};

// ---------------------------------------------------------------------------
// SINAIS VITAIS
// ---------------------------------------------------------------------------

const S01 = {
  code: 'S01', title: 'Preparo do material e abordagem do paciente', fonte: `${SV}, p. 1`,
  setting: 'Consultório. Bandeja vazia e materiais no armário.',
  scenario: 'Você vai avaliar os sinais vitais de um paciente adulto que aguarda no consultório.',
  task: 'Prepare o material e aborde o paciente antes de iniciar a avaliação.',
  steps: [
    { action: 'Higienizar as mãos', critical: true, origem: 'R' },
    { action: 'Organizar na bandeja: estetoscópio, esfigmomanômetro, termômetro, relógio, bloco, caneta, luvas de procedimento, álcool 70% e algodão', origem: 'R' },
    { action: 'Higienizar o termômetro com algodão e álcool 70%, em movimentos unidirecionais do display para o bulbo', origem: 'R' },
    { action: 'Higienizar a braçadeira do esfigmomanômetro em movimentos unidirecionais', origem: 'R' },
    { action: 'Higienizar o diafragma do estetoscópio em movimentos circulares', origem: 'R' },
    { action: 'Apresentar-se ao paciente', origem: 'R' },
    { action: 'Explicar o procedimento', origem: 'R' },
    { action: 'Pedir o consentimento do paciente', origem: 'R' },
  ],
  distractors: [
    { action: 'Higienizar o termômetro do bulbo para o display', why: 'O movimento é unidirecional do display para o bulbo (p. 1).', origem: 'D' },
    { action: 'Higienizar a braçadeira em movimentos circulares', why: 'A braçadeira é higienizada em movimentos unidirecionais (p. 1).', origem: 'D' },
    { action: 'Higienizar o diafragma do estetoscópio em movimentos unidirecionais', why: 'O diafragma é higienizado em movimentos circulares (p. 1).', origem: 'D' },
  ],
  tip: '',
};

// Só a variação com alteração de ritmo: o roteiro é taxativo ali (contar 1 minuto). Sem
// alteração, multiplicar 30 s por 2 é OPCIONAL ("pode-se") — uma sequência fixa puniria
// injustamente quem contasse o minuto inteiro, então o atalho ficou só na dica.
const S02 = {
  code: 'S02', title: 'Pulso e respiração', fonte: `${SV}, p. 2–3`,
  setting: 'Consultório. Paciente sentado, já orientado sobre a avaliação.',
  scenario: 'Ao palpar o pulso radial, você percebe alteração do ritmo nos primeiros 30 segundos.',
  task: 'Avalie o pulso e, em seguida, a respiração.',
  steps: [
    { action: 'Palpar o pulso radial', origem: 'R' },
    { action: 'Contar as pulsações por 30 segundos, observando ritmo, força e amplitude', origem: 'R' },
    { action: 'Manter a contagem até completar 1 minuto', why: 'Com alteração de ritmo ou amplitude nos primeiros 30 s, a contagem vai até 1 minuto (p. 2).', critical: true, origem: 'R' },
    { action: 'Continuar palpando o pulso e começar a observar discretamente o tórax', why: 'A respiração é avaliada logo após o pulso, continuando a palpar o mesmo (p. 3).', origem: 'R' },
    { action: 'Contar a respiração durante 1 minuto, sem informar o paciente', why: 'Informar o paciente leva ao controle voluntário do padrão respiratório (p. 2).', critical: true, origem: 'R' },
    { action: 'Avaliar ritmo, amplitude e tiragem da respiração', origem: 'R' },
  ],
  distractors: [
    { action: 'Multiplicar o valor de 30 segundos por 2', why: 'Só se multiplica por 2 quando não há alteração de ritmo ou amplitude nos primeiros 30 s (p. 2).', origem: 'D' },
    { action: 'Avisar o paciente de que a respiração será contada', why: 'O observador não deve informar o paciente, para que não ocorra controle voluntário do padrão respiratório (p. 2).', origem: 'D' },
    { action: 'Soltar o pulso para observar o tórax', why: 'Continue palpando o pulso enquanto observa discretamente o tórax (p. 3).', origem: 'D' },
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

const PA_DISTRACTORS = [
  { action: 'Colocar o manguito sobre a fossa cubital', why: 'O manguito fica 2 cm acima da fossa cubital (p. 3).', origem: 'D' },
  { action: 'Desinsuflar rapidamente o manguito', why: 'O ar é solto de maneira contínua, a 2–3 mmHg por segundo (p. 4).', origem: 'D' },
  { action: 'Registrar a diastólica no abafamento dos sons (fase IV de Korotkoff)', why: 'A diastólica é o desaparecimento dos sons, fase V (p. 4).', origem: 'D' },
  { action: 'Baixar a cabeça para auscultar melhor', why: 'O observador deve evitar baixar a cabeça: a congestão dos vasos do ouvido prejudica a ausculta (p. 3).', origem: 'D' },
];

const S03 = {
  code: 'S03', title: 'Pressão arterial — método indireto (paciente sentado)', fonte: `${SV}, p. 3–5`,
  setting: 'Consultório silencioso. Paciente adulto sentado.',
  scenario: 'O paciente acabou de chegar ao consultório para avaliação dos sinais vitais.',
  task: 'Afira a pressão arterial pelo método indireto.',
  steps: paSteps({ action: 'Posicionar o paciente sentado, confortável', origem: 'R' }),
  distractors: PA_DISTRACTORS,
  tip: 'Se os ruídos estiverem difíceis de ouvir, aumente o ângulo entre o braço e o tórax, retificando a artéria (p. 4).',
};

const S04 = {
  code: 'S04', title: 'Pressão arterial — método indireto (gestante)', fonte: `${SV}, p. 3–5`,
  setting: 'Consultório de pré-natal.',
  scenario: 'Você vai aferir a pressão arterial de uma gestante.',
  task: 'Afira a pressão arterial pelo método indireto, na posição preferencial para gestantes.',
  steps: paSteps({ action: 'Posicionar a gestante em decúbito lateral esquerdo ou decúbito dorsal', why: 'No caso de gestantes, preferir o decúbito lateral esquerdo ou o decúbito dorsal (p. 3).', critical: true, origem: 'R' }),
  distractors: [
    { action: 'Posicionar a gestante em decúbito lateral direito', why: 'O roteiro indica decúbito lateral esquerdo ou dorsal para gestantes (p. 3).', origem: 'D' },
    ...PA_DISTRACTORS,
  ],
  tip: 'Se os ruídos estiverem difíceis de ouvir, aumente o ângulo entre o braço e o tórax, retificando a artéria (p. 4).',
};

const S05 = {
  code: 'S05', title: 'Sequência completa de sinais vitais', fonte: `${SV}, p. 1–6`,
  setting: 'Consultório. Bandeja com o material.',
  scenario: 'Um paciente adulto aguarda a avaliação dos sinais vitais.',
  task: 'Realize a avaliação completa dos sinais vitais, do preparo à comunicação dos achados.',
  steps: [
    { action: 'Higienizar as mãos', critical: true, origem: 'R' },
    { action: 'Organizar e higienizar o material da bandeja com algodão e álcool 70%', origem: 'R' },
    { action: 'Apresentar-se, explicar o procedimento e pedir o consentimento', origem: 'R' },
    { action: 'Avaliar a temperatura corporal', origem: 'R' },
    { action: 'Avaliar o pulso', origem: 'R' },
    { action: 'Avaliar a respiração, sem informar o paciente', critical: true, origem: 'R' },
    { action: 'Aferir a pressão arterial', origem: 'R' },
    { action: 'Informar os achados ao paciente e perguntar se ele tem alguma dúvida', origem: 'R' },
  ],
  distractors: [
    { action: 'Avisar o paciente de que a respiração será observada', why: 'O observador não deve informar o paciente sobre a coleta, para evitar controle voluntário da respiração (p. 2).', origem: 'D' },
  ],
  tip: 'A técnica de avaliação dos sinais vitais é a mesma, independente do estado de consciência do paciente (p. 1).',
};

export default {
  biosseguranca: { single: [B01, B02], param: PARAM, desp: DESP, precaucoes: [C1, C2, C3], luvas: [L1, L2] },
  sinaisVitais: [S01, S02, S03, S04, S05],
};
