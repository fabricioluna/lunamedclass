export type ViewState = 'period-selection' | 'home' | 'discipline' | 'quiz-setup' | 'quiz' | 'admin' | 'summaries-list' | 'scripts-list' | 'osce-setup' | 'osce-quiz' | 'osce-ai-setup' | 'osce-ai-quiz' | 'osce-mode-selection' | 'calculators' | 'career-quiz' | 'references-view' | 'share-material' | 'lab-list' | 'lab-quiz' | 'survey' | 'survey-report' | 'medical-events';

/**
 * Utilitário global para gerenciar datas oriundas do Firebase (Firestore ou Realtime)
 * Evita o uso do tipo 'any' e previne crashes na renderização de datas.
 */
export type FirebaseTimestamp = number | string | { seconds: number; nanoseconds: number };

// === NOVOS TIPOS: CATEGORIZAÇÃO E UNIDADES ACADÊMICAS ===
export type DisciplineCategory = 'UC' | 'HABMED' | 'IESC' | 'UCCG';
export type AcademicUnit = 'N1' | 'N2';

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
  sessionId?: string;
}

export interface Question {
  id: string;
  firebaseId?: string;
  disciplineId: string;
  unit?: AcademicUnit; // Suporte à separação N1/N2. Undefined = legado (N1)
  theme: string;
  areaConhecimentoId?: string; // Área transversal (Anatomia, Histologia...) — Etapa 6. Opcional, classificação incremental.
  subareaConhecimentoId?: string; // Subárea transversal (Sistema Reprodutor Feminino...) — eixo independente da Área, sem cascata entre os dois.
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

// Área de Conhecimento: eixo transversal por assunto (Anatomia, Histologia...), independente
// de disciplina/UC/período — diferente do `theme` acima, que é por disciplina. Ambos os campos
// (Área e Subárea) são opcionais e independentes entre si (sem cascata) — ver
// PLANO-REESTRUTURACAO.md, Etapa 6.
export interface AreaConhecimento {
  id: string;
  label: string;
}

// Subárea de Conhecimento: eixo transversal mais específico (Sistema Reprodutor Feminino...),
// independente da Área — a mesma subárea pode combinar com várias áreas diferentes.
export interface SubareaConhecimento {
  id: string;
  label: string;
}

// Bloqueio de tipo de simulador (item novo, Etapa 6): chave = slug de
// features/simulators/simulatorTypesConfig.tsx (ex.: "osce-rpg"), valor = true quando travado
// pelo admin. Ausência de chave = liberado (mesmo padrão "ausente = destravado" de
// utils/featureLocks.ts). Vive em config/simulatorAccess, leitura pública (precisa aparecer
// bloqueado/liberado em /simulators para visitante deslogado, D6-style), escrita só admin.
export type SimulatorLocks = Record<string, boolean>;

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

// === LUNA ENGINE: CONTRATO DA IA (GEMINI) ENTRE FRONTEND E api/chat.ts ===
export interface PhaseRules {
  transitions: PhaseTransition[];
  narrative?: string;
}

export interface AIChatResponse {
  text: string;
  vitalsUpdate: ClinicalState | null;
  newPhaseId: string | null;
  modelUsed?: string;
}

// === INTERFACE 1: OSCE ESTÁTICO (Clássico - HM1) ===

// Formato de autoria (item 6.17): quem cadastra escreve os passos na ordem certa e os
// distratores, cada um com o "por quê" — sem calcular índice nem embaralhar à mão. A nuvem é
// montada e embaralhada pelo player (utils/osceStation.ts).
export interface StaticOsceStep {
  action: string;
  why?: string;
  critical?: boolean; // Só destaca em vermelho se esquecido — não limita a nota (decisão 6.17)
}

export interface StaticOsceDistractor {
  action: string;
  why?: string;
}

export interface StaticOsceStation {
  mode: 'clinical'; // Identificador estrito para TypeScript
  id: string;
  firebaseId?: string;
  slug?: string; // Vira o id do documento: reimportar com o mesmo slug atualiza em vez de duplicar
  disciplineId: string;
  unit?: AcademicUnit; // Suporte à separação N1/N2
  theme: string;
  title: string;
  scenario: string;
  setting?: string;
  task: string;
  tip?: string;
  checklist: string[];
  steps?: StaticOsceStep[];
  distractors?: StaticOsceDistractor[];
  // Formato antigo (estações cadastradas antes do 6.17) — só lido quando `steps` não existe.
  actionCloud?: string[];
  correctOrderIndices?: number[];
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
  slug?: string;
  disciplineId: string;
  unit?: AcademicUnit; // Suporte à separação N1/N2
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

// === INTERFACE 3: RPG GUIADO (item 6.17, Fase 2) ===
// Caso interativo SEM IA: a cada cena o aluno escolhe uma conduta entre 4 a 6 opções. Nota,
// feedback e consequências saem do próprio cadastro — nada é julgado em tempo real por modelo,
// então é gratuito, previsível e seguro com acesso público (diferente do RPG por texto livre).
export interface GuidedChoice {
  action: string;
  correct?: boolean; // pode haver mais de uma correta quando o roteiro aceita mais de uma conduta
  feedback: string; // na errada: a consequência narrada + o porquê; na certa: o desfecho da ação
}

export interface GuidedReveal {
  label: string;
  value: string;
}

export interface GuidedScene {
  narrative: string;
  patient?: string; // fala do paciente (ou da equipe), exibida como balão
  prompt?: string; // pergunta ao aluno; padrão: "O que você faz agora?"
  hint?: string; // pista do modo digitado (nível 1); sem ela, o jogo usa uma pista genérica
  choices: GuidedChoice[];
  reveals?: GuidedReveal[]; // valores que só aparecem DEPOIS da escolha correta (técnica feita certo)
}

export interface GuidedOsceStation {
  mode: 'guided';
  id: string;
  firebaseId?: string;
  slug?: string;
  disciplineId: string;
  unit?: AcademicUnit;
  theme: string;
  title: string;
  scenario: string;
  setting?: string;
  task: string;
  tip?: string;
  checklist?: string[];
  scenes: GuidedScene[];
}

// === UNIÃO DISCRIMINADA ===
export type OsceStation = StaticOsceStation | DynamicOsceStation | GuidedOsceStation;

export interface SimulationInfo {
  id: string;
  periodId: string; 
  title: string;
  category: DisciplineCategory; // Obrigatório para o roteador saber se exige filtro N1/N2
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
  unit?: AcademicUnit; // Suporte à separação N1/N2
  theme?: string; // Tema da disciplina (mesma lista de SimulationInfo.themes usada por Question.theme) — opcional, Etapa 6.14
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
  userId?: string; 
  userEmail?: string | null; 
  score: number;
  total: number;
  date: string;
  discipline?: string;
  unit?: AcademicUnit; // Estatística vinculada à unidade correta
  quizTitle?: string; 
  type?: 'teorico' | 'laboratorio' | 'osce' | 'osce-rpg' | 'osce-estatico';
  timeSpent?: number; 
  details?: QuizDetail[]; 
  createdAt?: FirebaseTimestamp; 
}

// === NOVO: INTERFACE DE ANALYTICS (OBSERVATÓRIO CIENTÍFICO) ===
export interface AnalyticsResult {
  id?: string;
  firebaseId?: string;
  studentId?: string;
  disciplineId?: string;
  unit?: AcademicUnit; // Permite ao admin avaliar lacunas N1 vs N2 separadamente
  theme?: string;
  stationTitle?: string;
  quizTitle?: string;
  mode?: 'clinical' | 'static-cloud' | 'rpg' | 'ai';
  grade?: number;
  timeSpent?: number;
  isFatalError?: boolean;
  date?: string;
  completedAt?: FirebaseTimestamp;
  fullDecisionPath?: Array<{ choice: string; [key: string]: unknown }>;
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

// Firestore não aceita array dentro de array: a linha guarda as coordenadas "achatadas"
// (x1, y1, z1, x2, y2, z2, ...) em vez de uma lista de pontos [x, y, z].
// `direction` é para onde a haste do alfinete sai: inclinada em relação à superfície, para a
// cabeça não cobrir justamente a estrutura que ele aponta.
// Marca-texto: cada traço guarda os pontos da superfície por onde o pincel passou (com a
// normal de cada um, para a tinta não atravessar para o outro lado de um osso fino) e o raio.
export interface AnatomyPaintStroke {
  radius: number;
  points: number[];
  normals: number[];
}

export type AnatomyMarker =
  | { type: 'pin'; position: number[]; direction: number[] }
  | { type: 'line'; points: number[] }
  | { type: 'paint'; strokes: AnatomyPaintStroke[] };

export interface AnatomyCameraView {
  position: number[];
  target: number[];
}

// Uma questão pode ter várias marcas (estruturas pares, mais de um ponto) — item 6.22.
// `marker` (uma só) é o formato das questões salvas antes disso; leia sempre via
// questionMarkers() em utils/anatomyMarkers.ts, que entende os dois.
export interface LabModel3D {
  modelUrl: string;
  modelName: string;
  markers?: AnatomyMarker[];
  marker?: AnatomyMarker;
  camera?: AnatomyCameraView;
}

// Questão do Lab é de imagem (imageUrl) OU de peça 3D (model3d) — item 6.18.
export interface LabQuestion {
  id: string;
  imageUrl?: string;
  model3d?: LabModel3D;
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
  unit?: AcademicUnit; // Suporte à separação N1/N2
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

// === MÓDULO: FEATURE FLAGS (LUNA ENGINE) ===
export interface FeatureFlag {
  firebaseId?: string;
  name: string;
  description: string;
  isEnabled: boolean;
}