import React, { useState, useEffect, useMemo } from 'react';
import { LabSimulation, LabQuestion, QuizDetail } from '../../types';
import {
  Microscope, ChevronRight, ChevronLeft, Eye, Shuffle, ListOrdered, SlidersHorizontal,
  Image as ImageIcon, Lightbulb, Search, Target, Brain, Flame, PartyPopper,
} from 'lucide-react';
import {
  SrsCardState, SrsRating, getOrCreateCardState, reviewCard, formatDueLabel,
  buildSessionQueue, getSessionCounts, reinsertForRetry,
} from '../../utils/srs';
import { fetchFlashcardProgress, upsertFlashcardCardState } from '../../services/flashcardsService';

interface Props {
  simulation: LabSimulation;
  onBack: () => void;
  // NOVO: A propriedade que envia os dados gota a gota para o Analytics
  onSaveResult?: (score: number, total: number, timeSpent?: number, details?: QuizDetail[]) => void;
  // Dono do progresso de flashcards (Etapa 6, item 6.3) — sem isso, o modo flashcard não
  // aparece, pois não há como isolar o progresso por aluno.
  userId?: string;
}

// Função utilitária para pegar o nome da imagem (ex: "040") e tirar a extensão (.jpg) se houver
const getDisplayImageName = (q: LabQuestion, index: number) => {
  if (q.imageName) return q.imageName.replace(/\.[^/.]+$/, "");

  try {
    const decoded = decodeURIComponent(q.imageUrl);
    const parts = decoded.split('/');
    const lastPart = parts[parts.length - 1].split('?')[0];
    const nameMatch = lastPart.match(/^\d{13}_(.*)$/);
    if (nameMatch && nameMatch[1]) return nameMatch[1].replace(/\.[^/.]+$/, "");
  } catch (e) {}

  return `Imagem ${index + 1}`;
};

type LabMode = 'flashcard' | 'sequential' | 'random' | 'range';

// Card com a imagem, a pergunta e (quando revelado) as dicas — idêntico nos dois modos de
// execução, só muda o que aparece embaixo depois de revelar.
const QuestionMedia: React.FC<{ q: LabQuestion; displayName: string }> = ({ q, displayName }) => (
  <>
    <div className="w-full h-72 md:h-[450px] bg-black rounded-[1.5rem] mb-8 overflow-hidden shadow-inner flex items-center justify-center relative">
      <div className="absolute top-4 left-4 z-10 bg-white/90 backdrop-blur-sm text-[#003366] px-4 py-2 rounded-xl shadow-lg border border-white/20 flex items-center gap-2">
        <ImageIcon size={16} className="text-[#D4A017]" />
        <span className="font-black tracking-widest uppercase text-sm">{displayName}</span>
      </div>
      <img
        src={q.imageUrl}
        alt={displayName}
        className="w-full h-full object-contain"
        onError={(e) => (e.currentTarget.src = 'https://via.placeholder.com/800x450.png?text=Erro+ao+carregar+imagem')}
      />
    </div>
    <h3 className="text-2xl font-black text-[#003366] text-center mb-8">{q.question}</h3>
  </>
);

