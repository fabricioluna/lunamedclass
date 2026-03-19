import { Question, SimulationInfo, Room } from './types';

export const THEME = {
  primary: '#003366',
  accent: '#D4A017',
  highlight: '#E31B23',
  bg: '#f4f7f6',
  text: '#333333'
};

// NOVO: Definição das Salas
export const ROOMS: Room[] = [
  {
    id: 'turma8',
    name: 'Turma VIII - FMS',
    description: '2º Período - Ciclo da Homeostase e Prática Clínica Básica.',
    semester: '2026.1',
    workload: '610h',
    icon: '🎓'
  },
  {
    id: 'turma9',
    name: 'Turma IX / HabMed 1',
    description: '1º Período - Introdução à Medicina, Locomoção e Habilidades Básicas.',
    semester: '2026.1',
    workload: '420h',
    icon: '🌱'
  }
];

export const SIMULATIONS: SimulationInfo[] = [
  // --- SALA: TURMA 8 ---
  {
    id: 'uciv',
    roomId: 'turma8',
    title: 'UCIV - Funções Biológicas',
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
    id: 'hm2',
    roomId: 'turma8',
    title: 'HM2 - Habilidades Médicas II',
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
    references: [
      { id: 'ref7', title: 'Exame Clínico', author: 'Porto & Porto', type: 'link', url: 'http://biblioteca.medicinadosertao.com.br/biblioteca/acervo/detalhe/210702' },
      { id: 'ref8', title: 'Bates: Propedêutica Médica', author: 'Bates', type: 'link', url: 'http://biblioteca.medicinadosertao.com.br/biblioteca/acervo/detalhe/213400' },
      { id: 'ref9', title: 'Código de Ética Médica', author: 'CFM', type: 'link', url: 'http://biblioteca.medicinadosertao.com.br/biblioteca/acervo/detalhe/140114' }
    ]
  },
  {
    id: 'iesc2',
    roomId: 'turma8',
    title: 'IESC2 - Saúde na Comunidade II',
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
    references: [
      { id: 'ref4', title: 'Epidemiologia', author: 'Leon Gordis', type: 'book' },
      { id: 'ref5', title: 'Tratado de Medicina de Família e Comunidade', author: 'Gustavo Gusso', type: 'book' },
      { id: 'ref6', title: 'Portal e-SUS APS', type: 'link', url: 'https://aps.saude.gov.br/ape/esus' }
    ]
  },
  {
    id: 'uccg2_3',
    roomId: 'turma8',
    title: 'UCCG2-3 - Análise Social e Relações Étnico-Raciais',
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
    references: [
      { id: 'uccg2_3_ref1', title: 'Educação e Sociologia', author: 'Émile Durkheim', type: 'book' },
      { id: 'uccg2_3_ref2', title: 'Racismo Estrutural', author: 'Silvio Almeida', type: 'book' }
    ]
  },
  {
    id: 'uccg2_4',
    roomId: 'turma8',
    title: 'UCCG2-4 - Hist., Sociedade e Cultura Afro e Indígena',
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
    references: [
      { id: 'uccg2_4_ref1', title: 'O Povo Brasileiro', author: 'Darcy Ribeiro', type: 'book' }
    ]
  },
  {
    id: 'ucv',
    roomId: 'turma8',
    title: 'UCV - Mecanismos de Agressão e Defesa',
    description: 'Agentes agressores, imunidade inata e adquirida, inflamação, lesão celular e hipersensibilidade.',
    meta: '110h • Mecanismos de Lesão',
    icon: '🛡️',
    status: 'locked',
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
    id: 'ucvi',
    roomId: 'turma8',
    title: 'UCVI - Percepção, Consciência e Emoção',
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

  // --- SALA: TURMA 9 / HABMED 1 ---
  {
    id: 'hm1',
    roomId: 'turma9',
    title: 'HM1 - Habilidades Médicas I',
    description: 'Introdução à prática médica, sinais vitais e bases da relação médico-paciente.',
    meta: '120h • Prática Clínica',
    icon: '🩺',
    status: 'active',
    themes: [
      'Aferição de Sinais Vitais',
      'Lavagem de Mãos e Biossegurança',
      'Introdução à Anamnese',
      'Apresentação Profissional'
    ],
    references: []
  },
  {
    id: 'uc3',
    roomId: 'turma9',
    title: 'UCIII - Locomoção e Preensão',
    description: 'Anatomia e fisiologia do sistema musculoesquelético e tecidos conjuntivos.',
    meta: '110h • Sistema Locomotor',
    icon: '🦴',
    status: 'active',
    themes: [
      'Osteologia Básica',
      'Miologia e Articulações',
      'Nervos Periféricos',
      'Histologia do Osso e Músculo'
    ],
    references: []
  }
];

export const INITIAL_QUESTIONS: Question[] = [];