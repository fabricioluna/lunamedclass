import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, UserProfile } from '../contexts/AuthContext';
import { subscribeToMyResults } from '../services/resultsService';
import { fetchAllFlashcardProgressDocs } from '../services/flashcardsService';
import { fetchLabSimulationById } from '../services/labService';
import { getWeakestCards, getDeckMastery, type SrsCardState } from '../utils/srs';
import { QuizResult, LabSimulation, AcademicUnit } from '../types';
import { BrainCircuit, ChevronLeft, Zap, Star, TrendingUp, TrendingDown, CheckCircle, XCircle, Brain, ChevronRight } from 'lucide-react';

interface StudentDashboardProps {
  onBack: () => void;
}

// "Ponto fraco" de flashcard já enriquecido com o contexto do Lab de origem (título, disciplina,
// unidade) para virar um link de estudo direto — a recomendação pedida no item 6.3.
interface WeakLabCard {
  simulationId: string;
  simulationTitle: string;
  disciplineId: string;
  unit?: AcademicUnit;
  cardId: string;
  answerLabel?: string;
  againCount: number;
}

// Visão consolidada do estudo de flashcards, somando todos os baralhos do aluno.
interface FlashcardOverview {
  studied: number;
  mastered: number;
  unmemorized: number;
  dueToday: number;
}

