import { useState, useEffect, lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useParams, useNavigate } from 'react-router-dom';
import AppLayout from '../components/layout/AppLayout';
import ProtectedRoute from '../features/auth/ProtectedRoute';

// ============================================================================
// CODE SPLITTING (LAZY LOADING) - PADRÃO BIG TECH
// ============================================================================
const PeriodSelectionView = lazy(() => import('../views/PeriodSelectionView'));
const HomeView = lazy(() => import('../views/HomeView'));
const DisciplineView = lazy(() => import('../views/DisciplineView'));
const QuizSetupView = lazy(() => import('../features/quiz/QuizSetupView'));
const QuizView = lazy(() => import('../features/quiz/QuizView'));
const AdminView = lazy(() => import('../features/admin/AdminView'));
const SummariesListView = lazy(() => import('../features/materials/SummariesListView'));
const OsceView = lazy(() => import('../features/osce/OsceView'));
const DynamicOsceView = lazy(() => import('../features/osce/DynamicOsceView'));
const OsceSetupView = lazy(() => import('../features/osce/OsceSetupView'));
const OsceAIView = lazy(() => import('../features/osce/OsceAIView'));
const OsceModeSelectionView = lazy(() => import('../features/osce/OsceModeSelectionView'));
const CalculatorsView = lazy(() => import('../views/CalculatorsView'));
const CareerQuiz = lazy(() => import('../components/CareerQuiz'));
const ReferencesView = lazy(() => import('../views/ReferencesView'));
const LabListView = lazy(() => import('../features/lab/LabListView'));
const LabQuizView = lazy(() => import('../features/lab/LabQuizView'));
const SimulatorsView = lazy(() => import('../views/SimulatorsView'));
const SurveyView = lazy(() => import('../views/SurveyView'));
const SurveyReportView = lazy(() => import('../views/SurveyReportView'));
const MedicalEventsView = lazy(() => import('../views/MedicalEventsView'));
const StudentDashboardView = lazy(() => import('../views/StudentDashboardView'));

import { Question, OsceStation, LabSimulation, AcademicUnit } from '../types';
import { PERIODS } from '../data/periods';
import { saveQuizResult, saveOsceAnalytics } from '../services/resultsService';
import { submitSurvey } from '../services/surveyService';
import { fetchOsceStationById } from '../services/osceService';
import { fetchLabSimulationById } from '../services/labService';
import { isCountedResultType } from '../utils/resultsPolicy';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';

// ============================================================================
// HELPER PARA EXTRAIR A UNIDADE DA URL (?unit=N1)
// ============================================================================
const useAcademicUnit = (): AcademicUnit => {
  const { search } = useLocation();
  const params = new URLSearchParams(search);
  return (params.get('unit') as AcademicUnit) || 'N1';
};

const isValidOsceSetupMode = (mode?: string): mode is 'static' | 'ai' | 'rpg' =>
  mode === 'static' || mode === 'ai' || mode === 'rpg';

// ============================================================================
// LOADER INLINE REUTILIZÁVEL (fetch por ID nas rotas de execução OSCE/Lab)
// ============================================================================
const InlineSpinner = ({ label }: { label: string }) => (
  <div className="flex-grow flex flex-col items-center justify-center p-6 bg-[#f4f7f6]">
    <div className="w-12 h-12 border-4 border-[#003366]/10 border-t-[#D4A017] rounded-full animate-spin mb-4"></div>
    <h3 className="text-[#003366] font-black uppercase tracking-widest text-xs">{label}</h3>
  </div>
);

// ============================================================================
// FLUXOS DE ROTEAMENTO (MOTOR DE PROGRESSÃO CURRICULAR E ISOLAMENTO ESTrito)
// ============================================================================

const PeriodFlow = () => {
  const navigate = useNavigate();
  const { periods } = useData();
  const { userProfile, isLoadingAuth } = useAuth();

  if (isLoadingAuth || !userProfile) return null;

  if (userProfile.role === 'student' && userProfile.periodId) {
    return <Navigate to={`/periodo/${userProfile.periodId}`} replace />;
  }

  const handleSelectPeriod = (periodId: string) => {
    navigate(`/periodo/${periodId}`);
  };

  return <PeriodSelectionView periods={periods} onSelectPeriod={handleSelectPeriod} />;
};

const HomeFlow = () => {
  const { periodId } = useParams();
  const navigate = useNavigate();
  const { disciplines } = useData();
  const { userProfile } = useAuth();

  const period = PERIODS.find(p => p.id === periodId);
  if (!period) return <Navigate to="/" replace />;

  if (userProfile?.role === 'student' && userProfile.periodId && userProfile.periodId !== periodId) {
    return <Navigate to={`/periodo/${userProfile.periodId}`} replace />;
  }

  const periodDiscs = disciplines.filter(d => d.periodId === periodId);
  return <HomeView period={period} disciplines={periodDiscs} onSelectDiscipline={(id) => navigate(`/disciplina/${id}`)} />;
};

