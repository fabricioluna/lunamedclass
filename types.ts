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

// A INTERFACE SUMMARY FOI ATUALIZADA COM OS NOVOS CAMPOS
export interface Summary {
  id: string;
  firebaseId?: string;
  disciplineId: string;
  label: string;
  url: string;
  type: 'summary' | 'script' | 'other';
  isFolder?: boolean;
  date: string;
  // Novos campos:
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

// === NOVAS INTERFACES: LABORATÓRIO VIRTUAL COM IA ===
export interface LabQuestion {
  id: string;
  imageUrl: string;          // Vai guardar o link da imagem no Firebase Storage
  question: string;
  answer: string;
  aiIdentification?: string; // Dica gerada pela IA
  aiLocation?: string;       // Dica gerada pela IA
  aiFunctions?: string;      // Dica gerada pela IA
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