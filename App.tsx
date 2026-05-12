import React, { useState, useEffect, Component, ErrorInfo, ReactNode } from 'react';
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

// ÍCONES PARA O ERROR BOUNDARY
import { AlertTriangle, RefreshCw } from 'lucide-react';

// IMPORTS PURIFICADOS (SEM EXTENSÕES)
import { ViewState, Question, OsceStation, LabSimulation, AcademicUnit } from './types';
import { PERIODS } from './constants'; 
import { db, ref, push } from './firebase';

import { DataProvider, useData } from './contexts/DataContext';

const APP_VERSION = "8.0.0 - Luna Modular Engine";

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
// COMPONENTE PRINCIPAL DE ROTEAMENTO (AppContent)
// ============================================================================
const AppContent: React.FC = () => {
  
  const getInitialView = (): ViewState | 'ai-test' => {
    const params = new URLSearchParams(window.location.search);
    const viewParam = params.get('view');
    if (viewParam === 'survey') return 'survey';
    if (viewParam === 'survey-report') return 'survey-report';
    if (viewParam === 'medical-events') return 'medical-events'; 
    return 'period-selection';
  };

  const [currentView, setCurrentView] = useState<ViewState | 'ai-test'>(getInitialView());
  const [viewHistory, setViewHistory] = useState<(ViewState | 'ai-test')[]>(
    getInitialView() !== 'period-selection' ? ['period-selection', getInitialView()] : ['period-selection']
  );

  const [selectedPeriodId, setSelectedPeriodId] = useState<string | null>(null);
  const [selectedDisciplineId, setSelectedDisciplineId] = useState<string | null>(null);
  const [selectedUnit, setSelectedUnit] = useState<AcademicUnit | null>(null); // NOVO: Controle de N1/N2
  
  const [quizFilteredQuestions, setQuizFilteredQuestions] = useState<Question[]>([]);
  const [currentOsceStation, setCurrentOsceStation] = useState<OsceStation | null>(null);
  const [currentOsceAIStation, setCurrentOsceAIStation] = useState<OsceStation | null>(null);
  const [currentLabSimulation, setCurrentLabSimulation] = useState<LabSimulation | null>(null); 

  const [osceFilterMode, setOsceFilterMode] = useState<'static' | 'rpg' | 'all'>('all');
  const [labCategoryFilter, setLabCategoryFilter] = useState<string | null>(null);

  const { 
    isLoading, 
    isOnline, 
    disciplines, 
    summaries, 
    questions, 
    osceStations, 
    labSimulations 
  } = useData();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentView]);

  const handleSelectPeriod = (periodId: string) => {
    setSelectedPeriodId(periodId);
    setSelectedUnit(null); // Reseta unidade ao trocar período
    const periodDiscs = disciplines.filter(d => d.periodId === periodId);
    if (periodDiscs.length === 1) {
      setSelectedDisciplineId(periodDiscs[0].id);
      setCurrentView('discipline');
      setViewHistory(['period-selection', 'discipline']);
    } else {
      setCurrentView('home');
      setViewHistory(['period-selection', 'home']);
    }
  };

  const handleNavigate = (view: ViewState | 'ai-test' | string, unit?: AcademicUnit) => {
    let targetView = view as ViewState | 'ai-test';

    // Se uma unidade for passada (via DisciplineView), ela é salva no estado global
    if (unit) {
      setSelectedUnit(unit);
    }

    if (typeof view === 'string' && view.startsWith('lab-list-')) {
      const category = view.replace('lab-list-', '');
      setLabCategoryFilter(category);
      targetView = 'lab-list';
    } else if (view === 'lab-list') {
      setLabCategoryFilter(null);
    }

    if (targetView === currentView) return; 
    
    if (targetView === 'period-selection') {
      setSelectedDisciplineId(null);
      setSelectedPeriodId(null);
      setSelectedUnit(null);
      setViewHistory(['period-selection']);
    } else if (targetView === 'home') {
      setSelectedDisciplineId(null);
      setSelectedUnit(null);
      setViewHistory(prev => [...prev, 'home']);
    } else {
      setViewHistory(prev => [...prev, targetView]);
    }
    setCurrentView(targetView);
  };

  const handleBack = () => {
    setViewHistory(prev => {
      if (prev.length <= 1) return prev; 
      const newHistory = [...prev];
      newHistory.pop(); 
      const prevView = newHistory[newHistory.length - 1]; 
      
      setCurrentView(prevView);
      if (prevView === 'home') {
        setSelectedDisciplineId(null);
        setSelectedUnit(null);
      }
      if (prevView === 'discipline') {
        // Se voltar para a disciplina, mantemos a unidade pois ela é controlada lá
      }
      if (prevView === 'period-selection') {
        setSelectedDisciplineId(null);
        setSelectedPeriodId(null);
        setSelectedUnit(null);
        window.history.replaceState({}, '', window.location.pathname);
      }
      if (prevView !== 'lab-list') {
        setLabCategoryFilter(null);
      }
      
      return newHistory;
    });
  };

  const handleSelectDiscipline = (id: string) => {
    setSelectedDisciplineId(id);
    setSelectedUnit(null); // Reseta ao selecionar nova disciplina
    handleNavigate('discipline');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#f4f7f6] p-4">
        <div className="w-10 h-10 border-4 border-[#003366]/10 border-t-[#D4A017] rounded-full animate-spin mb-4"></div>
        <h1 className="text-[#003366] font-black uppercase tracking-[0.2em] text-[10px]">Luna Analytics Engine Sincronizando...</h1>
      </div>
    );
  }

  const currentPeriod = PERIODS.find(r => r.id === selectedPeriodId);
  const currentDiscipline = disciplines.find(s => s.id === selectedDisciplineId);
  const periodDisciplines = disciplines.filter(d => d.periodId === selectedPeriodId);

  return (
    <div className="min-h-screen flex flex-col bg-[#f4f7f6]">
      <div className="print:hidden">
        <Header 
          onNavigate={handleNavigate as any} 
          onBack={handleBack}
          canGoBack={viewHistory.length > 1}
          hasPeriodSelected={!!selectedPeriodId}
        />
      </div>

      <div className={`print:hidden py-1 px-4 flex justify-center items-center gap-2 border-b transition-all duration-700 ${isOnline ? 'bg-green-50' : 'bg-red-50'}`}>
        <div className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-green-500' : 'bg-red-500 animate-pulse'}`}></div>
        <span className={`text-[8px] font-black uppercase tracking-widest ${isOnline ? 'text-green-700' : 'text-red-700'}`}>
          {isOnline ? 'Conexão Segura • Captura de Dados Científicos Ativa' : 'Modo Offline • Sincronização Pendente'}
        </span>
      </div>

      <main className="flex-grow w-full max-w-7xl mx-auto flex flex-col relative">
        {currentView === 'ai-test' && <AITestView />}

        {currentView === 'survey' && (
          <SurveyView 
            onBack={handleBack} 
            onSaveResult={(data: any) => {
              if (db) push(ref(db, 'surveys'), data);
            }} 
          />
        )}
        
        {currentView === 'survey-report' && <SurveyReportView onBack={handleBack} />}

        {currentView === 'medical-events' && <MedicalEventsView onBack={handleBack} />}

        {currentView === 'period-selection' && <PeriodSelectionView periods={PERIODS} onSelectPeriod={handleSelectPeriod} />}
        {currentView === 'home' && currentPeriod && <HomeView period={currentPeriod} disciplines={periodDisciplines} onSelectDiscipline={handleSelectDiscipline} />}
        
        {currentView === 'career-quiz' && <CareerQuiz onBack={handleBack} />}
        {currentView === 'discipline' && selectedDisciplineId && (
          <DisciplineView 
            disciplineId={selectedDisciplineId} 
            disciplines={disciplines}
            summaries={summaries}
            onBack={handleBack} 
            // Agora recebe a unidade da DisciplineView
            onSelectOption={(type, unit) => handleNavigate(type, unit)}
          />
        )}
        
        {currentView === 'references-view' && currentDiscipline && <ReferencesView discipline={currentDiscipline} onBack={handleBack} />}
        {currentView === 'share-material' && currentDiscipline && (
          <ShareMaterialView 
            discipline={currentDiscipline} 
            onShare={(s) => {
              // Ao compartilhar, injetamos a unidade atual no objeto
              const materialWithUnit = { ...s, unit: selectedUnit || 'N1' };
              if (db) push(ref(db, 'summaries'), materialWithUnit);
            }} 
            onBack={handleBack} 
          />
        )}
        
        {currentView === 'quiz-setup' && selectedDisciplineId && (
          <QuizSetupView 
            discipline={disciplines.find(s => s.id === selectedDisciplineId)!}
            // Filtra questões pela unidade selecionada (ou N1 se for legado)
            availableQuestions={questions.filter(q => {
              if (currentDiscipline?.category === 'UC') return true;
              const qUnit = q.unit || 'N1';
              return qUnit === selectedUnit;
            })}
            onBack={handleBack}
            onStart={(filtered) => { setQuizFilteredQuestions(filtered); handleNavigate('quiz'); }}
          />
        )}
        
        {currentView === 'quiz' && (
          <QuizView 
            questions={quizFilteredQuestions} 
            discipline={currentDiscipline!} 
            onBack={handleBack} 
            onSaveResult={(score, total, quizTitle, type, timeSpent, details) => {
              if (db) {
                push(ref(db, 'quizResults'), { 
                  score, total, date: new Date().toLocaleString(), 
                  discipline: currentDiscipline?.id || 'Geral',
                  unit: selectedUnit || 'N1', // Salva a unidade no resultado
                  quizTitle: quizTitle || 'Misto',
                  type: type || 'teorico',
                  timeSpent: timeSpent || 0,
                  details: details || []
                });
              }
            }} 
          />
        )}
        
        {currentView === 'summaries-list' && selectedDisciplineId && (
          <SummariesListView 
            disciplineId={selectedDisciplineId} 
            disciplines={disciplines} 
            // Injetamos a unidade para filtro interno na lista
            selectedUnit={selectedUnit || 'N1'} 
            onBack={handleBack}
            onShareClick={() => handleNavigate('share-material')} 
          />
        )}

        {currentView === 'osce-mode-selection' && (
          <OsceModeSelectionView 
            onBack={handleBack}
            onSelectMode={(mode) => {
              if (mode === 'static') {
                setOsceFilterMode('static');
                handleNavigate('osce-setup');
              } else if (mode === 'ai') {
                handleNavigate('osce-ai-setup');
              } else if (mode === 'rpg') {
                setOsceFilterMode('rpg');
                handleNavigate('osce-setup');
              }
            }}
          />
        )}
        
        {currentView === 'osce-setup' && selectedDisciplineId && (
          <OsceSetupView 
            discipline={disciplines.find(s => s.id === selectedDisciplineId)!}
            availableStations={osceStations.filter(s => {
              const isCorrectDisc = s.disciplineId === selectedDisciplineId;
              const sUnit = s.unit || 'N1';
              const isCorrectUnit = currentDiscipline?.category === 'UC' ? true : sUnit === selectedUnit;
              
              if (!isCorrectDisc || !isCorrectUnit) return false;
              if (osceFilterMode === 'static') return s.mode === 'clinical'; 
              if (osceFilterMode === 'rpg') return s.mode === 'rpg';
              return true;
            })}
            onBack={handleBack}
            onStart={(station) => { 
              setCurrentOsceStation(station); 
              handleNavigate('osce-quiz'); 
            }}
            setupMode={osceFilterMode}
          />
        )}
        
        {currentView === 'osce-quiz' && currentOsceStation && (
          currentOsceStation.mode === 'rpg' ? (
            <DynamicOsceView 
              station={currentOsceStation} 
              onBack={handleBack} 
              onSaveResult={(score, total, timeSpent, analytics) => {
                if (db) {
                  push(ref(db, 'quizResults'), {
                    score, total, timeSpent,
                    date: new Date().toLocaleString(),
                    discipline: currentOsceStation.disciplineId,
                    unit: selectedUnit || 'N1',
                    quizTitle: currentOsceStation.title,
                    type: 'osce-rpg'
                  });
                  push(ref(db, 'osceAnalytics'), {
                    ...analytics,
                    unit: selectedUnit || 'N1',
                    date: new Date().toLocaleString(),
                    studentId: "anon_student"
                  });
                }
              }}
            />
          ) : (
            <OsceView 
              station={currentOsceStation} 
              onBack={handleBack} 
              onSaveResult={(score, total, timeSpent, analytics) => {
                if (db) {
                  push(ref(db, 'quizResults'), {
                    score, total, timeSpent,
                    date: new Date().toLocaleString(),
                    discipline: currentOsceStation.disciplineId,
                    unit: selectedUnit || 'N1',
                    quizTitle: currentOsceStation.title,
                    type: 'osce-estatico'
                  });
                  push(ref(db, 'osceAnalytics'), {
                    ...analytics,
                    unit: selectedUnit || 'N1',
                    date: new Date().toLocaleString()
                  });
                }
              }}
            />
          )
        )}

        {currentView === 'osce-ai-setup' && selectedDisciplineId && (
          <OsceSetupView 
            discipline={disciplines.find(s => s.id === selectedDisciplineId)!}
            availableStations={osceStations.filter(s => {
               const sUnit = s.unit || 'N1';
               const isCorrectUnit = currentDiscipline?.category === 'UC' ? true : sUnit === selectedUnit;
               return s.disciplineId === selectedDisciplineId && s.mode === 'ai' && isCorrectUnit;
            })} 
            onBack={handleBack}
            onStart={(station) => { setCurrentOsceAIStation(station); handleNavigate('osce-ai-quiz'); }}
            setupMode="ai"
          />
        )}
        {currentView === 'osce-ai-quiz' && currentOsceAIStation && <OsceAIView station={currentOsceAIStation} onBack={handleBack} />}

        {currentView === 'calculators' && <CalculatorsView onBack={handleBack} />}
        
        {currentView === 'lab-list' && selectedDisciplineId && (
          <LabListView 
            disciplineId={selectedDisciplineId} 
            disciplines={disciplines} 
            // Filtro de unidade para laboratórios
            simulations={labSimulations.filter(ls => {
              if (currentDiscipline?.category === 'UC') return true;
              const lsUnit = ls.unit || 'N1';
              return lsUnit === selectedUnit;
            })} 
            categoryFilter={labCategoryFilter}
            onStart={(sim) => { setCurrentLabSimulation(sim); handleNavigate('lab-quiz'); }} 
          />
        )}
        
        {currentView === 'lab-quiz' && currentLabSimulation && (
          <LabQuizView 
            simulation={currentLabSimulation} 
            onBack={handleBack} 
            onSaveResult={(score, total, timeSpent, details) => {
              if (db) {
                push(ref(db, 'quizResults'), {
                  score, total, date: new Date().toLocaleString(),
                  discipline: currentLabSimulation.disciplineId,
                  unit: selectedUnit || 'N1',
                  quizTitle: currentLabSimulation.title,
                  type: 'laboratorio',
                  timeSpent: timeSpent || 0,
                  details: details || []
                });
              }
            }}
          />
        )}

        {currentView === 'admin' && <AdminView onBack={handleBack} />}
      </main>

      <footer className="print:hidden bg-white border-t py-4 flex flex-col items-center gap-1 mt-auto text-center px-4">
        <div className="text-gray-400 text-[9px] font-black uppercase tracking-widest">© 2026 Luna MedClass</div>
        <div className="text-gray-500 text-[8px] font-medium uppercase max-w-md">
          Simuladores de Alto Rendimento para Medicina.
        </div>
        <div className="text-[#D4A017] text-[9px] font-black uppercase tracking-[0.1em]">Desenvolvido por Fabrício Luna</div>
        
        <div 
          onClick={() => handleNavigate('ai-test')}
          className="text-[7px] text-gray-300 font-black uppercase tracking-tighter cursor-pointer hover:text-blue-500 transition-colors mt-1"
        >
          Build {APP_VERSION}
        </div>
      </footer>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <DataProvider>
        <AppContent />
      </DataProvider>
    </ErrorBoundary>
  );
};

export default App;