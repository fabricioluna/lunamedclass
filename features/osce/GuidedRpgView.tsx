import React, { useEffect, useMemo, useState } from 'react';
import { GuidedChoice, GuidedOsceStation, GuidedReveal } from '../../types';
import { calculateGuidedScore, GuidedScoreResult, sceneCredit } from '../../utils/guidedScoring';
import { DEFAULT_GUIDED_PROMPT, isCorrectChoice, KeyedChoice, shuffleChoices } from '../../utils/guidedStation';
import {
  Activity, ChevronRight, CheckCircle2, ClipboardList, Gamepad2, Lightbulb, MapPin, MessageCircle,
  RotateCcw, Timer, Trophy, XCircle,
} from 'lucide-react';

export interface GuidedOsceAnalytics {
  stationId: string;
  mode: 'guided';
  timeSpent: number;
  attemptsByScene: number[];
  totalWrong: number;
  grade: number;
}

interface GuidedRpgViewProps {
  station: GuidedOsceStation;
  onBack: () => void;
  onSaveResult?: (score: number, total: number, timeSpent: number, analytics: GuidedOsceAnalytics) => void;
}

// O que aconteceu em cada cena, para o resumo final: as condutas erradas (com a consequência
// narrada) e a certa que fez a cena avançar.
interface SceneRecord {
  wrong: GuidedChoice[];
  right?: GuidedChoice;
}

const formatTime = (seconds: number) => {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
};

// ============================================================================
// MICRO-COMPONENTES
// ============================================================================

