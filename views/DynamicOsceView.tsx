import React, { useState, useEffect, useRef, useCallback } from 'react';
import { DynamicOsceStation, SimulationPhase, ClinicalState } from '../types';
import { Activity, MessageSquare, ShieldCheck, AlertTriangle, ChevronRight, RotateCcw, Award, Timer, BarChart3, Send, HelpCircle, Volume2, VolumeX } from 'lucide-react';
import { evaluateRpgAction, generateRpgOptions } from '../services/aiService';

// ============================================================================
// LUNA ENGINE: Sintetizador de Áudio Clínico (Web Audio API)
// ============================================================================
const useClinicalAudio = (hr: number, isMonitorConnected: boolean, isCritical: boolean) => {
  const audioCtxRef = useRef<AudioContext | null>(null);
  const timerRef = useRef<any>(null); // Usamos 'any' para evitar conflito entre Node/Browser no setInterval
  const [isMuted, setIsMuted] = useState(false);

  const initAudio = useCallback(() => {
    if (!audioCtxRef.current) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) audioCtxRef.current = new AudioCtx();
    }
    if (audioCtxRef.current?.state === 'suspended') {
      audioCtxRef.current.resume();
    }
  }, []);

  const playTone = useCallback((freq = 800, type: OscillatorType = 'sine', duration = 0.1, vol = 0.05) => {
    if (isMuted || !audioCtxRef.current) return;
    try {
      const ctx = audioCtxRef.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(vol, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch (e) {}
  }, [isMuted]);

  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);

    if (!isMonitorConnected || isMuted || hr === 0) return;

    const intervalMs = 60000 / hr; 

    timerRef.current = setInterval(() => {
      if (isCritical) {
        playTone(950, 'square', 0.15, 0.04);
        setTimeout(() => playTone(1250, 'square', 0.15, 0.04), 150);
      } else {
        playTone(750, 'sine', 0.08, 0.02);
      }
    }, intervalMs);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [hr, isMonitorConnected, isCritical, isMuted, playTone]);

  const playSuccess = () => {
    initAudio();
    playTone(600, 'sine', 0.1, 0.05);
    setTimeout(() => playTone(900, 'sine', 0.2, 0.05), 100);
  };

  const playError = () => {
    initAudio();
    playTone(200, 'sawtooth', 0.4, 0.08);
  };

  return { playSuccess, playError, isMuted, toggleMute: () => setIsMuted(!isMuted), initAudio };
};

// ============================================================================

interface DynamicOsceViewProps {
  station: DynamicOsceStation;
  onBack: () => void;
  onSaveResult?: (score: number, total: number, timeSpent: number, analytics: any) => void; 
}

