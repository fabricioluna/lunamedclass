import React, { useState, useEffect, useMemo, useRef } from 'react';
import { LabSimulation, LabQuestion, QuizDetail } from '../../types';
import {
  ChevronLeft, Eye, Shuffle, ListOrdered, SlidersHorizontal,
  Image as ImageIcon, Lightbulb, Search, Target, Brain, PartyPopper, Info, RotateCcw, Flame, AlertTriangle, PauseCircle,
} from 'lucide-react';
import {
  SrsCardState, SrsRating, SrsSession, PersistedSession, PersistedSessionOptions,
  getOrCreateCardState, answerCard,
  buildSession, applyAnswerToSession, getSessionCounts, getDeckCounts,
  isResumableSession, restoreSession, countUnmemorizedCards, SessionFocus,
} from '../../utils/srs';
import {
  fetchFlashcardProgressDoc, upsertFlashcardCardState, clearActiveSession,
} from '../../services/flashcardsService';

interface Props {
  simulation: LabSimulation;
  onBack: () => void;
  // Grava UM resultado por sessão (não por card — ver D11 no PLANO-REESTRUTURACAO.md).
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

// Widget genérico de 3 números. Usado tanto pro placar AO VIVO da sessão (restantes /
// memorizados / não memorizados) quanto pra situação do baralho na tela de configuração.
const CounterTrio: React.FC<{
  items: { value: number; label: string; tone: 'blue' | 'green' | 'red' | 'amber' }[];
}> = ({ items }) => {
  const tones = {
    blue: 'bg-blue-50 border-blue-100 text-blue-700',
    green: 'bg-green-50 border-green-100 text-green-700',
    red: 'bg-red-50 border-red-100 text-red-600',
    amber: 'bg-amber-50 border-amber-100 text-[#D4A017]',
  };
  return (
    <div className="flex items-center gap-3">
      {items.map(({ value, label, tone }) => (
        <span key={label} className={`flex flex-col items-center px-3 py-1.5 rounded-xl border min-w-[70px] ${tones[tone]}`}>
          <span className="text-lg font-black leading-none">{value}</span>
          <span className="text-[8px] font-black uppercase tracking-widest opacity-70 mt-1">{label}</span>
        </span>
      ))}
    </div>
  );
};

// O Firestore devolve `code: 'permission-denied'` quando as Security Rules não liberam o
// caminho. Vale distinguir esse caso dos demais: ele NÃO se resolve tentando de novo nem
// trocando de rede — é configuração do banco (regra não publicada no console), e a mensagem
// precisa dizer isso para não mandar o aluno bater cabeça. Ver item 6.11 do PLANO.
const isPermissionDenied = (err: unknown): boolean =>
  typeof err === 'object' && err !== null && (err as { code?: string }).code === 'permission-denied';

const PERMISSION_MESSAGE =
  'Seu progresso não está sendo salvo: o banco de dados não autorizou o acesso. Isso é configuração do sistema, não erro seu — avise a coordenação (as regras do Firestore precisam ser publicadas).';

// Aviso de que o progresso não está sendo gravado. Fica no topo das duas telas (configuração e
// sessão) porque estudar sem salvar é pior que não estudar — o aluno precisa saber ANTES.
const SaveErrorBanner: React.FC<{ message: string }> = ({ message }) => (
  <div className="bg-red-50 border-2 border-red-200 p-4 rounded-2xl mb-6 flex items-start gap-3">
    <AlertTriangle size={20} className="text-red-500 shrink-0 mt-0.5" />
    <p className="text-xs font-bold text-red-800 leading-relaxed">{message}</p>
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
  const [focus, setFocus] = useState<SessionFocus>('all'); // 'unmemorized' = rodada só do que falta memorizar

  // === PROGRESSO PERSISTIDO (por aluno) ===
  const [progress, setProgress] = useState<Record<string, SrsCardState>>({});
  const [isProgressLoaded, setIsProgressLoaded] = useState(!userId);
  // Sessão interrompida numa visita anterior (item 6.6).
  const [pendingSession, setPendingSession] = useState<PersistedSession | null>(null);
  // Falha de leitura/gravação do progresso. Antes isso só ia pro console.error e o aluno via a
  // sessão funcionar normalmente, perdendo tudo ao sair — foi assim que a ausência das Security
  // Rules em produção passou despercebida por dias (item 6.11).
  const [saveError, setSaveError] = useState<string | null>(null);

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
      .catch((err) => {
        console.error('Erro ao carregar progresso de flashcards:', err);
        if (cancelled) return;
        setSaveError(isPermissionDenied(err)
          ? PERMISSION_MESSAGE
          : 'Não foi possível carregar seu progresso salvo. O que você estudar agora pode não ser gravado.');
      })
      .finally(() => { if (!cancelled) setIsProgressLoaded(true); });
    return () => { cancelled = true; };
  }, [userId, simulationId]);

  const deckCounts = useMemo(
    () => getDeckCounts(questionIds, progress),
    [questionIds, progress]
  );

  const unmemorizedCount = useMemo(
    () => countUnmemorizedCards(questionIds, progress),
    [questionIds, progress]
  );

  // === SESSÃO EM ANDAMENTO ===
  const [session, setSession] = useState<SrsSession>({ queue: [] });
  const [isRevealed, setIsRevealed] = useState(false);
  const [isSessionComplete, setIsSessionComplete] = useState(false);

  // cardId → memorizou (clicou "Lembrei fácil"). Guardado em ESTADO, não em ref, porque o
  // placar precisa aparecer ao vivo durante a sessão — pedido do usuário depois do teste.
  const [sessionAnswers, setSessionAnswers] = useState<Record<string, boolean>>({});
  const sessionAnswersRef = useRef<Record<string, boolean>>({});
  const sessionStartRef = useRef<number>(Date.now());
  const sessionOptionsRef = useRef<PersistedSessionOptions>({ order: 'sequential' });

  const counts = useMemo(() => getSessionCounts(session, sessionAnswers), [session, sessionAnswers]);

  // Passagem linear: o card atual é simplesmente o primeiro da fila. Sem relógio, sem
  // reinserção — era o `setInterval` de "learn ahead" que fazia o card recém-respondido
  // reaparecer no lugar quando ele era o último da fila.
  const currentCardId = session.queue.length > 0 ? session.queue[0] : null;

  useEffect(() => { setIsRevealed(false); }, [currentCardId]);

  // Só oferece retomar enquanto a sessão guardada ainda representa o que há pra estudar
  // (ver RESUMABLE_SESSION_MAX_AGE_MS): depois disso ela provavelmente não reflete mais a intenção.
  const canResume = useMemo(
    () => isResumableSession(pendingSession, Date.now()),
    [pendingSession]
  );
  const pendingSessionRemaining = pendingSession
    ? restoreSession(pendingSession, new Set(questionIds)).queue.length
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
  // cards sobrevivia, mas a sessão em si não virava linha no histórico.
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
    setSessionAnswers(answers);
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
      // Limite de novas não se aplica à rodada focada: lá não entra card inédito.
      newLimit: focus === 'unmemorized' ? undefined : parsedNewLimit,
      focus,
    };
    const built = buildSession(questionIds, progress, options);

    if (built.queue.length === 0) {
      alert(focus === 'unmemorized'
        ? 'Nenhum card pendente de memorização neste baralho! Um card sai dessa pilha quando você marca "Lembrei fácil".'
        : 'Nada para estudar com essa configuração! O intervalo escolhido não tem nenhum card.');
      return;
    }

    // Havia uma sessão pendente e o aluno optou por começar do zero: o que ele já respondeu
    // naquela sessão não pode simplesmente sumir do histórico.
    if (pendingSession) {
      flushSessionResult(pendingSession.answers, pendingSession.startedAt);
      setPendingSession(null);
      // Sem isso a sessão velha continuava no banco e reaparecia como "interrompida" na
      // próxima visita, mesmo já tendo sido contabilizada.
      if (userId) {
        clearActiveSession(userId, simulationId)
          .catch(err => console.error('Erro ao limpar sessão de flashcards:', err));
      }
    }

    beginSession(built, options, {}, Date.now());
  };

  // "Parar por aqui": sai da sessão SEM contabilizá-la e SEM apagar a sessão guardada — ao
  // voltar, o card "Sessão interrompida" oferece continuar. Diferente de "Encerrar", que fecha
  // a sessão, grava o resultado no Meu Desempenho e não dá pra retomar.
  // O progresso de cada card já foi salvo a cada clique; aqui só se decide o destino da SESSÃO.
  const pauseSession = () => {
    setIsSetupMode(true);
    setIsSessionComplete(false);
    if (userId) {
      fetchFlashcardProgressDoc(userId, simulationId)
        .then(({ activeSession }) => setPendingSession(activeSession ?? null))
        .catch(err => console.error('Erro ao recarregar sessão pausada:', err));
    }
  };

  const finishSession = () => {
    flushSessionResult(sessionAnswersRef.current, sessionStartRef.current);
    if (userId) {
      clearActiveSession(userId, simulationId)
        .catch(err => console.error('Erro ao limpar sessão de flashcards:', err));
    }
    sessionAnswersRef.current = {};
    setSessionAnswers({});
    setIsSetupMode(true);
  };

  // "Estudar esses N agora": encerra a sessão atual (gravando o resultado dela) e abre uma
  // rodada nova só com o que ficou por memorizar. Duas sessões distintas no histórico, que é o
  // que elas são de fato.
  const handleStudyUnmemorizedNow = () => {
    const pendentes = Object.keys(sessionAnswersRef.current).filter(id => !sessionAnswersRef.current[id]);
    flushSessionResult(sessionAnswersRef.current, sessionStartRef.current);

    const options: PersistedSessionOptions = { order, focus: 'unmemorized' };
    beginSession({ queue: pendentes }, options, {}, Date.now());
  };

  const handleRate = (rating: SrsRating) => {
    if (!currentCardId) return;
    const q = questionMap.get(currentCardId);
    if (!q) return;

    const now = Date.now();
    const prevState = getOrCreateCardState(progress, currentCardId, q.answer);
    const nextState = answerCard(prevState, rating, now);

    // "Memorizado" é só o "Lembrei fácil" — definição dada pelo usuário. O placar é atualizado
    // na hora (estado, não ref) para o contador de não memorizados andar em tempo real.
    const memorized = rating === 'easy';
    const nextAnswers = { ...sessionAnswersRef.current, [currentCardId]: memorized };
    sessionAnswersRef.current = nextAnswers;
    setSessionAnswers(nextAnswers);

    const nextProgress = { ...progress, [currentCardId]: nextState };
    const nextSession = applyAnswerToSession(session, currentCardId);
    setProgress(nextProgress);
    setSession(nextSession);
    if (nextSession.queue.length === 0) setIsSessionComplete(true);

    if (userId) {
      // A sessão pega carona na MESMA escrita do card: retomar depois não custa nenhuma
      // operação a mais no banco.
      const persisted: PersistedSession = {
        startedAt: sessionStartRef.current,
        updatedAt: now,
        options: sessionOptionsRef.current,
        queue: nextSession.queue,
        answers: nextAnswers,
      };
      upsertFlashcardCardState(userId, simulationId, currentCardId, nextState, persisted)
        .then(() => setSaveError(null))
        .catch(err => {
          console.error('Erro ao salvar progresso de flashcards:', err);
          setSaveError(isPermissionDenied(err)
            ? PERMISSION_MESSAGE
            : 'Seu progresso NÃO está sendo salvo. Avise a monitoria antes de continuar estudando.');
        });
    }
  };

  // ==========================================
  // TELA 1: CONFIGURAÇÃO
  // ==========================================
  if (isSetupMode) {
    const totalEstudavel = deckCounts.newCount + deckCounts.unmemorizedCount + deckCounts.memorizedCount;

    return (
      <div className="max-w-3xl mx-auto px-4 py-12 animate-in fade-in duration-500 pb-32">
        <button onClick={onBack} className="group flex items-center text-[#003366] font-bold mb-8 hover:text-[#D4A017] transition-all">
          <span className="mr-2 transition-transform group-hover:-translate-x-1">←</span> Voltar
        </button>

        <div className="text-center mb-10">
          <div className="w-20 h-20 bg-blue-50 text-[#003366] rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-sm"><Brain size={40}/></div>
          <h2 className="text-3xl font-black text-[#003366] uppercase tracking-tighter mb-2">Flashcards</h2>
          <p className="text-[#D4A017] font-black text-xs uppercase tracking-[0.2em]">{simulation.title} • {simulation.questions.length} cards</p>
        </div>

        {saveError && <SaveErrorBanner message={saveError} />}

        {/* SESSÃO INTERROMPIDA — retomar de onde parou (item 6.6) */}
        {canResume && pendingSession && (
          <div className="bg-[#003366] text-white p-6 md:p-8 rounded-[2.5rem] shadow-xl mb-6 animate-in slide-in-from-top-4 duration-500">
            <div className="flex items-center gap-2 mb-3">
              <RotateCcw size={16} className="text-[#D4A017]"/>
              <h3 className="font-black uppercase tracking-widest text-[10px] text-[#D4A017]">Sessão interrompida</h3>
            </div>
            <p className="text-sm font-medium text-blue-100 mb-6 leading-relaxed">
              Você parou no meio de uma sessão com <strong className="text-white">{pendingSessionRemaining} card{pendingSessionRemaining > 1 ? 's' : ''}</strong> ainda por estudar
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
              <CounterTrio items={[
                { value: deckCounts.newCount, label: 'Inéditos', tone: 'blue' },
                { value: deckCounts.unmemorizedCount, label: 'Por memorizar', tone: 'red' },
                { value: deckCounts.memorizedCount, label: 'Memorizados', tone: 'green' },
              ]} />
            ) : (
              <div className="w-8 h-8 border-4 border-[#003366]/10 border-t-[#D4A017] rounded-full animate-spin"/>
            )}
            {isProgressLoaded && totalEstudavel === 0 && (
              <p className="text-xs text-green-600 font-bold text-center">
                Este baralho ainda não tem cards cadastrados.
              </p>
            )}
          </div>

          {/* RODADA FOCADA NOS CARDS NÃO MEMORIZADOS */}
          {isProgressLoaded && unmemorizedCount > 0 && (
            <div className={`p-5 rounded-2xl border-2 mb-8 transition-all ${focus === 'unmemorized' ? 'border-red-300 bg-red-50/50' : 'border-gray-100 bg-gray-50'}`}>
              <div className="flex items-start gap-3 mb-4">
                <div className={`p-2.5 rounded-xl shrink-0 ${focus === 'unmemorized' ? 'bg-red-500 text-white' : 'bg-red-100 text-red-500'}`}>
                  <Flame size={20}/>
                </div>
                <div className="flex-1">
                  <h4 className="font-black text-[#003366] text-sm">
                    Você tem {unmemorizedCount} card{unmemorizedCount > 1 ? 's' : ''} que ainda não memorizou
                  </h4>
                  <p className="text-[10px] text-gray-500 font-medium mt-0.5">
                    Um card sai dessa pilha quando você marca "Lembrei fácil".
                  </p>
                </div>
              </div>
              <div className="flex p-1 bg-white rounded-xl shadow-inner border border-gray-100">
                <button
                  onClick={() => setFocus('all')}
                  className={`flex-1 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${focus === 'all' ? 'bg-[#003366] text-white shadow-sm' : 'text-gray-400 hover:text-[#003366]'}`}
                >
                  Sessão normal
                </button>
                <button
                  onClick={() => setFocus('unmemorized')}
                  className={`flex-1 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${focus === 'unmemorized' ? 'bg-red-500 text-white shadow-sm' : 'text-gray-400 hover:text-red-500'}`}
                >
                  Estudar só esses {unmemorizedCount}
                </button>
              </div>
              {focus === 'unmemorized' && (
                <p className="text-[10px] text-red-700 font-bold mt-3 leading-relaxed">
                  A rodada focada traz os {unmemorizedCount} de uma vez. Cada um sai da pilha assim que
                  você marcar "Lembrei fácil".
                </p>
              )}
            </div>
          )}

          {/* COMO FUNCIONA */}
          <div className="bg-blue-50/50 border border-blue-100 p-5 rounded-2xl mb-8">
            <p className="flex items-center gap-2 text-[10px] font-black uppercase text-blue-800 tracking-widest mb-3">
              <Info size={14}/> Como funciona
            </p>
            <ul className="text-xs text-gray-600 font-medium space-y-1.5 leading-relaxed">
              <li>A sessão corre do começo ao fim, sem repetir card no meio do caminho.</li>
              <li><strong className="text-green-600">Lembrei fácil</strong> — o card entra na pilha dos memorizados.</li>
              <li><strong className="text-red-600">Não lembrei</strong> e <strong className="text-amber-600">Lembrei com esforço</strong> — o card fica (ou volta) na pilha dos que faltam memorizar.</li>
              <li className="pt-1 text-gray-500">No fim você escolhe se quer rodar essa pilha de novo. Nada trava por data: dá para repassar o baralho quantas vezes quiser, no mesmo dia.</li>
            </ul>
          </div>

          {/* ORDEM */}
          <p className="text-[10px] font-black uppercase text-gray-500 tracking-widest mb-3">Ordem dos cards</p>
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
              <p className="text-[10px] text-gray-500 font-medium">Ex: do card 40 ao 100 — útil na véspera da prova</p>
            </div>
            <span className={`w-11 h-6 rounded-full flex items-center px-1 transition-all shrink-0 ${useRange ? 'bg-[#003366] justify-end' : 'bg-gray-200 justify-start'}`}>
              <span className="w-4 h-4 bg-white rounded-full shadow"/>
            </span>
          </button>

          {useRange && (
            <div className="bg-gray-50 p-6 rounded-2xl border border-gray-200 mb-6 animate-in zoom-in duration-300">
               <div className="flex items-center justify-center gap-4">
                  <div className="flex flex-col items-center">
                    <label className="text-[10px] font-bold text-[#003366] mb-1 uppercase">Do card nº</label>
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

          {/* LIMITE DE INÉDITOS — sem sentido na rodada focada, que só traz card já estudado */}
          {focus === 'all' && (
          <div className="bg-gray-50 p-5 rounded-2xl border border-gray-200 mb-8 flex items-center gap-4">
            <div className="flex-1">
              <h4 className="font-black text-[#003366] text-sm">Limite de cards inéditos</h4>
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
          )}

          <button onClick={handleStart} disabled={!isProgressLoaded} className="w-full bg-[#003366] text-white py-5 rounded-2xl font-black uppercase text-sm tracking-[0.2em] shadow-xl hover:bg-[#D4A017] hover:text-[#003366] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-[#003366] disabled:hover:text-white">
            {focus === 'unmemorized' ? `Estudar os ${unmemorizedCount} não memorizados 🔥` : 'Começar a estudar 🧠'}
          </button>
        </div>
      </div>
    );
  }

  // ==========================================
  // TELA 2: FIM DE SESSÃO — com a pilha do que não foi memorizado
  // ==========================================
  if (isSessionComplete) {
    const respostas = Object.values(sessionAnswers);
    const memorizados = respostas.filter(Boolean).length;
    const naoMemorizados = respostas.length - memorizados;

    return (
      <div className="max-w-2xl mx-auto px-4 py-12 animate-in zoom-in duration-500 pb-32 text-center">
        <div className="w-20 h-20 bg-amber-50 text-[#D4A017] rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-sm"><PartyPopper size={40}/></div>
        <h2 className="text-3xl font-black text-[#003366] uppercase tracking-tighter mb-2">Sessão Concluída!</h2>
        <p className="text-gray-500 text-sm mb-10">{simulation.title}</p>

        <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-gray-100 flex justify-center gap-10 mb-8">
          <div className="text-center">
            <p className="text-3xl font-black text-[#003366]">{respostas.length}</p>
            <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest mt-1">Cards</p>
          </div>
          <div className="w-px bg-gray-100" />
          <div className="text-center">
            <p className="text-3xl font-black text-green-600">{memorizados}</p>
            <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest mt-1">Memorizados</p>
          </div>
          <div className="w-px bg-gray-100" />
          <div className="text-center">
            <p className="text-3xl font-black text-red-500">{naoMemorizados}</p>
            <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest mt-1">Por memorizar</p>
          </div>
        </div>

        {/* Pilha do que ficou por memorizar — o aluno decide se roda de novo agora. */}
        {naoMemorizados > 0 && (
          <div className="bg-red-50/60 border-2 border-red-100 p-6 rounded-[2rem] mb-8">
            <p className="text-sm font-bold text-[#003366] mb-1">
              {naoMemorizados > 1
                ? `${naoMemorizados} cards ficaram por memorizar`
                : '1 card ficou por memorizar'}
            </p>
            <p className="text-[11px] text-gray-500 font-medium mb-5 leading-relaxed">
              São os que você marcou como "Não lembrei" ou "Lembrei com esforço". Quer rodar essa pilha agora?
            </p>
            <button onClick={handleStudyUnmemorizedNow} className="w-full bg-red-500 text-white py-4 rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] hover:bg-red-600 transition-all shadow-lg">
              Estudar esses {naoMemorizados} agora 🔥
            </button>
          </div>
        )}

        <button onClick={finishSession} className="bg-[#003366] text-white px-10 py-4 rounded-2xl font-black uppercase text-xs tracking-[0.2em] shadow-xl hover:bg-[#D4A017] hover:text-[#003366] transition-all">
          Salvar e Voltar
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
      {saveError && <SaveErrorBanner message={saveError} />}

      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <button onClick={pauseSession} title="Sai e guarda a sessão para você continuar depois" className="text-[10px] font-black uppercase text-[#003366] hover:text-[#D4A017] transition-colors flex items-center gap-1">
              <PauseCircle size={13}/> Parar por aqui
            </button>
            <span className="text-gray-200">|</span>
            <button onClick={finishSession} title="Fecha a sessão e registra o resultado no Meu Desempenho" className="text-[10px] font-black uppercase text-gray-400 hover:text-[#003366] transition-colors flex items-center gap-1">
              <ChevronLeft size={12}/> Encerrar sessão
            </button>
          </div>
          <h2 className="text-xl font-black text-[#003366]">{simulation.title}</h2>
          <p className="text-[10px] font-black uppercase text-[#D4A017] tracking-[0.2em]">{Object.keys(sessionAnswers).length} estudados nesta sessão</p>
        </div>
        <CounterTrio items={[
          { value: counts.remaining, label: 'Restantes', tone: 'blue' },
          { value: counts.memorized, label: 'Memorizados', tone: 'green' },
          { value: counts.unmemorized, label: 'Por memorizar', tone: 'red' },
        ]} />
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
