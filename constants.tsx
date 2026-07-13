import { Question, SimulationInfo, Period, MedicalEvent } from './types';

export const THEME = {
  primary: '#003366',
  accent: '#D4A017',
  highlight: '#E31B23',
  bg: '#f4f7f6',
  text: '#333333'
};

// Definição dos Períodos (Do 12º ao 1º Período)
export const PERIODS: Period[] = [
  {
    id: 'periodo12',
    name: '12º Período',
    description: 'Internato IV: Urgência, Emergência, UTI e Estágio Eletivo.',
    semester: '2031.2',
    workload: '800h',
    icon: '🚑'
  },
  {
    id: 'periodo11',
    name: '11º Período',
    description: 'Internato III: Saúde Coletiva, Medicina de Família e Saúde Mental.',
    semester: '2031.1',
    workload: '800h',
    icon: '🏡'
  },
  {
    id: 'periodo10',
    name: '10º Período',
    description: 'Internato II: Cirurgia Geral e Ginecologia/Obstetrícia.',
    semester: '2030.2',
    workload: '800h',
    icon: '👶'
  },
  {
    id: 'periodo9',
    name: '9º Período',
    description: 'Internato I: Clínica Médica e Pediatria Básica.',
    semester: '2030.1',
    workload: '800h',
    icon: '🏥'
  },
  {
    id: 'periodo8',
    name: '8º Período',
    description: 'Ciclo Cirúrgico II, Trauma, Ortopedia e Práticas Integradas.',
    semester: '2029.2',
    workload: '600h',
    icon: '🦴'
  },
  {
    id: 'periodo7',
    name: '7º Período',
    description: 'Ciclo Cirúrgico I, Anestesiologia e Técnica Operatória.',
    semester: '2029.1',
    workload: '600h',
    icon: '⚕️'
  },
  {
    id: 'periodo6',
    name: '6º Período',
    description: 'Ciclo Clínico II: Cardiologia, Pneumologia, Nefrologia e Gastroenterologia.',
    semester: '2028.2',
    workload: '600h',
    icon: '🫀'
  },
  {
    id: 'periodo5',
    name: '5º Período',
    description: 'Ciclo Clínico I: Infectologia, Neurologia e Psiquiatria.',
    semester: '2028.1',
    workload: '600h',
    icon: '🧠'
  },
  {
    id: 'periodo4',
    name: '4º Período',
    description: 'Farmacologia Clínica, Patologia Especial e Semiologia Avançada.',
    semester: '2027.2',
    workload: '600h',
    icon: '💊'
  },
  {
    id: 'periodo3',
    name: '3º Período',
    description: 'Mecanismos de Agressão e Defesa, Imunologia e Microbiologia.',
    semester: '2027.1',
    workload: '600h',
    icon: '🔬'
  },
  {
    id: 'periodo2',
    name: '2º Período',
    description: 'Ciclo da Homeostase e Prática Clínica Básica.',
    semester: '2026.2',
    workload: '610h',
    icon: '🎓',
    crest: '/turma8.jpg' 
  },
  {
    id: 'periodo1',
    name: '1º Período',
    description: 'Monitoria de Introdução à Prática Médica e Habilidades Básicas.',
    semester: '2026.1',
    workload: '120h',
    icon: '🌱'
  }
];