const AnswerReveal: React.FC<{ q: LabQuestion }> = ({ q }) => (
  <>
    <div className="bg-green-50 border-2 border-green-200 p-6 rounded-2xl text-center mb-8 shadow-sm">
      <p className="text-[10px] font-black uppercase text-green-600 tracking-[0.2em] mb-2">Resposta Oficial</p>
      <p className="text-2xl font-black text-green-800">{q.answer}</p>
    </div>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {q.aiIdentification && q.aiIdentification !== 'N/A' && (
        <div className="bg-blue-50/50 p-6 rounded-2xl border border-blue-100 flex flex-col items-start shadow-sm">
           <div className="bg-blue-100 p-2 rounded-lg text-blue-700 mb-4"><Lightbulb size={20}/></div>
           <h4 className="text-[10px] font-black uppercase tracking-widest text-blue-800 mb-2">Dica Estratégica 1</h4>
           <p className="text-sm text-gray-700 font-medium leading-relaxed">{q.aiIdentification}</p>
        </div>
      )}
      {q.aiLocation && q.aiLocation !== 'N/A' && (
        <div className="bg-amber-50/50 p-6 rounded-2xl border border-amber-100 flex flex-col items-start shadow-sm">
           <div className="bg-amber-100 p-2 rounded-lg text-amber-700 mb-4"><Search size={20}/></div>
           <h4 className="text-[10px] font-black uppercase tracking-widest text-amber-800 mb-2">Dica Estratégica 2</h4>
           <p className="text-sm text-gray-700 font-medium leading-relaxed">{q.aiLocation}</p>
        </div>
      )}
      {q.aiFunctions && q.aiFunctions !== 'N/A' && (
        <div className="bg-emerald-50/50 p-6 rounded-2xl border border-emerald-100 flex flex-col items-start shadow-sm">
           <div className="bg-emerald-100 p-2 rounded-lg text-emerald-700 mb-4"><Target size={20}/></div>
           <h4 className="text-[10px] font-black uppercase tracking-widest text-emerald-800 mb-2">Dica Estratégica 3</h4>
           <p className="text-sm text-gray-700 font-medium leading-relaxed">{q.aiFunctions}</p>
        </div>
      )}
    </div>
  </>
);

