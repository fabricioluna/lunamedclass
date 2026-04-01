import React, { createContext, useContext, ReactNode } from 'react';
import { useFirebaseData } from '../hooks/useFirebaseData.ts';
import { SimulationInfo, Summary, Question, OsceStation, QuizResult, LabSimulation, Room } from '../types.ts';

// 1. Definimos o formato da nossa "Nuvem de Dados"
interface DataContextType {
  isLoading: boolean;
  isOnline: boolean;
  rooms: Room[]; 
  disciplines: SimulationInfo[];
  summaries: Summary[];
  questions: Question[];
  osceStations: OsceStation[];
  quizResults: QuizResult[];
  labSimulations: LabSimulation[];
  osceAnalytics: any[]; // <--- ADICIONADO: Essencial para seus relatórios de pesquisa
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const data = useFirebaseData(); 
  return <DataContext.Provider value={data}>{children}</DataContext.Provider>;
};

export const useData = () => {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('useData deve ser usado dentro de um DataProvider');
  }
  return context;
};