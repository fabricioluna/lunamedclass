import React, { useState, useEffect, Component, ErrorInfo, ReactNode } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useParams, useNavigate } from 'react-router-dom';
import Header from './components/Header';
import PeriodSelectionView from './views/PeriodSelectionView'; 
import HomeView from './views/HomeView';
import DisciplineView from './views/DisciplineView';
import QuizSetupView from './views/QuizSetupView';
import QuizView from './views/QuizView';
import AdminView from './views/AdminView';
import SummariesListView from './views/SummariesListView';
import OsceView from './views/OsceView';
import DynamicOsceView from './views/DynamicOsceView'; 
import OsceSetupView from './views/OsceSetupView';
import OsceAIView from './views/OsceAIView';
import OsceModeSelectionView from './views/OsceModeSelectionView'; 
import CalculatorsView from './views/CalculatorsView';
import CareerQuiz from './components/CareerQuiz';
import ReferencesView from './views/ReferencesView';
import ShareMaterialView from './views/ShareMaterialView';
import LabListView from './views/LabListView';
import LabQuizView from './views/LabQuizView';

import SurveyView from './views/SurveyView';
import SurveyReportView from './views/SurveyReportView';
import AITestView from './views/AITestView';
import MedicalEventsView from './views/MedicalEventsView';

import { AlertTriangle, RefreshCw } from 'lucide-react';
import { ViewState, Question, OsceStation, LabSimulation, AcademicUnit } from './types';
import { PERIODS } from './constants'; 
import { db, ref, push } from './firebase';
import { DataProvider, useData } from './contexts/DataContext';

const APP_VERSION = "9.1.1 - Luna Semantic Router (Patched)";

// ============================================================================
// ERROR BOUNDARY
// ============================================================================
interface ErrorBoundaryProps { children: ReactNode; }
interface ErrorBoundaryState { hasError: boolean; error: Error | null; }

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: Error): ErrorBoundaryState { return { hasError: true, error }; }
  componentDidCatch(error: Error, errorInfo: ErrorInfo) { console.error("Erro Crítico:", error, errorInfo); }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-[#f4f7f6] p-6 text-center animate-in fade-in duration-500">
          <div className="w-24 h-24 bg-red-100 rounded-[2rem] flex items-center justify-center mb-6 shadow-sm">
            <AlertTriangle className="text-red-600" size={48} />
          </div>
          <h1 className="text-3xl font-black text-[#003366] tracking-tighter uppercase mb-2">Ops! Instabilidade Crítica.</h1>
          <p className="text-sm font-bold text-gray-500 uppercase tracking-widest max-w-md mb-8">
            Ocorreu uma falha inesperada na renderização.
          </p>
          <button 
            onClick={() => window.location.href = '/'}
            className="flex items-center gap-2 bg-[#003366] text-white px-8 py-4 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-[#D4A017] transition-all shadow-xl hover:scale-105"
          >
            <RefreshCw size={16} /> Recarregar Ecossistema
          </button>
        </div>
      );
    }
    return this.props.children; 
  }
}

// ============================================================================
// WRAPPER DE LAYOUT E PROTEÇÃO DE STATUS
// ============================================================================
const AppLayout: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { isLoading, isOnline } = useData();
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#f4f7f6] p-4">
        <div className="w-10 h-10 border-4 border-[#003366]/10 border-t-[#D4A017] rounded-full animate-spin mb-4"></div>
        <h1 className="text-[#003366] font-black uppercase tracking-[0.2em] text-[10px]">Luna Analytics Engine Sincronizando...</h1>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#f4f7f6]">
      <div className="print:hidden">
        <Header />
      </div>

      <div className={`print:hidden py-1 px-4 flex justify-center items-center gap-2 border-b transition-all duration-700 ${isOnline ? 'bg-green-50' : 'bg-red-50'}`}>
        <div className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-green-500' : 'bg-red-500 animate-pulse'}`}></div>
        <span className={`text-[8px] font-black uppercase tracking-widest ${isOnline ? 'text-green-700' : 'text-red-700'}`}>
          {isOnline ? 'Conexão Segura • Captura de Dados Científicos Ativa' : 'Modo Offline • Sincronização Pendente'}
        </span>
      </div>

      <main className="flex-grow w-full max-w-7xl mx-auto flex flex-col relative">
        {children}
      </main>

      <footer className="print:hidden bg-white border-t py-4 flex flex-col items-center gap-1 mt-auto text-center px-4">
        <div className="text-gray-400 text-[9px] font-black uppercase tracking-widest">© 2026 Luna MedClass</div>
        <div className="text-[#D4A017] text-[9px] font-black uppercase tracking-[0.1em]">Desenvolvido por Fabrício Luna</div>
        <div className="text-[7px] text-gray-300 font-black uppercase tracking-tighter mt-1">Build {APP_VERSION}</div>
      </footer>
    </div>
  );
};

// ============================================================================
// HELPER PARA EXTRAIR A UNIDADE DA URL (?unit=N1)
// ============================================================================
const useAcademicUnit = (): AcademicUnit => {
  const { search } = useLocation();
  const params = new URLSearchParams(search);
  return (params.get('unit') as AcademicUnit) || 'N1';
};

