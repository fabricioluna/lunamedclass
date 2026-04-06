export type ViewState = 'room-selection' | 'home' | 'discipline' | 'quiz-setup' | 'quiz' | 'admin' | 'summaries-list' | 'scripts-list' | 'osce-setup' | 'osce-quiz' | 'osce-ai-setup' | 'osce-ai-quiz' | 'osce-mode-selection' | 'calculators' | 'career-quiz' | 'references-view' | 'share-material' | 'lab-list' | 'lab-quiz' | 'survey';

export interface Room {
  id: string;
  name: string;
  description: string;
  semester: string;
  workload: string;
  icon: string;
  crest?: string; 
}

export interface QuizDetail {
  questionId: string;
  isCorrect: boolean;
  theme: string;
}

export interface Question {
  id: string;
  firebaseId?: string;
  disciplineId: string;
  theme: string;
  q: string;
  options: string[];
  answer: number;
  explanation: string;
  tag: string;
  isPractical: boolean;
  quizTitle?: string; 
  author?: string;    
}

// === INTERFACES COMPARTILHADAS ===
export interface ClinicalState {
  hr: number;       // Heart Rate (Frequência Cardíaca)
  bp: string;       // Blood Pressure (Pressão Arterial. Ex: "120/80")
  sat: number;      // Saturação de O2 (%)
  rr: number;       // Respiratory Rate (Frequência Respiratória)
  status: string;   // Status visual/clínico (Ex: "cianótico", "estável", "inconsciente")
}

// === LUNA ENGINE 2.0: ESTRUTURAS DE FASES E TRANSIÇÕES (RPG DINÂMICO) ===
export interface PhaseTransition {
  triggers: string[];       
  nextPhaseId: string;      
  feedbackText: string;     
  isFatalError?: boolean;   
}

export interface SimulationPhase {
  phaseId: string;
  narrative: string;              
  vitals: ClinicalState;          
  backgroundUrl?: string;         
  timeLimitSeconds?: number;      
  timeoutPhaseId?: string;        
  transitions: PhaseTransition[]; 
}

// === INTERFACE 1: OSCE ESTÁTICO (Clássico - HM1) ===
// Foco: Paramentação, Antropometria, SSVV - Checklist Sequencial
export interface StaticOsceStation {
  mode: 'clinical'; // Identificador para o modo estático/clássico
  id: string;
  firebaseId?: string;
  disciplineId: string;
  theme: string;
  title: string;
  scenario: string;
  setting?: string;
  task: string;
  tip?: string;
  checklist: string[];
  actionCloud: string[];
  correctOrderIndices: number[];
}

// === INTERFACE 2: OSCE DINÂMICO (RPG - Luna Engine 2.0 - HM2) ===
// Foco: Árvore de Decisão, Protocolo SPIKES, Relação Médico-Paciente
export interface RPGNodeOption {
  texto_acao: string;
  proximo_no: string;
  feedback_oculto: string;
  pontuacao_delta: {
    Tecnica: number;
    Comunicacao: number;
    Biosseguranca: number;
  };
}

export interface RPGNode {
  id_no: string;
  estado_paciente: string;
  sinais_vitais_atuais: string | ClinicalState; 
  opcoes_aluno: RPGNodeOption[];
}

export interface DynamicOsceStation {
  mode: 'rpg' | 'ai'; // Atualizado para suportar o modo RPG e Paciente Virtual (IA)
  id: string;
  firebaseId?: string;
  disciplineId: string;
  theme: string;
  title: string;
  scenario: string;
  task: string;
  
  // Estrutura de Árvore de Decisão (Luna Engine 2.0)
  initialPhaseId: string;
  phases: Record<string, SimulationPhase>;
  
  // Campo para o checklist de avaliação técnica/comunicação da IA
  checklist?: string[]; 

  // Campos de Suporte
  initialVitals?: ClinicalState;
  inventory?: string[];
  setting?: string;
  tip?: string;
}

// === UNIÃO DISCRIMINADA: O SISTEMA RECONHECE O FORMATO PELO 'mode' ===
export type OsceStation = StaticOsceStation | DynamicOsceStation;

export interface SimulationInfo {
  id: string;
  roomId: string; 
  title: string;
  description: string;
  meta: string;
  icon: string;
  status: 'active' | 'locked' | 'coming-soon'; 
  themes: string[];
  references?: ReferenceMaterial[];
  lockedFeatures?: string[]; 
  isHidden?: boolean; 
}

export interface Summary {
  id: string;
  firebaseId?: string;
  disciplineId: string;
  label: string;
  url: string;
  type: 'summary' | 'script' | 'other';
  isFolder?: boolean;
  date: string;
  title?: string;
  author?: string;
  description?: string;
  size?: string;
  createdAt?: any;
  views?: number; 
  isVerified?: boolean; 
}

export interface QuizResult {
  id?: string;
  score: number;
  total: number;
  date: string;
  discipline?: string;
  quizTitle?: string; 
  type?: 'teorico' | 'laboratorio' | 'osce'; 
  timeSpent?: number; 
  details?: QuizDetail[]; 
}

export interface ReferenceMaterial {
  id: string;
  title: string;
  author?: string;
  type: 'book' | 'article' | 'link' | 'video';
  url?: string;
}

export interface LabQuestion {
  id: string;
  imageUrl: string;          
  imageName?: string;        
  question: string;
  answer: string;
  aiIdentification?: string; 
  aiLocation?: string;       
  aiFunctions?: string;      
}

export interface LabSimulation {
  id: string;
  firebaseId?: string;
  disciplineId: string;
  title: string;
  author: string;
  description: string;
  questions: LabQuestion[];
  createdAt?: number;
  views?: number; 
}

// === INTERFACES DE PESQUISA INSTITUCIONAL ===
export interface SurveyAnswers {
  usagePattern: string;
  q2_timeSaved: number;
  q3_interface: number;
  q4_simulators: number;
  q5_finalImpact: number;
  q6_bestFeature: string;
  q7_nextUnit: string;
  q8_nps: number; // Métrica NPS (0 a 10) adicionada
}

export interface SurveyResponse {
  id?: string;
  unit: string; 
  answers: SurveyAnswers;
  createdAt?: any; 
}