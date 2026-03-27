import { useState, useEffect } from 'react';
import { db, ref, onValue } from '../firebase.ts';
import { INITIAL_QUESTIONS, SIMULATIONS } from '../constants.tsx';
import { SimulationInfo, Summary, Question, OsceStation, QuizResult, LabSimulation } from '../types.ts';

export const useFirebaseData = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(false);

  const [disciplines, setDisciplines] = useState<SimulationInfo[]>(SIMULATIONS);
  const [summaries, setSummaries] = useState<Summary[]>([]);
  const [questions, setQuestions] = useState<Question[]>(INITIAL_QUESTIONS);
  const [osceStations, setOsceStations] = useState<OsceStation[]>([]);
  const [quizResults, setQuizResults] = useState<QuizResult[]>([]);
  const [labSimulations, setLabSimulations] = useState<LabSimulation[]>([]); 

  useEffect(() => {
    if (!db) {
      setIsLoading(false);
      return;
    }

    // Monitorizar o status de conexão do Firebase
    onValue(ref(db, ".info/connected"), (snap) => {
      setIsOnline(snap.val() === true);
    });

    // Carregar configurações das disciplinas (temas, referências extras e STATUS)
    onValue(ref(db, 'discipline_config'), (snap) => {
      const config = snap.val();
      if (config) {
        setDisciplines(prev => prev.map(disc => {
          const dConf = config[disc.id];
          if (dConf) {
            return {
              ...disc,
              themes: Array.isArray(dConf.themes) ? dConf.themes : disc.themes,
              references: Array.isArray(dConf.references) ? dConf.references : disc.references,
              status: dConf.status ? dConf.status : disc.status // <-- AGORA LÊ O STATUS OFICIAL
            };
          }
          return disc;
        }));
      }
    });

    // Mapeamento e Sincronização Dinâmica das Coleções
    const collections = [
      { path: 'questions', setter: (data: any) => setQuestions([...INITIAL_QUESTIONS, ...Object.keys(data).filter(k => data[k]).map(k => ({ ...data[k], firebaseId: k }))]) },
      { path: 'summaries', setter: (data: any) => setSummaries(Object.keys(data).filter(k => data[k]).map(k => ({ ...data[k], firebaseId: k }))) },
      { path: 'osce', setter: (data: any) => setOsceStations(Object.keys(data).filter(k => data[k]).map(k => ({ ...data[k], firebaseId: k }))) },
      { path: 'quizResults', setter: (data: any) => setQuizResults(Object.keys(data).filter(k => data[k]).map(k => ({ ...data[k], id: k }))) },
      { path: 'labSimulations', setter: (data: any) => setLabSimulations(Object.keys(data).filter(k => data[k]).map(k => ({ ...data[k], firebaseId: k }))) } 
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
          if (col.path === 'labSimulations') setLabSimulations([]); 
        }
      });
    });

    setTimeout(() => setIsLoading(false), 2000);
  }, []);

  return {
    isLoading,
    isOnline,
    disciplines,
    summaries,
    questions,
    osceStations,
    quizResults,
    labSimulations
  };
};