const DisciplineFlow = () => {
  const { disciplineId } = useParams();
  const navigate = useNavigate();
  const { disciplines } = useData();
  const { userProfile } = useAuth();

  const discipline = disciplines.find(d => d.id === disciplineId);
  if (!discipline) return <Navigate to="/" replace />;

  if (userProfile?.role === 'student' && userProfile.periodId && discipline.periodId !== userProfile.periodId) {
    return <Navigate to={`/periodo/${userProfile.periodId}`} replace />;
  }

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

  return <DisciplineView disciplineId={disciplineId!} disciplines={disciplines} onSelectOption={handleSelectOption} />;
};

// --- SIMULADO: SETUP (rota inalterada) ---
const QuizFlow = () => {
  const { disciplineId } = useParams();
  const unit = useAcademicUnit();
  const navigate = useNavigate();
  const { disciplines } = useData();
  const discipline = disciplines.find(d => d.id === disciplineId);

  if (!discipline) return <Navigate to="/" replace />;

  return (
    <QuizSetupView
      discipline={discipline}
      selectedUnit={unit}
      onBack={() => navigate(-1)}
      onStart={() => navigate(`/disciplina/${disciplineId}/simulado/executar${unit ? `?unit=${unit}` : ''}`)}
    />
  );
};

// --- SIMULADO: EXECUÇÃO (rota nova) ---
// QuizSetupView já grava as questões escolhidas no localStorage antes de chamar onStart
// (todo caminho: início normal ou "continuar simulado salvo") — só precisamos ler de volta.
const QuizExecFlow = () => {
  const { disciplineId } = useParams();
  const unit = useAcademicUnit();
  const navigate = useNavigate();
  const { disciplines } = useData();
  const { currentUser } = useAuth();
  const discipline = disciplines.find(d => d.id === disciplineId);

  const questionsKey = `quiz_questions_${disciplineId}_${unit}`;
  const [questions] = useState<Question[] | null>(() => {
    const raw = localStorage.getItem(questionsKey);
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) && parsed.length > 0 ? parsed : null;
    } catch {
      return null;
    }
  });

  if (!discipline) return <Navigate to="/" replace />;
  if (!questions) {
    return <Navigate to={`/disciplina/${disciplineId}/simulado${unit ? `?unit=${unit}` : ''}`} replace />;
  }

  return (
    <QuizView
      questions={questions}
      discipline={discipline}
      onBack={() => navigate(-1)}
      onSaveResult={(score, total, title, type, time, details) => {
        if (currentUser) saveQuizResult({ userId: currentUser.uid, userEmail: currentUser.email, score, total, date: new Date().toLocaleString(), discipline: discipline.id, unit, quizTitle: title || 'Misto', type: type || 'teorico', timeSpent: time || 0, details: details || [] });
      }}
    />
  );
};

// --- OSCE: ESCOLHA DE MODO (rota inalterada) ---
const OsceModeFlow = () => {
  const { disciplineId } = useParams();
  const unit = useAcademicUnit();
  const navigate = useNavigate();
  const { disciplines } = useData();
  const discipline = disciplines.find(d => d.id === disciplineId);

  if (!discipline) return <Navigate to="/" replace />;

  return (
    <OsceModeSelectionView
      onBack={() => navigate(-1)}
      onSelectMode={(mode) => navigate(`/disciplina/${disciplineId}/osce/configurar/${mode}${unit ? `?unit=${unit}` : ''}`)}
    />
  );
};

// --- OSCE: CONFIGURAÇÃO / ESCOLHA DE ESTAÇÃO (rota nova) ---
const OsceSetupFlow = () => {
  const { disciplineId, mode } = useParams();
  const unit = useAcademicUnit();
  const navigate = useNavigate();
  const { disciplines } = useData();
  const discipline = disciplines.find(d => d.id === disciplineId);

  if (!discipline) return <Navigate to="/" replace />;
  if (!isValidOsceSetupMode(mode)) {
    return <Navigate to={`/disciplina/${disciplineId}/osce${unit ? `?unit=${unit}` : ''}`} replace />;
  }

  return (
    <OsceSetupView
      discipline={discipline}
      selectedUnit={unit}
      setupMode={mode}
      onBack={() => navigate(-1)}
      onStart={(station) => navigate(`/disciplina/${disciplineId}/osce/estacao/${station.firebaseId}${unit ? `?unit=${unit}` : ''}`)}
    />
  );
};

