import React, { useEffect, useMemo, useRef, useState } from 'react';
import { GuidedChoice, GuidedOsceStation, GuidedReveal } from '../../types';
import {
  calculateGuidedScore, calculateTypedScore, GuidedScoreResult, MAX_HINT_LEVEL, sceneCredit, typedSceneCredit, TypedScoreResult,
} from '../../utils/guidedScoring';
import { DEFAULT_GUIDED_PROMPT, isCorrectChoice, KeyedChoice, shuffleChoices } from '../../utils/guidedStation';
import { MatchError, MatchResult, MAX_TYPED_LENGTH } from '../../utils/typedMatch';
import {
  Activity, ChevronRight, CheckCircle2, ClipboardList, Gamepad2, Lightbulb, Loader2, MapPin, MessageCircle,
  RotateCcw, Send, Timer, Trophy, XCircle,
} from 'lucide-react';

export type GuidedInteraction = 'choices' | 'typed';

export interface GuidedOsceAnalytics {
  stationId: string;
  mode: 'guided';
  interaction: GuidedInteraction;
  timeSpent: number;
  attemptsByScene: number[];
  hintsByScene: number[];
  totalWrong: number;
  grade: number;
}

export interface TypedMatchInput {
  narrative: string;
  options: string[];
  text: string;
}

interface GuidedRpgViewProps {
  station: GuidedOsceStation;
  onBack: () => void;
  onSaveResult?: (score: number, total: number, timeSpent: number, analytics: GuidedOsceAnalytics) => void;
  // 'typed' esconde as alternativas: o aluno digita a conduta e `matchAction` diz a qual conduta do
  // caso ela corresponde (a tela nunca fala com a IA nem com o Firebase — recebe a função pronta).
  interaction?: GuidedInteraction;
  matchAction?: (input: TypedMatchInput) => Promise<MatchResult>;
}

// O que aconteceu em cada cena, para o resumo final: as condutas erradas (com a consequência
// narrada), a certa que fez a cena avançar e, no modo digitado, o que o aluno escreveu.
interface SceneRecord {
  wrong: GuidedChoice[];
  right?: GuidedChoice;
  typed: string[];
}

type LogRole = 'student' | 'wrong' | 'right' | 'system';
interface LogEntry {
  role: LogRole;
  text: string;
}

const DEFAULT_HINT = 'Releia a narração e pense: de acordo com o roteiro, qual é o próximo passo nesta situação?';
const NOT_UNDERSTOOD = 'Nada muda na cena com isso. Descreva uma ação concreta: o que você faz, com o quê e em que momento.';
const MULTIPLE_ACTIONS = 'Uma ação por vez: qual delas você faz primeiro?';
const NUDGE_TO_HINT = 'Se estiver difícil, use o botão "Dica" (ela custa pontos).';

const formatTime = (seconds: number) => {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
};

const failureMessage = (error: unknown): { text: string; fallBack: boolean } => {
  const reason = error instanceof MatchError ? error.reason : 'unavailable';
  if (reason === 'login') return { text: 'Entre na sua conta para jogar digitando. Enquanto isso, mostrei as alternativas desta cena.', fallBack: true };
  if (reason === 'busy') return { text: 'Muitas ações em pouco tempo. Aguarde um instante e envie de novo.', fallBack: false };
  return { text: 'Não consegui interpretar a sua ação agora. Para você não ficar parado, mostrei as alternativas desta cena.', fallBack: true };
};

// ============================================================================
// MICRO-COMPONENTES
// ============================================================================

const Header = ({ theme, title, onBack, typed }: { theme: string; title: string; onBack: () => void; typed: boolean }) => (
  <div className="flex justify-between items-center mb-10 border-b pb-6 gap-4">
    <button onClick={onBack} className="text-[#003366] font-black uppercase text-[10px] flex items-center gap-2 hover:text-[#D4A017] transition-colors shrink-0">
      <RotateCcw size={14} /> Sair do Caso
    </button>
    <div className="text-right">
      <span className="text-[10px] font-black text-[#D4A017] uppercase tracking-widest">{theme}{typed && ' • modo digitado'}</span>
      <h2 className="text-xl md:text-2xl font-black text-[#003366] uppercase tracking-tighter">🎮 {title}</h2>
    </div>
  </div>
);

