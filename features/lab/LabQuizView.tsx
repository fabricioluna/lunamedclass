import React, { useState, useEffect, useMemo, useRef } from 'react';
import { LabSimulation, LabQuestion, QuizDetail } from '../../types';
import {
  ChevronLeft, Eye, Shuffle, ListOrdered, SlidersHorizontal,
  Image as ImageIcon, Lightbulb, Search, Target, Brain, PartyPopper, Clock, Info, RotateCcw,
} from 'lucide-react';
import {
  SrsCardState, SrsRating, SrsSession, PersistedSession, PersistedSessionOptions,
  getOrCreateCardState, answerCard,
  buildSession, pickNextCard, applyAnswerToSession, getSessionCounts, getDeckCounts,
  isResumableSession, restoreSession,
} from '../../utils/srs';
import {
  fetchFlashcardProgressDoc, upsertFlashcardCardState, clearActiveSession,
} from '../../services/flashcardsService';

interface Props {
  simulation: LabSimulation;
  onBack: () => void;
  // Grava UM resultado por sessão (não por lâmina — ver D11 no PLANO-REESTRUTURACAO.md).
  onSaveResult?: (score: number, total: number, timeSpent?: number, details?: QuizDetail[]) => void;
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

// Os 3 contadores que o Anki mostra o tempo todo. É a resposta visual para "não entendi como
// fica a repetição": o número de "aprendendo" sobe quando o aluno erra e desce conforme acerta.
const SessionCounters: React.FC<{ newCount: number; learningCount: number; reviewCount: number }> = ({
  newCount, learningCount, reviewCount,
}) => (
  <div className="flex items-center gap-3">
    <span className="flex flex-col items-center px-3 py-1.5 rounded-xl bg-blue-50 border border-blue-100 min-w-[62px]">
      <span className="text-lg font-black text-blue-700 leading-none">{newCount}</span>
      <span className="text-[8px] font-black uppercase tracking-widest text-blue-400 mt-1">Novas</span>
    </span>
    <span className="flex flex-col items-center px-3 py-1.5 rounded-xl bg-red-50 border border-red-100 min-w-[62px]">
      <span className="text-lg font-black text-red-600 leading-none">{learningCount}</span>
      <span className="text-[8px] font-black uppercase tracking-widest text-red-400 mt-1">Aprendendo</span>
    </span>
    <span className="flex flex-col items-center px-3 py-1.5 rounded-xl bg-green-50 border border-green-100 min-w-[62px]">
      <span className="text-lg font-black text-green-700 leading-none">{reviewCount}</span>
      <span className="text-[8px] font-black uppercase tracking-widest text-green-500 mt-1">Revisão</span>
    </span>
  </div>
);

const RATING_BUTTONS: { rating: SrsRating; label: string; className: string }[] = [
  { rating: 'again', label: 'Não lembrei', className: 'bg-red-500 hover:bg-red-600' },
  { rating: 'good', label: 'Lembrei com esforço', className: 'bg-amber-500 hover:bg-amber-600' },
  { rating: 'easy', label: 'Lembrei fácil', className: 'bg-green-500 hover:bg-green-600' },
];

const LabQuizView: React.FC<Props> = ({ simulation, onBack, onSaveResult, userId }) => {
  const simulationId = simulation.firebaseId || simulation.id;
  const questionIds = useMemo(() => simulation.questions.map(q => q.id), [simulation.questions]);
  const questionMap = useMemo(() => new Map(simulation.questions.map(q => [q.id, q])), [simulation.questions]);

  // === CONFIGURAÇÃO DA SESSÃO (tudo dentro do flashcard — item 6.5) ===
  const [isSetupMode, setIsSetupMode] = useState(true);
  const [order, setOrder] = useState<'sequential' | 'random'>('sequential');
  const [useRange, setUseRange] = useState(false);
  const [rangeStart, setRangeStart] = useState(1);
  const [rangeEnd, setRangeEnd] = useState(simulation.questions.length);
  const [newLimitText, setNewLimitText] = useState(''); // vazio = sem limite (padrão do usuário)

  // === PROGRESSO PERSISTIDO (por aluno) ===
  const [progress, setProgress] = useState<Record<string, SrsCardState>>({});
  const [isProgressLoaded, setIsProgressLoaded] = useState(!userId);
  // Sessão interrompida numa visita anterior (item 6.6).
  const [pendingSession, setPendingSession] = useState<PersistedSession | null>(null);

  useEffect(() => {
    if (!userId) {
      setIsProgressLoaded(true);
      return;
    }
    let cancelled = false;
    setIsProgressLoaded(false);
    fetchFlashcardProgressDoc(userId, simulationId)
      .then(({ cards, activeSession }) => {
        if (cancelled) return;
        setProgress(cards);
        setPendingSession(activeSession ?? null);
      })
      .catch((err) => console.error('Erro ao carregar progresso de flashcards:', err))
      .finally(() => { if (!cancelled) setIsProgressLoaded(true); });
    return () => { cancelled = true; };
  }, [userId, simulationId]);

  const deckCounts = useMemo(
    () => getDeckCounts(questionIds, progress, Date.now()),
    [questionIds, progress]
  );

  // === SESSÃO EM ANDAMENTO ===
  const [session, setSession] = useState<SrsSession>({ mainQueue: [], learningQueue: [] });
  const [currentCardId, setCurrentCardId] = useState<string | null>(null);
  const [waitingUntil, setWaitingUntil] = useState<number | null>(null);
  const [isRevealed, setIsRevealed] = useState(false);
  const [isSessionComplete, setIsSessionComplete] = useState(false);

  // Acertos por lâmina DISTINTA, pela PRIMEIRA resposta dada na sessão — é a métrica de
  // retenção do Anki. Uma lâmina errada e depois acertada na mesma sessão conta como erro:
  // senão bastaria insistir até acertar para a nota ficar perfeita.
  const sessionAnswersRef = useRef<Record<string, boolean>>({});
  const sessionStartRef = useRef<number>(Date.now());
  const sessionOptionsRef = useRef<PersistedSessionOptions>({ order: 'sequential' });
  const [answeredCount, setAnsweredCount] = useState(0);

  const counts = useMemo(() => getSessionCounts(session, progress), [session, progress]);

  // Escolhe a próxima lâmina sempre que a sessão muda. Fica num efeito (e não no clique) porque
  // o "learn ahead" depende do relógio: uma lâmina que ainda não venceu pode virar a próxima
  // alguns segundos depois, sem nenhuma ação do aluno.
  useEffect(() => {
    if (isSetupMode || isSessionComplete) return;

    const advance = () => {
      const next = pickNextCard(session, progress, Date.now());
      if (next.kind === 'card') {
        setCurrentCardId(prev => (prev === next.cardId ? prev : next.cardId));
        setWaitingUntil(null);
      } else if (next.kind === 'waiting') {
        setCurrentCardId(null);
        setWaitingUntil(next.dueAt);
      } else {
        setCurrentCardId(null);
        setWaitingUntil(null);
        setIsSessionComplete(true);
      }
    };

    advance();
    // Só precisa de relógio enquanto houver lâmina esperando o degrau vencer.
    const timer = window.setInterval(advance, 1000);
    return () => window.clearInterval(timer);
  }, [session, progress, isSetupMode, isSessionComplete]);

  useEffect(() => { setIsRevealed(false); }, [currentCardId]);

  // Só oferece retomar enquanto a sessão guardada ainda representa o que há pra estudar
  // (ver RESUMABLE_SESSION_MAX_AGE_MS): depois disso as lâminas já mudaram de estado.
  const canResume = useMemo(
    () => isResumableSession(pendingSession, Date.now()),
    [pendingSession]
  );
  const pendingSessionRemaining = pendingSession
    ? pendingSession.mainQueue.length + pendingSession.learningQueue.length
    : 0;
  const pendingSessionAnswered = pendingSession ? Object.keys(pendingSession.answers).length : 0;

  // "Começar sessão nova": o que já foi respondido na sessão antiga vira resultado agora, em
  // vez de sumir.
  const handleDiscardPending = () => {
    if (!pendingSession) return;
    flushSessionResult(pendingSession.answers, pendingSession.startedAt);
    if (userId) {
      clearActiveSession(userId, simulationId)
        .catch(err => console.error('Erro ao limpar sessão de flashcards:', err));
    }
    setPendingSession(null);
  };

  const parsedNewLimit = useMemo(() => {
    const trimmed = newLimitText.trim();
    if (trimmed === '') return undefined; // sem limite
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : undefined;
  }, [newLimitText]);

  // Contabiliza uma sessão (a atual ou uma abandonada em outra visita) como UM resultado.
  // Sem isso, fechar a aba no meio perdia o estudo do "Meu Desempenho" — o progresso das
  // lâminas sobrevivia, mas a sessão em si não virava linha no histórico.
  const flushSessionResult = (answers: Record<string, boolean>, startedAt: number) => {
    const cardIds = Object.keys(answers);
    if (!onSaveResult || cardIds.length === 0) return;

    const details: QuizDetail[] = cardIds.map((cardId) => ({
      questionId: cardId,
      isCorrect: answers[cardId],
      theme: 'Laboratório Virtual',
    }));
    const score = cardIds.filter((id) => answers[id]).length;
    const timeSpent = Math.max(0, Math.round((Date.now() - startedAt) / 1000));
    onSaveResult(score, cardIds.length, timeSpent, details);
  };

  const beginSession = (built: SrsSession, options: PersistedSessionOptions, answers: Record<string, boolean>, startedAt: number) => {
    sessionAnswersRef.current = answers;
    sessionStartRef.current = startedAt;
    sessionOptionsRef.current = options;
    setAnsweredCount(Object.keys(answers).length);
    setSession(built);
    setIsSessionComplete(false);
    setIsRevealed(false);
    setIsSetupMode(false);
  };

  const handleResume = () => {
    if (!pendingSession) return;
    const validIds = new Set(questionIds);
    beginSession(
      restoreSession(pendingSession, validIds),
      pendingSession.options,
      { ...pendingSession.answers },
      pendingSession.startedAt,
    );
    setPendingSession(null);
  };

  const handleStart = () => {
    const options: PersistedSessionOptions = {
      order,
      rangeStart: useRange ? rangeStart : undefined,
      rangeEnd: useRange ? rangeEnd : undefined,
      newLimit: parsedNewLimit,
    };
    const built = buildSession(questionIds, progress, Date.now(), options);

    if (built.mainQueue.length === 0 && built.learningQueue.length === 0) {
      alert('Nada para estudar com essa configuração! Ou o baralho está em dia (volte mais tarde), ou o intervalo escolhido não tem lâminas pendentes.');
      return;
    }

    // Havia uma sessão pendente e o aluno optou por começar do zero: o que ele já respondeu
    // naquela sessão não pode simplesmente sumir do histórico.
    if (pendingSession) {
      flushSessionResult(pendingSession.answers, pendingSession.startedAt);
      setPendingSession(null);
    }

    beginSession(built, options, {}, Date.now());
  };

  const finishSession = () => {
    flushSessionResult(sessionAnswersRef.current, sessionStartRef.current);
    if (userId) {
      clearActiveSession(userId, simulationId)
        .catch(err => console.error('Erro ao limpar sessão de flashcards:', err));
    }
    sessionAnswersRef.current = {};
    setAnsweredCount(0);
    setIsSetupMode(true);
  };

  const handleRate = (rating: SrsRating) => {
    if (!currentCardId) return;
    const q = questionMap.get(currentCardId);
    if (!q) return;

    const now = Date.now();
    const prevState = getOrCreateCardState(progress, currentCardId, now, q.answer);
    const nextState = answerCard(prevState, rating, now);

    // Só a PRIMEIRA resposta da lâmina nesta sessão entra na nota.
    if (!(currentCardId in sessionAnswersRef.current)) {
      sessionAnswersRef.current = { ...sessionAnswersRef.current, [currentCardId]: rating !== 'again' };
      setAnsweredCount(Object.keys(sessionAnswersRef.current).length);
    }

    const nextProgress = { ...progress, [currentCardId]: nextState };
    const nextSession = applyAnswerToSession(session, currentCardId, nextState, nextProgress);
    setProgress(nextProgress);
    setSession(nextSession);

    if (userId) {
      // A sessão pega carona na MESMA escrita do card: retomar depois não custa nenhuma
      // operação a mais no banco.
      const persisted: PersistedSession = {
        startedAt: sessionStartRef.current,
        updatedAt: now,
        options: sessionOptionsRef.current,
        mainQueue: nextSession.mainQueue,
        learningQueue: nextSession.learningQueue,
        answers: sessionAnswersRef.current,
      };
      upsertFlashcardCardState(userId, simulationId, currentCardId, nextState, persisted)
        .catch(err => console.error('Erro ao salvar progresso de flashcards:', err));
    }
  };

  // ==========================================
  // TELA 1: CONFIGURAÇÃO
  // ==========================================
  if (isSetupMode) {
    const totalPendente = deckCounts.newCount + deckCounts.learningCount + deckCounts.reviewCount;

    return (
      <div className="max-w-3xl mx-auto px-4 py-12 animate-in fade-in duration-500 pb-32">
        <button onClick={onBack} className="group flex items-center text-[#003366] font-bold mb-8 hover:text-[#D4A017] transition-all">
          <span className="mr-2 transition-transform group-hover:-translate-x-1">←</span> Voltar
        </button>

        <div className="text-center mb-10">
          <div className="w-20 h-20 bg-blue-50 text-[#003366] rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-sm"><Brain size={40}/></div>
          <h2 className="text-3xl font-black text-[#003366] uppercase tracking-tighter mb-2">Flashcards</h2>
          <p className="text-[#D4A017] font-black text-xs uppercase tracking-[0.2em]">{simulation.title} • {simulation.questions.length} Peças</p>
        </div>

        {/* SESSÃO INTERROMPIDA — retomar de onde parou (item 6.6) */}
        {canResume && pendingSession && (
          <div className="bg-[#003366] text-white p-6 md:p-8 rounded-[2.5rem] shadow-xl mb-6 animate-in slide-in-from-top-4 duration-500">
            <div className="flex items-center gap-2 mb-3">
              <RotateCcw size={16} className="text-[#D4A017]"/>
              <h3 className="font-black uppercase tracking-widest text-[10px] text-[#D4A017]">Sessão interrompida</h3>
            </div>
            <p className="text-sm font-medium text-blue-100 mb-6 leading-relaxed">
              Você parou no meio de uma sessão com <strong className="text-white">{pendingSessionRemaining} lâmina{pendingSessionRemaining > 1 ? 's' : ''}</strong> ainda por estudar
              {pendingSessionAnswered > 0 && <> (já respondeu {pendingSessionAnswered})</>}. Quer continuar de onde parou?
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <button onClick={handleResume} className="flex-1 bg-[#D4A017] text-[#003366] py-4 rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] hover:bg-white transition-all shadow-lg">
                Continuar de onde parei
              </button>
              <button onClick={handleDiscardPending} className="flex-1 bg-white/10 text-white py-4 rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] hover:bg-white/20 transition-all border border-white/20">
                Começar sessão nova
              </button>
            </div>
          </div>
        )}

        <div className="bg-white p-6 md:p-10 rounded-[3rem] shadow-xl border border-gray-100">

          {/* SITUAÇÃO DO BARALHO */}
          <div className="flex flex-col items-center gap-4 pb-8 border-b mb-8">
            <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Situação do baralho hoje</p>
            {isProgressLoaded ? (
              <SessionCounters {...deckCounts} />
            ) : (
              <div className="w-8 h-8 border-4 border-[#003366]/10 border-t-[#D4A017] rounded-full animate-spin"/>
            )}
            {isProgressLoaded && totalPendente === 0 && (
              <p className="text-xs text-green-600 font-bold text-center">
                Tudo em dia! As lâminas já estudadas voltam sozinhas na data certa.
              </p>
            )}
          </div>

          {/* COMO FUNCIONA */}
          <div className="bg-blue-50/50 border border-blue-100 p-5 rounded-2xl mb-8">
            <p className="flex items-center gap-2 text-[10px] font-black uppercase text-blue-800 tracking-widest mb-3">
              <Info size={14}/> Como funciona a repetição
            </p>
            <ul className="text-xs text-gray-600 font-medium space-y-1.5 leading-relaxed">
              <li><strong className="text-red-600">Não lembrei</strong> — a lâmina volta ainda nesta sessão, em poucos minutos.</li>
              <li><strong className="text-amber-600">Lembrei com esforço</strong> — volta mais adiante na sessão e depois no dia seguinte.</li>
              <li><strong className="text-green-600">Lembrei fácil</strong> — sai da sessão e só volta daqui a alguns dias.</li>
              <li className="pt-1 text-gray-500">A cada acerto o intervalo cresce (1 dia → 3 → 8 → 20...). Quanto mais você erra, mais a lâmina aparece.</li>
            </ul>
          </div>

          {/* ORDEM */}
          <p className="text-[10px] font-black uppercase text-gray-500 tracking-widest mb-3">Ordem das lâminas</p>
          <div className="grid grid-cols-2 gap-3 mb-8">
            <button onClick={() => setOrder('sequential')} className={`p-5 rounded-2xl border-2 text-left flex items-center gap-3 transition-all ${order === 'sequential' ? 'border-[#003366] bg-blue-50/30 shadow-md' : 'border-gray-100 bg-white hover:border-gray-300'}`}>
              <div className={`p-2.5 rounded-xl ${order === 'sequential' ? 'bg-[#003366] text-white' : 'bg-gray-100 text-gray-400'}`}><ListOrdered size={20}/></div>
              <div>
                <h4 className="font-black text-[#003366] text-sm">Sequencial</h4>
                <p className="text-[10px] text-gray-500 font-medium">Ordem cadastrada</p>
              </div>
            </button>
            <button onClick={() => setOrder('random')} className={`p-5 rounded-2xl border-2 text-left flex items-center gap-3 transition-all ${order === 'random' ? 'border-[#003366] bg-blue-50/30 shadow-md' : 'border-gray-100 bg-white hover:border-gray-300'}`}>
              <div className={`p-2.5 rounded-xl ${order === 'random' ? 'bg-[#003366] text-white' : 'bg-gray-100 text-gray-400'}`}><Shuffle size={20}/></div>
              <div>
                <h4 className="font-black text-[#003366] text-sm">Aleatória</h4>
                <p className="text-[10px] text-gray-500 font-medium">Testa a memória real</p>
              </div>
            </button>
          </div>

          {/* INTERVALO ESPECÍFICO */}
          <button onClick={() => setUseRange(!useRange)} className={`w-full p-5 rounded-2xl border-2 text-left flex items-center gap-3 transition-all mb-4 ${useRange ? 'border-[#003366] bg-blue-50/30 shadow-md' : 'border-gray-100 bg-white hover:border-gray-300'}`}>
            <div className={`p-2.5 rounded-xl ${useRange ? 'bg-[#003366] text-white' : 'bg-gray-100 text-gray-400'}`}><SlidersHorizontal size={20}/></div>
            <div className="flex-1">
              <h4 className="font-black text-[#003366] text-sm">Estudar só um intervalo</h4>
              <p className="text-[10px] text-gray-500 font-medium">Ex: da lâmina 40 à 100 — útil na véspera da prova</p>
            </div>
            <span className={`w-11 h-6 rounded-full flex items-center px-1 transition-all shrink-0 ${useRange ? 'bg-[#003366] justify-end' : 'bg-gray-200 justify-start'}`}>
              <span className="w-4 h-4 bg-white rounded-full shadow"/>
            </span>
          </button>

          {useRange && (
            <div className="bg-gray-50 p-6 rounded-2xl border border-gray-200 mb-6 animate-in zoom-in duration-300">
               <div className="flex items-center justify-center gap-4">
                  <div className="flex flex-col items-center">
                    <label className="text-[10px] font-bold text-[#003366] mb-1 uppercase">Da lâmina nº</label>
                    <input type="number" min={1} max={simulation.questions.length} value={rangeStart} onChange={e => setRangeStart(Number(e.target.value))} className="w-24 p-3 text-center rounded-xl border-2 border-gray-200 font-black text-lg focus:border-[#D4A017] outline-none" />
                  </div>
                  <span className="text-gray-300 font-black text-2xl mt-4">→</span>
                  <div className="flex flex-col items-center">
                    <label className="text-[10px] font-bold text-[#003366] mb-1 uppercase">Até a nº</label>
                    <input type="number" min={1} max={simulation.questions.length} value={rangeEnd} onChange={e => setRangeEnd(Number(e.target.value))} className="w-24 p-3 text-center rounded-xl border-2 border-gray-200 font-black text-lg focus:border-[#D4A017] outline-none" />
                  </div>
               </div>
            </div>
          )}

          {/* LIMITE DE NOVAS */}
          <div className="bg-gray-50 p-5 rounded-2xl border border-gray-200 mb-8 flex items-center gap-4">
            <div className="flex-1">
              <h4 className="font-black text-[#003366] text-sm">Limite de lâminas novas</h4>
              <p className="text-[10px] text-gray-500 font-medium">Deixe vazio para estudar o baralho inteiro</p>
            </div>
            <input
              type="number"
              min={1}
              placeholder="sem limite"
              value={newLimitText}
              onChange={e => setNewLimitText(e.target.value)}
              className="w-32 p-3 text-center rounded-xl border-2 border-gray-200 font-black text-sm focus:border-[#D4A017] outline-none placeholder:font-medium placeholder:text-[10px] placeholder:text-gray-400"
            />
          </div>

          <button onClick={handleStart} disabled={!isProgressLoaded} className="w-full bg-[#003366] text-white py-5 rounded-2xl font-black uppercase text-sm tracking-[0.2em] shadow-xl hover:bg-[#D4A017] hover:text-[#003366] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-[#003366] disabled:hover:text-white">
            Começar a estudar 🧠
          </button>
        </div>
      </div>
    );
  }

  // ==========================================
  // TELA 2: FIM DE SESSÃO
  // ==========================================
  if (isSessionComplete) {
    const respostas = Object.values(sessionAnswersRef.current);
    const acertos = respostas.filter(Boolean).length;
    const total = respostas.length;

    return (
      <div className="max-w-2xl mx-auto px-4 py-12 animate-in zoom-in duration-500 pb-32 text-center">
        <div className="w-20 h-20 bg-amber-50 text-[#D4A017] rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-sm"><PartyPopper size={40}/></div>
        <h2 className="text-3xl font-black text-[#003366] uppercase tracking-tighter mb-2">Sessão Concluída!</h2>
        <p className="text-gray-500 text-sm mb-10">{simulation.title}</p>

        <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-gray-100 flex justify-center gap-10 mb-6">
          <div className="text-center">
            <p className="text-3xl font-black text-[#003366]">{total}</p>
            <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest mt-1">Lâminas</p>
          </div>
          <div className="w-px bg-gray-100" />
          <div className="text-center">
            <p className="text-3xl font-black text-green-600">{acertos}</p>
            <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest mt-1">De primeira</p>
          </div>
          <div className="w-px bg-gray-100" />
          <div className="text-center">
            <p className="text-3xl font-black text-red-500">{total - acertos}</p>
            <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest mt-1">Não lembradas</p>
          </div>
        </div>

        <p className="text-xs text-gray-400 font-medium mb-10 max-w-md mx-auto">
          As lâminas que você não lembrou voltam antes das outras na próxima sessão.
        </p>

        <button onClick={finishSession} className="bg-[#003366] text-white px-10 py-4 rounded-2xl font-black uppercase text-xs tracking-[0.2em] shadow-xl hover:bg-[#D4A017] hover:text-[#003366] transition-all">
          Salvar e Voltar
        </button>
      </div>
    );
  }

  // ==========================================
  // TELA 3: ESPERANDO O DEGRAU VENCER
  // ==========================================
  if (waitingUntil !== null) {
    const minutosRestantes = Math.max(1, Math.ceil((waitingUntil - Date.now()) / 60000));
    return (
      <div className="max-w-2xl mx-auto px-4 py-12 animate-in fade-in duration-500 pb-32 text-center">
        <div className="w-20 h-20 bg-blue-50 text-[#003366] rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-sm"><Clock size={40}/></div>
        <h2 className="text-2xl font-black text-[#003366] uppercase tracking-tighter mb-3">Tudo revisado por enquanto</h2>
        <p className="text-gray-500 text-sm mb-10 max-w-md mx-auto">
          Ainda há lâminas em aprendizado, mas a próxima só volta em cerca de {minutosRestantes} minuto{minutosRestantes > 1 ? 's' : ''}.
          Você pode esperar aqui ou encerrar a sessão.
        </p>
        <button onClick={finishSession} className="bg-[#003366] text-white px-10 py-4 rounded-2xl font-black uppercase text-xs tracking-[0.2em] shadow-xl hover:bg-[#D4A017] hover:text-[#003366] transition-all">
          Encerrar e Salvar
        </button>
      </div>
    );
  }

  // ==========================================
  // TELA 4: A SESSÃO EM SI
  // ==========================================
  const q = currentCardId ? questionMap.get(currentCardId) : undefined;
  if (!q) return null;

  const displayName = getDisplayImageName(q, questionIds.indexOf(q.id));

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 animate-in fade-in duration-500 pb-32">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-8">
        <div>
          <button onClick={finishSession} className="text-[10px] font-black uppercase text-gray-400 hover:text-[#003366] transition-colors mb-2 flex items-center gap-1"><ChevronLeft size={12}/> Encerrar sessão</button>
          <h2 className="text-xl font-black text-[#003366]">{simulation.title}</h2>
          <p className="text-[10px] font-black uppercase text-[#D4A017] tracking-[0.2em]">{answeredCount} estudadas nesta sessão</p>
        </div>
        <SessionCounters {...counts} />
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
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {RATING_BUTTONS.map(({ rating, label, className }) => (
                  <button
                    key={rating}
                    onClick={() => handleRate(rating)}
                    className={`${className} text-white py-5 rounded-xl font-black uppercase tracking-widest text-[10px] hover:scale-105 transition-all shadow-md text-center`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LabQuizView;
