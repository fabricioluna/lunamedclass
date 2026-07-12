import { useState, useEffect } from 'react';
import { db, ref, onValue } from '../firebase.ts';
import { INITIAL_QUESTIONS, SIMULATIONS, PERIODS } from '../constants.tsx';
import { SimulationInfo, Summary, Question, OsceStation, QuizResult, LabSimulation, Period } from '../types.ts';

export const useFirebaseData = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(false);

  // ESTADOS GLOBAIS ESTRUTURAIS (Fallback seguro via constants)
  const [periods, setPeriods] = useState<Period[]>(PERIODS); 
  const [disciplines, setDisciplines] = useState<SimulationInfo[]>(SIMULATIONS);
  
  // DADOS PESADOS (Sangria Estancada)
  // Eles não serão mais baixados no boot da aplicação (Global Fetch). 
  // Retornamos arrays vazios para não quebrar o contrato com o App.tsx nesta etapa.
  const summaries: Summary[] = [];
  const questions: Question[] = [];
  const osceStations: OsceStation[] = [];
  const quizResults: QuizResult[] = [];
  const labSimulations: LabSimulation[] = []; 
  const osceAnalytics: any[] = []; 

  useEffect(() => {
    if (!db) {
      setIsLoading(false);
      return;
    }

    // Monitorar o status de conexão (Mantido no Realtime DB pois é nativo e não consome cota)
    onValue(ref(db, ".info/connected"), (snap) => {
      setIsOnline(snap.val() === true);
    });

    // 1. Ouvinte da coleção centralizada de Períodos
    const periodsRef = ref(db, 'periods');
    onValue(periodsRef, (snap) => {
      const data = snap.val();
      if (data) {
        // Converte objeto do Firebase para array iterável mantendo a tipagem estrita
        const parsedPeriods = Array.isArray(data) ? data : Object.values(data);
        setPeriods(parsedPeriods as Period[]);
      }
    });

    // 2. Ouvinte da coleção centralizada de Disciplinas
    const disciplinesRef = ref(db, 'disciplines');
    onValue(disciplinesRef, (snap) => {
      const data = snap.val();
      if (data) {
        const parsedDisciplines = Array.isArray(data) ? data : Object.values(data);
        setDisciplines(parsedDisciplines as SimulationInfo[]);
      } else {
        // 3. Fallback de Segurança: Manter lógica legada até a migração do banco ser concluída
        onValue(ref(db, 'discipline_config'), (configSnap) => {
          const config = configSnap.val();
          if (config) {
            setDisciplines(prev => prev.map(disc => {
              const dConf = config[disc.id];
              if (dConf) {
                return {
                  ...disc,
                  themes: Array.isArray(dConf.themes) ? dConf.themes : disc.themes,
                  references: Array.isArray(dConf.references) ? dConf.references : disc.references,
                  status: dConf.status ? dConf.status : disc.status,
                  lockedFeatures: Array.isArray(dConf.lockedFeatures) ? dConf.lockedFeatures : [] 
                };
              }
              return disc;
            }));
          }
        });
      }
    });

    // Tempo de boot da aplicação mantido rápido
    const timer = setTimeout(() => setIsLoading(false), 500);
    return () => clearTimeout(timer);
  }, []);

  return {
    isLoading,
    isOnline,
    periods,
    disciplines,
    summaries,
    questions,
    osceStations,
    quizResults,
    labSimulations,
    osceAnalytics 
  };
};