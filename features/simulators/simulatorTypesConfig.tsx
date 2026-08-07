import React from 'react';
import { Activity, Microscope, Pill, ClipboardList, Sword, UserSquare2, FileSearch, Stethoscope } from 'lucide-react';

export interface SimulatorTypeConfig {
  slug: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  source: 'lab' | 'osce';
  matchValue: string; // category (lab, ex.: "anatomia") ou mode (osce, ex.: "rpg")
  buildPath: (disciplineId: string) => string;
}

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
    slug: 'osce-rpg',
    title: 'OSCE RPG (Luna Engine)',
    description: 'Decisões dinâmicas com sinais vitais em tempo real.',
    icon: <Sword className="w-8 h-8 text-[#D4A017]" />,
    source: 'osce',
    matchValue: 'rpg',
    buildPath: (id) => `/disciplina/${id}/osce/configurar/rpg`,
  },
  {
    slug: 'paciente-virtual',
    title: 'Paciente Virtual (IA)',
    description: 'Anamnese livre conversando com a IA.',
    icon: <UserSquare2 className="w-8 h-8 text-[#D4A017]" />,
    source: 'osce',
    matchValue: 'ai',
    buildPath: (id) => `/disciplina/${id}/osce/configurar/ai`,
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