// ============================================================================
// FLUXOS DE ROTEAMENTO (Substituem os antigos if/else)
// ============================================================================

const PeriodFlow = () => {
  const navigate = useNavigate();
  const { disciplines } = useData();
  const handleSelectPeriod = (periodId: string) => {
    const periodDiscs = disciplines.filter(d => d.periodId === periodId);
    if (periodDiscs.length === 1) navigate(`/disciplina/${periodDiscs[0].id}`);
    else navigate(`/periodo/${periodId}`);
  };
  return <PeriodSelectionView periods={PERIODS} onSelectPeriod={handleSelectPeriod} />;
};

const HomeFlow = () => {
  const { periodId } = useParams();
  const navigate = useNavigate();
  const { disciplines } = useData();
  const period = PERIODS.find(p => p.id === periodId);
  
  if (!period) return <Navigate to="/" replace />;
  const periodDiscs = disciplines.filter(d => d.periodId === periodId);
  return <HomeView period={period} disciplines={periodDiscs} onSelectDiscipline={(id) => navigate(`/disciplina/${id}`)} />;
};

const DisciplineFlow = () => {
  const { disciplineId } = useParams();
  const navigate = useNavigate();
  const { disciplines } = useData();
  
  const handleSelectOption = (type: string, unit?: AcademicUnit) => {
    const base = `/disciplina/${disciplineId}`;
    const query = unit ? `?unit=${unit}` : '';
    
    if (type === 'quiz-setup') navigate(`${base}/simulado${query}`);
    if (type === 'summaries-list') navigate(`${base}/materiais${query}`);
    if (type === 'references-view') navigate(`${base}/referencias${query}`);
    if (type === 'osce-mode-selection') navigate(`${base}/osce${query}`);
    if (type.startsWith('lab-list')) {
       const cat = type.replace('lab-list-', '');
       navigate(`${base}/lab${query}${cat && cat !== 'lab-list' ? (query ? '&' : '?') + 'cat=' + cat : ''}`);
    }
  };

  return <DisciplineView disciplineId={disciplineId!} disciplines={disciplines} summaries={[]} onBack={() => navigate(-1)} onSelectOption={handleSelectOption as any} />;
};

const QuizFlow = () => {
  const { disciplineId } = useParams();
  const unit = useAcademicUnit();
  const navigate = useNavigate();
  const { disciplines } = useData();
  const discipline = disciplines.find(d => d.id === disciplineId);
  
  const [step, setStep] = useState<'setup' | 'quiz'>('setup');
  const [questions, setQuestions] = useState<Question[]>([]);

  if (!discipline) return <Navigate to="/" replace />;

  if (step === 'setup') {
     return <QuizSetupView discipline={discipline} selectedUnit={unit} onBack={() => navigate(-1)} onStart={(q) => { setQuestions(q); setStep('quiz'); }} />;
  }
  return (
    <QuizView 
      questions={questions} 
      discipline={discipline} 
      onBack={() => setStep('setup')} 
      onSaveResult={(score, total, title, type, time, details) => {
        if (db) push(ref(db, 'quizResults'), { score, total, date: new Date().toLocaleString(), discipline: discipline.id, unit, quizTitle: title || 'Misto', type: type || 'teorico', timeSpent: time || 0, details: details || [] });
      }} 
    />
  );
};

const OsceFlow = () => {
  const { disciplineId } = useParams();
  const unit = useAcademicUnit();
  const navigate = useNavigate();
  const { disciplines } = useData();
  const discipline = disciplines.find(d => d.id === disciplineId);
  
  const [step, setStep] = useState<'mode' | 'setup' | 'quiz' | 'ai-setup' | 'ai-quiz'>('mode');
  const [mode, setMode] = useState<'static' | 'rpg' | 'ai' | 'all'>('all');
  const [station, setStation] = useState<OsceStation | null>(null);

  if (!discipline) return <Navigate to="/" replace />;

  if (step === 'mode') {
     return <OsceModeSelectionView onBack={() => navigate(-1)} onSelectMode={(m) => {
        if (m === 'ai') { setStep('ai-setup'); } else { setMode(m); setStep('setup'); }
     }} />;
  }
  if (step === 'setup') {
     return <OsceSetupView discipline={discipline} selectedUnit={unit} setupMode={mode} onBack={() => setStep('mode')} onStart={(s) => { setStation(s); setStep('quiz'); }} />;
  }
  if (step === 'quiz' && station) {
     if (station.mode === 'rpg') {
       return <DynamicOsceView station={station} onBack={() => setStep('setup')} onSaveResult={(score, total, time, analytics) => {
           if (db) {
              push(ref(db, 'quizResults'), { score, total, timeSpent: time, date: new Date().toLocaleString(), discipline: station.disciplineId, unit, quizTitle: station.title, type: 'osce-rpg' });
              push(ref(db, 'osceAnalytics'), { ...analytics, unit, date: new Date().toLocaleString(), studentId: 'anon_student' });
           }
       }} />;
     }
     return <OsceView station={station} onBack={() => setStep('setup')} onSaveResult={(score, total, time, analytics) => {
         if (db) {
            push(ref(db, 'quizResults'), { score, total, timeSpent: time, date: new Date().toLocaleString(), discipline: station.disciplineId, unit, quizTitle: station.title, type: 'osce-estatico' });
            push(ref(db, 'osceAnalytics'), { ...analytics, unit, date: new Date().toLocaleString() });
         }
     }} />;
  }
  if (step === 'ai-setup') {
     return <OsceSetupView discipline={discipline} selectedUnit={unit} setupMode="ai" onBack={() => setStep('mode')} onStart={(s) => { setStation(s); setStep('ai-quiz'); }} />;
  }
  if (step === 'ai-quiz' && station) {
     return <OsceAIView station={station} onBack={() => setStep('ai-setup')} />;
  }
  return null;
};