const ContextPanel = ({ station }: { station: GuidedOsceStation }) => (
  <div className="bg-white p-8 rounded-[2rem] shadow-xl border-t-8 border-purple-600">
    {station.setting && (
      <p className="text-[11px] text-gray-500 font-bold mb-5 flex gap-2 items-start bg-gray-50 p-3 rounded-xl">
        <MapPin size={14} className="text-[#D4A017] shrink-0 mt-0.5" /> {station.setting}
      </p>
    )}
    <h3 className="text-[10px] font-black text-[#003366] uppercase mb-4 tracking-widest flex items-center gap-2">
      <ClipboardList size={14} /> Cenário Clínico
    </h3>
    <p className="text-gray-700 leading-relaxed font-medium mb-6">"{station.scenario}"</p>
    <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
      <h4 className="text-[9px] font-black text-blue-800 uppercase mb-1 tracking-widest">🎯 Missão</h4>
      <p className="text-xs text-blue-900 font-bold">{station.task}</p>
    </div>
  </div>
);

const TimerAndProgress = ({ timer, sceneIndex, total }: { timer: number; sceneIndex: number; total: number }) => (
  <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
    <div className="flex items-center justify-between">
      <span className="flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase tracking-widest"><Timer size={14} /> Cronômetro</span>
      <span className="text-xl font-mono font-bold text-[#003366]">{formatTime(timer)}</span>
    </div>
    <div>
      <div className="flex justify-between text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">
        <span>Cena {sceneIndex + 1} de {total}</span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className="h-full bg-purple-600 transition-all duration-500" style={{ width: `${(sceneIndex / total) * 100}%` }} />
      </div>
    </div>
  </div>
);

// Valores só entram aqui DEPOIS que o aluno fez a técnica certa — nunca aparecem de graça.
const MeasurementsPanel = ({ reveals }: { reveals: GuidedReveal[] }) => (
  <div className="bg-[#0a0f18] p-5 rounded-2xl border-2 border-gray-800 shadow-lg">
    <div className="flex items-center gap-2 mb-3 border-b border-white/5 pb-2">
      <Activity size={14} className={reveals.length > 0 ? 'text-green-500' : 'text-gray-700'} />
      <span className="text-[10px] font-black uppercase text-gray-500 tracking-widest">Aferições</span>
    </div>
    {reveals.length === 0 ? (
      <p className="text-[10px] text-gray-600 font-bold uppercase tracking-widest italic text-center py-3">
        Os valores aparecem aqui conforme você executa a técnica corretamente
      </p>
    ) : (
      <ul className="space-y-2 font-mono">
        {reveals.map((reveal, i) => (
          <li key={i} className="flex justify-between items-baseline gap-3 animate-in fade-in">
            <span className="text-[10px] text-gray-500 font-black uppercase">{reveal.label}</span>
            <span className="text-green-400 text-sm font-black text-right">{reveal.value}</span>
          </li>
        ))}
      </ul>
    )}
  </div>
);

const SceneIntro = ({ narrative, patient }: { narrative: string; patient?: string }) => (
  <div className="space-y-6">
    <div className="bg-[#003366] text-white p-8 rounded-[2rem] shadow-xl border-l-8 border-[#D4A017]">
      <p className="text-base leading-relaxed font-medium whitespace-pre-line">{narrative}</p>
    </div>

    {patient && (
      <div className="flex gap-3 items-start">
        <div className="w-10 h-10 shrink-0 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center"><MessageCircle size={18} /></div>
        <div className="bg-white border border-purple-100 rounded-2xl rounded-tl-none px-5 py-4 shadow-sm">
          <p className="text-sm text-gray-800 font-medium italic whitespace-pre-line">{patient}</p>
        </div>
      </div>
    )}
  </div>
);