const Header = ({ theme, title, onBack }: { theme: string; title: string; onBack: () => void }) => (
  <div className="flex justify-between items-center mb-10 border-b pb-6 gap-4">
    <button onClick={onBack} className="text-[#003366] font-black uppercase text-[10px] flex items-center gap-2 hover:text-[#D4A017] transition-colors shrink-0">
      <RotateCcw size={14} /> Sair do Caso
    </button>
    <div className="text-right">
      <span className="text-[10px] font-black text-[#D4A017] uppercase tracking-widest">{theme}</span>
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

interface ScenePanelProps {
  narrative: string;
  patient?: string;
  prompt: string;
  choices: KeyedChoice[];
  tried: number[];
  isAnswered: boolean;
  chosenKey: number | null;
  onChoose: (choice: KeyedChoice) => void;
}

const ScenePanel = ({ narrative, patient, prompt, choices, tried, isAnswered, chosenKey, onChoose }: ScenePanelProps) => (
  <div className="space-y-6">
    <div className="bg-[#003366] text-white p-8 rounded-[2rem] shadow-xl border-l-8 border-[#D4A017]">
      <p className="text-base leading-relaxed font-medium whitespace-pre-line">{narrative}</p>
    </div>

    {patient && (
      <div className="flex gap-3 items-start">
        <div className="w-10 h-10 shrink-0 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center"><MessageCircle size={18} /></div>
        <div className="bg-white border border-purple-100 rounded-2xl rounded-tl-none px-5 py-4 shadow-sm">
          <p className="text-sm text-gray-800 font-medium italic whitespace-pre-line">"{patient}"</p>
        </div>
      </div>
    )}

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

interface ResultsProps {
  score: GuidedScoreResult;
  timer: number;
  records: SceneRecord[];
  attempts: number[];
  reveals: GuidedReveal[];
  station: GuidedOsceStation;
}

const Results = ({ score, timer, records, attempts, reveals, station }: ResultsProps) => (
  <div className="space-y-8 animate-in fade-in slide-in-from-bottom-10 duration-700">
    <div className="bg-white p-10 rounded-[3rem] shadow-2xl text-center border-b-8 border-[#D4A017] relative overflow-hidden">
      <div className="absolute top-0 right-0 p-8 opacity-10 text-[#003366]"><Trophy size={120} /></div>
      <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] mb-2">Desempenho Técnico</p>
      <h4 className="text-8xl font-black text-[#003366] tracking-tighter">{score.grade.toFixed(1)}</h4>
      <div className="mt-4 flex flex-wrap items-center justify-center gap-2 md:gap-4">
        <span className="px-4 py-1 bg-blue-50 text-blue-600 rounded-full text-[10px] font-black uppercase tracking-widest">Tempo: {formatTime(timer)}</span>
        <span className="px-4 py-1 bg-green-50 text-green-700 rounded-full text-[10px] font-black uppercase tracking-widest">{score.firstTry} de {records.length} de primeira</span>
        {score.totalWrong > 0 && (
          <span className="px-4 py-1 bg-red-50 text-red-600 rounded-full text-[10px] font-black uppercase tracking-widest">{score.totalWrong} escolha{score.totalWrong > 1 ? 's' : ''} errada{score.totalWrong > 1 ? 's' : ''}</span>
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
          const credit = sceneCredit(attempts[i]);
          return (
            <div key={i} className={`p-5 rounded-2xl border-2 ${credit === 1 ? 'bg-green-50 border-green-100' : credit > 0 ? 'bg-yellow-50 border-yellow-100' : 'bg-red-50 border-red-100'}`}>
              <div className="flex items-start gap-4">
                <div className={`w-9 h-9 shrink-0 rounded-xl flex items-center justify-center text-sm font-black text-white ${credit === 1 ? 'bg-green-600' : credit > 0 ? 'bg-yellow-500' : 'bg-red-500'}`}>{i + 1}</div>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-gray-800">{record.right?.action}</p>
                  <span className="text-[9px] font-black uppercase tracking-tighter mt-1 block text-gray-500">
                    {attempts[i] <= 1 ? '✅ De primeira' : `⚠️ ${attempts[i]} tentativas`}
                  </span>
                  {record.right && <p className="text-xs text-gray-600 font-medium mt-2 leading-relaxed">{record.right.feedback}</p>}
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
const GuidedRpgView: React.FC<GuidedRpgViewProps> = ({ station, onBack, onSaveResult }) => {
  const total = station.scenes.length;
  const [sceneIndex, setSceneIndex] = useState(0);
  const [attempts, setAttempts] = useState<number[]>(() => new Array<number>(total).fill(0));
  const [records, setRecords] = useState<SceneRecord[]>(() => Array.from({ length: total }, () => ({ wrong: [] })));
  const [tried, setTried] = useState<number[]>([]);
  const [chosenKey, setChosenKey] = useState<number | null>(null);
  const [lastWrong, setLastWrong] = useState<GuidedChoice | null>(null);
  const [reveals, setReveals] = useState<GuidedReveal[]>([]);
  const [timer, setTimer] = useState(0);
  const [score, setScore] = useState<GuidedScoreResult | null>(null);

  const scene = station.scenes[sceneIndex];
  const isAnswered = chosenKey !== null;
  const isLastScene = sceneIndex === total - 1;

  // Embaralhada uma vez por cena (não a cada render), para a ordem não pular enquanto o aluno lê.
  const choices = useMemo(() => shuffleChoices(scene?.choices ?? []), [scene]);

  useEffect(() => {
    if (score) return;
    const interval = setInterval(() => setTimer((t) => t + 1), 1000);
    return () => clearInterval(interval);
  }, [score]);

  const handleChoose = (choice: KeyedChoice) => {
    if (isAnswered || tried.includes(choice.key)) return;

    setAttempts((prev) => prev.map((value, i) => (i === sceneIndex ? value + 1 : value)));

    if (isCorrectChoice(choice)) {
      setChosenKey(choice.key);
      setLastWrong(null);
      setRecords((prev) => prev.map((record, i) => (i === sceneIndex ? { ...record, right: choice } : record)));
      if (scene.reveals?.length) setReveals((prev) => [...prev, ...scene.reveals!]);
      return;
    }

    setTried((prev) => [...prev, choice.key]);
    setLastWrong(choice);
    setRecords((prev) => prev.map((record, i) => (i === sceneIndex ? { ...record, wrong: [...record.wrong, choice] } : record)));
  };

  const handleContinue = () => {
    if (!isLastScene) {
      setSceneIndex((i) => i + 1);
      setTried([]);
      setChosenKey(null);
      setLastWrong(null);
      return;
    }

    const result = calculateGuidedScore(attempts);
    setScore(result);
    onSaveResult?.(result.grade, 10, timer, {
      stationId: station.id,
      mode: 'guided',
      timeSpent: timer,
      attemptsByScene: attempts,
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
      <Header theme={station.theme} title={station.title} onBack={onBack} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div className="lg:col-span-1 space-y-6">
          <ContextPanel station={station} />
          {!score && <TimerAndProgress timer={timer} sceneIndex={sceneIndex} total={total} />}
          {!score && <MeasurementsPanel reveals={reveals} />}
        </div>

        <div className="lg:col-span-2 space-y-6">
          {score ? (
            <>
              <Results score={score} timer={timer} records={records} attempts={attempts} reveals={reveals} station={station} />
              <div className="pt-2 flex justify-center">
                <button onClick={onBack} className="w-full md:w-auto bg-[#D4A017] text-[#003366] px-16 py-5 rounded-[2rem] font-black uppercase text-xs tracking-widest shadow-xl hover:scale-105 active:scale-95 transition-all">
                  Sair do Caso
                </button>
              </div>
            </>
          ) : (
            <>
              <ScenePanel
                narrative={scene.narrative}
                patient={scene.patient}
                prompt={scene.prompt || DEFAULT_GUIDED_PROMPT}
                choices={choices}
                tried={tried}
                isAnswered={isAnswered}
                chosenKey={chosenKey}
                onChoose={handleChoose}
              />
              {lastWrong && !isAnswered && <FeedbackBox kind="wrong" text={lastWrong.feedback} />}
              {isAnswered && rightChoice && (
                <>
                  <FeedbackBox kind="right" text={rightChoice.feedback} />
                  <div className="flex justify-end">
                    <button onClick={handleContinue} className="bg-[#003366] text-white px-10 py-4 rounded-2xl font-black uppercase text-xs tracking-widest shadow-lg border-2 border-[#D4A017] hover:bg-[#D4A017] hover:text-[#003366] transition-all flex items-center gap-3">
                      {isLastScene ? 'Concluir caso' : 'Continuar'} <ChevronRight size={18} />
                    </button>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default GuidedRpgView;