// --- OSCE: EXECUÇÃO DA ESTAÇÃO (rota nova) ---
// Busca a estação por ID no Firestore (sobrevive a F5) e despacha pelo próprio station.mode —
// não depende de qual tela de setup o aluno usou pra chegar aqui.
type OsceExecState =
  | { status: 'loading' }
  | { status: 'ready'; station: OsceStation }
  | { status: 'not-found' };

const OsceExecFlow = () => {
  const { disciplineId, stationId } = useParams();
  const unit = useAcademicUnit();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [state, setState] = useState<OsceExecState>({ status: 'loading' });

  useEffect(() => {
    let cancelled = false;
    setState({ status: 'loading' });

    if (!stationId) {
      setState({ status: 'not-found' });
      return;
    }

    fetchOsceStationById(stationId)
      .then((station) => {
        if (cancelled) return;
        setState(station ? { status: 'ready', station } : { status: 'not-found' });
      })
      .catch(() => {
        if (!cancelled) setState({ status: 'not-found' });
      });

    return () => { cancelled = true; };
  }, [stationId]);

  if (state.status === 'loading') return <InlineSpinner label="Carregando estação..." />;
  if (state.status === 'not-found') {
    return <Navigate to={`/disciplina/${disciplineId}/osce${unit ? `?unit=${unit}` : ''}`} replace />;
  }

  const { station } = state;
  const onBack = () => navigate(-1);

  // Só Simulado Teórico conta resultado por enquanto — ver utils/resultsPolicy.ts.
  // Decisão "por enquanto" do usuário: reversível trocando COUNTED_RESULT_TYPES lá.
  if (station.mode === 'rpg') {
    return (
      <DynamicOsceView
        station={station}
        onBack={onBack}
        onSaveResult={isCountedResultType('osce-rpg') ? (score, total, time, analytics) => {
          if (currentUser) {
            saveQuizResult({ userId: currentUser.uid, userEmail: currentUser.email, score, total, timeSpent: time, date: new Date().toLocaleString(), discipline: station.disciplineId, unit, quizTitle: station.title, type: 'osce-rpg' });
            saveOsceAnalytics({ ...analytics, unit, date: new Date().toLocaleString(), studentId: currentUser.uid });
          }
        } : undefined}
      />
    );
  }

  if (station.mode === 'ai') {
    return <OsceAIView station={station} onBack={onBack} />;
  }

  return (
    <OsceView
      station={station}
      onBack={onBack}
      onSaveResult={isCountedResultType('osce-estatico') ? (score, total, time, analytics) => {
        if (currentUser) {
          saveQuizResult({ userId: currentUser.uid, userEmail: currentUser.email, score, total, timeSpent: time, date: new Date().toLocaleString(), discipline: station.disciplineId, unit, quizTitle: station.title, type: 'osce-estatico' });
          saveOsceAnalytics({ ...analytics, unit, date: new Date().toLocaleString() });
        }
      } : undefined}
    />
  );
};

// --- LABORATÓRIO: LISTA (rota inalterada) ---
const LabFlow = () => {
  const { disciplineId } = useParams();
  const unit = useAcademicUnit();
  const { search } = useLocation();
  const navigate = useNavigate();
  const cat = new URLSearchParams(search).get('cat');
  const { disciplines } = useData();
  const discipline = disciplines.find(d => d.id === disciplineId);

  if (!discipline) return <Navigate to="/" replace />;

  return (
    <LabListView
      disciplineId={discipline.id}
      disciplines={disciplines}
      selectedUnit={unit}
      categoryFilter={cat}
      onStart={(sim) => navigate(`/disciplina/${disciplineId}/lab/simulacao/${sim.firebaseId}${unit ? `?unit=${unit}` : ''}`)}
    />
  );
};

// --- LABORATÓRIO: EXECUÇÃO DA SIMULAÇÃO (rota nova) ---
type LabExecState =
  | { status: 'loading' }
  | { status: 'ready'; sim: LabSimulation }
  | { status: 'not-found' };

const LabExecFlow = () => {
  const { disciplineId, simId } = useParams();
  const unit = useAcademicUnit();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [state, setState] = useState<LabExecState>({ status: 'loading' });

  useEffect(() => {
    let cancelled = false;
    setState({ status: 'loading' });

    if (!simId) {
      setState({ status: 'not-found' });
      return;
    }

    fetchLabSimulationById(simId)
      .then((sim) => {
        if (cancelled) return;
        setState(sim ? { status: 'ready', sim } : { status: 'not-found' });
      })
      .catch(() => {
        if (!cancelled) setState({ status: 'not-found' });
      });

    return () => { cancelled = true; };
  }, [simId]);

  if (state.status === 'loading') return <InlineSpinner label="Carregando simulação..." />;
  if (state.status === 'not-found') {
    return <Navigate to={`/disciplina/${disciplineId}/lab${unit ? `?unit=${unit}` : ''}`} replace />;
  }

  const { sim } = state;

  return (
    <LabQuizView
      simulation={sim}
      onBack={() => navigate(-1)}
      onSaveResult={isCountedResultType('laboratorio') ? (score, total, time, details) => {
        if (currentUser) saveQuizResult({ userId: currentUser.uid, userEmail: currentUser.email, score, total, date: new Date().toLocaleString(), discipline: sim.disciplineId, unit, quizTitle: sim.title, type: 'laboratorio', timeSpent: time || 0, details: details || [] });
      } : undefined}
    />
  );
};