const DynamicOsceView: React.FC<DynamicOsceViewProps> = ({ station, onBack, onSaveResult }) => {
  // 1. Estados de Dados
  const [currentPhaseId, setCurrentPhaseId] = useState<string>(station.initialPhaseId);
  const [vitals, setVitals] = useState<ClinicalState>(station.initialVitals || {
    hr: 80, bp: "120/80", sat: 98, rr: 16, status: "Estável"
  });
  
  // 2. Estados de Simulação
  const [isMonitorConnected, setIsMonitorConnected] = useState(false);
  const [scores, setScores] = useState({ tecnica: 0, comunicacao: 0, biosseguranca: 0 });
  const [history, setHistory] = useState<{ narrative: string, choice: string, feedback: string, phaseId: string }[]>([]);
  const [isFinished, setIsFinished] = useState(false);
  const [lastFeedback, setLastFeedback] = useState<string | null>(null);
  
  // 3. Estados de Controle de UI
  const [startTime] = useState(Date.now());
  const [endTime, setEndTime] = useState<number | null>(null);
  const [inputText, setInputText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [sosOptions, setSosOptions] = useState<{ text: string, isCorrect: boolean, transitionRef: any }[] | null>(null);

  const [rpgTracking, setRpgTracking] = useState({ hintsRequested: 0, textErrors: 0, hintErrors: 0 });
  const currentPhase: SimulationPhase | undefined = station.phases[currentPhaseId];
  const chatEndRef = useRef<HTMLDivElement>(null);

  // ============================================================================
  // CÁLCULO DE ESTADO CRÍTICO (Definido antes de ser usado no som)
  // ============================================================================
  const isCritical = isMonitorConnected && (
    vitals.sat < 90 || 
    vitals.hr > 130 || 
    vitals.hr < 45 || 
    (vitals.bp ? parseInt(vitals.bp.split('/')[0]) < 85 : false)
  );

  // Inicializa Áudio
  const { playSuccess, playError, isMuted, toggleMute, initAudio } = useClinicalAudio(
    vitals.hr, 
    isMonitorConnected, 
    isCritical
  );

  useEffect(() => {
    if (!currentPhase) { setIsFinished(true); return; }
    if (currentPhase.vitals) setVitals(currentPhase.vitals);
    setSosOptions(null);
    setInputText('');
  }, [currentPhaseId, currentPhase]);

  // Motor de Lote (Múltiplos Acertos)
  const executeTransitions = (matches: any[], choiceLabel: string, isPenalty: boolean = false) => {
    let deltaTecnica = 0, deltaComunicacao = 0, deltaBiosseguranca = 0;
    let combinedFeedback: string[] = [];
    let finalNextPhaseId = currentPhaseId;
    let isFatal = false;

    const penaltyFactor = isPenalty ? 0.3 : 1;

    matches.forEach(t => {
        const delta = t.scoreDelta || t.pontuacao_delta || { tecnica: 0, comunicacao: 0, biosseguranca: 0 };
        deltaTecnica += ((delta.tecnica || delta.Tecnica || 0) * penaltyFactor);
        deltaComunicacao += ((delta.comunicacao || delta.Comunicacao || 0) * penaltyFactor);
        deltaBiosseguranca += ((delta.biosseguranca || delta.Biosseguranca || 0) * penaltyFactor);

        if (t.feedbackText) combinedFeedback.push(t.feedbackText);
        if (t.isFatalError) isFatal = true;
        if (t.nextPhaseId && t.nextPhaseId !== 'FINISH') finalNextPhaseId = t.nextPhaseId;
        if (t.nextPhaseId === 'FINISH') finalNextPhaseId = 'FINISH';
    });

    if (isFatal || (deltaTecnica < 0 && !isPenalty)) playError();
    else if (deltaTecnica > 0 || deltaBiosseguranca > 0) playSuccess();

    const newScores = {
      tecnica: scores.tecnica + deltaTecnica,
      comunicacao: scores.comunicacao + deltaComunicacao,
      biosseguranca: scores.biosseguranca + deltaBiosseguranca
    };

    setScores(newScores);
    setLastFeedback(combinedFeedback.join(" + "));
    setHistory(prev => [...prev, {
      narrative: currentPhase?.narrative || "Cena",
      choice: choiceLabel,
      feedback: combinedFeedback.join(" + "),
      phaseId: currentPhaseId
    }]);

    if (isFatal || finalNextPhaseId === 'FINISH') {
      const timeSpent = Math.floor((Date.now() - startTime) / 1000);
      setEndTime(timeSpent);
      if (onSaveResult) onSaveResult(Math.min(Math.max(newScores.tecnica + newScores.comunicacao + newScores.biosseguranca, 0), 10), 10, timeSpent, { performanceMap: newScores, isFatalError: isFatal });
      setIsFinished(true);
      return;
    }
    setCurrentPhaseId(finalNextPhaseId);
  };

  const handleTextSubmit = async () => {
    initAudio();
    if (!inputText.trim() || isProcessing || !currentPhase) return;
    setIsProcessing(true);
    setLastFeedback(null);

    const userText = inputText.trim();
    const transitions = currentPhase.transitions || []; 
    const monitorKeywords = /(monitor|ox[ií]metr|sinais vitais|ssvv|press[aã]o|eletro|ecg|cabos|satura[çc][aã]o|frequ[êe]ncia)/i;
    const isAskingForMonitor = monitorKeywords.test(userText) && !/(n[aã]o|deslig|tirar|remover)/i.test(userText);

    const matchedTransitions = await evaluateRpgAction(userText, transitions, currentPhase.narrative);

    if (matchedTransitions && matchedTransitions.length > 0) {
        if (isAskingForMonitor && !isMonitorConnected) setIsMonitorConnected(true);
        executeTransitions(matchedTransitions, userText);
    } else if (isAskingForMonitor && !isMonitorConnected) {
        setIsMonitorConnected(true);
        playSuccess();
        setLastFeedback("Monitorização instalada.");
        setScores(prev => ({ ...prev, tecnica: prev.tecnica + 0.5 }));
        setHistory(prev => [...prev, { narrative: currentPhase.narrative, choice: userText, feedback: "Monitor ligado.", phaseId: currentPhaseId }]);
    } else {
        playError();
        setLastFeedback("Conduta sem efeito esperado nesta fase.");
        setScores(prev => ({ ...prev, tecnica: prev.tecnica - 0.5 }));
    }
    setIsProcessing(false);
    setInputText('');
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleRequestHelp = async () => {
    initAudio();
    if (!currentPhase) return;
    setIsProcessing(true);
    const options = await generateRpgOptions(currentPhase.transitions || [], currentPhase.narrative);
    setSosOptions(options);
    setIsProcessing(false);
  };

  const handleSosChoice = (option: any) => {
    initAudio();
    if (option.isCorrect && option.transitionRef) {
        executeTransitions([option.transitionRef], `Ajuda: ${option.text}`, true);
    } else {
        playError();
        setScores(prev => ({ ...prev, tecnica: prev.tecnica - 1.0 }));
        setLastFeedback("Conduta incorreta escolhida no SOS.");
    }
  };

  const VitalParam = ({ label, value, unit, icon: Icon, color }: any) => (
    <div className="bg-black/5 p-3 rounded-xl border border-black/5">
      <div className="flex items-center gap-2 mb-1">
        <Icon size={14} className={color} />
        <span className="text-[10px] font-black uppercase text-gray-500 tracking-widest">{label}</span>
      </div>
      <div className="flex items-baseline gap-1">
        <span className={`text-xl font-mono font-bold ${color}`}>{value}</span>
        <span className="text-[9px] text-gray-400 font-bold">{unit}</span>
      </div>
    </div>
  );

  const CompetencyBar = ({ label, value, color, icon: Icon }: any) => {
    const percentage = Math.min(Math.max(value * 10, 0), 100); 
    return (
      <div className="space-y-2">
        <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-gray-500">
          <span className="flex items-center gap-1"><Icon size={12}/> {label}</span>
          <span>{value.toFixed(1)}</span>
        </div>
        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div className={`h-full transition-all duration-1000 ${color}`} style={{ width: `${percentage}%` }} />
        </div>
      </div>
    );
  };

  if (isFinished) {
    const totalScore = Math.min(Math.max(scores.tecnica + scores.comunicacao + scores.biosseguranca, 0), 10);
    const isSuccess = totalScore >= 7;
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 animate-in zoom-in duration-500">
        <div className="bg-white rounded-[3rem] shadow-2xl overflow-hidden border border-gray-100">
          <div className={`${isSuccess ? 'bg-[#003366]' : 'bg-red-900'} p-10 text-center text-white relative`}>
            <h2 className="text-3xl font-black uppercase tracking-tighter mb-2 relative z-10">{isSuccess ? 'Simulação Concluída' : 'Desfecho Crítico'}</h2>
            <p className="text-[#D4A017] font-bold uppercase text-xs tracking-widest relative z-10">Luna Engine Feedback</p>
          </div>
          <div className="p-8 md:p-12 space-y-10">
            <div className="flex flex-col items-center justify-center py-6 bg-gray-50 rounded-[2rem] border border-gray-100">
                <span className="text-[10px] font-black text-gray-400 uppercase mb-2">Nota Final</span>
                <div className="flex items-baseline gap-1">
                    <span className={`text-6xl font-black ${isSuccess ? 'text-[#003366]' : 'text-red-600'}`}>{totalScore.toFixed(1)}</span>
                    <span className="text-gray-300 font-bold">/ 10</span>
                </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <CompetencyBar label="Técnica" value={scores.tecnica} color="bg-blue-500" icon={ShieldCheck} />
              <CompetencyBar label="Comunicação" value={scores.comunicacao} color="bg-green-500" icon={MessageSquare} />
              <CompetencyBar label="Segurança" value={scores.biosseguranca} color="bg-purple-500" icon={Activity} />
            </div>
            <div className="pt-4 flex justify-center">
              <button onClick={onBack} className="w-full md:w-2/3 bg-[#003366] text-white py-5 rounded-2xl font-black uppercase tracking-widest hover:bg-[#D4A017] transition-all">Salvar e Sair</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 pb-32">
      <div className="flex justify-between items-center mb-8 bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100">
        <div>
          <span className="px-2 py-0.5 bg-blue-50 text-blue-600 text-[8px] font-black uppercase rounded border border-blue-100">Híbrido IA</span>
          <h2 className="text-2xl font-black text-[#003366] uppercase tracking-tighter mt-1">{station.title}</h2>
        </div>
        <button onClick={onBack} className="text-gray-400 hover:text-red-500 p-2"><RotateCcw size={20} /></button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-3 space-y-4">
          <div className={`bg-white p-6 rounded-[2rem] shadow-xl border-t-8 sticky top-4 transition-all duration-500 ${isCritical ? 'border-red-600 shadow-[0_0_20px_rgba(220,38,38,0.2)]' : 'border-[#003366]'}`}>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-[10px] font-black text-[#003366] uppercase tracking-widest flex items-center gap-2">
                <Activity size={14} className={isMonitorConnected ? (isCritical ? "animate-pulse text-red-500" : "text-green-500") : "text-gray-400"} />
                VITAIS
              </h3>
              <button onClick={() => { initAudio(); toggleMute(); }} className={`p-1.5 rounded-lg ${isMuted ? 'bg-gray-100 text-gray-400' : 'bg-blue-50 text-blue-600'}`}>
                {isMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
              </button>
            </div>
            {isMonitorConnected ? (
              <div className="grid grid-cols-1 gap-3 animate-in zoom-in">
                <VitalParam label="FC" value={vitals.hr} unit="bpm" icon={Activity} color={vitals.hr > 120 || vitals.hr < 50 ? "text-red-600 animate-pulse" : "text-red-500"} />
                <VitalParam label="PA" value={vitals.bp} unit="mmHg" icon={ShieldCheck} color="text-blue-500" />
                <VitalParam label="SatO2" value={vitals.sat} unit="%" icon={Activity} color={vitals.sat < 90 ? "text-red-600 animate-pulse" : "text-green-600"} />
                <VitalParam label="FR" value={vitals.rr} unit="irpm" icon={Activity} color="text-purple-500" />
              </div>
            ) : (
              <div className="bg-[#0a0f18] rounded-2xl p-6 flex flex-col items-center justify-center text-center border-2 border-gray-800 h-[220px]">
                <Activity size={30} className="text-gray-800 mb-2 opacity-20" />
                <span className="text-gray-500 text-[10px] font-bold">Monitor Desconectado.</span>
              </div>
            )}
            <div className="mt-4 pt-4 border-t border-gray-50 font-mono text-[10px] text-center">
                <div className={`py-2 px-3 rounded-lg uppercase tracking-tighter ${isMonitorConnected ? (isCritical ? 'bg-red-900 text-red-200 animate-pulse' : 'bg-gray-900 text-green-400') : 'bg-gray-100 text-gray-400'}`}>
                    {isMonitorConnected ? vitals.status : 'OFFLINE'}
                </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-9 space-y-6">
          <div className="bg-white p-8 md:p-10 rounded-[3rem] shadow-2xl border border-gray-50 flex flex-col min-h-[500px]">
            <div className="relative z-10 mb-8 flex-grow">
              <span className="inline-block bg-blue-50 text-[#003366] px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest mb-4">Mestre (Narrador)</span>
              <p className="text-xl md:text-2xl text-gray-800 font-medium leading-relaxed">{currentPhase?.narrative}</p>
            </div>
            {lastFeedback && (
              <div className={`p-6 rounded-[2rem] border-l-4 mb-8 flex items-start gap-4 animate-in slide-in-from-left-4 ${lastFeedback.includes("efeito") ? 'bg-red-50 border-red-500' : 'bg-green-50 border-green-500'}`}>
                <div className="flex-grow">
                    <span className="text-[10px] font-black uppercase text-gray-400 tracking-widest block mb-1">Avaliação da Equipe</span>
                    <p className="text-sm font-bold text-gray-800 leading-snug">{lastFeedback}</p>
                </div>
              </div>
            )}
            <div className="mt-auto pt-6 border-t border-gray-100">
                {sosOptions ? (
                    <div className="animate-in slide-in-from-bottom-4 space-y-3">
                        <span className="text-[10px] font-black text-orange-600 uppercase tracking-widest">Auxílio do Plantonista</span>
                        <div className="grid grid-cols-1 gap-2">
                            {sosOptions.map((opt, idx) => (
                                <button key={idx} onClick={() => handleSosChoice(opt)} className="text-left p-4 rounded-xl border-2 border-gray-100 bg-white hover:border-[#D4A017] text-sm font-bold text-gray-700 transition-all">{opt.text}</button>
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col sm:flex-row gap-3">
                        <div className="flex-grow flex bg-gray-50 rounded-2xl border-2 border-transparent focus-within:border-[#D4A017] transition-all p-2 overflow-hidden shadow-inner">
                            <input type="text" value={inputText} onChange={e => setInputText(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleTextSubmit()} placeholder="Ação composta (ex: lavar mãos e monitorizar)..." className="w-full bg-transparent p-3 outline-none font-medium text-[#003366] text-sm" />
                            <button onClick={handleTextSubmit} disabled={isProcessing || !inputText.trim()} className="bg-[#003366] text-white px-6 rounded-xl font-black shadow-md"><Send size={18} /></button>
                        </div>
                        <button onClick={handleRequestHelp} disabled={isProcessing} className="bg-orange-50 text-orange-600 border-2 border-orange-100 px-6 rounded-2xl font-black uppercase text-[10px] flex items-center justify-center gap-2 min-w-[120px]"><HelpCircle size={18}/> SOS</button>
                    </div>
                )}
                {isProcessing && <p className="text-center text-xs font-bold text-[#D4A017] mt-4 animate-pulse">Luna Engine analisando...</p>}
            </div>
            <div ref={chatEndRef} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default DynamicOsceView;