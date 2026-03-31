export type ViewState = 'room-selection' | 'home' | 'discipline' | 'quiz-setup' | 'quiz' | 'admin' | 'summaries-list' | 'scripts-list' | 'osce-setup' | 'osce-quiz' | 'osce-ai-setup' | 'osce-ai-quiz' | 'calculators' | 'career-quiz' | 'references-view' | 'share-material' | 'lab-list' | 'lab-quiz';

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

// === NOVA INTERFACE: ESTADO CLÍNICO DO PACIENTE (RPG) ===
export interface ClinicalState {
  hr: number;       // Heart Rate (Frequência Cardíaca)
  bp: string;       // Blood Pressure (Pressão Arterial. Ex: "120/80")
  sat: number;      // Saturação de O2 (%)
  rr: number;       // Respiratory Rate (Frequência Respiratória)
  status: string;   // Status visual/clínico (Ex: "cianótico", "estável", "inconsciente")
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
  
  // === NOVOS CAMPOS OPCIONAIS PARA O MODO RPG ===
  mode?: 'clinical' | 'rpg'; 
  initialVitals?: ClinicalState; // Sinais vitais com os quais o paciente começa a estação
}

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

export const getAIResponse = async (prompt: string, context: string = "") => {
  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, context }),
    });

    if (!response.ok) {
      throw new Error(`Erro no servidor: ${response.status}`);
    }

    const data = await response.json();
    return data.text; 

  } catch (error) {
    console.error("Erro na comunicação com a API segura:", error);
    return "Desculpe, tive um problema ao processar a sua dúvida. Tente novamente em instantes.";
  }
};

// === FUNÇÃO: GERAÇÃO DE DICAS PARA O LABORATÓRIO (INTACTA) ===
export const generateLabTips = async (answer: string, question: string) => {
  const prompt = `Você é um professor de medicina especialista em anatomia, histologia e patologia.
  A pergunta do simulado de laboratório visual foi: "${question}"
  A resposta correta esperada é: "${answer}"

  Com base APENAS nesta resposta correta, retorne um objeto JSON ESTRITO com as seguintes chaves (em inglês):
  "identification": "Dica prática e direta de como identificar visualmente essa estrutura na imagem (ex: formato, cor, características)",
  "location": "Dica de localização topográfica ou contexto no órgão",
  "functions": "Principais funções fisiológicas ou correlação clínica direta"

  Não use formatação markdown (como \`\`\`json). Retorne APENAS o objeto JSON puro e válido.`;

  try {
    const responseText = await getAIResponse(prompt, "Geração de dicas estruturadas para laboratório virtual.");
    const cleanText = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(cleanText);
  } catch (error) {
    console.error("Erro ao gerar/processar as dicas da IA:", error);
    return {
      identification: "Dica visual não disponível no momento.",
      location: "Erro ao processar localização.",
      functions: "Verifique sua conexão e tente novamente."
    };
  }
};