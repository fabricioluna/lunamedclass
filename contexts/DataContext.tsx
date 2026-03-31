import React, { createContext, useContext, ReactNode } from 'react';
import { useFirebaseData } from '../hooks/useFirebaseData.ts';
// 1. IMPORTAÇÃO ATUALIZADA (Adicionado o 'Room')
import { SimulationInfo, Summary, Question, OsceStation, QuizResult, LabSimulation, Room } from '../types.ts';

// 2. Definimos o formato da nossa "Nuvem de Dados"
interface DataContextType {
  isLoading: boolean;
  isOnline: boolean;
  rooms: Room[]; // <--- A MÁGICA ACONTECE AQUI! Agora o sistema exporta as salas.
  disciplines: SimulationInfo[];
  summaries: Summary[];
  questions: Question[];
  osceStations: OsceStation[];
  quizResults: QuizResult[];
  labSimulations: LabSimulation[];
}

// 3. Criamos o Contexto vazio
const DataContext = createContext<DataContextType | undefined>(undefined);

// 4. Criamos o Provedor que vai envolver o nosso App
export const DataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const data = useFirebaseData(); // Ele pega os dados do seu Hook do Firebase
  return <DataContext.Provider value={data}>{children}</DataContext.Provider>;
};

// 5. Criamos um Hook super simples para qualquer componente pegar os dados
export const useData = () => {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('useData deve ser usado dentro de um DataProvider');
  }
  return context;
};