// O Mapeamento Completo de todas as Disciplinas preservando as antigas perfeitamente.
export const SIMULATIONS: SimulationInfo[] = [
  // ================= PERÍODO 1 =================
  {
    id: 'uci',
    periodId: 'periodo1',
    title: 'UCI - Introdução ao Estudo da Medicina',
    category: 'UC',
    description: 'Apresentação do ecossistema médico, ética, bioética e bases fundamentais.',
    meta: '110h • Ciclo Básico',
    icon: '📘',
    status: 'active',
    themes: [],
    references: []
  },
  {
    id: 'ucii',
    periodId: 'periodo1',
    title: 'UCII - Concepção e Formação do Ser Humano',
    category: 'UC',
    description: 'Embriologia, histologia e bases genéticas do desenvolvimento humano.',
    meta: '110h • Ciclo Básico',
    icon: '🧬',
    status: 'active',
    themes: [],
    references: []
  },
  {
    id: 'uciii',
    periodId: 'periodo1',
    title: 'UCIII - Metabolismo',
    category: 'UC',
    description: 'Bioquímica celular, vias metabólicas e bioenergética.',
    meta: '110h • Ciclo Básico',
    icon: '⚗️',
    status: 'active',
    themes: [],
    references: []
  },
  {
    id: 'iesc1',
    periodId: 'periodo1',
    title: 'IESC1 - Interação em Saúde na Comunidade I',
    category: 'IESC',
    description: 'Primeiros contatos com a atenção primária e o SUS.',
    meta: '80h • Saúde Coletiva',
    icon: '🏥',
    status: 'active',
    themes: [],
    references: []
  },
  {
    id: 'uccg1',
    periodId: 'periodo1',
    title: 'UCCG1 - LIBRAS e Educação Ambiental',
    category: 'UCCG',
    description: 'Língua Brasileira de Sinais e sustentabilidade no contexto da saúde.',
    meta: '80h • Conhecimentos Gerais',
    icon: '🗣️',
    status: 'active',
    themes: [],
    references: []
  },
  {
    id: 'hm1', // (MANTIDO INTACTO COMO PEDIDO)
    periodId: 'periodo1',
    title: 'Habilidades Médicas 1',
    category: 'HABMED',
    description: 'Introdução à Prática Médica: Biossegurança, sinais vitais, administração de medicamentos e Suporte Básico de Vida (BLS/AHA).',
    meta: 'Módulo Exclusivo',
    icon: '🩺',
    status: 'active',
    themes: [
      'Biossegurança e Higienização das Mãos',
      'Sinais Vitais, Antropometria e Glicemia Capilar',
      'Administração de Medicamentos (IM, SC, IV)',
      'Suporte Básico de Vida (BLS/PCR)',
      'Abordagem Inicial em Urgências (ABCDE)'
    ],
    units: [
      { id: 'N1', title: 'Unidade 1 - Biossegurança', description: 'EPIs e Higienização das Mãos' },
      { id: 'N2', title: 'Unidade 2 - Sinais Vitais', description: 'Aferição de Parâmetros Básicos' },
      { id: 'N3', title: 'Unidade 3 - BLS e Urgência', description: 'Protocolo de RCP e ABCDE' }
    ],
    references: [
      { id: 'ref1', title: 'Normas, rotinas e técnicas de enfermagem (5ª ed.)', author: 'MOTTA AL', type: 'link', url: 'http://biblioteca.medicinadosertao.com.br/biblioteca/acervo/detalhe/212535' },
      { id: 'ref2', title: 'Avaliação nutricional de coletividades (4ª ed.)', author: 'VASCONCELOS FAG', type: 'link', url: 'http://biblioteca.medicinadosertao.com.br/biblioteca/acervo/detalhe/43630' },
      { id: 'ref3', title: 'Avaliação antropométrica em Pediatria: guia prático para profissionais da saúde', author: 'BARROS SP et al.', type: 'link', url: 'http://biblioteca.medicinadosertao.com.br/biblioteca/acervo/detalhe/43628' },
      { id: 'ref4', title: 'Curso básico de controle de infecção hospitalar (E-book)', author: 'BRASIL. Ministério da Saúde', type: 'link', url: 'http://biblioteca.medicinadosertao.com.br/biblioteca/acervo/detalhe/58548' },
      { id: 'ref5', title: 'Metodologia científica (6ª ed.)', author: 'CERVO AL et al.', type: 'link', url: 'http://biblioteca.medicinadosertao.com.br/biblioteca/acervo/detalhe/83454' },
      { id: 'ref6', title: 'Semiologia para enfermagem: conceitos e prática clínica', author: 'JENSEN S', type: 'link', url: 'http://biblioteca.medicinadosertao.com.br/biblioteca/acervo/detalhe/209547' },
      { id: 'ref7', title: 'Suporte básico de vida: primeiro atendimento na emergência para profissionais da saúde', author: 'QUILICI AP et al.', type: 'link', url: 'http://biblioteca.medicinadosertao.com.br/biblioteca/acervo/detalhe/209736' },
      { id: 'ref8', title: 'Vigilância Epidemiológica das infecções hospitalares no estado de São Paulo', author: 'Governo de São Paulo. Coord. de Controle de Doenças.', type: 'link', url: 'http://biblioteca.medicinadosertao.com.br/biblioteca/acervo/detalhe/58605' }
    ]
  },

  // ================= PERÍODO 2 ================= (MANTIDOS INTACTOS)
  {
    id: 'ucv',
    periodId: 'periodo2',
    title: 'UCV - Mecanismos de Agressão e Defesa',
    category: 'UC',
    description: 'Agentes agressores, imunidade inata e adquirida, inflamação, lesão celular e hipersensibilidade.',
    meta: '110h • Mecanismos de Lesão',
    icon: '🛡️',
    status: 'active',
    themes: [
      'Mecanismos de Lesão Celular', 
      'Imunologia Celular e Humoral', 
      'Processos Inflamatórios', 
      'Microbiologia e Parasitologia',
      'Hipersensibilidade e Alergia'
    ],
    references: []
  },
  {
    id: 'hm2',
    periodId: 'periodo2',
    title: 'HM2 - Habilidades Médicas II',
    category: 'HABMED',
    description: 'Relacionamento médico-paciente, semiologia, anamnese e exame físico geral.',
    meta: '120h • Prática Clínica',
    icon: '🩺',
    status: 'active',
    themes: [
      'Técnicas de Comunicação e Anamnese', 
      'Exame Físico Geral e Especializado', 
      'Ética Médica e Postura',
      'Relação Médico-Paciente-Família',
      'Comunicação de Más Notícias'
    ],
    units: [
      { id: 'N1', title: 'Unidade 1 - Comunicação e Anamnese', description: 'Protocolo SPIKES e Anamnese Geral' },
      { id: 'N2', title: 'Unidade 2 - Exame Físico Geral', description: 'Sinais Vitais e Ectoscopia' },
      { id: 'N3', title: 'Unidade 3 - Semiologia Especializada', description: 'Exame Físico Segmentar' }
    ],
    references: [
      { id: 'ref7', title: 'Exame Clínico', author: 'Porto & Porto', type: 'link', url: 'http://biblioteca.medicinadosertao.com.br/biblioteca/acervo/detalhe/210702' },
      { id: 'ref8', title: 'Bates: Propedêutica Médica', author: 'Bates', type: 'link', url: 'http://biblioteca.medicinadosertao.com.br/biblioteca/acervo/detalhe/213400' },
      { id: 'ref9', title: 'Código de Ética Médica', author: 'CFM', type: 'link', url: 'http://biblioteca.medicinadosertao.com.br/biblioteca/acervo/detalhe/140114' }
    ]
  },
  {
    id: 'iesc2',
    periodId: 'periodo2',
    title: 'IESC2 - Saúde na Comunidade II',
    category: 'IESC',
    description: 'Vigilância em saúde, acolhimento na UBS, índices epidemiológicos e fluxos de referência.',
    meta: '80h • Gestão e Sociedade',
    icon: '🏥',
    status: 'active',
    themes: [
      'Índices Epidemiológicos', 
      'Vigilância Sanitária e Epidemiológica', 
      'Acolhimento e Processos na UBS', 
      'Referência e Contrarreferência',
      'Programas de Hipertensão e Diabetes'
    ],
    units: [
      { id: 'N1', title: 'Unidade 1 - Epidemiologia', description: 'Cálculo de Índices e Indicadores de Saúde' },
      { id: 'N2', title: 'Unidade 2 - Fluxos na APS', description: 'Acolhimento e Programas de Saúde' }
    ],
    references: [
      { id: 'ref4', title: 'Epidemiologia', author: 'Leon Gordis', type: 'book' },
      { id: 'ref5', title: 'Tratado de Medicina de Família e Comunidade', author: 'Gustavo Gusso', type: 'book' },
      { id: 'ref6', title: 'Portal e-SUS APS', type: 'link', url: 'https://aps.saude.gov.br/ape/esus' }
    ]
  },
  {
    id: 'uccg2_3',
    periodId: 'periodo2',
    title: 'UCCG2-3 - Análise Social e Relações Étnico-Raciais',
    category: 'UCCG',
    description: 'Conceitos de sociologia, diversidade, racismo estrutural, e determinantes sociais da saúde.',
    meta: '60h • Ciências Humanas',
    icon: '⚖️',
    status: 'active',
    themes: [
      'Sociodiversidade, Cultura e Minorias',
      'Relações Étnico-Raciais e Racismo Estrutural',
      'Equidade e Determinantes Sociais em Saúde',
      'Movimentos Sociais e Saúde'
    ],
    units: [
      { id: 'N1', title: 'Unidade 1 - Sociologia e Minorias', description: 'Bases da Sociologia em Saúde' },
      { id: 'N2', title: 'Unidade 2 - Racismo Estrutural', description: 'Impactos no Sistema de Saúde' }
    ],
    references: [
      { id: 'uccg2_3_ref1', title: 'Educação e Sociologia', author: 'Émile Durkheim', type: 'book' },
      { id: 'uccg2_3_ref2', title: 'Racismo Estrutural', author: 'Silvio Almeida', type: 'book' }
    ]
  },
  {
    id: 'uccg2_4',
    periodId: 'periodo2',
    title: 'UCCG2-4 - Hist., Sociedade e Cultura Afro e Indígena',
    category: 'UCCG',
    description: 'Contexto histórico e cultural das populações afro-brasileiras e indígenas e seus impactos na saúde.',
    meta: '60h • Cultura e Saúde',
    icon: '🌿',
    status: 'active',
    themes: [
      'História da População Indígena no Brasil',
      'Cultura Afro-Brasileira e Saúde da População Negra',
      'Políticas Públicas para Minorias',
      'Medicina Tradicional e Saberes Populares'
    ],
    units: [
      { id: 'N1', title: 'Unidade 1 - Povos Originários', description: 'História Indígena' },
      { id: 'N2', title: 'Unidade 2 - Cultura Afro-Brasileira', description: 'Políticas para a População Negra' }
    ],
    references: [
      { id: 'uccg2_4_ref1', title: 'O Povo Brasileiro', author: 'Darcy Ribeiro', type: 'book' }
    ]
  },
  {
    id: 'uciv',
    periodId: 'periodo2',
    title: 'UCIV - Funções Biológicas',
    category: 'UC',
    description: 'Controle neuroendócrino, cardiovascular, respiratório, renal, digestório e equilíbrio ácido-básico.',
    meta: '110h • Ciclo da Homeostase',
    icon: '🫀',
    status: 'active',
    themes: [
      'Fisiologia Cardiovascular', 
      'Fisiologia Respiratória', 
      'Fisiologia Renal e Eletrólitos', 
      'Fisiologia Digestória',
      'Equilíbrio Ácido-Básico',
      'Biofísica e Bioquímica'
    ],
    references: [
      { id: 'ref_fisio1', title: 'Tratado de Fisiologia Médica (Guyton & Hall)', author: 'John E. Hall', type: 'link', url: 'http://biblioteca.medicinadosertao.com.br/biblioteca/acervo/detalhe/214483' },
      { id: 'ref_fisio2', title: 'Fisiologia (Linda Costanzo)', author: 'Linda S. Costanzo', type: 'link', url: 'http://biblioteca.medicinadosertao.com.br/biblioteca/acervo/detalhe/214442' },
      { id: 'ref_anato1', title: 'Anatomia Orientada para a Clínica (Moore)', author: 'Keith L. Moore', type: 'link', url: 'http://biblioteca.medicinadosertao.com.br/biblioteca/acervo/detalhe/214507' },
      { id: 'ref_anato2', title: 'Atlas de Anatomia Humana (Netter)', author: 'Frank H. Netter', type: 'link', url: 'http://biblioteca.medicinadosertao.com.br/biblioteca/acervo/detalhe/214509' },
      { id: 'ref_bioq1', title: 'Princípios de Bioquímica (Lehninger)', author: 'David L. Nelson', type: 'link', url: 'http://biblioteca.medicinadosertao.com.br/biblioteca/acervo/detalhe/213429' },
      { id: 'ref_histo1', title: 'Histologia Básica (Junqueira & Carneiro)', author: 'L.C. Junqueira', type: 'link', url: 'http://biblioteca.medicinadosertao.com.br/biblioteca/acervo/detalhe/214487' },
      { id: 'ref_embrio1', title: 'Embriologia Clínica (Moore)', author: 'Keith L. Moore', type: 'link', url: 'http://biblioteca.medicinadosertao.com.br/biblioteca/acervo/detalhe/214458' }
    ]
  },
  {
    id: 'ucvi',
    periodId: 'periodo2',
    title: 'UCVI - Percepção, Consciência e Emoção',
    category: 'UC',
    description: 'Neuroanatomia, neurofisiologia e bases biológicas do comportamento humano, psiquiatria e neurologia.',
    meta: '110h • Neurociências',
    icon: '🧠',
    status: 'locked',
    themes: [
      'Neuroanatomia e Vias Sensitivas',
      'Neurofisiologia da Consciência',
      'Bases da Emoção e Comportamento',
      'Psicofarmacologia Básica'
    ],
    references: []
  },

  // ================= PERÍODO 3 =================
  {
    id: 'ucvii',
    periodId: 'periodo3',
    title: 'UCVII - Saúde da Mulher, sexualidade e planejamento familiar',
    category: 'UC',
    description: 'Fisiologia feminina, métodos contraceptivos e bases da obstetrícia.',
    meta: '110h • Ciclo Clínico',
    icon: '♀️',
    status: 'active',
    themes: [],
    references: []
  },
  {
    id: 'ucviii',
    periodId: 'periodo3',
    title: 'UCVIII - Nascimento, crescimento e desenvolvimento',
    category: 'UC',
    description: 'Neonatologia, pediatria básica e marcos do desenvolvimento infantil.',
    meta: '110h • Ciclo Clínico',
    icon: '🍼',
    status: 'active',
    themes: [],
    references: []
  },
  {
    id: 'ucix',
    periodId: 'periodo3',
    title: 'UCIX - Processo de Envelhecimento',
    category: 'UC',
    description: 'Geriatria, fisiologia do envelhecimento e síndromes geriátricas.',
    meta: '110h • Ciclo Clínico',
    icon: '🧓',
    status: 'active',
    themes: [],
    references: []
  },
  {
    id: 'iesc3',
    periodId: 'periodo3',
    title: 'IESC3 - Interação em Saúde na Comunidade III',
    category: 'IESC',
    description: 'Estratégia de Saúde da Família e políticas de saúde populacional.',
    meta: '80h • Saúde Coletiva',
    icon: '🏥',
    status: 'active',
    themes: [],
    references: []
  },
  {
    id: 'hm3',
    periodId: 'periodo3',
    title: 'HM3 - Habilidades Médicas III',
    category: 'HABMED',
    description: 'Aprofundamento em exame físico segmentar e propedêutica clínica.',
    meta: '120h • Prática Clínica',
    icon: '🩺',
    status: 'active',
    themes: [],
    references: []
  },
  {
    id: 'uccg3',
    periodId: 'periodo3',
    title: 'UCCG3 - Ética, Cidadania e Empreendedorismo',
    category: 'UCCG',
    description: 'Código de Ética Médica e gestão básica de carreira.',
    meta: '80h • Conhecimentos Gerais',
    icon: '💼',
    status: 'active',
    themes: [],
    references: []
  },

  // ================= PERÍODO 4 =================
  {
    id: 'ucx',
    periodId: 'periodo4',
    title: 'UCX - Fadiga, perda de peso e anemia',
    category: 'UC',
    description: 'Diagnóstico diferencial de síndromes consumptivas e hematológicas básicas.',
    meta: '110h • Ciclo Clínico',
    icon: '🩸',
    status: 'active',
    themes: [],
    references: []
  },
  {
    id: 'ucxi',
    periodId: 'periodo4',
    title: 'UCXI - Proliferação celular',
    category: 'UC',
    description: 'Bases da oncologia, patologia tumoral e marcadores.',
    meta: '110h • Ciclo Clínico',
    icon: '🔬',
    status: 'active',
    themes: [],
    references: []
  },
  {
    id: 'ucxii',
    periodId: 'periodo4',
    title: 'UCXII - Dor e cuidados paliativos',
    category: 'UC',
    description: 'Fisiopatologia da dor, analgesia e abordagem paliativa.',
    meta: '110h • Ciclo Clínico',
    icon: '🕊️',
    status: 'active',
    themes: [],
    references: []
  },
  {
    id: 'iesc4',
    periodId: 'periodo4',
    title: 'IESC4 - Interação em Saúde na Comunidade IV',
    category: 'IESC',
    description: 'Análise de dados epidemiológicos e vigilância.',
    meta: '80h • Saúde Coletiva',
    icon: '📊',
    status: 'active',
    themes: [],
    references: []
  },
  {
    id: 'hm4',
    periodId: 'periodo4',
    title: 'HM4 - Habilidades Médicas IV',
    category: 'HABMED',
    description: 'Simulação de cenários clínicos complexos.',
    meta: '120h • Prática Clínica',
    icon: '🩺',
    status: 'active',
    themes: [],
    references: []
  },

  // ================= PERÍODO 5 =================
  {
    id: 'ucxiii',
    periodId: 'periodo5',
    title: 'UCXIII - Dor abdominal, diarreia, vômitos e icterícia',
    category: 'UC',
    description: 'Gastroenterologia clínica e síndromes abdominais.',
    meta: '110h • Ciclo Clínico',
    icon: '🤢',
    status: 'active',
    themes: [],
    references: []
  },
  {
    id: 'ucxiv',
    periodId: 'periodo5',
    title: 'UCXIV - Desordens nutricionais e metabólicas',
    category: 'UC',
    description: 'Endocrinologia, diabetes e distúrbios da tireoide.',
    meta: '110h • Ciclo Clínico',
    icon: '⚖️',
    status: 'active',
    themes: [],
    references: []
  },
  {
    id: 'ucxv',
    periodId: 'periodo5',
    title: 'UCXV - Febre, inflamação e infecção',
    category: 'UC',
    description: 'Doenças infectocontagiosas e infectologia clínica.',
    meta: '110h • Ciclo Clínico',
    icon: '🌡️',
    status: 'active',
    themes: [],
    references: []
  },
  {
    id: 'iesc5',
    periodId: 'periodo5',
    title: 'IESC5 - Interação em Saúde na Comunidade V',
    category: 'IESC',
    description: 'Saúde ambiental e endemias.',
    meta: '80h • Saúde Coletiva',
    icon: '🌍',
    status: 'active',
    themes: [],
    references: []
  },
  {
    id: 'hm5',
    periodId: 'periodo5',
    title: 'HM5 - Habilidades Médicas V',
    category: 'HABMED',
    description: 'Práticas avançadas em enfermaria.',
    meta: '120h • Prática Clínica',
    icon: '🩺',
    status: 'active',
    themes: [],
    references: []
  },

  // ================= PERÍODO 6 =================
  {
    id: 'ucxvi',
    periodId: 'periodo6',
    title: 'UCXVI - Distúrbios hematológicos',
    category: 'UC',
    description: 'Hematologia clínica e onco-hematologia.',
    meta: '110h • Ciclo Clínico',
    icon: '🩸',
    status: 'active',
    themes: [],
    references: []
  },
  {
    id: 'ucxvii',
    periodId: 'periodo6',
    title: 'UCXVII - Dispneia, dor torácica e edema',
    category: 'UC',
    description: 'Cardiologia e Pneumologia Clínica.',
    meta: '110h • Ciclo Clínico',
    icon: '🫁',
    status: 'active',
    themes: [],
    references: []
  },
  {
    id: 'ucxviii',
    periodId: 'periodo6',
    title: 'UCXVIII - Desordens geniturinárias',
    category: 'UC',
    description: 'Nefrologia e Urologia Básica.',
    meta: '110h • Ciclo Clínico',
    icon: '💧',
    status: 'active',
    themes: [],
    references: []
  },
  {
    id: 'iesc6',
    periodId: 'periodo6',
    title: 'IESC6 - Interação em Saúde na Comunidade VI',
    category: 'IESC',
    description: 'Planejamento e gestão em saúde.',
    meta: '80h • Saúde Coletiva',
    icon: '📊',
    status: 'active',
    themes: [],
    references: []
  },
  {
    id: 'hm6',
    periodId: 'periodo6',
    title: 'HM6 - Habilidades Médicas VI',
    category: 'HABMED',
    description: 'Simulações de alta fidelidade e cenários agudos.',
    meta: '120h • Prática Clínica',
    icon: '🩺',
    status: 'active',
    themes: [],
    references: []
  },

  // ================= PERÍODO 7 =================
  {
    id: 'ucxix',
    periodId: 'periodo7',
    title: 'UCXIX - Locomoção e Preensão',
    category: 'UC',
    description: 'Ortopedia, traumatologia e reumatologia.',
    meta: '110h • Ciclo Clínico',
    icon: '🦴',
    status: 'active',
    themes: [],
    references: []
  },
  {
    id: 'ucxx',
    periodId: 'periodo7',
    title: 'UCXX - Distúrbios Sensoriais, Motores e da Consciência',
    category: 'UC',
    description: 'Neurologia clínica e neurocirurgia básica.',
    meta: '110h • Ciclo Clínico',
    icon: '🧠',
    status: 'active',
    themes: [],
    references: []
  },
  {
    id: 'ucxxi',
    periodId: 'periodo7',
    title: 'UCXXI - Manifestações externas das doenças e iatrogenias',
    category: 'UC',
    description: 'Dermatologia e segurança do paciente.',
    meta: '110h • Ciclo Clínico',
    icon: '🩹',
    status: 'active',
    themes: [],
    references: []
  },
  {
    id: 'iesc7',
    periodId: 'periodo7',
    title: 'IESC7 - Interação em Saúde na Comunidade VII',
    category: 'IESC',
    description: 'Medicina do trabalho e saúde ocupacional.',
    meta: '80h • Saúde Coletiva',
    icon: '💼',
    status: 'active',
    themes: [],
    references: []
  },
  {
    id: 'hm7',
    periodId: 'periodo7',
    title: 'HM7 - Habilidades Médicas VII',
    category: 'HABMED',
    description: 'Técnica operatória e clínica cirúrgica.',
    meta: '120h • Prática Clínica',
    icon: '🔪',
    status: 'active',
    themes: [],
    references: []
  },

  // ================= PERÍODO 8 =================
  {
    id: 'ucxxii',
    periodId: 'periodo8',
    title: 'UCXXII - Problemas mentais e do comportamento',
    category: 'UC',
    description: 'Psiquiatria clínica e urgências psiquiátricas.',
    meta: '110h • Ciclo Clínico',
    icon: '🎭',
    status: 'active',
    themes: [],
    references: []
  },
  {
    id: 'ucxxiii',
    periodId: 'periodo8',
    title: 'UCXXIII - Urgência e Emergência Materno-Infantil',
    category: 'UC',
    description: 'Emergências pediátricas e obstétricas.',
    meta: '110h • Urgência',
    icon: '🚨',
    status: 'active',
    themes: [],
    references: []
  },
  {
    id: 'ucxxiv',
    periodId: 'periodo8',
    title: 'UCXXIV - Emergências de Adulto e Idoso',
    category: 'UC',
    description: 'Manejo do trauma, ACLS, ATLS e emergências clínicas.',
    meta: '110h • Urgência',
    icon: '🚑',
    status: 'active',
    themes: [],
    references: []
  },
  {
    id: 'iesc8',
    periodId: 'periodo8',
    title: 'IESC8 - Interação em Saúde na Comunidade VIII',
    category: 'IESC',
    description: 'Gestão de desastres e epidemias.',
    meta: '80h • Saúde Coletiva',
    icon: '🌪️',
    status: 'active',
    themes: [],
    references: []
  },
  {
    id: 'hm8',
    periodId: 'periodo8',
    title: 'HM8 - Habilidades Médicas VIII',
    category: 'HABMED',
    description: 'Simulações de emergência e preparação para o internato.',
    meta: '200h • Prática Clínica',
    icon: '🩺',
    status: 'active',
    themes: [],
    references: []
  },

  // ================= INTERNATO (PERÍODOS 9 A 12) =================
  {
    id: 'int_clinica',
    periodId: 'periodo9',
    title: 'Clínica Médica e Urgência',
    category: 'HABMED',
    description: 'Rodízio de Internato em Clínica Médica (Enfermaria e Pronto-Socorro).',
    meta: '291h • Internato',
    icon: '🏥',
    status: 'active',
    themes: [],
    references: []
  },
  {
    id: 'int_pediatria',
    periodId: 'periodo9',
    title: 'Pediatria e Urgência',
    category: 'HABMED',
    description: 'Rodízio de Internato em Pediatria Clínica e Emergência Pediátrica.',
    meta: '291h • Internato',
    icon: '🧸',
    status: 'active',
    themes: [],
    references: []
  },
  {
    id: 'int_cirurgia',
    periodId: 'periodo10',
    title: 'Cirurgia Geral e Urgência',
    category: 'HABMED',
    description: 'Rodízio de Internato em Centro Cirúrgico e Trauma.',
    meta: '291h • Internato',
    icon: '🔪',
    status: 'active',
    themes: [],
    references: []
  },
  {
    id: 'int_go',
    periodId: 'periodo10',
    title: 'Ginecologia e Obstetrícia',
    category: 'HABMED',
    description: 'Rodízio de Internato em Maternidade e Centro Obstétrico.',
    meta: '291h • Internato',
    icon: '🤰',
    status: 'active',
    themes: [],
    references: []
  },
  {
    id: 'int_mfc',
    periodId: 'periodo11',
    title: 'Medicina de Família e Saúde Coletiva',
    category: 'IESC',
    description: 'Rodízio de Internato em Atenção Primária à Saúde (UBS).',
    meta: '308h • Internato',
    icon: '🏡',
    status: 'active',
    themes: [],
    references: []
  },
  {
    id: 'int_psiquiatria',
    periodId: 'periodo11',
    title: 'Saúde Mental e Psiquiatria',
    category: 'HABMED',
    description: 'Rodízio de Internato em CAPS e Emergências Psiquiátricas.',
    meta: '144h • Internato',
    icon: '🧠',
    status: 'active',
    themes: [],
    references: []
  },
  {
    id: 'int_uti',
    periodId: 'periodo12',
    title: 'Urgência, Emergência e UTI',
    category: 'HABMED',
    description: 'Rodízio final em Unidade de Terapia Intensiva e Sala Vermelha.',
    meta: 'Estágio Rotativo • Internato',
    icon: '❤️‍🔥',
    status: 'active',
    themes: [],
    references: []
  },
  {
    id: 'int_eletivo',
    periodId: 'periodo12',
    title: 'Estágio Eletivo',
    category: 'UCCG',
    description: 'Rodízio opcional na especialidade de escolha do interno.',
    meta: '198h • Internato',
    icon: '⭐',
    status: 'active',
    themes: [],
    references: []
  }
];

