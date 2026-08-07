import React, { createContext, useContext, ReactNode } from 'react';
import { useAppConfig } from '../hooks/useAppConfig.ts';
import { SimulationInfo, Period, FeatureFlag, AreaConhecimento, SubareaConhecimento } from '../types.ts';

// Dados estruturais globais (períodos, disciplinas, feature flags, áreas de conhecimento) —
// não confundir com dados de domínio (questões, resultados, materiais...), que cada view busca
// do seu próprio service sob demanda. Ver PLANO-REESTRUTURACAO.md, item 3.5: este contexto
// substituiu o antigo DataContext/useFirebaseData baseado em RTDB, que prometia
// Question[]/QuizResult[]/etc. e sempre devolvia array vazio — um contrato que mentia.
interface DataContextType {
  isLoading: boolean;
  isOnline: boolean;
  periods: Period[];
  disciplines: SimulationInfo[];
  featureFlags: FeatureFlag[];
  areasConhecimento: AreaConhecimento[];
  subareasConhecimento: SubareaConhecimento[];
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const data = useAppConfig();
  return <DataContext.Provider value={data}>{children}</DataContext.Provider>;
};

export const useData = () => {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('useData deve ser usado dentro de um DataProvider');
  }
  return context;
};