const LabQuizView: React.FC<Props> = ({ simulation, onBack, onSaveResult, userId }) => {
  const simulationId = simulation.firebaseId || simulation.id;
  const questionIds = useMemo(() => simulation.questions.map(q => q.id), [simulation.questions]);
  const questionMap = useMemo(() => new Map(simulation.questions.map(q => [q.id, q])), [simulation.questions]);

  // ==========================================
  // ESTADOS DE CONFIGURAÇÃO (SETUP)
  // ==========================================
  const [isSetupMode, setIsSetupMode] = useState(true);
  const [mode, setMode] = useState<LabMode>('flashcard'); // Padrão: flashcard, como decidido com o usuário.
  const [rangeStart, setRangeStart] = useState(1);
  const [rangeEnd, setRangeEnd] = useState(simulation.questions.length);

  // ==========================================
  // PROGRESSO DE FLASHCARDS (por aluno, Etapa 6 item 6.3)
  // ==========================================
  const [progress, setProgress] = useState<Record<string, SrsCardState>>({});
  const [isProgressLoaded, setIsProgressLoaded] = useState(!userId);

  useEffect(() => {
    if (!userId) {
      setIsProgressLoaded(true);
      return;
    }
    let cancelled = false;
    setIsProgressLoaded(false);
    fetchFlashcardProgress(userId, simulationId)
      .then((cards) => { if (!cancelled) setProgress(cards); })
      .catch((err) => console.error('Erro ao carregar progresso de flashcards:', err))
      .finally(() => { if (!cancelled) setIsProgressLoaded(true); });
    return () => { cancelled = true; };
  }, [userId, simulationId]);

  const sessionCounts = useMemo(
    () => getSessionCounts(questionIds, progress, Date.now()),
    [questionIds, progress]
  );

  // ==========================================
  // ESTADOS DO JOGO ATIVO — modos clássicos (sequencial/aleatório/intervalo)
  // ==========================================
  const [activeQuestions, setActiveQuestions] = useState<LabQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isRevealed, setIsRevealed] = useState(false);
  const [answerRecorded, setAnswerRecorded] = useState<'correct' | 'incorrect' | null>(null);

  // ==========================================
  // ESTADO DA SESSÃO DE FLASHCARDS
  // ==========================================
  const [srsQueue, setSrsQueue] = useState<string[]>([]);
  const [sessionStats, setSessionStats] = useState({ reviewed: 0, hard: 0 });
  const [isSessionComplete, setIsSessionComplete] = useState(false);

  // Limpa a resposta revelada e o registo ao trocar de imagem
  useEffect(() => {
    setIsRevealed(false);
    setAnswerRecorded(null);
  }, [currentIndex]);

  // Função que inicia o simulado com base nas escolhas do aluno
  const handleStart = () => {
    if (mode === 'flashcard') {
      const queue = buildSessionQueue(questionIds, progress, Date.now());
      if (queue.length === 0) {
        alert('Nada para revisar agora! Todos os cards estão em dia — volte mais tarde ou escolha outro modo de treino.');
        return;
      }
      setSrsQueue(queue);
      setSessionStats({ reviewed: 0, hard: 0 });
      setIsSessionComplete(false);
      setCurrentIndex(0);
      setIsRevealed(false);
      setIsSetupMode(false);
      return;
    }

    let qs = [...simulation.questions];

    if (mode === 'range') {
      const s = Math.max(1, rangeStart);
      const e = Math.min(qs.length, rangeEnd);
      qs = qs.slice(s - 1, e);
    }

    if (mode === 'random') {
      qs = qs.sort(() => Math.random() - 0.5);
    }

    if (qs.length === 0) {
      alert("Intervalo inválido! Nenhuma imagem selecionada.");
      return;
    }

    setActiveQuestions(qs);
    setCurrentIndex(0);
    setIsRevealed(false);
    setAnswerRecorded(null);
    setIsSetupMode(false);
  };

  // NOVO: Função que regista o Acerto/Erro gota a gota no Firebase (modos clássicos)
  const handleRecordAnswer = (isCorrect: boolean) => {
    setAnswerRecorded(isCorrect ? 'correct' : 'incorrect');

    if (onSaveResult) {
      const q = activeQuestions[currentIndex];
      onSaveResult(
        isCorrect ? 1 : 0,
        1, // Total avaliado neste momento
        0, // Tempo ignorado no gota a gota para não corromper a média global
        [{
          questionId: q.id,
          isCorrect: isCorrect,
          theme: 'Laboratório Virtual' // Usamos a flag de Lab como tema para os gráficos
        }]
      );
    }
  };

  const handleNext = () => { if (currentIndex < activeQuestions.length - 1) setCurrentIndex(currentIndex + 1); };
  const handlePrev = () => { if (currentIndex > 0) setCurrentIndex(currentIndex - 1); };

  // Avalia o card atual no modo flashcard: "Difícil" reinsere ~4 posições à frente NA MESMA
  // sessão (não avança o índice — o próximo card já ocupa a posição atual); "Médio"/"Fácil"
  // avançam. Compatível com o analytics existente: hard vira 0/1, medium/easy viram 1/1.
  const handleRateFlashcard = (rating: SrsRating) => {
    const cardId = srsQueue[currentIndex];
    const q = cardId ? questionMap.get(cardId) : undefined;
    if (!cardId || !q) return;

    const now = Date.now();
    const prevState = getOrCreateCardState(progress, cardId, now, q.answer);
    const nextState = reviewCard(prevState, rating, now);
    setProgress(prev => ({ ...prev, [cardId]: nextState }));

    if (userId) {
      upsertFlashcardCardState(userId, simulationId, cardId, nextState)
        .catch(err => console.error('Erro ao salvar progresso de flashcards:', err));
    }

    if (onSaveResult) {
      onSaveResult(rating === 'hard' ? 0 : 1, 1, 0, [{
        questionId: cardId,
        isCorrect: rating !== 'hard',
        theme: 'Laboratório Virtual',
      }]);
    }

    setSessionStats(prev => ({
      reviewed: prev.reviewed + 1,
      hard: prev.hard + (rating === 'hard' ? 1 : 0),
    }));

    if (rating === 'hard') {
      setSrsQueue(prev => reinsertForRetry(prev, currentIndex));
      setIsRevealed(false); // currentIndex não muda — precisa resetar aqui na mão
    } else if (currentIndex + 1 >= srsQueue.length) {
      setIsSessionComplete(true);
    } else {
      setCurrentIndex(i => i + 1);
    }
  };

  // ==========================================
  // TELA 1: CONFIGURAÇÃO INICIAL (SETUP)
  // ==========================================
  if (isSetupMode) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12 animate-in fade-in duration-500 pb-32">
        <button onClick={onBack} className="group flex items-center text-[#003366] font-bold mb-8 hover:text-[#D4A017] transition-all">
          <span className="mr-2 transition-transform group-hover:-translate-x-1">←</span> Voltar
        </button>

        <div className="text-center mb-10">
          <div className="w-20 h-20 bg-blue-50 text-[#003366] rounded-3xl flex items-center justify-center text-4xl mx-auto mb-6 shadow-sm"><Microscope size={40}/></div>
          <h2 className="text-3xl font-black text-[#003366] uppercase tracking-tighter mb-2">Configurar Lab</h2>
          <p className="text-[#D4A017] font-black text-xs uppercase tracking-[0.2em]">{simulation.title} • {simulation.questions.length} Peças</p>
        </div>

        <div className="bg-white p-6 md:p-10 rounded-[3rem] shadow-xl border border-gray-100">
          <h3 className="font-black text-[#003366] mb-6 uppercase tracking-widest text-xs text-center border-b pb-4">Como você deseja treinar?</h3>

          <div className="grid gap-4 mb-8">
            <button onClick={() => setMode('flashcard')} disabled={!userId} className={`p-6 rounded-2xl border-2 text-left flex items-center gap-4 transition-all ${mode === 'flashcard' ? 'border-[#003366] bg-blue-50/30 shadow-md' : 'border-gray-100 bg-white hover:border-gray-300'} ${!userId ? 'opacity-50 cursor-not-allowed' : ''}`}>
               <div className={`p-3 rounded-xl ${mode === 'flashcard' ? 'bg-[#003366] text-white' : 'bg-gray-100 text-gray-400'}`}><Brain size={24}/></div>
               <div className="flex-1">
                 <h4 className="font-black text-[#003366] text-lg flex items-center gap-2">
                   Flashcards (Revisão Espaçada)
                   <span className="bg-[#D4A017]/20 text-[#D4A017] text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md">Recomendado</span>
                 </h4>
                 <p className="text-xs text-gray-500 font-medium">
                   {!userId
                     ? 'Faça login para usar a revisão espaçada.'
                     : isProgressLoaded
                       ? `${sessionCounts.dueCount} para revisar hoje • ${sessionCounts.newCount} inéditas`
                       : 'Carregando seu progresso...'}
                 </p>
               </div>
            </button>

            <button onClick={() => setMode('sequential')} className={`p-6 rounded-2xl border-2 text-left flex items-center gap-4 transition-all ${mode === 'sequential' ? 'border-[#003366] bg-blue-50/30 shadow-md' : 'border-gray-100 bg-white hover:border-gray-300'}`}>
               <div className={`p-3 rounded-xl ${mode === 'sequential' ? 'bg-[#003366] text-white' : 'bg-gray-100 text-gray-400'}`}><ListOrdered size={24}/></div>
               <div>
                 <h4 className="font-black text-[#003366] text-lg">Ordem Sequencial</h4>
                 <p className="text-xs text-gray-500 font-medium">Todas as imagens na ordem original cadastrada.</p>
               </div>
            </button>

            <button onClick={() => setMode('random')} className={`p-6 rounded-2xl border-2 text-left flex items-center gap-4 transition-all ${mode === 'random' ? 'border-[#003366] bg-blue-50/30 shadow-md' : 'border-gray-100 bg-white hover:border-gray-300'}`}>
               <div className={`p-3 rounded-xl ${mode === 'random' ? 'bg-[#003366] text-white' : 'bg-gray-100 text-gray-400'}`}><Shuffle size={24}/></div>
               <div>
                 <h4 className="font-black text-[#003366] text-lg">Modo Aleatório</h4>
                 <p className="text-xs text-gray-500 font-medium">Imagens misturadas para testar a sua memória real.</p>
               </div>
            </button>

            <button onClick={() => setMode('range')} className={`p-6 rounded-2xl border-2 text-left flex items-center gap-4 transition-all ${mode === 'range' ? 'border-[#003366] bg-blue-50/30 shadow-md' : 'border-gray-100 bg-white hover:border-gray-300'}`}>
               <div className={`p-3 rounded-xl ${mode === 'range' ? 'bg-[#003366] text-white' : 'bg-gray-100 text-gray-400'}`}><SlidersHorizontal size={24}/></div>
               <div className="flex-1">
                 <h4 className="font-black text-[#003366] text-lg">Intervalo Específico</h4>
                 <p className="text-xs text-gray-500 font-medium">Estude apenas uma parte (ex: da imagem 40 a 100).</p>
               </div>
            </button>
          </div>

          {mode === 'range' && (
            <div className="bg-gray-50 p-6 rounded-2xl border border-gray-200 mb-8 animate-in zoom-in duration-300">
               <p className="text-center text-[10px] font-black uppercase text-gray-500 tracking-widest mb-4">Defina o intervalo desejado</p>
               <div className="flex items-center justify-center gap-4">
                  <div className="flex flex-col items-center">
                    <label className="text-[10px] font-bold text-[#003366] mb-1 uppercase">Da Imagem nº:</label>
                    <input type="number" min={1} max={rangeEnd} value={rangeStart} onChange={e => setRangeStart(Number(e.target.value))} className="w-24 p-3 text-center rounded-xl border-2 border-gray-200 font-black text-lg focus:border-[#D4A017] outline-none" />
                  </div>
                  <span className="text-gray-300 font-black text-2xl mt-4">→</span>
                  <div className="flex flex-col items-center">
                    <label className="text-[10px] font-bold text-[#003366] mb-1 uppercase">Até a nº:</label>
                    <input type="number" min={rangeStart} max={simulation.questions.length} value={rangeEnd} onChange={e => setRangeEnd(Number(e.target.value))} className="w-24 p-3 text-center rounded-xl border-2 border-gray-200 font-black text-lg focus:border-[#D4A017] outline-none" />
                  </div>
               </div>
            </div>
          )}

          <button onClick={handleStart} disabled={mode === 'flashcard' && (!userId || !isProgressLoaded)} className="w-full bg-[#003366] text-white py-5 rounded-2xl font-black uppercase text-sm tracking-[0.2em] shadow-xl hover:bg-[#D4A017] hover:text-[#003366] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-[#003366] disabled:hover:text-white">
            Iniciar Prática 🔬
          </button>
        </div>
      </div>
    );
  }

  // ==========================================
  // TELA 2A: SESSÃO DE FLASHCARDS EM EXECUÇÃO
  // ==========================================
  if (mode === 'flashcard') {
    if (isSessionComplete) {
      return (
        <div className="max-w-2xl mx-auto px-4 py-12 animate-in zoom-in duration-500 pb-32 text-center">
          <div className="w-20 h-20 bg-amber-50 text-[#D4A017] rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-sm"><PartyPopper size={40}/></div>
          <h2 className="text-3xl font-black text-[#003366] uppercase tracking-tighter mb-2">Sessão Concluída!</h2>
          <p className="text-gray-500 text-sm mb-10">{simulation.title}</p>

          <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-gray-100 flex justify-center gap-10 mb-10">
            <div className="text-center">
              <p className="text-3xl font-black text-[#003366]">{sessionStats.reviewed}</p>
              <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest mt-1">Revisados</p>
            </div>
            <div className="w-px bg-gray-100" />
            <div className="text-center">
              <p className="text-3xl font-black text-red-500">{sessionStats.hard}</p>
              <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest mt-1">Não Lembradas</p>
            </div>
          </div>

          <button onClick={() => setIsSetupMode(true)} className="bg-[#003366] text-white px-10 py-4 rounded-2xl font-black uppercase text-xs tracking-[0.2em] shadow-xl hover:bg-[#D4A017] hover:text-[#003366] transition-all">
            Voltar ao Início
          </button>
        </div>
      );
    }

    const cardId = srsQueue[currentIndex];
    const q = cardId ? questionMap.get(cardId) : undefined;
    if (!q) return null;

    const displayName = getDisplayImageName(q, currentIndex);
    const now = Date.now();
    const currentState = getOrCreateCardState(progress, q.id, now, q.answer);

    // Foco na experiência de recall (estilo Anki: "How well did you remember this?"), não num
    // rótulo de dificuldade abstrata — é o texto que decide o rating, então precisa continuar
    // descrevendo o que aconteceu na cabeça do aluno, não o efeito (prazo) dessa escolha.
    const ratingButtons: { rating: SrsRating; label: string; icon: React.ReactElement; className: string }[] = [
      { rating: 'hard', label: 'Não lembrei', icon: <Flame size={18}/>, className: 'bg-red-500 hover:bg-red-600' },
      { rating: 'medium', label: 'Lembrei com esforço', icon: <Eye size={18}/>, className: 'bg-amber-500 hover:bg-amber-600' },
      { rating: 'easy', label: 'Lembrei fácil', icon: <PartyPopper size={18}/>, className: 'bg-green-500 hover:bg-green-600' },
    ];

    return (
      <div className="max-w-4xl mx-auto px-4 py-8 animate-in fade-in duration-500 pb-32">
        <div className="flex justify-between items-center mb-8">
          <div>
            <button onClick={() => setIsSetupMode(true)} className="text-[10px] font-black uppercase text-gray-400 hover:text-[#003366] transition-colors mb-2 flex items-center gap-1"><ChevronLeft size={12}/> Trocar Modo</button>
            <h2 className="text-xl font-black text-[#003366]">{simulation.title}</h2>
            <p className="text-[10px] font-black uppercase text-[#D4A017] tracking-[0.2em]">{simulation.author}</p>
          </div>
          <div className="bg-white px-4 py-2 rounded-xl shadow-sm border font-black text-[#003366] text-xs flex flex-col items-center">
            <span>{currentIndex + 1} / {srsQueue.length}</span>
            <span className="text-[8px] text-gray-400 uppercase tracking-widest flex items-center gap-1"><Brain size={10}/> Flashcards</span>
          </div>
        </div>

        <div className="bg-white rounded-[2.5rem] p-6 md:p-10 shadow-xl border border-gray-100">
          <QuestionMedia q={q} displayName={displayName} />

          {!isRevealed ? (
            <button
              onClick={() => setIsRevealed(true)}
              className="w-full md:w-2/3 mx-auto bg-[#003366] text-white py-5 rounded-2xl font-black uppercase text-xs tracking-[0.2em] flex items-center justify-center gap-3 hover:bg-[#D4A017] hover:text-[#003366] hover:scale-105 transition-all shadow-xl"
            >
              <Eye size={20}/> Revelar Resposta
            </button>
          ) : (
            <div className="animate-in slide-in-from-top-4 duration-500">
              <AnswerReveal q={q} />

              <div className="mt-8">
                <p className="text-center text-[10px] font-black uppercase text-gray-500 tracking-widest mb-4">Você lembrou dessa identificação?</p>
                <div className="grid grid-cols-3 gap-3">
                  {ratingButtons.map(({ rating, label, icon, className }) => (
                    <button
                      key={rating}
                      onClick={() => handleRateFlashcard(rating)}
                      className={`${className} text-white py-4 rounded-xl font-black uppercase tracking-widest text-[10px] hover:scale-105 transition-all shadow-md flex flex-col items-center gap-1.5 text-center`}
                    >
                      {icon} {label}
                      <span className="text-[8px] font-bold normal-case opacity-80">
                        {formatDueLabel(reviewCard(currentState, rating, now).intervalDays)}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ==========================================
  // TELA 2B: MODOS CLÁSSICOS (SEQUENCIAL/ALEATÓRIO/INTERVALO) EM EXECUÇÃO
  // ==========================================
  const q = activeQuestions[currentIndex];
  if (!q) return null;

  const displayName = getDisplayImageName(q, currentIndex);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 animate-in fade-in duration-500 pb-32">

      {/* Header Superior */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <button onClick={() => setIsSetupMode(true)} className="text-[10px] font-black uppercase text-gray-400 hover:text-[#003366] transition-colors mb-2 flex items-center gap-1"><ChevronLeft size={12}/> Trocar Modo</button>
          <h2 className="text-xl font-black text-[#003366]">{simulation.title}</h2>
          <p className="text-[10px] font-black uppercase text-[#D4A017] tracking-[0.2em]">{simulation.author}</p>
        </div>
        <div className="bg-white px-4 py-2 rounded-xl shadow-sm border font-black text-[#003366] text-xs flex flex-col items-center">
          <span>{currentIndex + 1} / {activeQuestions.length}</span>
          <span className="text-[8px] text-gray-400 uppercase tracking-widest">
            {mode === 'sequential' ? 'Sequencial' : mode === 'random' ? 'Aleatório' : 'Intervalo'}
          </span>
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] p-6 md:p-10 shadow-xl border border-gray-100">
        <QuestionMedia q={q} displayName={displayName} />

        {/* ANTES DE REVELAR */}
        {!isRevealed ? (
          <button
            onClick={() => setIsRevealed(true)}
            className="w-full md:w-2/3 mx-auto bg-[#003366] text-white py-5 rounded-2xl font-black uppercase text-xs tracking-[0.2em] flex items-center justify-center gap-3 hover:bg-[#D4A017] hover:text-[#003366] hover:scale-105 transition-all shadow-xl"
          >
            <Eye size={20}/> Revelar Resposta
          </button>
        ) : (
          <div className="animate-in slide-in-from-top-4 duration-500">
            <AnswerReveal q={q} />
            {/* BLOCO DE AUTOAVALIAÇÃO (GOTA A GOTA DO ANALYTICS) */}
            {!answerRecorded ? (
              <div className="mt-8 bg-blue-50/50 border-2 border-blue-100 p-6 rounded-2xl flex flex-col items-center animate-in zoom-in duration-300">
                <p className="text-[10px] font-black uppercase text-blue-800 tracking-widest mb-4">Seja sincero: Você acertou a identificação?</p>
                <div className="flex gap-4 w-full md:w-2/3">
                  <button onClick={() => handleRecordAnswer(true)} className="flex-1 bg-green-500 text-white py-4 rounded-xl font-black uppercase tracking-widest text-[10px] hover:bg-green-600 hover:scale-105 transition-all shadow-md">
                    👍 Acertei
                  </button>
                  <button onClick={() => handleRecordAnswer(false)} className="flex-1 bg-red-500 text-white py-4 rounded-xl font-black uppercase tracking-widest text-[10px] hover:bg-red-600 hover:scale-105 transition-all shadow-md">
                    👎 Errei
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-8 bg-gray-50 border-2 border-gray-100 p-4 rounded-2xl flex justify-center items-center animate-in fade-in">
                <p className="text-[10px] font-black uppercase text-gray-500 tracking-widest">
                  {answerRecorded === 'correct' ? '✅ Acerto Registrado nas Estatísticas!' : '❌ Erro Registrado para Revisão'}
                </p>
              </div>
            )}

          </div>
        )}
      </div>

      {/* Navegação entre as imagens */}
      <div className="flex justify-between items-center mt-8 gap-4">
        <button
          onClick={handlePrev}
          disabled={currentIndex === 0}
          className="bg-white p-4 md:px-6 rounded-2xl shadow-sm border border-gray-100 text-[#003366] disabled:opacity-30 flex items-center gap-2 font-black uppercase text-[10px] hover:bg-gray-50 transition-all"
        >
          <ChevronLeft size={16}/> Anterior
        </button>

        {/* Se for a última questão, mostra o botão Finalizar. Caso contrário, botão Próxima.
            Ambos estão desativados se a resposta não tiver sido revelada E registada. */}
        {currentIndex === activeQuestions.length - 1 ? (
          <button
            onClick={() => setIsSetupMode(true)}
            disabled={!isRevealed || !answerRecorded}
            className={`px-8 py-4 rounded-2xl shadow-lg border border-transparent font-black uppercase text-[10px] tracking-widest transition-all
              ${(!isRevealed || !answerRecorded) ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-[#D4A017] text-[#003366] hover:scale-105'}
            `}
          >
            Finalizar e Voltar
          </button>
        ) : (
          <button
            onClick={handleNext}
            disabled={!isRevealed || !answerRecorded}
            className={`bg-white p-4 md:px-6 rounded-2xl shadow-sm border flex items-center gap-2 font-black uppercase text-[10px] transition-all
              ${(!isRevealed || !answerRecorded) ? 'border-gray-100 text-gray-300 cursor-not-allowed opacity-50' : 'border-[#003366] text-[#003366] hover:bg-[#003366] hover:text-white'}
            `}
          >
            Próxima <ChevronRight size={16}/>
          </button>
        )}
      </div>
    </div>
  );
};

export default LabQuizView;
