import React, { useState, useEffect } from 'react';
import Header from './components/Header.tsx';
import RoomSelectionView from './views/RoomSelectionView.tsx';
import HomeView from './views/HomeView.tsx';
import DisciplineView from './views/DisciplineView.tsx';
import QuizSetupView from './views/QuizSetupView.tsx';
import QuizView from './views/QuizView.tsx';
import AdminView from './views/AdminView.tsx';
import SummariesListView from './views/SummariesListView.tsx';
import OsceView from './views/OsceView.tsx';
import DynamicOsceView from './views/DynamicOsceView.tsx'; 
import OsceSetupView from './views/OsceSetupView.tsx';
import OsceAIView from './views/OsceAIView.tsx';
import OsceModeSelectionView from './views/OsceModeSelectionView'; 
import CalculatorsView from './views/CalculatorsView.tsx';
import CareerQuiz from './components/CareerQuiz.tsx';
import ReferencesView from './views/ReferencesView.tsx';
import ShareMaterialView from './views/ShareMaterialView.tsx';
import LabListView from './views/LabListView.tsx';
import LabQuizView from './views/LabQuizView.tsx';

import { ViewState, Question, OsceStation, LabSimulation } from './types.ts';
import { ROOMS } from './constants.tsx';
import { db, ref, push } from './firebase.ts';

import { DataProvider, useData } from './contexts/DataContext.tsx';

const APP_VERSION = "7.8.0 - Luna Data Engine";

const AppContent: React.FC = () => {
  const [currentView, setCurrentView] = useState<ViewState>('room-selection');
  const [viewHistory, setViewHistory] = useState<ViewState[]>(['room-selection']);
  
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [selectedDisciplineId, setSelectedDisciplineId] = useState<string | null>(null);
  const [quizFilteredQuestions, setQuizFilteredQuestions] = useState<Question[]>([]);
  
  const [currentOsceStation, setCurrentOsceStation] = useState<OsceStation | null>(null);
  const [currentOsceAIStation, setCurrentOsceAIStation] = useState<OsceStation | null>(null);
  const [currentLabSimulation, setCurrentLabSimulation] = useState<LabSimulation | null>(null); 

  const [osceFilterMode, setOsceFilterMode] = useState<'static' | 'rpg' | 'all'>('all');

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

  const handleSelectRoom = (roomId: string) => {
    setSelectedRoomId(roomId);
    const roomDiscs = disciplines.filter(d => d.roomId === roomId);
    if (roomDiscs.length === 1) {
      setSelectedDisciplineId(roomDiscs[0].id);
      setCurrentView('discipline');
      setViewHistory(['room-selection', 'discipline']);
    } else {
      setCurrentView('home');
      setViewHistory(['room-selection', 'home']);
    }
  };

  const handleNavigate = (view: ViewState) => {
    if (view === currentView) return; 
    if (view === 'room-selection') {
      setSelectedDisciplineId(null);
      setSelectedRoomId(null);
      setViewHistory(['room-selection']);
    } else if (view === 'home') {
      setSelectedDisciplineId(null);
      setViewHistory(prev => [...prev, 'home']);
    } else {
      setViewHistory(prev => [...prev, view]);
    }
    setCurrentView(view);
  };

  const handleBack = () => {
    setViewHistory(prev => {
      if (prev.length <= 1) return prev; 
      const newHistory = [...prev];
      newHistory.pop(); 
      const prevView = newHistory[newHistory.length - 1]; 
      setCurrentView(prevView);
      if (prevView === 'home') setSelectedDisciplineId(null);
      if (prevView === 'room-selection') {
        setSelectedDisciplineId(null);
        setSelectedRoomId(null);
      }
      return newHistory;
    });
  };

  const handleSelectDiscipline = (id: string) => {
    setSelectedDisciplineId(id);
    handleNavigate('discipline');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#f4f7f6] p-6">
        <div className="w-12 h-12 border-4 border-[#003366]/10 border-t-[#D4A017] rounded-full animate-spin mb-6"></div>
        <h1 className="text-[#003366] font-black uppercase tracking-[0.3em] text-xs">Luna Analytics Engine Sincronizando...</h1>
      </div>
    );
  }

  const currentRoom = ROOMS.find(r => r.id === selectedRoomId);
  const currentDiscipline = disciplines.find(s => s.id === selectedDisciplineId);
  const roomDisciplines = disciplines.filter(d => d.roomId === selectedRoomId);

  return (
    <div className="min-h-screen flex flex-col bg-[#f4f7f6]">
      <Header 
        onNavigate={handleNavigate} 
        onBack={handleBack}
        canGoBack={viewHistory.length > 1}
        hasRoomSelected={!!selectedRoomId}
      />

      {/* Barra de Status com foco em Dados */}
      <div className={`py-1 px-4 flex justify-center items-center gap-2 border-b transition-all duration-700 ${isOnline ? 'bg-green-50' : 'bg-red-50'}`}>
        <div className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-green-500' : 'bg-red-500 animate-pulse'}`}></div>
        <span className={`text-[8px] font-black uppercase tracking-widest ${isOnline ? 'text-green-700' : 'text-red-700'}`}>
          {isOnline ? 'Conexão Segura • Captura de Dados Científicos Ativa' : 'Modo Offline • Sincronização Pendente'}
        </span>
      </div>

      <div className="flex-grow">
        {currentView === 'room-selection' && <RoomSelectionView rooms={ROOMS} onSelectRoom={handleSelectRoom} />}
        {currentView === 'home' && currentRoom && <HomeView room={currentRoom} disciplines={roomDisciplines} onSelectDiscipline={handleSelectDiscipline} />}
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
            onBack={handleBack}
            onShareClick={() => handleNavigate('share-material')} 
          />
        )}

        {/* ROTAS DE OSCE E PRÁTICA */}
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
              if (osceFilterMode === 'static') return isCorrectDisc && s.mode === 'clinical'; 
              if (osceFilterMode === 'rpg') return isCorrectDisc && s.mode === 'rpg';
              return isCorrectDisc;
            })}
            onBack={handleBack}
            onStart={(station) => { 
              setCurrentOsceStation(station); 
              handleNavigate('osce-quiz'); 
            }}
            setupMode={osceFilterMode}
          />
        )}
        
        {/* === MOTOR HÍBRIDO OSCE (ESTÁTICO + RPG) === */}
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
                    quizTitle: currentOsceStation.title,
                    type: 'osce-rpg'
                  });
                  push(ref(db, 'osceAnalytics'), {
                    ...analytics,
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
                    quizTitle: currentOsceStation.title,
                    type: 'osce-estatico'
                  });
                  push(ref(db, 'osceAnalytics'), {
                    ...analytics,
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
            availableStations={osceStations.filter(s => s.disciplineId === selectedDisciplineId && s.mode === 'ai')} 
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
            simulations={labSimulations} 
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
      </div>

      <footer className="bg-white border-t py-8 flex flex-col items-center gap-2 mt-auto text-center px-4">
        <div className="text-gray-400 text-[10px] font-black uppercase tracking-widest">© 2026 Luna MedClass</div>
        <div className="text-gray-500 text-[9px] font-medium uppercase max-w-md my-1">
          Simuladores de Alto Rendimento para Medicina.
        </div>
        <div className="text-[#D4A017] text-[11px] font-black uppercase tracking-[0.2em] mb-1">Desenvolvido por Fabrício Luna</div>
        <div className="text-[8px] text-gray-300 font-black uppercase tracking-tighter">Build {APP_VERSION}</div>
      </footer>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <DataProvider>
      <AppContent />
    </DataProvider>
  );
};

export default App;