export const INITIAL_QUESTIONS: Question[] = [];

// === MÓDULO: CONGRESSOS MÉDICOS 2026 ===
export const MEDICAL_EVENTS_2026: MedicalEvent[] = [
  {
    id: 'evt-dermato-1',
    congress: 'Congresso Internacional EB2026',
    description: 'Evento internacional dedicado à pesquisa e ao cuidado da Epidermólise Bolhosa, reunindo especialistas de vários países.',
    specialty: 'Dermatologia',
    location: 'São Paulo (SP)',
    eventDate: '20 a 22 de Janeiro de 2026',
    registrationPeriod: 'Encerrado',
    submissionPeriod: 'Encerrado',
    link: 'https://usebip.com/blogs/bip-insights/calendario-de-congressos-medicos-2026-em-sao-paulo'
  },
  {
    id: 'evt-inovacao-1',
    congress: 'Health Innovation Forum 2026',
    description: 'Fórum presencial com foco em tendências, transformação digital, inteligência artificial e inovação aplicada à saúde.',
    specialty: 'Gestão e Tecnologia em Saúde',
    location: 'Espaço Dois Ipês – Goiânia (GO)',
    eventDate: '28 e 29 de Janeiro de 2026',
    registrationPeriod: 'Até 15/01/2026',
    submissionPeriod: 'Não aplicável',
    link: 'https://usebip.com/blogs/bip-insights/congresos-medicos-2026-em-goiania'
  },
  {
    id: 'evt-ortopedia-1',
    congress: '2nd South Atlantic Forum on Osteoarthritis',
    description: 'Fórum com foco em osteoartrite, trazendo atualização em diagnóstico, tratamento clínico, cirúrgico e reabilitação.',
    specialty: 'Ortopedia e Traumatologia',
    location: 'Centro de Convenções Rebouças – São Paulo (SP)',
    eventDate: '27 e 28 de Fevereiro de 2026',
    registrationPeriod: 'Até 10/02/2026',
    submissionPeriod: 'Não aplicável',
    link: 'https://usebip.com/blogs/bip-insights/calendario-de-congressos-medicos-2026-em-sao-paulo'
  },
  {
    id: 'evt-pediatria-pr-1',
    congress: 'Congresso Paranaense de Pediatria, Alergia e Imunologia',
    description: 'Atualização clínica focada nos distúrbios alérgicos e imunológicos na infância.',
    specialty: 'Pediatria e Imunologia',
    location: 'Curitiba (PR)',
    eventDate: '06 e 07 de Março de 2026',
    registrationPeriod: 'Até 20/02/2026',
    submissionPeriod: 'Até 15/01/2026',
    link: 'https://usebip.com/blogs/bip-insights/calendario-de-congressos-medicos-2026-em-curitiba'
  },
  {
    id: 'evt-paliativos-1',
    congress: 'XII Congresso Latinoamericano e XI Brasileiro de Cuidados Paliativos',
    description: 'Encontro latino-americano dedicado à integração e ao desenvolvimento dos cuidados paliativos em diferentes cenários de saúde.',
    specialty: 'Cuidados Paliativos',
    location: 'São Paulo (SP)',
    eventDate: '11 a 14 de Março de 2026',
    registrationPeriod: 'Até 28/02/2026',
    submissionPeriod: 'Encerrado',
    link: 'https://usebip.com/blogs/bip-insights/calendario-de-congressos-medicos-2026-em-sao-paulo'
  },
  {
    id: 'evt-tricologia-1',
    congress: 'III Congresso Internacional de Tricologia e Transplante Capilar',
    description: 'Um dos principais encontros em tricologia, terapias regenerativas e transplante capilar.',
    specialty: 'Dermatologia',
    location: 'São Paulo (SP)',
    eventDate: '12 a 14 de Março de 2026',
    registrationPeriod: 'Até 01/03/2026',
    submissionPeriod: 'Até 30/01/2026',
    link: 'https://usebip.com/blogs/bip-insights/calendario-de-congressos-medicos-2026-em-sao-paulo'
  },
  {
    id: 'evt-estetica-1',
    congress: 'IMCAS Americas 2026',
    description: 'Evento internacional de referência em tendências, tecnologias e técnicas em medicina estética.',
    specialty: 'Medicina Estética e Cirurgia Plástica',
    location: 'São Paulo (SP)',
    eventDate: '13 a 15 de Março de 2026',
    registrationPeriod: 'Até 01/03/2026',
    submissionPeriod: 'Encerrado',
    link: 'https://usebip.com/blogs/bip-insights/calendario-de-congressos-medicos-2026-em-sao-paulo'
  },
  {
    id: 'evt-saudepublica-1',
    congress: 'Congresso Brasileiro de Saúde Coletiva e Políticas Públicas (UFPR)',
    description: 'Evento voltado à saúde coletiva, políticas públicas, pesquisa em saúde e integração entre academia e comunidade.',
    specialty: 'Saúde Coletiva',
    location: 'UFPR – Curitiba (PR)',
    eventDate: '08 a 10 de Abril de 2026',
    registrationPeriod: 'Até 25/03/2026',
    submissionPeriod: 'Até 20/02/2026',
    link: 'https://usebip.com/blogs/bip-insights/calendario-de-congressos-medicos-2026-em-curitiba'
  },
  {
    id: 'evt-coloprocto-1',
    congress: 'Congresso de Coloproctologia do Centro-Oeste',
    description: 'Reúne especialistas para atualização em doenças colorretais, técnicas cirúrgicas e discussão de casos.',
    specialty: 'Coloproctologia',
    location: 'Auditório Sicoob UniCentro Br – Goiânia (GO)',
    eventDate: '10 e 11 de Abril de 2026',
    registrationPeriod: 'Até 30/03/2026',
    submissionPeriod: 'Até 15/02/2026',
    link: 'https://usebip.com/blogs/bip-insights/congresos-medicos-2026-em-goiania'
  },
  {
    id: 'evt-ortopedia-pr-1',
    congress: 'Congresso Brasileiro de Ortopedia e Cirurgia da Coluna',
    description: 'Atualizações técnicas em abordagens cirúrgicas de coluna e controle de dor.',
    specialty: 'Ortopedia e Coluna',
    location: 'Viasoft Experience – Curitiba (PR)',
    eventDate: '18 a 21 de Abril de 2026',
    registrationPeriod: 'Até 05/04/2026',
    submissionPeriod: 'Até 15/02/2026',
    link: 'https://usebip.com/blogs/bip-insights/calendario-de-congressos-medicos-2026-em-curitiba'
  },
  {
    id: 'evt-pediatria-nefro-1',
    congress: 'Congresso Brasileiro de Nefrologia Pediátrica',
    description: 'Encontro nacional dedicado à nefrologia pediátrica, com foco em atualização científica e discussão de casos.',
    specialty: 'Pediatria e Nefrologia',
    location: 'Windsor Barra Hotel – Rio de Janeiro (RJ)',
    eventDate: '29 de Abril a 02 de Maio de 2026',
    registrationPeriod: 'Até 10/04/2026',
    submissionPeriod: 'Até 20/02/2026',
    link: 'https://usebip.com/blogs/bip-insights/calend-rio-de-congressos-medicos-2026-no-rio-de-janeiro'
  },
  {
    id: 'evt-ciruderm-1',
    congress: '36º Congresso Brasileiro de Cirurgia Dermatológica (CBCD 2026)',
    description: 'Congresso nacional com programação científica em cirurgia dermatológica, oncologia cutânea e estética.',
    specialty: 'Cirurgia Dermatológica',
    location: 'Centro de Convenções – Goiânia (GO)',
    eventDate: '30 de Abril a 03 de Maio de 2026',
    registrationPeriod: 'Até 15/04/2026',
    submissionPeriod: 'Até 15/02/2026',
    link: 'https://usebip.com/blogs/bip-insights/congresos-medicos-2026-em-goiania'
  },
  {
    id: 'evt-cardiologia-rj-1',
    congress: 'Congresso de Cardiologia do Estado do Rio de Janeiro',
    description: 'Debates sobre insuficiência cardíaca, valvopatias e novas diretrizes de hipertensão.',
    specialty: 'Cardiologia',
    location: 'Rio de Janeiro (RJ)',
    eventDate: '07 e 08 de Maio de 2026',
    registrationPeriod: 'Até 25/04/2026',
    submissionPeriod: 'Até 10/03/2026',
    link: 'https://usebip.com/blogs/bip-insights/calend-rio-de-congressos-medicos-2026-no-rio-de-janeiro'
  },
  {
    id: 'evt-mastologia-1',
    congress: '28º Congresso Brasileiro de Mastologia e 15º BBCS',
    description: 'Principal encontro da mastologia, com foco em prevenção, diagnóstico e tratamento de câncer de mama.',
    specialty: 'Mastologia / Oncologia',
    location: 'Centro de Convenções – Goiânia (GO)',
    eventDate: '13 a 16 de Maio de 2026',
    registrationPeriod: 'Até 01/05/2026',
    submissionPeriod: 'Até 28/02/2026',
    link: 'https://usebip.com/blogs/bip-insights/congresos-medicos-2026-em-goiania'
  },
  {
    id: 'evt-educacao-1',
    congress: 'X Congresso de Educação Médica do Centro-Oeste (COEMCO)',
    description: 'Voltado a médicos e acadêmicos, debatendo currículos, tecnologia no ensino e metodologias ativas.',
    specialty: 'Educação Médica',
    location: 'Faculdade de Medicina da UFG – Goiânia (GO)',
    eventDate: '22 e 23 de Maio de 2026',
    registrationPeriod: 'Até 10/05/2026',
    submissionPeriod: 'Até 30/03/2026',
    link: 'https://usebip.com/blogs/bip-insights/congresos-medicos-2026-em-goiania'
  },
  {
    id: 'evt-trauma-1',
    congress: 'XXXI Congresso Brasileiro de Trauma Ortopédico (CBTO)',
    description: 'Reúne ortopedistas de todo o Brasil com foco em trauma e emergências ortopédicas em cirurgias de alta complexidade.',
    specialty: 'Ortopedia e Traumatologia',
    location: 'São Paulo (SP)',
    eventDate: '04 a 06 de Junho de 2026',
    registrationPeriod: 'Até 20/05/2026',
    submissionPeriod: 'Até 10/03/2026',
    link: 'https://usebip.com/blogs/bip-insights/calendario-de-congressos-medicos-2026'
  },
  {
    id: 'evt-neuro-1',
    congress: 'Congress on Brain, Behavior and Emotions 2026',
    description: 'Encontro internacional reunindo neurociência, psicologia e psiquiatria para discutir a relação entre cérebro, comportamento e emoções.',
    specialty: 'Psiquiatria e Neurologia',
    location: 'Porto Alegre (RS)',
    eventDate: '04 a 06 de Junho de 2026',
    registrationPeriod: 'Até 15/05/2026',
    submissionPeriod: 'Até 28/02/2026',
    link: 'https://usebip.com/blogs/bip-insights/calendario-de-congressos-medicos-2026'
  },
  {
    id: 'evt-infecto-1',
    congress: 'X Infecto Rio 2026',
    description: 'Congresso regional com atualização em doenças infecciosas, HIV, antimicrobianos e infecções hospitalares.',
    specialty: 'Infectologia',
    location: 'Rio de Janeiro (RJ)',
    eventDate: '10 a 12 de Junho de 2026',
    registrationPeriod: 'Até 30/05/2026',
    submissionPeriod: 'Até 20/03/2026',
    link: 'https://usebip.com/blogs/bip-insights/calend-rio-de-congressos-medicos-2026-no-rio-de-janeiro'
  },
  {
    id: 'evt-medgeral-1',
    congress: '4º Congresso Brasileiro de Medicina Geral da AMB (CBMG)',
    description: 'Evento multiprofissional sobre soluções para o cuidado integrado e visão sistêmica do paciente.',
    specialty: 'Medicina Geral',
    location: 'Distrito Anhembi – São Paulo (SP)',
    eventDate: '11 a 13 de Junho de 2026',
    registrationPeriod: 'Até 31/05/2026',
    submissionPeriod: 'Até 15/04/2026',
    link: 'https://usebip.com/blogs/bip-insights/calendario-de-congressos-medicos-2026'
  },
  {
    id: 'evt-oftalmo-1',
    congress: 'Congresso Brasileiro de Oftalmologia 2026',
    description: 'Educação médica continuada essencial para oftalmologistas, debates sobre avanços cirúrgicos e networking.',
    specialty: 'Oftalmologia',
    location: 'Windsor Oceânico – Rio de Janeiro (RJ)',
    eventDate: '02 a 04 de Julho de 2026',
    registrationPeriod: 'Até 15/06/2026',
    submissionPeriod: 'Até 30/04/2026',
    link: 'https://usebip.com/blogs/bip-insights/calend-rio-de-congressos-medicos-2026-no-rio-de-janeiro'
  },
  {
    id: 'evt-aids-1',
    congress: 'Congresso Internacional de Saúde Pública, HIV e AIDS',
    description: 'Maior encontro global sobre HIV/AIDS reunindo pesquisadores, infectologistas e formuladores de políticas públicas.',
    specialty: 'Infectologia e Saúde Pública',
    location: 'Riocentro – Rio de Janeiro (RJ)',
    eventDate: '26 a 31 de Julho de 2026',
    registrationPeriod: 'Até 30/06/2026',
    submissionPeriod: 'Até 15/05/2026',
    link: 'https://usebip.com/blogs/bip-insights/calend-rio-de-congressos-medicos-2026-no-rio-de-janeiro'
  },
  {
    id: 'evt-neurocirurgia-1',
    congress: 'Congresso Brasileiro de Neurocirurgia',
    description: 'Abordagens modernas e robótica aplicadas a lesões medulares, tumores cerebrais e traumas neurológicos.',
    specialty: 'Neurocirurgia',
    location: 'Windsor Barra – Rio de Janeiro (RJ)',
    eventDate: '11 a 15 de Agosto de 2026',
    registrationPeriod: 'Até 25/07/2026',
    submissionPeriod: 'Até 30/05/2026',
    link: 'https://usebip.com/blogs/bip-insights/calend-rio-de-congressos-medicos-2026-no-rio-de-janeiro'
  },
  {
    id: 'evt-reumato-1',
    congress: 'Congresso Sul-Brasileiro de Reumatologia',
    description: 'Debates sobre lúpus, artrite reumatoide, fibromialgia e o uso de biológicos na prática clínica.',
    specialty: 'Reumatologia',
    location: 'Curitiba (PR)',
    eventDate: '02 a 05 de Setembro de 2026',
    registrationPeriod: 'Até 15/08/2026',
    submissionPeriod: 'Até 30/06/2026',
    link: 'https://usebip.com/blogs/bip-insights/calendario-de-congressos-medicos-2026-em-curitiba'
  },
  {
    id: 'evt-ginecologia-1',
    congress: 'Congresso Brasileiro de Ginecologia, Menopausa e Saúde da Mulher',
    description: 'Focado em climatério, reposição hormonal, oncoginecologia preventiva e saúde integral feminina.',
    specialty: 'Ginecologia',
    location: 'Rio de Janeiro (RJ)',
    eventDate: '30 de Setembro a 03 de Outubro de 2026',
    registrationPeriod: 'Até 10/09/2026',
    submissionPeriod: 'Até 15/07/2026',
    link: 'https://usebip.com/blogs/bip-insights/calend-rio-de-congressos-medicos-2026-no-rio-de-janeiro'
  },
  {
    id: 'evt-oncologia-1',
    congress: 'Congresso Brasileiro de Oncologia Clínica (SBOC)',
    description: 'Avanços em imunoterapia, terapia-alvo, rastreamento molecular e protocolos no manejo do paciente oncológico.',
    specialty: 'Oncologia Clínica',
    location: 'Windsor Barra Hotel – Rio de Janeiro (RJ)',
    eventDate: '05 a 07 de Novembro de 2026',
    registrationPeriod: 'Até 20/10/2026',
    submissionPeriod: 'Até 30/08/2026',
    link: 'https://usebip.com/blogs/bip-insights/calend-rio-de-congressos-medicos-2026-no-rio-de-janeiro'
  },
  {
    id: 'evt-cih-1',
    congress: 'XX Congresso Brasileiro de Controle de Infecção e Epidemiologia Hospitalar (CIH 2026)',
    description: 'Discussão nacional sobre controle de surtos, resistência antimicrobiana e protocolos de biossegurança.',
    specialty: 'Infectologia / Epidemiologia',
    location: 'Rio de Janeiro (RJ)',
    eventDate: '18 a 21 de Novembro de 2026',
    registrationPeriod: 'Até 30/10/2026',
    submissionPeriod: 'Até 15/09/2026',
    link: 'https://usebip.com/blogs/bip-insights/calend-rio-de-congressos-medicos-2026-no-rio-de-janeiro'
  }
];