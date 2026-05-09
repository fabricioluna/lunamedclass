export type ViewState = 'period-selection' | 'home' | 'discipline' | 'quiz-setup' | 'quiz' | 'admin' | 'summaries-list' | 'scripts-list' | 'osce-setup' | 'osce-quiz' | 'osce-ai-setup' | 'osce-ai-quiz' | 'osce-mode-selection' | 'calculators' | 'career-quiz' | 'references-view' | 'share-material' | 'lab-list' | 'lab-quiz' | 'survey' | 'survey-report' | 'medical-events';

/**
 * Utilitário global para gerenciar datas oriundas do Firebase (Firestore ou Realtime)
 * Evita o uso do tipo 'any' e previne crashes na renderização de datas.
 */
export type FirebaseTimestamp = number | string | { seconds: number; nanoseconds: number };

export interface Period {
  id: string;
  name: string;
  description: string;
  semester: string;
  workload: string;
  icon: string;
  crest?: string; 
}

export interface Unit {
  id: string;
  title: string;
  description?: string;
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
  image?: string; 
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
export interface StaticOsceStation {
  mode: 'clinical'; // Identificador estrito para TypeScript
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

// === INTERFACE 2: OSCE DINÂMICO (RPG / IA - Luna Engine 2.0 - HM2) ===
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
  mode: 'rpg' | 'ai'; 
  id: string;
  firebaseId?: string;
  disciplineId: string;
  theme: string;
  title: string;
  scenario: string;
  task: string;
  initialPhaseId: string;
  phases: Record<string, SimulationPhase>;
  checklist?: string[]; 
  initialVitals?: ClinicalState;
  inventory?: string[];
  setting?: string;
  tip?: string;
}

// === UNIÃO DISCRIMINADA ===
export type OsceStation = StaticOsceStation | DynamicOsceStation;

export interface SimulationInfo {
  id: string;
  periodId: string; 
  title: string;
  description: string;
  meta: string;
  icon: string;
  status: 'active' | 'locked' | 'coming-soon'; 
  themes: string[];
  references?: ReferenceMaterial[];
  lockedFeatures?: string[]; 
  isHidden?: boolean; 
  units?: Unit[]; // Divisão opcional obrigatória para práticas longitudinais
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
  createdAt?: FirebaseTimestamp;
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
  createdAt?: FirebaseTimestamp; 
}

// === NOVO: INTERFACE DE ANALYTICS (OBSERVATÓRIO CIENTÍFICO) ===
export interface AnalyticsResult {
  id?: string;
  firebaseId?: string;
  disciplineId?: string;
  theme?: string;
  stationTitle?: string;
  quizTitle?: string;
  mode?: 'clinical' | 'static-cloud' | 'rpg' | 'ai';
  grade?: number;
  timeSpent?: number;
  isFatalError?: boolean;
  date?: string;
  completedAt?: FirebaseTimestamp;
  fullDecisionPath?: Array<{ choice: string; [key: string]: any }>;
  userSequence?: string[];
  createdAt?: FirebaseTimestamp;
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
  category?: string; 
  questions: LabQuestion[];
  createdAt?: FirebaseTimestamp;
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
  q8_nps: number; 
}

export interface SurveyResponse {
  id?: string;
  unit: string; 
  answers: SurveyAnswers;
  createdAt?: FirebaseTimestamp; 
}

// === MÓDULO: CONGRESSOS MÉDICOS ===
export interface MedicalEvent {
  id: string;
  congress: string;
  description: string;
  specialty: string;
  location: string;
  eventDate: string;
  registrationPeriod: string;
  submissionPeriod: string;
  link: string;
}