interface ChoiceListProps {
  prompt: string;
  choices: KeyedChoice[];
  tried: number[];
  isAnswered: boolean;
  chosenKey: number | null;
  onChoose: (choice: KeyedChoice) => void;
}

const ChoiceList = ({ prompt, choices, tried, isAnswered, chosenKey, onChoose }: ChoiceListProps) => (
  <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100">
    <h3 className="text-[10px] font-black text-gray-400 uppercase mb-6 tracking-[0.2em] text-center">{prompt}</h3>
    <div className="grid grid-cols-1 gap-3">
      {choices.map((choice) => {
        const wasWrong = tried.includes(choice.key);
        const isChosenRight = isAnswered && chosenKey === choice.key;
        return (
          <button
            key={choice.key}
            disabled={wasWrong || isAnswered}
            onClick={() => onChoose(choice)}
            className={`p-5 rounded-2xl text-left text-sm font-bold transition-all border-2 flex items-start gap-3
              ${wasWrong ? 'bg-red-50 border-red-100 text-red-400 line-through decoration-red-200 cursor-not-allowed'
                : isChosenRight ? 'bg-green-50 border-green-300 text-green-800'
                : isAnswered ? 'bg-gray-50 border-gray-50 text-gray-300 cursor-not-allowed'
                : 'bg-white border-gray-100 text-[#003366] hover:border-[#D4A017] hover:shadow-xl active:scale-[0.99]'}
            `}
          >
            {wasWrong && <XCircle size={18} className="shrink-0 mt-0.5" />}
            {isChosenRight && <CheckCircle2 size={18} className="shrink-0 mt-0.5" />}
            <span>{choice.action}</span>
          </button>
        );
      })}
    </div>
  </div>
);

