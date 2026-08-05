import { useState, lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useParams, useNavigate } from 'react-router-dom';
import AppLayout from '../components/layout/AppLayout';
import ProtectedRoute from '../features/auth/ProtectedRoute';

// ============================================================================
// CODE SPLITTING (LAZY LOADING) - PADRÃO BIG TECH
// ============================================================================
const PeriodSelectionView = lazy(() => import('../views/PeriodSelectionView'));
const HomeView = lazy(() => import('../views/HomeView'));
const DisciplineView = lazy(() => import('../views/DisciplineView'));
const QuizSetupView = lazy(() => import('../views/QuizSetupView'));
const QuizView = lazy(() => import('../views/QuizView'));
const AdminView = lazy(() => import('../views/AdminView'));
const SummariesListView = lazy(() => import('../views/SummariesListView'));
const OsceView = lazy(() => import('../views/OsceView'));
const DynamicOsceView = lazy(() => import('../views/DynamicOsceView'));
const OsceSetupView = lazy(() => import('../views/OsceSetupView'));
const OsceAIView = lazy(() => import('../views/OsceAIView'));
const OsceModeSelectionView = lazy(() => import('../views/OsceModeSelectionView'));
const CalculatorsView = lazy(() => import('../views/CalculatorsView'));
const CareerQuiz = lazy(() => import('../components/CareerQuiz'));
const ReferencesView = lazy(() => import('../views/ReferencesView'));
const LabListView = lazy(() => import('../views/LabListView'));
const LabQuizView = lazy(() => import('../views/LabQuizView'));
const SimulatorsView = lazy(() => import('../views/SimulatorsView'));
const SurveyView = lazy(() => import('../views/SurveyView'));
const SurveyReportView = lazy(() => import('../views/SurveyReportView'));
const MedicalEventsView = lazy(() => import('../views/MedicalEventsView'));
const StudentDashboardView = lazy(() => import('../views/StudentDashboardView'));

import { Question, OsceStation, LabSimulation, AcademicUnit } from '../types';
import { PERIODS } from '../data/periods';
import { saveQuizResult, saveOsceAnalytics } from '../services/resultsService';
import { submitSurvey } from '../services/surveyService';
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

const QuizFlow = () => {
  const { disciplineId } = useParams();
  const unit = useAcademicUnit();
  const navigate = useNavigate();
  const { disciplines } = useData();
  const { currentUser } = useAuth();
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
        // ASSINATURA DO ALUNO INJETADA NO PAYLOAD
        if (currentUser) saveQuizResult({ userId: currentUser.uid, userEmail: currentUser.email, score, total, date: new Date().toLocaleString(), discipline: discipline.id, unit, quizTitle: title || 'Misto', type: type || 'teorico', timeSpent: time || 0, details: details || [] });
      }}
    />
  );
};

const OsceFlow = () => {
  const { disciplineId } = useParams();
  const unit = useAcademicUnit();
  const navigate = useNavigate();
  const { disciplines } = useData();
  const { currentUser } = useAuth();
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
           if (currentUser) {
              saveQuizResult({ userId: currentUser.uid, userEmail: currentUser.email, score, total, timeSpent: time, date: new Date().toLocaleString(), discipline: station.disciplineId, unit, quizTitle: station.title, type: 'osce-rpg' });
              saveOsceAnalytics({ ...analytics, unit, date: new Date().toLocaleString(), studentId: currentUser.uid });
           }
       }} />;
     }
     return <OsceView station={station} onBack={() => setStep('setup')} onSaveResult={(score, total, time, analytics) => {
         if (currentUser) {
            saveQuizResult({ userId: currentUser.uid, userEmail: currentUser.email, score, total, timeSpent: time, date: new Date().toLocaleString(), discipline: station.disciplineId, unit, quizTitle: station.title, type: 'osce-estatico' });
            saveOsceAnalytics({ ...analytics, unit, date: new Date().toLocaleString() });
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
  const { disciplines } = useData();
  const { currentUser } = useAuth();
  const discipline = disciplines.find(d => d.id === disciplineId);

  const [step, setStep] = useState<'list' | 'quiz'>('list');
  const [sim, setSim] = useState<LabSimulation | null>(null);

  if (!discipline) return <Navigate to="/" replace />;

  if (step === 'list') {
     return <LabListView disciplineId={discipline.id} disciplines={disciplines} selectedUnit={unit} categoryFilter={cat} onStart={(s) => { setSim(s); setStep('quiz'); }} />;
  }
  if (step === 'quiz' && sim) {
     return <LabQuizView simulation={sim} onBack={() => setStep('list')} onSaveResult={(score, total, time, details) => {
         if (currentUser) saveQuizResult({ userId: currentUser.uid, userEmail: currentUser.email, score, total, date: new Date().toLocaleString(), discipline: sim.disciplineId, unit, quizTitle: sim.title, type: 'laboratorio', timeSpent: time || 0, details: details || [] });
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
            <Route path="/disciplina/:disciplineId/osce" element={<ProtectedRoute><OsceFlow /></ProtectedRoute>} />
            <Route path="/disciplina/:disciplineId/lab" element={<ProtectedRoute><LabFlow /></ProtectedRoute>} />
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
