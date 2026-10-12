import React from 'react';
import { Activity, Gamepad2, Microscope, Pill, ClipboardList, FileSearch, Stethoscope } from 'lucide-react';

export interface SimulatorTypeConfig {
  slug: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  source: 'lab' | 'osce';
  matchValue: string; // category (lab, ex.: "anatomia") ou mode (osce, ex.: "rpg")
  buildPath: (disciplineId: string) => string;
}

// Cada tipo OSCE casa com exatamente um `mode` de estação. Só há dois formatos ativos para o aluno:
// Estático (`clinical`) e RPG Guiado (`guided`). Os motores `rpg` (Luna Engine) e `ai` (Paciente
// Virtual) continuam no código, mas sem cartão: ver PLANO-REESTRUTURACAO.md.
export const stationModeMatchesType = (stationMode: string, matchValue: string): boolean => stationMode === matchValue;

export interface ComingSoonSimulatorType {
  title: string;
  description: string;
  icon: React.ReactNode;
}

// Fonte única de título/descrição/ícone/destino dos tipos de simulador em /simulators — usada
// tanto pela lista de tipos (views/SimulatorsView.tsx) quanto pelo seletor de disciplina que
// cada tipo abre (routes/AppRoutes.tsx, TypeDisciplineListFlow). Ver PLANO-REESTRUTURACAO.md,
// Etapa 6.
//
// Cada tipo aqui já é uma feature real, usada hoje dentro do fluxo por disciplina — o
// `buildPath` sempre aponta pra uma rota que JÁ EXISTE e já funciona (LabListView já entende
// `?cat=`, OsceSetupView já entende `/configurar/:mode`); esta tela só resolve "em qual
// disciplina esse tipo de conteúdo existe", que antes não tinha atalho nenhum.
//
// `source: 'osce'` roda sem login (item 6.16, decisão explícita do usuário) — as rotas
// `/disciplina/:id/osce/*` não têm <ProtectedRoute>. `source: 'lab'` continua exigindo conta
// (`labSimulations` não é público). Mudar o `source` de um tipo muda essa exigência de login
// automaticamente em routes/AppRoutes.tsx (TypeDisciplineListFlow) — não é só cosmético.
export const AVAILABLE_SIMULATOR_TYPES: SimulatorTypeConfig[] = [
  {
    slug: 'lab-anatomia',
    title: 'Laboratório de Anatomia',
    description: 'Identificação de peças anatômicas.',
    icon: <Activity className="w-8 h-8 text-[#D4A017]" />,
    source: 'lab',
    matchValue: 'anatomia',
    buildPath: (id) => `/disciplina/${id}/lab?cat=anatomia`,
  },
  {
    slug: 'lab-histologia',
    title: 'Laboratório de Histologia/Morfofuncional',
    description: 'Identificação de lâminas e estruturas microscópicas.',
    icon: <Microscope className="w-8 h-8 text-[#D4A017]" />,
    source: 'lab',
    matchValue: 'histologia',
    buildPath: (id) => `/disciplina/${id}/lab?cat=histologia`,
  },
  {
    slug: 'lab-farmacologia',
    title: 'Laboratório de Farmacologia',
    description: 'Identificação de fármacos e classes medicamentosas.',
    icon: <Pill className="w-8 h-8 text-[#D4A017]" />,
    source: 'lab',
    matchValue: 'farmacologia',
    buildPath: (id) => `/disciplina/${id}/lab?cat=farmacologia`,
  },
  {
    slug: 'lab-exames',
    title: 'Laboratório de Exames',
    description: 'Identificação de exames de imagem e laboratoriais.',
    icon: <FileSearch className="w-8 h-8 text-[#D4A017]" />,
    source: 'lab',
    matchValue: 'exames',
    buildPath: (id) => `/disciplina/${id}/lab?cat=exames`,
  },
  {
    slug: 'osce-estatico',
    title: 'OSCE Estático',
    description: 'Checklists sequenciais e protocolos técnicos.',
    icon: <ClipboardList className="w-8 h-8 text-[#D4A017]" />,
    source: 'osce',
    matchValue: 'clinical',
    buildPath: (id) => `/disciplina/${id}/osce/configurar/static`,
  },
  {
    slug: 'osce-rpg-guiado',
    title: 'OSCE RPG Guiado',
    description: 'Casos de técnica, cena a cena, escolhendo a conduta entre alternativas. Sem IA.',
    icon: <Gamepad2 className="w-8 h-8 text-[#D4A017]" />,
    source: 'osce',
    matchValue: 'guided',
    buildPath: (id) => `/disciplina/${id}/osce/configurar/guided`,
  },
];

// Planos reais do usuário, ainda sem implementação nenhuma — ficam "Em breve" em vez de
// linkar pra rota inexistente. "Interpretação de Exames" aqui é o simulador amplo planejado
// (análise crítica de exames), diferente de "Laboratório de Exames" acima (identificação de
// imagem, já real) — nomes parecidos de propósito, mas são coisas diferentes.
export const COMING_SOON_SIMULATOR_TYPES: ComingSoonSimulatorType[] = [
  {
    title: 'Prescrição Farmacológica',
    description: 'Prática de escolha posológica, interações medicamentosas e preenchimento de receitas.',
    icon: <Pill className="w-8 h-8 text-[#D4A017]" />,
  },
  {
    title: 'Interpretação de Exames',
    description: 'Análise crítica de exames laboratoriais, gasometrias, ECG e exames de imagem.',
    icon: <FileSearch className="w-8 h-8 text-[#D4A017]" />,
  },
  {
    title: 'Propedêutica',
    description: 'Refinamento de manobras de exame físico, palpação, percussão e ausculta semiológica.',
    icon: <Stethoscope className="w-8 h-8 text-[#D4A017]" />,
  },
  {
    title: 'Evolução Clínico-Hospitalar',
    description: 'Construção e registro técnico da evolução diária de pacientes internados.',
    icon: <Activity className="w-8 h-8 text-[#D4A017]" />,
  },
];