const LabFlow = () => {
  const { disciplineId } = useParams();
  const unit = useAcademicUnit();
  const { search } = useLocation();
  const cat = new URLSearchParams(search).get('cat');
  const navigate = useNavigate();
  const { disciplines } = useData();
  const discipline = disciplines.find(d => d.id === disciplineId);
  
  const [step, setStep] = useState<'list' | 'quiz'>('list');
  const [sim, setSim] = useState<LabSimulation | null>(null);

  if (!discipline) return <Navigate to="/" replace />;

  if (step === 'list') {
     return <LabListView disciplineId={discipline.id} disciplines={disciplines} selectedUnit={unit} categoryFilter={cat} onStart={(s) => { setSim(s); setStep('quiz'); }} />;
  }
  if (step === 'quiz' && sim) {
     return <LabQuizView simulation={sim} onBack={() => setStep('list')} onSaveResult={(score, total, time, details) => {
         if (db) push(ref(db, 'quizResults'), { score, total, date: new Date().toLocaleString(), discipline: sim.disciplineId, unit, quizTitle: sim.title, type: 'laboratorio', timeSpent: time || 0, details: details || [] });
     }} />;
  }
  return null;
};

const MaterialsFlow = () => {
  const { disciplineId } = useParams();
  const unit = useAcademicUnit();
  const navigate = useNavigate();
  const { disciplines } = useData();
  const discipline = disciplines.find(d => d.id === disciplineId);

  const [step, setStep] = useState<'list' | 'share'>('list');

  if (!discipline) return <Navigate to="/" replace />;

  if (step === 'list') {
     return <SummariesListView disciplineId={discipline.id} disciplines={disciplines} selectedUnit={unit} onBack={() => navigate(-1)} onShareClick={() => setStep('share')} />;
  }
  if (step === 'share') {
     return <ShareMaterialView discipline={discipline} onBack={() => setStep('list')} onShare={(s) => {
         if (db) push(ref(db, 'summaries'), { ...s, unit });
     }} />;
  }
  return null;
};

// === NOVO FLUXO: Referências Bibliográficas (Corrigindo o Erro do TypeScript) ===
const ReferencesFlow = () => {
  const { disciplineId } = useParams();
  const navigate = useNavigate();
  const { disciplines } = useData();
  const discipline = disciplines.find(d => d.id === disciplineId);

  if (!discipline) return <Navigate to="/" replace />;

  return <ReferencesView discipline={discipline} onBack={() => navigate(-1)} />;
};

// ============================================================================
// APP ROUTER (O Coração da Aplicação)
// ============================================================================
const AppRouter: React.FC = () => {
  return (
    <Router>
      <AppLayout>
        <Routes>
          {/* Rotas Core */}
          <Route path="/" element={<PeriodFlow />} />
          <Route path="/periodo/:periodId" element={<HomeFlow />} />
          <Route path="/disciplina/:disciplineId" element={<DisciplineFlow />} />
          
          {/* Sub-rotas Curriculares */}
          <Route path="/disciplina/:disciplineId/simulado" element={<QuizFlow />} />
          <Route path="/disciplina/:disciplineId/osce" element={<OsceFlow />} />
          <Route path="/disciplina/:disciplineId/lab" element={<LabFlow />} />
          <Route path="/disciplina/:disciplineId/materiais" element={<MaterialsFlow />} />
          <Route path="/disciplina/:disciplineId/referencias" element={<ReferencesFlow />} />

          {/* Rotas Utilitárias e Públicas */}
          <Route path="/admin" element={<AdminView onBack={() => window.history.back()} />} />
          <Route path="/calculators" element={<CalculatorsView onBack={() => window.history.back()} />} />
          <Route path="/career-quiz" element={<CareerQuiz onBack={() => window.history.back()} />} />
          <Route path="/medical-events" element={<MedicalEventsView onBack={() => window.history.back()} />} />
          <Route path="/ai-test" element={<AITestView />} />
          
          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AppLayout>
    </Router>
  );
};

const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <DataProvider>
        <AppRouter />
      </DataProvider>
    </ErrorBoundary>
  );
};

export default App;