export type ViewState = 'home' | 'discipline' | 'quiz-setup' | 'quiz' | 'admin' | 'summaries-list' | 'scripts-list' | 'osce-setup' | 'osce-quiz' | 'osce-ai-setup' | 'osce-ai-quiz' | 'calculators' | 'career-quiz' | 'references-view' | 'share-material' | 'lab-list' | 'lab-quiz';

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
  quizTitle?: string; // NOVO: Guarda o título do simulado teórico
  author?: string;    // NOVO: Guarda o autor do simulado
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
}

export interface QuizResult {
  id?: string;
  score: number;
  total: number;
  date: string;
  discipline?: string;
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
}