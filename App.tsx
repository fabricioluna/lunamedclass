import React, { useState, useEffect } from 'react';
import Header from './components/Header.tsx';
import HomeView from './views/HomeView.tsx';
import DisciplineView from './views/DisciplineView.tsx';
import QuizSetupView from './views/QuizSetupView.tsx';
import QuizView from './views/QuizView.tsx';
import AdminView from './views/AdminView.tsx';
import SummariesListView from './views/SummariesListView.tsx';
import OsceView from './views/OsceView.tsx';
import OsceSetupView from './views/OsceSetupView.tsx';
import OsceAIView from './views/OsceAIView.tsx';
import CalculatorsView from './views/CalculatorsView.tsx';
import CareerQuiz from './components/CareerQuiz.tsx';
import ReferencesView from './views/ReferencesView.tsx';
import ShareMaterialView from './views/ShareMaterialView.tsx';
import { ViewState, Summary, Question, SimulationInfo, OsceStation, QuizResult, ReferenceMaterial } from './types.ts';
import { INITIAL_QUESTIONS, SIMULATIONS } from './constants.tsx';
import { db, ref, onValue, push, remove, set } from './firebase.ts';

const APP_VERSION = "5.4.0 - Global Back Navigation";

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<ViewState>('home');
  // NOVO: Histórico de navegação inteligente!
  const [viewHistory, setViewHistory] = useState<ViewState[]>(['home']);
  
  const [selectedDisciplineId, setSelectedDisciplineId] = useState<string | null>(null);
  const [quizFilteredQuestions, setQuizFilteredQuestions] = useState<Question[]>([]);
  
  const [currentOsceStation, setCurrentOsceStation] = useState<OsceStation | null>(null);
  const [currentOsceAIStation, setCurrentOsceAIStation] = useState<OsceStation | null>(null);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(false);

  const [disciplines, setDisciplines] = useState<SimulationInfo[]>(SIMULATIONS);
  const [summaries, setSummaries] = useState<Summary[]>([]);
  const [questions, setQuestions] = useState<Question[]>(INITIAL_QUESTIONS);
  const [osceStations, setOsceStations] = useState<OsceStation[]>([]);
  const [quizResults, setQuizResults] = useState<QuizResult[]>([]);

  // Rolar para o topo ao mudar de tela
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentView]);

  useEffect(() => {
    if (!db) {
      setIsLoading(false);
      return;
    }

    onValue(ref(db, ".info/connected"), (snap) => {
      setIsOnline(snap.val() === true);
    });

    onValue(ref(db, 'discipline_config'), (snap) => {
      const config = snap.val();
      if (config) {
        setDisciplines(prev => prev.map(disc => {
          const dConf = config[disc.id];
          if (dConf) {
            return {
              ...disc,
              themes: Array.isArray(dConf.themes) ? dConf.themes : disc.themes,
              references: Array.isArray(dConf.references) ? dConf.references : disc.references
            };
          }
          return disc;
        }));
      }
    });

    const collections = [
      { path: 'questions', setter: (data: any) => setQuestions([...INITIAL_QUESTIONS, ...Object.keys(data).filter(k => data[k]).map(k => ({ ...data[k], firebaseId: k }))]) },
      { path: 'summaries', setter: (data: any) => setSummaries(Object.keys(data).filter(k => data[k]).map(k => ({ ...data[k], firebaseId: k }))) },
      { path: 'osce', setter: (data: any) => setOsceStations(Object.keys(data).filter(k => data[k]).map(k => ({ ...data[k], firebaseId: k }))) },
      { path: 'quizResults', setter: (data: any) => setQuizResults(Object.keys(data).filter(k => data[k]).map(k => ({ ...data[k], id: k }))) }
    ];

    collections.forEach(col => {
      onValue(ref(db, col.path), (snap) => {
        const val = snap.val();
        if (val) {
          col.setter(val);
        } else {
          if (col.path === 'questions') setQuestions(INITIAL_QUESTIONS);
          if (col.path === 'summaries') setSummaries([]);
          if (col.path === 'osce') setOsceStations([]);
          if (col.path === 'quizResults') setQuizResults([]);
        }
      });
    });

    setTimeout(() => setIsLoading(false), 2000);
  }, []);

  // --- FUNÇÕES DE NAVEGAÇÃO INTELIGENTE ---
  const handleNavigate = (view: ViewState) => {
    if (view === currentView) return; 
    
    if (view === 'home') {
      setSelectedDisciplineId(null);
      setViewHistory(['home']); // Reseta o histórico se for para o início
    } else {
      setViewHistory(prev => [...prev, view]); // Adiciona a nova página na pilha
    }
    setCurrentView(view);
  };

  const handleBack = () => {
    setViewHistory(prev => {
      if (prev.length <= 1) return prev; // Se já está na home, não faz nada
      
      const newHistory = [...prev];
      newHistory.pop(); // Remove a tela atual
      const prevView = newHistory[newHistory.length - 1]; // Pega a anterior
      
      setCurrentView(prevView);
      if (prevView === 'home') {
        setSelectedDisciplineId(null);
      }
      return newHistory;
    });
  };

  // --- FUNÇÕES DE ADMINISTRAÇÃO ---
  const handleAddTheme = (disciplineId: string, themeName: string) => {
    const disc = disciplines.find(d => d.id === disciplineId);
    if (!disc) return;
    const newThemes = Array.from(new Set([...disc.themes, themeName]));
    if (db) set(ref(db, `discipline_config/${disciplineId}/themes`), newThemes);
  };

  const handleRemoveTheme = (disciplineId: string, themeName: string) => {
    const disc = disciplines.find(d => d.id === disciplineId);
    if (!disc) return;
    const newThemes = disc.themes.filter(t => t !== themeName);
    if (db) set(ref(db, `discipline_config/${disciplineId}/themes`), newThemes);
  };

  const handleUpdateReferences = (disciplineId: string, refsList: ReferenceMaterial[]) => {
    if (db) set(ref(db, `discipline_config/${disciplineId}/references`), refsList);
  };

  const handleSelectDiscipline = (id: string) => {
    setSelectedDisciplineId(id);
    handleNavigate('discipline');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#f4f7f6] p-6">
        <div className="w-12 h-12 border-4 border-[#003366]/10 border-t-[#D4A017] rounded-full animate-spin mb-6"></div>
        <h1 className="text-[#003366] font-black uppercase tracking-[0.3em] text-xs">Sincronizando Dados...</h1>
      </div>
    );
  }

  const currentDiscipline = disciplines.find(s => s.id === selectedDisciplineId);

  return (
    <div className="min-h-screen flex flex-col bg-[#f4f7f6]">
      <Header 
        onNavigate={handleNavigate} 
        onBack={handleBack}
        canGoBack={viewHistory.length > 1}
      />

      <div className={`py-1 px-4 flex justify-center items-center gap-2 border-b transition-all duration-700 ${isOnline ? 'bg-green-50' : 'bg-red-50'}`}>
        <div className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-green-500' : 'bg-red-500 animate-pulse'}`}></div>
        <span className={`text-[8px] font-black uppercase tracking-widest ${isOnline ? 'text-green-700' : 'text-red-700'}`}>
          {isOnline ? 'Conexão em Nuvem Ativa' : 'Trabalhando Offline'}
        </span>
      </div>

      <div className="flex-grow">
        {currentView === 'home' && <HomeView disciplines={disciplines} onSelectDiscipline={handleSelectDiscipline} />}
        {currentView === 'career-quiz' && <CareerQuiz onBack={handleBack} />}
        
        {currentView === 'discipline' && selectedDisciplineId && (
          <DisciplineView 
            disciplineId={selectedDisciplineId} 
            disciplines={disciplines}
            summaries={summaries}
            onBack={handleBack} 
            onSelectOption={(type) => handleNavigate(type as ViewState)}
          />
        )}
        
        {currentView === 'references-view' && currentDiscipline && <ReferencesView discipline={currentDiscipline} onBack={handleBack} />}
        {currentView === 'share-material' && currentDiscipline && <ShareMaterialView discipline={currentDiscipline} onShare={(s) => db && push(ref(db, 'summaries'), s)} onBack={handleBack} />}
        
        {currentView === 'quiz-setup' && selectedDisciplineId && (
          <QuizSetupView 
            discipline={disciplines.find(s => s.id === selectedDisciplineId)!}
            availableQuestions={questions}
            onBack={handleBack}
            onStart={(filtered) => { setQuizFilteredQuestions(filtered); handleNavigate('quiz'); }}
          />
        )}
        {currentView === 'quiz' && <QuizView questions={quizFilteredQuestions} discipline={currentDiscipline!} onBack={handleBack} onSaveResult={(score, total) => db && push(ref(db, 'quizResults'), { score, total, date: new Date().toLocaleString(), discipline: currentDiscipline?.title })} />}
        
        {currentView === 'summaries-list' && selectedDisciplineId && (
          <SummariesListView 
            disciplineId={selectedDisciplineId} 
            disciplines={disciplines} 
            summaries={summaries} 
            onBack={handleBack}
            onShareClick={() => handleNavigate('share-material')} 
          />
        )}
        
        {currentView === 'osce-setup' && selectedDisciplineId && (
          <OsceSetupView 
            discipline={disciplines.find(s => s.id === selectedDisciplineId)!}
            availableStations={osceStations.filter(s => s.disciplineId === selectedDisciplineId)}
            onBack={handleBack}
            onStart={(station) => { setCurrentOsceStation(station); handleNavigate('osce-quiz'); }}
          />
        )}
        {currentView === 'osce-quiz' && currentOsceStation && <OsceView station={currentOsceStation} onBack={handleBack} />}

        {currentView === 'osce-ai-setup' && selectedDisciplineId && (
          <OsceSetupView 
            discipline={disciplines.find(s => s.id === selectedDisciplineId)!}
            availableStations={osceStations.filter(s => s.disciplineId === selectedDisciplineId)}
            onBack={handleBack}
            onStart={(station) => { setCurrentOsceAIStation(station); handleNavigate('osce-ai-quiz'); }}
            isAIMode={true}
          />
        )}
        {currentView === 'osce-ai-quiz' && currentOsceAIStation && <OsceAIView station={currentOsceAIStation} onBack={handleBack} />}

        {currentView === 'calculators' && <CalculatorsView onBack={handleBack} />}
        
        {currentView === 'admin' && (
          <AdminView 
            questions={questions}
            osceStations={osceStations}
            disciplines={disciplines}
            summaries={summaries}
            quizResults={quizResults}
            onAddSummary={(s) => db && push(ref(db, 'summaries'), s)}
            onRemoveSummary={(id) => { const s = summaries.find(item => item.id === id); if (db && s?.firebaseId) remove(ref(db, `summaries/${s.firebaseId}`)); }}
            onAddQuestions={(qs) => db && qs.forEach(q => push(ref(db, 'questions'), q))}
            onUpdateQuestion={() => {}}
            onAddOsceStations={(os) => db && os.forEach(o => push(ref(db, 'osce'), o))}
            onRemoveQuestion={(id) => { const q = questions.find(item => item.id === id); if (db && q?.firebaseId) remove(ref(db, `questions/${q.firebaseId}`)); }}
            onRemoveOsceStation={(id) => { const o = osceStations.find(item => item.id === id); if (db && o?.firebaseId) remove(ref(db, `osce/${o.firebaseId}`)); }}
            onClearDatabase={() => {
              if (db) {
                remove(ref(db, 'questions'));
                remove(ref(db, 'summaries'));
                remove(ref(db, 'osce'));
                remove(ref(db, 'discipline_config'));
              }
            }}
            onClearResults={() => db && remove(ref(db, 'quizResults'))}
            onClearQuestions={(discId) => {
              if (db) {
                if (discId) {
                  questions.filter(q => q.disciplineId === discId).forEach(q => q.firebaseId && remove(ref(db, `questions/${q.firebaseId}`)));
                } else {
                  remove(ref(db, 'questions'));
                }
              }
            }}
            onClearOsce={(discId) => {
              if (db) {
                if (discId) {
                  osceStations.filter(o => o.disciplineId === discId).forEach(o => o.firebaseId && remove(ref(db, `osce/${o.firebaseId}`)));
                } else {
                  remove(ref(db, 'osce'));
                }
              }
            }}
            onClearMaterials={(discId) => {
              if (db) {
                if (discId) {
                  summaries.filter(s => s.disciplineId === discId).forEach(s => s.firebaseId && remove(ref(db, `summaries/${s.firebaseId}`)));
                } else {
                  remove(ref(db, 'summaries'));
                }
              }
            }}
            onAddTheme={handleAddTheme}
            onRemoveTheme={handleRemoveTheme}
            onUpdateReferences={handleUpdateReferences}
            onBack={handleBack}
          />
        )}
      </div>

      <footer className="bg-white border-t py-8 flex flex-col items-center gap-2">
        <div className="text-gray-400 text-[10px] font-bold uppercase tracking-widest">© 2026 Medicina do Sertão</div>
        <div className="text-[#D4A017] text-[11px] font-black uppercase tracking-[0.2em] mb-1">Desenvolvido por Fabrício Luna</div>
        <div className="text-[8px] text-gray-300 font-black uppercase tracking-tighter">Build {APP_VERSION}</div>
      </footer>
    </div>
  );
};

export default App;