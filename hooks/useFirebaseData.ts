import { useState, useEffect } from 'react';
import { db, ref, onValue } from '../firebase.ts';
import { SIMULATIONS, PERIODS } from '../constants.tsx';
import { SimulationInfo, Summary, Question, OsceStation, QuizResult, LabSimulation, Period, FeatureFlag, AnalyticsResult } from '../types.ts';

export const useFirebaseData = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(false);

  // ESTADOS GLOBAIS ESTRUTURAIS (Fallback seguro via constants)
  const [periods, setPeriods] = useState<Period[]>(PERIODS); 
  const [disciplines, setDisciplines] = useState<SimulationInfo[]>(SIMULATIONS);
  const [featureFlags, setFeatureFlags] = useState<FeatureFlag[]>([]); // <--- NOVO ESTADO
  
  // DADOS PESADOS (Sangria Estancada)
  // Retornamos arrays vazios para não quebrar o contrato com o App.tsx nesta etapa.
  const summaries: Summary[] = [];
  const questions: Question[] = [];
  const osceStations: OsceStation[] = [];
  const quizResults: QuizResult[] = [];
  const labSimulations: LabSimulation[] = []; 
  const osceAnalytics: AnalyticsResult[] = [];

  useEffect(() => {
    if (!db) {
      setIsLoading(false);
      return;
    }

    const unsubscribers: Array<() => void> = [];
    let periodsLoaded = false;
    let disciplinesLoaded = false;

    // isLoading só cai depois que periods e disciplines — os dados estruturais que o resto
    // do app assume disponíveis — entregaram o primeiro snapshot, não num tempo arbitrário.
    const maybeFinishLoading = () => {
      if (periodsLoaded && disciplinesLoaded) {
        setIsLoading(false);
      }
    };

    // Monitorar o status de conexão
    unsubscribers.push(onValue(ref(db, ".info/connected"), (snap) => {
      setIsOnline(snap.val() === true);
    }));

    // 1. Ouvinte da coleção de Períodos
    // As Security Rules exigem auth != null para ler 'periods' — para um visitante ainda
    // deslogado (ex: a própria tela de login) a leitura vem negada. O callback de erro marca
    // "carregado" mesmo assim, para não travar o app inteiro esperando um dado que nunca virá;
    // o fallback via constants (linha 11) cobre esse caso.
    const periodsRef = ref(db, 'periods');
    unsubscribers.push(onValue(periodsRef, (snap) => {
      const data = snap.val();
      if (data) {
        const parsedPeriods = Array.isArray(data) ? data : Object.values(data);
        setPeriods(parsedPeriods as Period[]);
      }
      periodsLoaded = true;
      maybeFinishLoading();
    }, () => {
      periodsLoaded = true;
      maybeFinishLoading();
    }));

    // 2. Ouvinte da coleção de Disciplinas (mesma ressalva de permissão do item 1 acima)
    const disciplinesRef = ref(db, 'disciplines');
    unsubscribers.push(onValue(disciplinesRef, (snap) => {
      const data = snap.val();
      if (data) {
        const parsedDisciplines = Array.isArray(data) ? data : Object.values(data);
        setDisciplines(parsedDisciplines as SimulationInfo[]);
      } else {
        // Fallback de Segurança Legado
        unsubscribers.push(onValue(ref(db, 'discipline_config'), (configSnap) => {
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
        }));
      }
      disciplinesLoaded = true;
      maybeFinishLoading();
    }, () => {
      disciplinesLoaded = true;
      maybeFinishLoading();
    }));

    // 3. OUVINTE DE FEATURE FLAGS (NOVO)
    const flagsRef = ref(db, 'feature_flags');
    unsubscribers.push(onValue(flagsRef, (snap) => {
      const data = snap.val();
      if (data) {
        setFeatureFlags(Object.keys(data).map(k => ({ ...data[k], firebaseId: k })));
      } else {
        setFeatureFlags([]);
      }
    }));

    return () => unsubscribers.forEach(unsubscribe => unsubscribe());
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
    osceAnalytics,
    featureFlags // <--- EXPORTANDO AS FLAGS
  };
};