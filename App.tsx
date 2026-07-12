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
import SimulatorsView from './views/SimulatorsView';

import SurveyView from './views/SurveyView';
import SurveyReportView from './views/SurveyReportView';
import AITestView from './views/AITestView';
import MedicalEventsView from './views/MedicalEventsView';

import { AlertTriangle, RefreshCw, LogIn, Mail, UserPlus, HeartPulse } from 'lucide-react';
import { ViewState, Question, OsceStation, LabSimulation, AcademicUnit } from './types';
import { PERIODS } from './constants'; 
import { db, ref, push } from './firebase';
import { DataProvider, useData } from './contexts/DataContext';
import { AuthProvider, useAuth } from './contexts/AuthContext'; 

const APP_VERSION = "9.4.0 - Luna Public Utilities Routing";

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
// PROTECTED ROUTE (RECEPÇÃO VIRTUAL / GATEWAY ACOLHEDOR)
// ============================================================================
const ProtectedRoute: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { currentUser, isLoadingAuth, loginWithGoogle, loginWithEmail, registerWithEmail } = useAuth();
  
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setIsProcessing(true);

    try {
      if (isLoginMode) {
        await loginWithEmail(email, password);
      } else {
        if (!name.trim()) throw new Error('O nome é obrigatório para o seu prontuário acadêmico.');
        await registerWithEmail(name, email, password);
      }
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/invalid-credential') setErrorMsg('Credenciais incorretas. Verifique seu e-mail e senha.');
      else if (err.code === 'auth/email-already-in-use') setErrorMsg('Este e-mail já está cadastrado. Tente fazer login.');
      else if (err.code === 'auth/weak-password') setErrorMsg('A senha deve ter pelo menos 6 caracteres.');
      else setErrorMsg(err.message || 'Ocorreu um erro. Tente novamente.');
    } finally {
      setIsProcessing(false);
    }
  };

  if (isLoadingAuth) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#f4f7f6] p-4">
        <div className="w-10 h-10 border-4 border-[#003366]/10 border-t-[#D4A017] rounded-full animate-spin mb-4"></div>
        <h1 className="text-[#003366] font-black uppercase tracking-[0.2em] text-[10px]">Preparando seu ambiente...</h1>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="min-h-[85vh] flex items-center justify-center px-4 py-8 animate-in fade-in duration-700 bg-cover bg-center relative" 
           style={{ backgroundImage: 'url("https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&q=80")' }}>
        
        <div className="absolute inset-0 bg-[#003366]/80 backdrop-blur-sm z-0"></div>

        <div className="bg-white p-8 md:p-10 rounded-[2.5rem] shadow-2xl w-full max-w-md text-center z-10 relative overflow-hidden border-4 border-[#D4A017]/20">
          <div className="w-16 h-16 bg-[#003366] text-[#D4A017] rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl transform -rotate-3">
            <HeartPulse size={32} />
          </div>
          
          <h2 className="text-2xl md:text-3xl font-black text-[#003366] mb-2 tracking-tighter">
            Bem-vindo(a) ao<br/><span className="text-[#D4A017]">Luna MedClass</span>
          </h2>
          
          <p className="text-[11px] text-gray-500 font-bold tracking-widest uppercase mb-8 leading-relaxed px-4">
            Crie seu prontuário acadêmico para acessar simuladores clínicos e gerenciar seu progresso.
          </p>

          <div className="flex bg-gray-100 p-1 rounded-xl mb-6 relative">
            <button 
              onClick={() => { setIsLoginMode(true); setErrorMsg(''); }}
              className={`flex-1 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all z-10 ${isLoginMode ? 'text-white bg-[#003366] shadow-md' : 'text-gray-400 hover:text-[#003366]'}`}
            >
              Já tenho conta
            </button>
            <button 
              onClick={() => { setIsLoginMode(false); setErrorMsg(''); }}
              className={`flex-1 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all z-10 ${!isLoginMode ? 'text-white bg-[#003366] shadow-md' : 'text-gray-400 hover:text-[#003366]'}`}
            >
              Criar Perfil
            </button>
          </div>

          {errorMsg && (
            <div className="bg-red-50 text-red-600 border border-red-200 text-xs font-bold p-3 rounded-lg mb-4 animate-in slide-in-from-top-2">
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 mb-6">
            {!isLoginMode && (
              <div className="relative">
                <input 
                  type="text" 
                  placeholder="Seu Nome Completo" 
                  required
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full pl-4 pr-4 py-3.5 bg-gray-50 rounded-xl outline-none border-2 border-transparent focus:border-[#D4A017] focus:bg-white transition-all font-bold text-gray-700" 
                />
              </div>
            )}
            <div className="relative">
              <input 
                type="email" 
                placeholder="E-mail Acadêmico ou Pessoal" 
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full pl-4 pr-4 py-3.5 bg-gray-50 rounded-xl outline-none border-2 border-transparent focus:border-[#D4A017] focus:bg-white transition-all font-bold text-gray-700" 
              />
            </div>
            <div className="relative">
              <input 
                type="password" 
                placeholder="Senha Segura" 
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full pl-4 pr-4 py-3.5 bg-gray-50 rounded-xl outline-none border-2 border-transparent focus:border-[#D4A017] focus:bg-white transition-all font-bold text-gray-700" 
              />
            </div>

            <button 
              type="submit"
              disabled={isProcessing}
              className="w-full flex items-center justify-center gap-2 bg-[#003366] text-white py-4 rounded-xl font-black uppercase tracking-widest shadow-lg hover:bg-[#D4A017] hover:text-[#003366] transition-all disabled:opacity-50"
            >
              {isProcessing ? 'Processando...' : (isLoginMode ? <><LogIn size={18}/> Acessar Sistema</> : <><UserPlus size={18}/> Iniciar Jornada</>)}
            </button>
          </form>

          <div className="flex items-center gap-4 mb-6">
            <div className="h-px bg-gray-200 flex-1"></div>
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">ou</span>
            <div className="h-px bg-gray-200 flex-1"></div>
          </div>

          <button 
            type="button"
            onClick={loginWithGoogle}
            className="w-full flex items-center justify-center gap-3 bg-white border-2 border-gray-100 text-gray-600 py-3.5 px-6 rounded-xl font-black uppercase tracking-widest hover:border-[#D4A017] hover:text-[#003366] transition-all"
          >
            <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" className="w-5 h-5" />
            Continuar com Google
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

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
      <div className="print:hidden sticky top-0 z-50">
        <Header />
      </div>

      <div className={`print:hidden py-1 px-4 flex justify-center items-center gap-2 border-b transition-all duration-700 ${isOnline ? 'bg-green-50' : 'bg-red-50'}`}>
        <div className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-green-500' : 'bg-red-500 animate-pulse'}`}></div>
        <span className={`text-[8px] font-black uppercase tracking-widest ${isOnline ? 'text-green-700' : 'text-red-700'}`}>
          {isOnline ? 'Conexão Segura • Captura de Dados Científicos Ativa' : 'Modo Offline • Sincronização Pendente'}
        </span>
      </div>

      {/* Removido o ProtectedRoute global daqui. A renderização agora é livre no layout principal */}
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
// FLUXOS DE ROTEAMENTO 
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
          {/* ROTAS PRIVADAS (EXIGEM LOGIN) - Envelopadas com ProtectedRoute */}
          <Route path="/" element={<ProtectedRoute><PeriodFlow /></ProtectedRoute>} />
          <Route path="/periodo/:periodId" element={<ProtectedRoute><HomeFlow /></ProtectedRoute>} />
          <Route path="/disciplina/:disciplineId" element={<ProtectedRoute><DisciplineFlow /></ProtectedRoute>} />
          <Route path="/disciplina/:disciplineId/simulado" element={<ProtectedRoute><QuizFlow /></ProtectedRoute>} />
          <Route path="/disciplina/:disciplineId/osce" element={<ProtectedRoute><OsceFlow /></ProtectedRoute>} />
          <Route path="/disciplina/:disciplineId/lab" element={<ProtectedRoute><LabFlow /></ProtectedRoute>} />
          <Route path="/disciplina/:disciplineId/materiais" element={<ProtectedRoute><MaterialsFlow /></ProtectedRoute>} />
          <Route path="/disciplina/:disciplineId/referencias" element={<ProtectedRoute><ReferencesFlow /></ProtectedRoute>} />
          
          <Route path="/admin" element={<ProtectedRoute><AdminView onBack={() => window.history.back()} /></ProtectedRoute>} />

          {/* ROTAS PÚBLICAS (ACESSO LIVRE) - Sem o ProtectedRoute */}
          <Route path="/calculators" element={<CalculatorsView onBack={() => window.history.back()} />} />
          <Route path="/career-quiz" element={<CareerQuiz onBack={() => window.history.back()} />} />
          <Route path="/medical-events" element={<MedicalEventsView onBack={() => window.history.back()} />} />
          <Route path="/simulators" element={<SimulatorsView />} /> 
          <Route path="/ai-test" element={<AITestView />} />
          
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AppLayout>
    </Router>
  );
};

const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <DataProvider>
          <AppRouter />
        </DataProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
};

export default App;