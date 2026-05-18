import React, { Component, ErrorInfo, ReactNode } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
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

// TELAS DE PESQUISA INSTITUCIONAL
import SurveyView from './views/SurveyView';
import SurveyReportView from './views/SurveyReportView';

// SANDBOX DA IA
import AITestView from './views/AITestView';

// TELA DE CONGRESSOS MÉDICOS
import MedicalEventsView from './views/MedicalEventsView';

// ÍCONES PARA O ERROR BOUNDARY E CONTEXTO
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { DataProvider, useData } from './contexts/DataContext';

const APP_VERSION = "9.0.0 - Luna Semantic Router";

// ============================================================================
// ERROR BOUNDARY
// ============================================================================
interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Luna MedClass Interceptou um Erro Crítico:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-[#f4f7f6] p-6 text-center animate-in fade-in duration-500">
          <div className="w-24 h-24 bg-red-100 rounded-[2rem] flex items-center justify-center mb-6 shadow-sm">
            <AlertTriangle className="text-red-600" size={48} />
          </div>
          <h1 className="text-3xl font-black text-[#003366] tracking-tighter uppercase mb-2">Ops! Instabilidade Crítica.</h1>
          <p className="text-sm font-bold text-gray-500 uppercase tracking-widest max-w-md mb-8">
            Ocorreu uma falha inesperada na renderização deste módulo. Nossos protocolos de segurança já registraram o incidente.
          </p>
          <div className="bg-white p-4 rounded-2xl border border-gray-200 text-left max-w-lg w-full mb-8 overflow-auto max-h-32 shadow-sm">
            <p className="text-[10px] font-mono text-red-500 font-bold">
              {this.state.error?.toString()}
            </p>
          </div>
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
// STATUS BAR E PROTEÇÃO DE ROTAS (Wrapper)
// ============================================================================
const AppLayout: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { isLoading, isOnline } = useData();

  // Garante que o scroll volte para o topo ao trocar de rota
  const { pathname } = useLocation();
  React.useEffect(() => {
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
        <div className="text-gray-500 text-[8px] font-medium uppercase max-w-md">
          Simuladores de Alto Rendimento para Medicina.
        </div>
        <div className="text-[#D4A017] text-[9px] font-black uppercase tracking-[0.1em]">Desenvolvido por Fabrício Luna</div>
        
        <div className="text-[7px] text-gray-300 font-black uppercase tracking-tighter mt-1">
          Build {APP_VERSION}
        </div>
      </footer>
    </div>
  );
};

// ============================================================================
// ORQUESTRADOR DE ROTAS (A Nova Engenharia)
// ============================================================================
const AppRouter: React.FC = () => {
  return (
    <Router>
      <AppLayout>
        <Routes>
          {/* Rotas Públicas e Utilitárias */}
          <Route path="/" element={<PeriodSelectionView periods={[]} onSelectPeriod={() => {}} />} />
          <Route path="/admin" element={<AdminView onBack={() => {}} />} />
          <Route path="/calculators" element={<CalculatorsView onBack={() => {}} />} />
          <Route path="/career-quiz" element={<CareerQuiz onBack={() => {}} />} />
          <Route path="/medical-events" element={<MedicalEventsView onBack={() => {}} />} />
          <Route path="/survey" element={<SurveyView onBack={() => {}} onSaveResult={() => {}} />} />
          <Route path="/survey-report" element={<SurveyReportView onBack={() => {}} />} />
          <Route path="/ai-test" element={<AITestView />} />
          
          {/* Rota Coringa para Fallback */}
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