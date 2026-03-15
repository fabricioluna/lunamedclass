export type ViewState = 'home' | 'discipline' | 'quiz-setup' | 'quiz' | 'admin' | 'summaries-list' | 'scripts-list' | 'osce-setup' | 'osce-quiz' | 'osce-ai-setup' | 'osce-ai-quiz' | 'calculators' | 'career-quiz' | 'references-view' | 'share-material' | 'lab-list' | 'lab-quiz';

// NOVO: Para gravar os detalhes de cada questão respondida no Analytics
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

export interface OsceStation {
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

export interface SimulationInfo {
  id: string;
  title: string;
  description: string;
  meta: string;
  icon: string;
  status: 'active' | 'locked';
  themes: string[];
  references?: ReferenceMaterial[];
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
  views?: number; // NOVO: Contador de cliques/visualizações no material
}

export interface QuizResult {
  id?: string;
  score: number;
  total: number;
  date: string;
  discipline?: string;
  quizTitle?: string; // NOVO: Nome do simulado
  type?: 'teorico' | 'laboratorio' | 'osce'; // NOVO: Tipo de simulado
  timeSpent?: number; // NOVO: Tempo gasto em segundos
  details?: QuizDetail[]; // NOVO: Mapeamento de acertos/erros por questão
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
  views?: number; // NOVO: Contador de quantas vezes o laboratório foi aberto
}