const FeedbackBox = ({ kind, text }: { kind: 'wrong' | 'right'; text: string }) => (
  <div
    role="status"
    className={`p-6 rounded-2xl border-2 animate-in slide-in-from-bottom-2 ${kind === 'wrong' ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}
  >
    <h4 className={`text-[10px] font-black uppercase tracking-widest mb-2 flex items-center gap-2 ${kind === 'wrong' ? 'text-red-600' : 'text-green-700'}`}>
      {kind === 'wrong' ? <><XCircle size={14} /> O que acontece</> : <><CheckCircle2 size={14} /> Conduta correta</>}
    </h4>
    <p className={`text-sm leading-relaxed font-medium whitespace-pre-line ${kind === 'wrong' ? 'text-red-900' : 'text-green-900'}`}>{text}</p>
    {kind === 'wrong' && <p className="text-[10px] font-black uppercase tracking-widest text-red-500 mt-3">Escolha outra conduta</p>}
  </div>
);

// --- Modo digitado ---------------------------------------------------------------------------

const LOG_STYLE: Record<Exclude<LogRole, 'student'>, { box: string; label: string; title: string }> = {
  wrong: { box: 'bg-red-50 border-red-200 text-red-900', label: 'text-red-600', title: 'O que acontece' },
  right: { box: 'bg-green-50 border-green-200 text-green-900', label: 'text-green-700', title: 'Conduta correta' },
  system: { box: 'bg-gray-50 border-gray-200 text-gray-700', label: 'text-gray-500', title: 'Orientação' },
};

const ConversationLog = ({ log, isMatching }: { log: LogEntry[]; isMatching: boolean }) => (
  <div role="log" aria-live="polite" aria-busy={isMatching} className="space-y-3">
    {log.map((entry, i) =>
      entry.role === 'student' ? (
        <div key={i} className="flex justify-end animate-in slide-in-from-bottom-2">
          <div className="max-w-[88%] bg-[#003366] text-white rounded-2xl rounded-tr-none px-5 py-3 text-sm font-medium shadow whitespace-pre-line">{entry.text}</div>
        </div>
      ) : (
        <div key={i} className="flex justify-start animate-in slide-in-from-bottom-2">
          <div className={`max-w-[92%] rounded-2xl rounded-tl-none px-5 py-3 text-sm font-medium border-2 whitespace-pre-line ${LOG_STYLE[entry.role].box}`}>
            <span className={`block text-[8px] font-black uppercase tracking-widest mb-1 ${LOG_STYLE[entry.role].label}`}>{LOG_STYLE[entry.role].title}</span>
            {entry.text}
          </div>
        </div>
      )
    )}
    {isMatching && (
      <div className="flex justify-start">
        <div className="rounded-2xl rounded-tl-none px-5 py-3 text-xs font-bold text-gray-400 bg-white border border-gray-100 flex items-center gap-2">
          <Loader2 size={14} className="animate-spin" /> Interpretando a sua ação...
        </div>
      </div>
    )}
  </div>
);

interface ComposerProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onHint: () => void;
  hintLevel: number;
  isMatching: boolean;
}

const Composer = ({ value, onChange, onSubmit, onHint, hintLevel, isMatching }: ComposerProps) => (
  <form
    onSubmit={(e) => { e.preventDefault(); onSubmit(); }}
    className="bg-white p-5 rounded-[2rem] shadow-sm border border-gray-100 space-y-3"
  >
    <label htmlFor="rpg-action" className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] text-center">
      O que você faz agora?
    </label>
    <div className="flex gap-2 items-center">
      <input
        id="rpg-action"
        type="text"
        value={value}
        maxLength={MAX_TYPED_LENGTH}
        onChange={(e) => onChange(e.target.value)}
        disabled={isMatching}
        autoComplete="off"
        placeholder="Descreva a sua conduta (uma ação por vez)..."
        className="flex-grow bg-gray-50 rounded-xl px-4 py-3 outline-none border-2 border-transparent focus:border-[#003366] focus:bg-white font-medium text-[#003366] text-sm min-w-0"
      />
      <button
        type="submit"
        disabled={!value.trim() || isMatching}
        aria-label="Enviar conduta"
        className="bg-[#003366] text-white p-3 rounded-xl active:scale-95 hover:bg-[#D4A017] transition-all shadow disabled:opacity-30 shrink-0"
      >
        <Send size={18} />
      </button>
    </div>
    <div className="flex flex-wrap justify-between items-center gap-2">
      <button
        type="button"
        onClick={onHint}
        disabled={isMatching || hintLevel >= MAX_HINT_LEVEL}
        className="text-[10px] font-black uppercase tracking-widest text-orange-600 bg-orange-50 border border-orange-100 px-4 py-2 rounded-lg hover:bg-orange-600 hover:text-white transition-all disabled:opacity-40 disabled:hover:bg-orange-50 disabled:hover:text-orange-600 flex items-center gap-2"
      >
        <Lightbulb size={12} /> Dica ({hintLevel}/{MAX_HINT_LEVEL}) · custa pontos
      </button>
      <span className="text-[9px] text-gray-400 font-bold">Interpretado por IA · não digite dados pessoais</span>
    </div>
  </form>
);

// --- Resultado -------------------------------------------------------------------------------

interface ResultsProps {
  score: GuidedScoreResult & Partial<Pick<TypedScoreResult, 'hintsUsed'>>;
  timer: number;
  records: SceneRecord[];
  attempts: number[];
  hintLevels: number[];
  reveals: GuidedReveal[];
  station: GuidedOsceStation;
  typedMode: boolean;
}

const Results = ({ score, timer, records, attempts, hintLevels, reveals, station, typedMode }: ResultsProps) => (
  <div className="space-y-8 animate-in fade-in slide-in-from-bottom-10 duration-700">
    <div className="bg-white p-10 rounded-[3rem] shadow-2xl text-center border-b-8 border-[#D4A017] relative overflow-hidden">
      <div className="absolute top-0 right-0 p-8 opacity-10 text-[#003366]"><Trophy size={120} /></div>
      <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] mb-2">Desempenho Técnico{typedMode && ' · modo digitado'}</p>
      <h4 className="text-8xl font-black text-[#003366] tracking-tighter">{score.grade.toFixed(1)}</h4>
      <div className="mt-4 flex flex-wrap items-center justify-center gap-2 md:gap-4">
        <span className="px-4 py-1 bg-blue-50 text-blue-600 rounded-full text-[10px] font-black uppercase tracking-widest">Tempo: {formatTime(timer)}</span>
        <span className="px-4 py-1 bg-green-50 text-green-700 rounded-full text-[10px] font-black uppercase tracking-widest">{score.firstTry} de {records.length} de primeira</span>
        {score.totalWrong > 0 && (
          <span className="px-4 py-1 bg-red-50 text-red-600 rounded-full text-[10px] font-black uppercase tracking-widest">{score.totalWrong} {typedMode ? 'conduta' : 'escolha'}{score.totalWrong > 1 ? 's' : ''} errada{score.totalWrong > 1 ? 's' : ''}</span>
        )}
        {typedMode && (score.hintsUsed ?? 0) > 0 && (
          <span className="px-4 py-1 bg-orange-50 text-orange-600 rounded-full text-[10px] font-black uppercase tracking-widest">{score.hintsUsed} dica{(score.hintsUsed ?? 0) > 1 ? 's' : ''} usada{(score.hintsUsed ?? 0) > 1 ? 's' : ''}</span>
        )}
      </div>
    </div>

    {reveals.length > 0 && (
      <div className="bg-[#0a0f18] p-8 rounded-[2.5rem] shadow-xl">
        <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-4 flex items-center gap-2"><Activity size={14} className="text-green-500" /> Valores aferidos</h4>
        <ul className="space-y-2 font-mono">
          {reveals.map((reveal, i) => (
            <li key={i} className="flex justify-between gap-3 border-b border-white/5 pb-2">
              <span className="text-xs text-gray-500 font-black uppercase">{reveal.label}</span>
              <span className="text-green-400 font-black">{reveal.value}</span>
            </li>
          ))}
        </ul>
      </div>
    )}

    <div className="bg-white p-10 rounded-[3rem] shadow-xl border border-gray-100">
      <h4 className="text-lg font-black text-[#003366] uppercase mb-8 flex items-center gap-3">
        <Gamepad2 size={20} className="text-[#D4A017]" /> Revisão cena a cena
      </h4>
      <div className="space-y-4">
        {records.map((record, i) => {
          const credit = typedMode ? typedSceneCredit({ attempts: attempts[i], hintLevel: hintLevels[i] }) : sceneCredit(attempts[i]);
          return (
            <div key={i} className={`p-5 rounded-2xl border-2 ${credit >= 1 ? 'bg-green-50 border-green-100' : credit > 0 ? 'bg-yellow-50 border-yellow-100' : 'bg-red-50 border-red-100'}`}>
              <div className="flex items-start gap-4">
                <div className={`w-9 h-9 shrink-0 rounded-xl flex items-center justify-center text-sm font-black text-white ${credit >= 1 ? 'bg-green-600' : credit > 0 ? 'bg-yellow-500' : 'bg-red-500'}`}>{i + 1}</div>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-gray-800">{record.right?.action}</p>
                  <span className="text-[9px] font-black uppercase tracking-tighter mt-1 block text-gray-500">
                    {attempts[i] <= 1 ? '✅ De primeira' : `⚠️ ${attempts[i]} tentativas`}
                    {typedMode && hintLevels[i] > 0 && ` · dica nível ${hintLevels[i]}`}
                  </span>
                  {record.right && <p className="text-xs text-gray-600 font-medium mt-2 leading-relaxed">{record.right.feedback}</p>}
                  {typedMode && record.typed.length > 0 && (
                    <p className="text-[11px] text-[#003366] font-bold mt-2">Você escreveu: {record.typed.map((t) => `“${t}”`).join(' → ')}</p>
                  )}
                  {record.wrong.map((wrong, w) => (
                    <div key={w} className="mt-3 pl-3 border-l-2 border-red-200">
                      <p className="text-xs font-bold text-red-600 line-through decoration-red-200">{wrong.action}</p>
                      <p className="text-xs text-red-800 font-medium mt-1 leading-relaxed">{wrong.feedback}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>

    {station.tip && (
      <div className="bg-amber-50 p-8 rounded-[2.5rem] border border-amber-100 flex gap-4">
        <Lightbulb size={22} className="text-[#D4A017] shrink-0" />
        <p className="text-sm text-amber-900 font-medium leading-relaxed">{station.tip}</p>
      </div>
    )}

    {station.checklist && station.checklist.length > 0 && (
      <div className="bg-white p-10 rounded-[3rem] border-2 border-gray-100 shadow-xl">
        <h4 className="text-lg font-black text-[#003366] uppercase mb-8 flex items-center gap-3 border-b pb-4"><span>📋</span> Critérios de Avaliação (Checklist)</h4>
        <ul className="space-y-3">
          {station.checklist.map((item, i) => (
            <li key={i} className="flex items-start gap-3 text-xs font-bold text-gray-500"><span className="text-[#D4A017]">●</span> {item}</li>
          ))}
        </ul>
      </div>
    )}
  </div>
);

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================
const GuidedRpgView: React.FC<GuidedRpgViewProps> = ({ station, onBack, onSaveResult, interaction = 'choices', matchAction }) => {
  const total = station.scenes.length;
  const typedMode = interaction === 'typed' && !!matchAction;

  const [sceneIndex, setSceneIndex] = useState(0);
  const [attempts, setAttempts] = useState<number[]>(() => new Array<number>(total).fill(0));
  const [hintLevels, setHintLevels] = useState<number[]>(() => new Array<number>(total).fill(0));
  const [records, setRecords] = useState<SceneRecord[]>(() => Array.from({ length: total }, () => ({ wrong: [], typed: [] })));
  const [tried, setTried] = useState<number[]>([]);
  const [chosenKey, setChosenKey] = useState<number | null>(null);
  const [lastWrong, setLastWrong] = useState<GuidedChoice | null>(null);
  const [reveals, setReveals] = useState<GuidedReveal[]>([]);
  const [timer, setTimer] = useState(0);
  const [score, setScore] = useState<(GuidedScoreResult & Partial<Pick<TypedScoreResult, 'hintsUsed'>>) | null>(null);

  // Só do modo digitado (zerados a cada cena)
  const [log, setLog] = useState<LogEntry[]>([]);
  const [input, setInput] = useState('');
  const [isMatching, setIsMatching] = useState(false);
  const [unmatched, setUnmatched] = useState(0);
  const [fellBack, setFellBack] = useState(false);

  const scene = station.scenes[sceneIndex];
  const isAnswered = chosenKey !== null;
  const isLastScene = sceneIndex === total - 1;
  const showChoices = !typedMode || fellBack;

  // Embaralhada uma vez por cena (não a cada render), para a ordem não pular enquanto o aluno lê.
  const choices = useMemo(() => shuffleChoices(scene?.choices ?? []), [scene]);

  useEffect(() => {
    if (score) return;
    const interval = setInterval(() => setTimer((t) => t + 1), 1000);
    return () => clearInterval(interval);
  }, [score]);

  // No celular a consequência fica abaixo das opções, fora da tela: leva o aluno até ela. E, ao
  // avançar, leva ao topo da cena nova (o painel de contexto vem antes dela na coluna única).
  // scrollIntoView não existe no jsdom — daí o `?.`.
  const feedbackRef = useRef<HTMLDivElement>(null);
  const sceneTopRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (lastWrong || chosenKey !== null || log.length > 0) feedbackRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'nearest' });
  }, [lastWrong, chosenKey, log.length]);
  useEffect(() => {
    if (sceneIndex > 0) sceneTopRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
  }, [sceneIndex]);

  const append = (...entries: LogEntry[]) => setLog((prev) => [...prev, ...entries]);

  // Aplica a conduta escolhida (ou reconhecida a partir do texto digitado).
  const applyChoice = (choice: GuidedChoice, key: number, typedText?: string) => {
    setAttempts((prev) => prev.map((value, i) => (i === sceneIndex ? value + 1 : value)));
    if (typedText) {
      setRecords((prev) => prev.map((record, i) => (i === sceneIndex ? { ...record, typed: [...record.typed, typedText] } : record)));
    }

    if (isCorrectChoice(choice)) {
      setChosenKey(key);
      setLastWrong(null);
      setRecords((prev) => prev.map((record, i) => (i === sceneIndex ? { ...record, right: choice } : record)));
      if (scene.reveals?.length) setReveals((prev) => [...prev, ...scene.reveals!]);
      if (typedMode) append({ role: 'right', text: choice.feedback });
      return;
    }

    setTried((prev) => [...prev, key]);
    setLastWrong(choice);
    setRecords((prev) => prev.map((record, i) => (i === sceneIndex ? { ...record, wrong: [...record.wrong, choice] } : record)));
    if (typedMode) append({ role: 'wrong', text: choice.feedback });
  };

  const handleChoose = (choice: KeyedChoice) => {
    if (isAnswered || tried.includes(choice.key)) return;
    applyChoice(choice, choice.key);
  };

  const handleSubmit = async () => {
    const text = input.trim();
    if (!text || isMatching || isAnswered || !matchAction) return;

    append({ role: 'student', text });
    setInput('');
    setIsMatching(true);

    try {
      const result = await matchAction({ narrative: scene.narrative, options: scene.choices.map((c) => c.action), text });

      if (result.kind === 'match') {
        const choice = scene.choices[result.index];
        // Repetir uma conduta errada que já foi vista não conta como nova tentativa.
        if (!isCorrectChoice(choice) && tried.includes(result.index)) {
          append({ role: 'system', text: 'Você já tentou isso nesta cena e já viu o que acontece. Tente outra conduta.' });
        } else {
          applyChoice(choice, result.index, text);
        }
      } else if (result.kind === 'multiple') {
        append({ role: 'system', text: MULTIPLE_ACTIONS });
      } else {
        const nextUnmatched = unmatched + 1;
        setUnmatched(nextUnmatched);
        append({ role: 'system', text: nextUnmatched >= 2 ? `${NOT_UNDERSTOOD} ${NUDGE_TO_HINT}` : NOT_UNDERSTOOD });
      }
    } catch (error) {
      const failure = failureMessage(error);
      append({ role: 'system', text: failure.text });
      if (failure.fallBack) setFellBack(true);
    } finally {
      setIsMatching(false);
    }
  };

  const handleHint = () => {
    const level = hintLevels[sceneIndex];
    if (isAnswered || isMatching || level >= MAX_HINT_LEVEL) return;

    setHintLevels((prev) => prev.map((value, i) => (i === sceneIndex ? level + 1 : value)));
    if (level === 0) {
      append({ role: 'system', text: `Dica: ${scene.hint || DEFAULT_HINT}` });
    } else {
      const expected = scene.choices.find(isCorrectChoice);
      append({ role: 'system', text: `Conduta esperada: ${expected?.action ?? DEFAULT_HINT}` });
    }
  };

  const handleContinue = () => {
    if (!isLastScene) {
      setSceneIndex((i) => i + 1);
      setTried([]);
      setChosenKey(null);
      setLastWrong(null);
      setLog([]);
      setInput('');
      setUnmatched(0);
      setFellBack(false);
      return;
    }

    const result = typedMode
      ? calculateTypedScore(attempts.map((a, i) => ({ attempts: a, hintLevel: hintLevels[i] })))
      : calculateGuidedScore(attempts);
    setScore(result);
    onSaveResult?.(result.grade, 10, timer, {
      stationId: station.id,
      mode: 'guided',
      interaction: typedMode ? 'typed' : 'choices',
      timeSpent: timer,
      attemptsByScene: attempts,
      hintsByScene: hintLevels,
      totalWrong: result.totalWrong,
      grade: result.grade,
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // A importação recusa estação sem cenas; isto só protege contra dado corrompido no banco.
  if (!scene) {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 text-center">
        <p className="text-gray-600 font-medium mb-8">Este caso não tem cenas cadastradas.</p>
        <button onClick={onBack} className="bg-[#003366] text-white px-8 py-4 rounded-2xl font-bold uppercase text-xs tracking-widest hover:bg-[#D4A017] transition-all">Voltar</button>
      </div>
    );
  }

  const rightChoice = records[sceneIndex].right;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 pb-24">
      <Header theme={station.theme} title={station.title} onBack={onBack} typed={typedMode} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div className="lg:col-span-1 space-y-6">
          <ContextPanel station={station} />
          {!score && <TimerAndProgress timer={timer} sceneIndex={sceneIndex} total={total} />}
          {!score && <MeasurementsPanel reveals={reveals} />}
        </div>

        <div className="lg:col-span-2 space-y-6">
          {score ? (
            <>
              <Results score={score} timer={timer} records={records} attempts={attempts} hintLevels={hintLevels} reveals={reveals} station={station} typedMode={typedMode} />
              <div className="pt-2 flex justify-center">
                <button onClick={onBack} className="w-full md:w-auto bg-[#D4A017] text-[#003366] px-16 py-5 rounded-[2rem] font-black uppercase text-xs tracking-widest shadow-xl hover:scale-105 active:scale-95 transition-all">
                  Sair do Caso
                </button>
              </div>
            </>
          ) : (
            <>
              <div ref={sceneTopRef} className="scroll-mt-4 space-y-6">
                <SceneIntro narrative={scene.narrative} patient={scene.patient} />

                {typedMode && (log.length > 0 || isMatching) && <ConversationLog log={log} isMatching={isMatching} />}

                {typedMode && !fellBack && !isAnswered && (
                  <Composer value={input} onChange={setInput} onSubmit={handleSubmit} onHint={handleHint} hintLevel={hintLevels[sceneIndex]} isMatching={isMatching} />
                )}

                {showChoices && (
                  <ChoiceList
                    prompt={scene.prompt || DEFAULT_GUIDED_PROMPT}
                    choices={choices}
                    tried={tried}
                    isAnswered={isAnswered}
                    chosenKey={chosenKey}
                    onChoose={handleChoose}
                  />
                )}
              </div>

              {!typedMode && lastWrong && !isAnswered && <div ref={feedbackRef}><FeedbackBox kind="wrong" text={lastWrong.feedback} /></div>}
              {typedMode && <div ref={feedbackRef} />}
              {!typedMode && isAnswered && rightChoice && <div ref={feedbackRef}><FeedbackBox kind="right" text={rightChoice.feedback} /></div>}
              {isAnswered && rightChoice && (
                <div className="flex justify-end">
                  <button onClick={handleContinue} className="bg-[#003366] text-white px-10 py-4 rounded-2xl font-black uppercase text-xs tracking-widest shadow-lg border-2 border-[#D4A017] hover:bg-[#D4A017] hover:text-[#003366] transition-all flex items-center gap-3">
                    {isLastScene ? 'Concluir caso' : 'Continuar'} <ChevronRight size={18} />
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default GuidedRpgView;