const MaterialsFlow = () => {
  const { disciplineId } = useParams();
  const unit = useAcademicUnit();
  const navigate = useNavigate();
  const { disciplines } = useData();
  const discipline = disciplines.find(d => d.id === disciplineId);

  if (!discipline) return <Navigate to="/" replace />;

  return <SummariesListView disciplineId={discipline.id} disciplines={disciplines} selectedUnit={unit} onBack={() => navigate(-1)} />;
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
// LOADER DE SUSPENSE REUTILIZÁVEL (UI LIMPA)
// ============================================================================
const SuspenseLoader = () => (
  <div className="flex-grow flex flex-col items-center justify-center p-6 bg-[#f4f7f6]">
    <div className="w-12 h-12 border-4 border-[#003366]/20 border-t-[#D4A017] rounded-full animate-spin mb-4"></div>
    <h2 className="text-[#003366] font-black uppercase tracking-widest text-xs">A Carregar Módulo...</h2>
  </div>
);

// ============================================================================
// APP ROUTER COM LAZY LOADING APLICADO
// ============================================================================
const AppRoutes: React.FC = () => {
  return (
    <Router>
      <AppLayout>
        <Suspense fallback={<SuspenseLoader />}>
          <Routes>
            <Route path="/" element={<ProtectedRoute><PeriodFlow /></ProtectedRoute>} />
            <Route path="/periodo/:periodId" element={<ProtectedRoute><HomeFlow /></ProtectedRoute>} />
            <Route path="/disciplina/:disciplineId" element={<ProtectedRoute><DisciplineFlow /></ProtectedRoute>} />

            <Route path="/disciplina/:disciplineId/simulado" element={<ProtectedRoute><QuizFlow /></ProtectedRoute>} />
            <Route path="/disciplina/:disciplineId/simulado/executar" element={<ProtectedRoute><QuizExecFlow /></ProtectedRoute>} />

            <Route path="/disciplina/:disciplineId/osce" element={<ProtectedRoute><OsceModeFlow /></ProtectedRoute>} />
            <Route path="/disciplina/:disciplineId/osce/configurar/:mode" element={<ProtectedRoute><OsceSetupFlow /></ProtectedRoute>} />
            <Route path="/disciplina/:disciplineId/osce/estacao/:stationId" element={<ProtectedRoute><OsceExecFlow /></ProtectedRoute>} />

            <Route path="/disciplina/:disciplineId/lab" element={<ProtectedRoute><LabFlow /></ProtectedRoute>} />
            <Route path="/disciplina/:disciplineId/lab/simulacao/:simId" element={<ProtectedRoute><LabExecFlow /></ProtectedRoute>} />

            <Route path="/disciplina/:disciplineId/materiais" element={<ProtectedRoute><MaterialsFlow /></ProtectedRoute>} />
            <Route path="/disciplina/:disciplineId/referencias" element={<ProtectedRoute><ReferencesFlow /></ProtectedRoute>} />

            <Route path="/admin" element={<ProtectedRoute><AdminView onBack={() => window.history.back()} /></ProtectedRoute>} />

            {/* ROTA DO DASHBOARD DO ALUNO */}
            <Route path="/dashboard" element={<ProtectedRoute><StudentDashboardView onBack={() => window.history.back()} /></ProtectedRoute>} />

            <Route path="/survey" element={
              <SurveyView
                onBack={() => window.location.href = '/'}
                onSaveResult={(data) => {
                  submitSurvey(data.unit, data.answers);
                }}
              />
            } />

            <Route path="/survey-report" element={
              <SurveyReportView onBack={() => window.location.href = '/'} />
            } />

            <Route path="/calculators" element={<CalculatorsView onBack={() => window.history.back()} />} />
            <Route path="/career-quiz" element={<CareerQuiz onBack={() => window.history.back()} />} />
            <Route path="/medical-events" element={<MedicalEventsView />} />
            <Route path="/simulators" element={<SimulatorsView />} />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </AppLayout>
    </Router>
  );
};

export default AppRoutes;