const StudentDashboardView: React.FC<StudentDashboardProps> = ({ onBack }) => {
  const { userProfile, currentUser } = useAuth();
  const navigate = useNavigate();
  const [results, setResults] = useState<QuizResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [weakestCards, setWeakestCards] = useState<WeakLabCard[]>([]);
  const [flashcardOverview, setFlashcardOverview] = useState<FlashcardOverview | null>(null);
  const [isLoadingWeakest, setIsLoadingWeakest] = useState(true);

  useEffect(() => {
    let isMounted = true;
    
    if (!currentUser) {
      setIsLoading(false);
      return;
    }

    // FILTRO NO SERVIDOR: a query (where userId == uid) só devolve os resultados deste
    // aluno — as Security Rules do Firestore exigem exatamente isso (ver firestore.rules).
    const unsubscribe = subscribeToMyResults(
      currentUser.uid,
      (myResults) => {
        if (!isMounted) return;
        // subscribeToMyResults já devolve em ordem de mais recente primeiro
        const validResults = myResults.filter(r => typeof r.score === 'number' && typeof r.total === 'number');
        setResults(validResults);
        setIsLoading(false);
      },
      () => {
        if (!isMounted) return;
        console.error('Falha ao carregar o desempenho do aluno.');
        setResults([]);
        setIsLoading(false);
      }
    );

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [currentUser]);

  // "Seus pontos fracos no Laboratório Virtual" (Etapa 6, item 6.3): 1 leitura de coleção pra
  // pegar TODO o progresso de flashcards do aluno (sem precisar saber os IDs das simulações de
  // antemão — ver fetchAllFlashcardProgressDocs), rankeia globalmente por erros/ease, e só
  // então busca os poucos labs de origem do top 5 pra montar o link de estudo.
  useEffect(() => {
    if (!currentUser) {
      setIsLoadingWeakest(false);
      return;
    }

    let cancelled = false;
    setIsLoadingWeakest(true);

    fetchAllFlashcardProgressDocs(currentUser.uid)
      .then(async (docs) => {
        // Junta o progresso de todos os baralhos num mapa só para a visão consolidada.
        const allCards: Record<string, SrsCardState> = {};
        for (const docData of docs) {
          for (const [cardId, state] of Object.entries(docData.cards)) {
            allCards[`${docData.simulationId}:${cardId}`] = state;
          }
        }
        if (!cancelled) setFlashcardOverview(getDeckMastery(allCards, Date.now()));

        const globalWeakest = docs
          .flatMap((docData) =>
            getWeakestCards(docData.cards, 5).map((card) => ({ ...card, simulationId: docData.simulationId }))
          )
          .sort((a, b) => b.againCount - a.againCount || a.ease - b.ease)
          .slice(0, 5);

        if (globalWeakest.length === 0) {
          if (!cancelled) setWeakestCards([]);
          return;
        }

        const simulationIds = Array.from(new Set(globalWeakest.map((card) => card.simulationId)));
        const simulations = await Promise.all(simulationIds.map((id) => fetchLabSimulationById(id)));
        const simulationById = new Map(
          simulations
            .filter((sim): sim is LabSimulation => !!sim)
            .map((sim) => [sim.firebaseId || sim.id, sim])
        );

        const enriched = globalWeakest
          .map((card): WeakLabCard | null => {
            const sim = simulationById.get(card.simulationId);
            if (!sim) return null; // Simulação apagada depois do progresso salvo — não linka pra nada.
            return {
              simulationId: card.simulationId,
              simulationTitle: sim.title,
              disciplineId: sim.disciplineId,
              unit: sim.unit,
              cardId: card.cardId,
              answerLabel: card.answerLabel,
              againCount: card.againCount,
            };
          })
          .filter((card): card is WeakLabCard => card !== null);

        if (!cancelled) setWeakestCards(enriched);
      })
      .catch((error) => {
        console.error('Erro ao carregar pontos fracos de flashcards:', error);
        if (!cancelled) setWeakestCards([]);
      })
      .finally(() => { if (!cancelled) setIsLoadingWeakest(false); });

    return () => { cancelled = true; };
  }, [currentUser]);

  if (isLoading) {
    return (
      <div className="flex-grow flex flex-col items-center justify-center p-6 bg-[#f4f7f6]">
        <div className="w-12 h-12 border-4 border-[#003366]/20 border-t-[#D4A017] rounded-full animate-spin mb-4"></div>
        <h2 className="text-[#003366] font-black uppercase tracking-widest text-xs">Sincronizando Prontuário Pessoal...</h2>
      </div>
    );
  }

  // Cálculos de gamificação e precisão diagnóstica
  const totalSimulations = results.length;

  let totalCorrect = 0;
  let totalQuestions = 0;
  results.forEach(r => {
    totalCorrect += (r.score || 0);
    totalQuestions += (r.total || 0);
  });
  
  const avgScore = totalSimulations > 0 
    ? (results.reduce((acc, curr) => acc + (curr.score / curr.total) * 10, 0) / totalSimulations).toFixed(1) 
    : '0.0';

  const totalXP = results.reduce((acc, curr) => acc + ((curr.score || 0) * 50), 0);
  const userLevel = Math.floor(totalXP / 1000) + 1;

  // Processamento Analítico: Identificar Domínio vs Lacunas Críticas
  const topicsMap: Record<string, { correct: number, total: number }> = {};
  results.forEach(r => {
    const topic = r.quizTitle || r.discipline || 'Geral';
    if (!topicsMap[topic]) topicsMap[topic] = { correct: 0, total: 0 };
    topicsMap[topic].correct += r.score || 0;
    topicsMap[topic].total += r.total || 0;
  });

  const topicStats = Object.keys(topicsMap).map(key => ({
    name: key,
    pct: topicsMap[key].total > 0 ? (topicsMap[key].correct / topicsMap[key].total) * 100 : 0
  })).sort((a, b) => b.pct - a.pct);

  const bestTopics = topicStats.slice(0, 3);
  const weakTopics = topicStats.slice().reverse().filter(t => t.pct < 70).slice(0, 3);

  // Alguns perfis legados foram gravados com "name" em vez de "displayName".
  const profileSafe = userProfile as (UserProfile & { name?: string }) | null;
  const displayName = profileSafe?.name || profileSafe?.displayName || currentUser?.email || 'Aluno';
  const initial = typeof displayName === 'string' && displayName.length > 0 ? displayName.charAt(0).toUpperCase() : 'A';

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 animate-in fade-in duration-500 pb-32">
      
      <div className="flex items-center mb-8">
        <button onClick={onBack} className="p-3 mr-4 bg-white rounded-xl text-[#003366] shadow-sm hover:bg-gray-100 transition-colors border border-gray-100">
          <ChevronLeft size={20} />
        </button>
        <div>
          <h1 className="text-3xl font-black text-[#003366] tracking-tighter uppercase">Meu Prontuário</h1>
          <p className="text-[10px] text-[#D4A017] uppercase tracking-widest font-bold">Relatório Analítico de Evolução</p>
        </div>
      </div>

      <div className="bg-gradient-to-br from-[#003366] to-[#001f3f] p-8 md:p-10 rounded-[2.5rem] shadow-2xl text-white mb-8 relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="absolute -right-10 -top-10 opacity-10"><BrainCircuit size={200} /></div>
        
        <div className="flex items-center gap-6 relative z-10 w-full">
          <div className="w-20 h-20 bg-white/10 border-2 border-[#D4A017] rounded-full flex items-center justify-center shrink-0">
            <span className="text-3xl font-black text-[#D4A017]">{initial}</span>
          </div>
          <div>
            <h2 className="text-2xl font-black">{displayName}</h2>
            <p className="text-blue-200 text-xs uppercase tracking-widest mt-1">Nível {userLevel} • {profileSafe?.periodId ? `Período ${profileSafe.periodId}` : 'Luna MedClass'}</p>
          </div>
        </div>

        <div className="flex gap-4 relative z-10 w-full md:w-auto shrink-0 bg-black/20 p-4 rounded-3xl border border-white/10">
          <div className="text-center px-4 border-r border-white/20">
            <p className="text-[10px] uppercase text-blue-300 font-bold tracking-wider">XP Total</p>
            <p className="text-2xl font-black text-[#D4A017] flex items-center justify-center gap-1"><Zap size={16}/> {totalXP}</p>
          </div>
          <div className="text-center px-4">
            <p className="text-[10px] uppercase text-blue-300 font-bold tracking-wider">Média Geral</p>
            <p className="text-2xl font-black text-white">{avgScore}</p>
          </div>
        </div>
      </div>

      {/* RAIO-X CURRICULAR: PRECISÃO E TEMAS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col justify-center items-center hover:shadow-md transition-shadow col-span-1">
          <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Precisão Diagnóstica</h3>
          <div className="flex gap-6 w-full justify-center">
             <div className="text-center">
                <div className="w-12 h-12 bg-green-50 text-green-600 rounded-full flex items-center justify-center mx-auto mb-2"><CheckCircle size={20}/></div>
                <span className="text-2xl font-black text-green-600 block">{totalCorrect}</span>
                <span className="text-[9px] uppercase font-bold text-gray-400 tracking-wider">Acertos</span>
             </div>
             <div className="text-center">
                <div className="w-12 h-12 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-2"><XCircle size={20}/></div>
                <span className="text-2xl font-black text-red-600 block">{totalQuestions - totalCorrect}</span>
                <span className="text-[9px] uppercase font-bold text-gray-400 tracking-wider">Erros</span>
             </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col hover:shadow-md transition-shadow col-span-1 md:col-span-2">
           <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 h-full">
              <div>
                 <h3 className="text-[10px] font-black text-green-600 uppercase tracking-widest mb-3 flex items-center gap-1.5"><TrendingUp size={14}/> Temas de Maior Domínio</h3>
                 {bestTopics.length > 0 ? (
                   <ul className="space-y-3">
                     {bestTopics.map((t, i) => (
                       <li key={i} className="flex justify-between items-center text-sm">
                         <span className="font-bold text-[#003366] truncate pr-2">{t.name}</span>
                         <span className="text-[10px] font-black bg-green-50 text-green-700 px-2 py-0.5 rounded-lg shrink-0">{t.pct.toFixed(0)}%</span>
                       </li>
                     ))}
                   </ul>
                 ) : <p className="text-xs text-gray-400 italic">Sem dados suficientes.</p>}
              </div>
              
              <div>
                 <h3 className="text-[10px] font-black text-orange-600 uppercase tracking-widest mb-3 flex items-center gap-1.5"><TrendingDown size={14}/> Pontos de Atenção (Abaixo de 70%)</h3>
                 {weakTopics.length > 0 ? (
                   <ul className="space-y-3">
                     {weakTopics.map((t, i) => (
                       <li key={i} className="flex justify-between items-center text-sm">
                         <span className="font-bold text-[#003366] truncate pr-2">{t.name}</span>
                         <span className="text-[10px] font-black bg-orange-50 text-orange-700 px-2 py-0.5 rounded-lg shrink-0">{t.pct.toFixed(0)}%</span>
                       </li>
                     ))}
                   </ul>
                 ) : <p className="text-xs text-gray-400 italic">Nenhum alerta crítico no momento.</p>}
              </div>
           </div>
        </div>

      </div>

      {/* FLASHCARDS DO LABORATÓRIO VIRTUAL — visão consolidada (Etapa 6, item 6.5).
          Vem do estado de repetição espaçada, não de quizResults: são métricas de estudo
          (o que já está memorizado, o que vence hoje), não de nota. */}
      {!isLoadingWeakest && flashcardOverview && flashcardOverview.studied > 0 && (
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm mb-8">
          <h3 className="text-[10px] font-black text-[#003366] uppercase tracking-widest mb-4 flex items-center gap-1.5">
            <Brain size={14}/> Flashcards do Laboratório Virtual
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-3 rounded-2xl bg-gray-50">
              <p className="text-2xl font-black text-[#003366]">{flashcardOverview.studied}</p>
              <p className="text-[9px] font-black uppercase text-gray-400 tracking-widest mt-1">Em estudo</p>
            </div>
            <div className="text-center p-3 rounded-2xl bg-green-50">
              <p className="text-2xl font-black text-green-600">{flashcardOverview.mastered}</p>
              <p className="text-[9px] font-black uppercase text-green-500 tracking-widest mt-1">Dominadas</p>
            </div>
            <div className="text-center p-3 rounded-2xl bg-red-50">
              <p className="text-2xl font-black text-red-500">{flashcardOverview.unmemorized}</p>
              <p className="text-[9px] font-black uppercase text-red-400 tracking-widest mt-1">Por memorizar</p>
            </div>
            <div className="text-center p-3 rounded-2xl bg-amber-50">
              <p className="text-2xl font-black text-[#D4A017]">{flashcardOverview.dueToday}</p>
              <p className="text-[9px] font-black uppercase text-amber-500 tracking-widest mt-1">Para hoje</p>
            </div>
          </div>
          <p className="text-[10px] text-gray-400 font-medium mt-4 text-center">
            "Dominadas" = lâminas cujo intervalo de revisão já passou de 21 dias.
          </p>
        </div>
      )}

      {/* SEUS PONTOS FRACOS NO LABORATÓRIO VIRTUAL (Etapa 6, item 6.3) */}
      {!isLoadingWeakest && weakestCards.length > 0 && (
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm mb-8">
          <h3 className="text-[10px] font-black text-red-600 uppercase tracking-widest mb-4 flex items-center gap-1.5">
            <Brain size={14}/> Seus Pontos Fracos no Laboratório Virtual
          </h3>
          <div className="space-y-2">
            {weakestCards.map((card) => (
              <button
                key={`${card.simulationId}-${card.cardId}`}
                onClick={() => navigate(`/disciplina/${card.disciplineId}/lab/simulacao/${card.simulationId}${card.unit ? `?unit=${card.unit}` : ''}`)}
                className="w-full flex items-center justify-between text-left p-3 rounded-xl bg-gray-50 hover:bg-red-50 border border-transparent hover:border-red-100 transition-all group"
              >
                <div className="min-w-0">
                  <p className="font-bold text-[#003366] text-sm truncate">{card.answerLabel || 'Lâmina sem identificação salva'}</p>
                  <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wider truncate">{card.simulationTitle}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0 pl-3">
                  <span className="text-[10px] font-black bg-red-50 text-red-600 px-2 py-0.5 rounded-lg">{card.againCount}x não lembrada</span>
                  <ChevronRight size={16} className="text-gray-300 group-hover:text-red-500 transition-colors"/>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      <h3 className="text-sm font-black text-[#003366] uppercase tracking-widest mb-6 border-b border-gray-200 pb-2">Histórico de Simulados</h3>
      
      {results.length === 0 ? (
        <div className="bg-white border-2 border-dashed border-gray-200 rounded-3xl p-12 text-center text-gray-400">
          <Star size={40} className="mx-auto mb-4 opacity-50"/>
          <p className="font-bold uppercase tracking-widest text-xs">Você ainda não completou nenhuma simulação.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {results.map((r, i) => {
            const pct = r.total > 0 ? (r.score / r.total) * 100 : 0;
            const isApproved = pct >= 70;
            return (
              <div key={r.id || i} className="bg-white p-5 rounded-2xl border border-gray-100 flex items-center justify-between shadow-sm hover:shadow-md transition-shadow">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md ${r.type && String(r.type).includes('osce') ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                      {r.type || 'Simulado'}
                    </span>
                    <span className="text-xs font-bold text-gray-400">{r.date}</span>
                  </div>
                  <h4 className="font-black text-[#003366]">{r.quizTitle || r.discipline || 'Prática Clínica'}</h4>
                </div>
                <div className={`text-right ${isApproved ? 'text-green-500' : 'text-orange-500'}`}>
                  <span className="text-2xl font-black">{r.score}/{r.total}</span>
                  <p className="text-[9px] font-black uppercase tracking-widest">{isApproved ? 'Adequado' : 'Abaixo da Média'}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default StudentDashboardView;