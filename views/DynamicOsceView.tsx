import React, { useState, useEffect, useRef, useCallback } from 'react';
import { DynamicOsceStation, SimulationPhase, ClinicalState } from '../types';
import { Activity, ShieldCheck, ChevronRight, RotateCcw, Award, Send, HelpCircle, Volume2, VolumeX, UserCircle, History, Zap, XCircle } from 'lucide-react';
import { fetchAdvancedAIWithStream, generateRpgOptions, generateFinalFeedback } from '../services/aiService';

// ============================================================================
// LUNA ENGINE: Sintetizador de Áudio Clínico
// ============================================================================
const useClinicalAudio = (hr: number, isMonitorConnected: boolean, isCritical: boolean) => {
  const audioCtxRef = useRef<AudioContext | null>(null);
  const timerRef = useRef<any>(null);
  const [isMuted, setIsMuted] = useState(false);

  const initAudio = useCallback(() => {
    if (!audioCtxRef.current) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) audioCtxRef.current = new AudioCtx();
    }
    if (audioCtxRef.current?.state === 'suspended') audioCtxRef.current.resume();
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
      osc.connect(gain); gain.connect(ctx.destination);
      osc.start(); osc.stop(ctx.currentTime + duration);
    } catch (e) {}
  }, [isMuted]);

  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (!isMonitorConnected || isMuted || hr === 0) return;
    const intervalMs = 60000 / hr; 
    timerRef.current = setInterval(() => {
      if (isCritical) {
        playTone(1000, 'square', 0.2, 0.04);
        setTimeout(() => playTone(1300, 'square', 0.2, 0.04), 150);
      } else {
        playTone(750, 'sine', 0.08, 0.02);
      }
    }, intervalMs);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [hr, isMonitorConnected, isCritical, isMuted, playTone]);

  const playSuccess = () => { initAudio(); playTone(600, 'sine', 0.1, 0.05); setTimeout(() => playTone(900, 'sine', 0.2, 0.05), 100); };
  const playError = () => { initAudio(); playTone(200, 'sawtooth', 0.4, 0.08); };

  return { playSuccess, playError, isMuted, toggleMute: () => setIsMuted(!isMuted), initAudio };
};

// ============================================================================
// MICRO-COMPONENTES DE UI
// ============================================================================

const SimulationHeader = ({ title, progress, onManualEnd, onBack }: any) => (
  <header className="h-[60px] md:h-[70px] bg-white border-b border-gray-200 flex flex-col justify-center px-4 md:px-6 shrink-0 z-50 shadow-sm relative">
    <div className="flex justify-between items-center w-full">
      <div className="flex items-center gap-2 overflow-hidden mr-2">
        <Zap size={16} className="text-blue-600 fill-blue-600 shrink-0"/>
        <h2 className="text-[10px] md:text-[12px] font-black text-[#003366] uppercase tracking-wider truncate">{title}</h2>
      </div>
      
      <div className="flex gap-2 md:gap-4 items-center shrink-0">
        <div className="hidden md:flex items-center gap-2 mr-4 border-r border-gray-200 pr-4">
          <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Conclusão</span>
          <div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-green-500 transition-all duration-700 ease-out" style={{ width: `${progress}%` }}></div>
          </div>
          <span className="text-[10px] font-black text-green-600">{progress.toFixed(0)}%</span>
        </div>

        <button onClick={onManualEnd} className="bg-red-50 text-red-600 px-3 py-1 md:px-4 md:py-1.5 rounded-full text-[8px] md:text-[10px] font-black uppercase border border-red-100 hover:bg-red-600 hover:text-white transition-all shadow-sm flex items-center gap-1.5 md:gap-2">
          <XCircle size={12} className="md:w-3.5 md:h-3.5"/> <span className="hidden sm:inline">Finalizar Atendimento</span><span className="sm:hidden">Finalizar</span>
        </button>
        <RotateCcw size={16} className="md:w-4 md:h-4 text-gray-300 cursor-pointer hover:text-red-500" onClick={onBack}/>
      </div>
    </div>
    <div className="md:hidden w-full h-1 bg-gray-100 absolute bottom-0 left-0">
       <div className="h-full bg-green-500 transition-all duration-700 ease-out" style={{ width: `${progress}%` }}></div>
    </div>
  </header>
);

const VitalsMonitor = ({ vitals, isConnected, isCritical, isMuted, onToggleMute, onInitAudio }: any) => (
  <div className={`bg-[#0a0f18] p-3 md:p-6 rounded-[1.25rem] md:rounded-3xl border-2 md:border-4 transition-all duration-500 shrink-0 ${isCritical ? 'border-red-600 shadow-[0_0_20px_rgba(220,0,0,0.4)] animate-pulse' : 'border-gray-800 shadow-lg'}`}>
    <div className="flex justify-between items-center mb-2 md:mb-4 border-b border-white/5 pb-1.5 md:pb-2">
      <div className="flex items-center gap-1.5 md:gap-2">
        <Activity className={isConnected ? 'text-green-500' : 'text-gray-700'} size={14}/>
        <span className="text-[8px] md:text-[10px] font-black uppercase text-gray-500 tracking-widest">Sinais Vitais</span>
      </div>
      <button onClick={() => { onInitAudio(); onToggleMute(); }} className="text-gray-600 hover:text-white transition-colors">
        {isMuted ? <VolumeX size={16}/> : <Volume2 size={16}/>}
      </button>
    </div>

    {isConnected ? (
      <div className="grid grid-cols-3 lg:flex lg:flex-col gap-2 lg:gap-0 lg:space-y-4 font-mono">
        <div className="flex flex-col lg:flex-row lg:justify-between items-center lg:items-end lg:border-b border-white/5 lg:pb-2 bg-white/5 lg:bg-transparent rounded-lg lg:rounded-none py-1">
          <span className="text-[8px] md:text-[10px] text-gray-500 font-black">FC</span>
          <span className={`${vitals.hr > 120 || vitals.hr < 45 || vitals.hr === 0 ? 'text-red-500' : 'text-green-500'} text-2xl md:text-5xl font-black leading-none mt-0.5 lg:mt-0`}>{vitals.hr}</span>
        </div>
        <div className="flex flex-col lg:flex-row lg:justify-between items-center lg:items-end lg:border-b border-white/5 lg:pb-2 bg-white/5 lg:bg-transparent rounded-lg lg:rounded-none py-1">
          <span className="text-[8px] md:text-[10px] text-gray-500 font-black">PA</span>
          <span className="text-blue-400 text-sm md:text-3xl font-black leading-none mt-0.5 lg:mt-0">{vitals.bp}</span>
        </div>
        <div className="flex flex-col lg:flex-row lg:justify-between items-center lg:items-end bg-white/5 lg:bg-transparent rounded-lg lg:rounded-none py-1">
          <span className="text-[8px] md:text-[10px] text-gray-500 font-black">SpO2</span>
          <span className={`${vitals.sat < 92 ? 'text-red-500' : 'text-green-400'} text-xl md:text-4xl font-black leading-none mt-0.5 lg:mt-0`}>{vitals.sat}%</span>
        </div>
      </div>
    ) : (
      <div className="py-4 md:py-14 text-center text-gray-800 text-[9px] md:text-[11px] font-black uppercase tracking-widest leading-relaxed opacity-40 italic">Aguardando Conexão</div>
    )}
    
    <div className={`mt-2 md:mt-4 py-1.5 md:py-2 px-3 rounded-lg md:rounded-xl text-[8px] md:text-[10px] font-bold text-center uppercase tracking-widest ${isConnected ? (isCritical ? 'bg-red-900/40 text-red-200' : 'bg-gray-800 text-green-400') : 'bg-gray-800/50 text-gray-600'}`}>
      {isConnected ? vitals.status : 'OFFLINE'}
    </div>
  </div>
);

const CompactHistory = ({ history }: { history: any[] }) => (
  <div className="bg-white p-3 md:p-4 rounded-[1.25rem] md:rounded-3xl border border-gray-200 flex-grow max-h-[70px] lg:max-h-none overflow-hidden flex flex-col shadow-sm">
    <div className="flex items-center gap-1.5 md:gap-2 mb-1.5 md:mb-3 border-b pb-1 md:pb-2 shrink-0">
      <History size={12} className="text-gray-400 md:w-3.5 md:h-3.5"/>
      <span className="text-[8px] md:text-[10px] font-black uppercase text-gray-400">Histórico Compacto</span>
    </div>
    <div className="overflow-y-auto space-y-1 md:space-y-2 flex-grow custom-scrollbar pr-2">
      {history.filter(h => h.role === 'user').map((h, i) => (
        <div key={i} className="text-[9px] md:text-[10px] text-gray-400 italic border-l-2 border-blue-100 pl-2 leading-tight truncate md:whitespace-normal">"{h.text}"</div>
      ))}
    </div>
  </div>
);

const ChatBoard = ({ narrative, history, isProcessing, isStreaming, streamingText, chatRef }: any) => (
  <>
    <div className="bg-[#003366] text-white p-3 md:p-4 rounded-[1.25rem] md:rounded-3xl shadow-xl shrink-0 border-l-[4px] md:border-l-[6px] border-[#D4A017] min-h-[60px] md:min-h-[100px] max-h-[15vh] md:max-h-[25vh] flex flex-col overflow-hidden relative">
      <div className="flex items-center gap-1.5 md:gap-2 mb-1 shrink-0 opacity-70">
        <ShieldCheck size={12} className="text-[#D4A017] md:w-3.5 md:h-3.5"/>
        <span className="text-[8px] md:text-[9px] font-black uppercase tracking-[0.2em] md:tracking-[0.3em]">Contexto Clínico</span>
      </div>
      <div className="overflow-y-auto custom-scrollbar-white pr-2">
        <p className="text-xs md:text-base font-medium leading-relaxed italic">{narrative}</p>
      </div>
    </div>

    <div className="flex-grow flex-1 min-h-0 bg-white rounded-t-[1.5rem] md:rounded-t-[2.5rem] border-x border-t border-gray-200 shadow-inner flex flex-col overflow-hidden relative mt-2 md:mt-3">
      <div ref={chatRef} className="flex-grow overflow-y-auto p-3 md:p-6 space-y-4 md:space-y-6 bg-gray-50/20 custom-scrollbar">
        {history.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center opacity-10">
            <UserCircle size={40} strokeWidth={1} className="text-[#003366] mb-2 md:w-16 md:h-16"/>
            <p className="font-black uppercase text-[9px] md:text-[11px] tracking-[0.3em] md:tracking-[0.4em]">Protocolo Luna Engine</p>
          </div>
        ) : (
          history.map((msg: any, i: number) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-2`}>
              <div className={`max-w-[85%] md:max-w-[80%] p-2.5 px-4 md:p-3 md:px-5 rounded-xl md:rounded-2xl text-xs md:text-sm shadow-sm border ${
                msg.role === 'user' ? 'bg-[#003366] text-white border-blue-800 rounded-tr-none' : 'bg-white border-gray-100 text-gray-800 rounded-tl-none font-medium'
              }`}>
                {msg.role === 'narrator' && <span className="block text-[7px] md:text-[8px] font-black text-[#D4A017] uppercase mb-0.5 tracking-widest">Equipe / Narrador</span>}
                {msg.text}
              </div>
            </div>
          ))
        )}
        
        {isStreaming && (
           <div className="flex justify-start animate-in slide-in-from-bottom-2">
             <div className="max-w-[85%] md:max-w-[80%] p-2.5 px-4 md:p-3 md:px-5 rounded-xl md:rounded-2xl text-xs md:text-sm shadow-sm border bg-white border-gray-100 text-gray-800 rounded-tl-none font-medium whitespace-pre-wrap">
               <span className="block text-[7px] md:text-[8px] font-black text-[#D4A017] uppercase mb-0.5 tracking-widest">Equipe / Narrador</span>
               {streamingText}
               <span className="inline-block w-1.5 h-3 ml-1 bg-gray-400 animate-pulse align-middle"></span>
             </div>
           </div>
        )}

        {isProcessing && !isStreaming && (
          <div className="flex justify-start items-center gap-2 animate-pulse">
            <div className="bg-gray-200 h-8 md:h-10 w-20 md:w-24 rounded-full md:rounded-3xl"></div>
            <span className="text-[8px] md:text-[10px] font-black text-gray-300 uppercase"> Analisando Cena...</span>
          </div>
        )}
      </div>
    </div>
  </>
);

const FeedbackScreen = ({ endReason, feedback, onFinish }: any) => (
  <div className="h-screen w-full flex flex-col items-center justify-center bg-gray-50 p-4 md:p-6 text-center overflow-y-auto">
    <div className="max-w-2xl w-full bg-white p-6 md:p-12 rounded-[2rem] md:rounded-[3rem] shadow-2xl border border-gray-100 animate-in zoom-in-95 duration-500 my-auto">
      {endReason === 'death' ? <XCircle size={60} className="text-red-500 mb-4 md:mb-6 mx-auto animate-pulse md:w-20 md:h-20" /> : <Award size={60} className="text-[#003366] mb-4 md:mb-6 mx-auto animate-bounce md:w-20 md:h-20" />}
      <h2 className="text-xl md:text-3xl font-black text-[#003366] uppercase mb-2 md:mb-4 tracking-tighter">
        {endReason === 'death' ? "ÓBITO CONFIRMADO" : "SIMULAÇÃO ENCERRADA"}
      </h2>
      
      {!feedback ? (
        <div className="py-8 md:py-10 flex flex-col items-center">
          <div className="w-8 h-8 md:w-10 md:h-10 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin mb-3 md:mb-4"></div>
          <p className="text-gray-400 font-bold text-[9px] md:text-[10px] uppercase tracking-widest">Luna está avaliando seu desempenho...</p>
        </div>
      ) : (
        <div className="text-left space-y-4 md:space-y-6 animate-in fade-in duration-700 mt-4">
          <div className="bg-blue-50/50 p-4 md:p-5 rounded-xl md:rounded-2xl border border-blue-100">
            <h4 className="text-[9px] md:text-[10px] font-black text-[#003366] uppercase mb-1.5 md:mb-2">🤝 Postura e Comunicação</h4>
            <p className="text-gray-600 text-xs md:text-sm italic">"{feedback.postura}"</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
            <div className="bg-green-50 p-3 md:p-4 rounded-xl md:rounded-2xl">
              <h4 className="text-[9px] md:text-[10px] font-black text-green-600 uppercase mb-1.5 md:mb-2">🎯 Acertos</h4>
              <ul className="text-[10px] md:text-[11px] text-green-700 space-y-1">
                {feedback.acertos?.map((a:string, i:number) => <li key={i}>• {a}</li>)}
              </ul>
            </div>
            <div className="bg-red-50 p-3 md:p-4 rounded-xl md:rounded-2xl">
              <h4 className="text-[9px] md:text-[10px] font-black text-red-600 uppercase mb-1.5 md:mb-2">⚠️ Omissões</h4>
              <ul className="text-[10px] md:text-[11px] text-red-700 space-y-1">
                {feedback.omissoes?.map((o:string, i:number) => <li key={i}>• {o}</li>)}
              </ul>
            </div>
          </div>
          <div className="bg-[#003366] p-4 md:p-6 rounded-2xl md:rounded-3xl flex justify-between items-center shadow-xl mt-4">
            <div>
              <span className="text-blue-300 text-[9px] md:text-[10px] font-black uppercase">Nota Final</span>
              <div className="text-3xl md:text-4xl font-black text-white">{Number(feedback.nota).toFixed(1)}</div>
            </div>
            <button 
              onClick={onFinish} 
              className="bg-[#D4A017] text-white px-6 py-3 md:px-10 md:py-4 rounded-xl md:rounded-2xl font-black uppercase text-[10px] md:text-xs hover:scale-105 transition-all shadow-lg"
            >
              Finalizar
            </button>
          </div>
        </div>
      )}
    </div>
  </div>
);

// ============================================================================
// O ORQUESTRADOR PRINCIPAL (MAESTRO) COM STREAMING
// ============================================================================
interface DynamicOsceViewProps {
  station: DynamicOsceStation;
  onBack: () => void;
  onSaveResult?: (score: number, total: number, timeSpent: number, analytics: any) => void; 
}

const DynamicOsceView: React.FC<DynamicOsceViewProps> = ({ station, onBack, onSaveResult }) => {
  const [currentPhaseId, setCurrentPhaseId] = useState<string>(station.initialPhaseId);
  const [vitals, setVitals] = useState<ClinicalState>(station.initialVitals || { hr: 80, bp: "120/80", sat: 98, rr: 16, status: "Estável" });
  const [dynamicNarrative, setDynamicNarrative] = useState<string | null>(null);
  const [isMonitorConnected, setIsMonitorConnected] = useState(false);
  const [scores, setScores] = useState({ tecnica: 0, comunicacao: 0, biosseguranca: 0 });
  const [history, setHistory] = useState<{ role: 'user' | 'narrator', text: string }[]>([]);
  const [isFinished, setIsFinished] = useState(false);
  const [endReason, setEndReason] = useState<'success' | 'death' | 'manual'>('success');
  const [inputText, setInputText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [sosOptions, setSosOptions] = useState<any[] | null>(null);
  const [finalFeedback, setFinalFeedback] = useState<any | null>(null);
  
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState('');

  const currentPhase = station.phases[currentPhaseId];
  const chatContainerRef = useRef<HTMLDivElement>(null);

  const isCritical = isMonitorConnected && (vitals.sat < 90 || vitals.hr > 125 || vitals.hr < 45 || vitals.hr === 0);
  const { playSuccess, playError, isMuted, toggleMute, initAudio } = useClinicalAudio(vitals.hr, isMonitorConnected, isCritical);

  useEffect(() => {
    if (!currentPhase) { handleFinishSim('success'); return; }
    if (currentPhase.vitals && !isProcessing) setVitals(currentPhase.vitals);
    setDynamicNarrative(currentPhase.narrative);
    setSosOptions(null);
  }, [currentPhaseId]);

  useEffect(() => {
    if (chatContainerRef.current) {
        const container = chatContainerRef.current;
        container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
    }
    if (vitals.hr === 0 && isMonitorConnected && !isFinished && !isProcessing) {
      handleFinishSim('death');
    }
  }, [history, isProcessing, isStreaming, streamingText, vitals.hr, isFinished]);

  const handleFinishSim = async (reason: 'success' | 'death' | 'manual') => {
    if (isFinished) return;
    setEndReason(reason);
    setIsFinished(true);
    setIsProcessing(true);
    try {
      const feedback = await generateFinalFeedback(history, station.title);
      setFinalFeedback(feedback);
    } catch (err) {
      console.error("Erro ao gerar feedback final:", err);
      setFinalFeedback({ postura: "Erro no servidor. Pontuação parcial salva.", acertos: [], omissoes: [], nota: Math.max(0, scores.tecnica) });
    } finally {
      setIsProcessing(false);
    }
  };

  const processAction = async (text: string, isFromSOS: boolean = false) => {
    initAudio();
    if (!text.trim() || isProcessing || !currentPhase || isFinished) return;
    
    setIsProcessing(true);
    setHistory(prev => [...prev, { role: 'user', text: isFromSOS ? `[AJUDA DO PRECEPTOR] A equipe conduta: ${text}` : text }]);
    setInputText('');

    if (/(monitor|ox[ií]metr|sinais vitais|ssvv|press[aã]o|eletro|ecg|cabos|satura[çc][aã]o|frequ[êe]ncia)/i.test(text)) setIsMonitorConnected(true);

    setIsStreaming(true);
    setStreamingText('');

    const systemPrompt = `Você é o paciente e o ambiente clínico. Cena Atual: ${dynamicNarrative}
    REGRA ABSOLUTA DE INTERATIVIDADE: Aja de forma imersiva e realista. Nunca responda apenas com reticências ("..."). Sempre descreva detalhadamente a reação física do paciente, sua fala (se houver), ou as mudanças sutis percebidas no exame físico em resposta à conduta da equipe médica.`;

    try {
      const res = await fetchAdvancedAIWithStream(
        text, 
        systemPrompt, 
        { transitions: currentPhase.transitions },
        (partialText) => {
          setStreamingText(partialText.replace(/^(Narrador|Paciente):\s*/i, ''));
        }
      );
      
      setIsStreaming(false);

      if (res?.newPhaseId === "FINISH" || /simula[çc][aã]o encerrada|óbito confirmado/i.test(res?.text || "")) {
        handleFinishSim(vitals.hr === 0 ? 'death' : 'success');
        return;
      }

      if (res?.newPhaseId && res.newPhaseId !== currentPhaseId) {
          playSuccess();
          setScores(prev => ({ ...prev, tecnica: prev.tecnica + (isFromSOS ? 0.2 : 1.0) }));
          setCurrentPhaseId(res.newPhaseId);
      } else if (res?.vitalsUpdate && (res.vitalsUpdate.hr > 125 || res.vitalsUpdate.sat < 90)) {
          playError();
          setScores(prev => ({ ...prev, tecnica: prev.tecnica - 0.5 }));
      }

      if (res?.vitalsUpdate) setVitals(res.vitalsUpdate);
      
      if (res?.text && res.text.trim() !== "..." && res.text.trim() !== "") {
        let cleanText = res.text.replace(/^(Narrador|Paciente):\s*/i, '').trim();
        setDynamicNarrative(cleanText);
        setHistory(prev => [...prev, { role: 'narrator', text: cleanText }]);
      } else {
        setHistory(prev => [...prev, { role: 'narrator', text: "O paciente observa atentamente a sua conduta. Os achados clínicos permanecem inalterados." }]);
      }
    } catch (err) {
      setIsStreaming(false);
      setHistory(prev => [...prev, { role: 'narrator', text: "A equipe aguarda ordens clínicas claras para prosseguir." }]);
    } finally {
      setIsProcessing(false);
      setStreamingText('');
    }
  };

  const handleRequestHelp = async () => {
    initAudio(); 
    setIsProcessing(true);
    setScores(prev => ({ ...prev, tecnica: prev.tecnica - 1.0 }));
    
    try {
      const options = await generateRpgOptions(currentPhase.transitions || [], dynamicNarrative || currentPhase.narrative);
      if (options && options.length > 0) {
         setSosOptions(options); 
      } else {
         setHistory(prev => [...prev, { role: 'narrator', text: "⚠️ [SISTEMA] O preceptor está indisponível no momento. Você deve prosseguir com o seu raciocínio clínico." }]);
      }
    } catch (error) {
      console.error("Erro no SOS:", error);
      setHistory(prev => [...prev, { role: 'narrator', text: "⚠️ [SISTEMA] O preceptor está indisponível no momento. Você deve prosseguir com o seu raciocínio clínico." }]);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSosChoice = async (option: any) => {
    setSosOptions(null);
    await processAction(option.text, true); 
  };

  const handleManualEnd = () => {
    if(window.confirm("Deseja encerrar o atendimento para colher o feedback final?")) handleFinishSim('manual');
  };

  const totalPhases = Object.keys(station.phases).length;
  const maxExpectedScore = Math.max(1, totalPhases - 1);
  let progressPercent = (scores.tecnica / maxExpectedScore) * 100;
  if (progressPercent > 100) progressPercent = 100;
  if (progressPercent < 0) progressPercent = 0;
  if (isFinished && endReason === 'success') progressPercent = 100;

  if (isFinished) return <FeedbackScreen endReason={endReason} feedback={finalFeedback} onFinish={() => { if(onSaveResult && finalFeedback) onSaveResult(finalFeedback.nota, 10, 0, { history, feedback: finalFeedback }); onBack(); }} />;

  return (
    <div className="h-screen w-full flex flex-col overflow-hidden bg-gray-100 select-none">
      <SimulationHeader title={station.title} progress={progressPercent} onManualEnd={handleManualEnd} onBack={onBack} />
      
      <main className="flex-grow flex flex-col lg:flex-row p-2 md:p-3 gap-2 md:gap-3 overflow-hidden min-h-0">
        <aside className="w-full lg:w-[340px] flex flex-col gap-2 md:gap-3 shrink-0 h-auto lg:h-full lg:overflow-hidden">
          <VitalsMonitor vitals={vitals} isConnected={isMonitorConnected} isCritical={isCritical} isMuted={isMuted} onToggleMute={toggleMute} onInitAudio={initAudio} />
          <CompactHistory history={history} />
        </aside>

        <section className="flex-grow flex flex-col h-full overflow-hidden min-h-0 relative">
          <ChatBoard narrative={dynamicNarrative} history={history} isProcessing={isProcessing} isStreaming={isStreaming} streamingText={streamingText} chatRef={chatContainerRef} />
          
          <div className="p-2 md:p-4 bg-white border-x border-b border-t border-gray-200 shrink-0 mt-auto rounded-b-[1.5rem] md:rounded-b-[2.5rem] shadow-inner">
            {sosOptions ? (
              <div className="animate-in slide-in-from-bottom-2 space-y-2 md:space-y-4">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-[9px] md:text-[10px] font-black text-orange-600 uppercase flex items-center gap-1.5 md:gap-2"><HelpCircle size={12} className="md:w-3.5 md:h-3.5"/> SOS MÉDICO (Ajuda Solicitada)</span>
                  <button onClick={() => setSosOptions(null)} className="text-[9px] md:text-[10px] font-black text-gray-400 hover:text-red-500 uppercase">Fechar</button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-3 max-h-[30vh] overflow-y-auto custom-scrollbar">
                  {sosOptions.map((opt: any) => (
                    <button key={opt.id} onClick={() => handleSosChoice(opt)} className="bg-white border-2 border-orange-100 p-3 md:p-4 rounded-xl md:rounded-3xl text-left text-[11px] md:text-xs font-bold hover:border-orange-500 hover:bg-orange-50/50 transition-all flex justify-between items-center group shadow-sm">
                        <span className="leading-snug pr-2 md:pr-4 truncate block">{opt.text}</span>
                        <ChevronRight className="text-orange-200 group-hover:text-orange-500 shrink-0" size={16}/>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex gap-1.5 md:gap-3 items-center max-w-5xl mx-auto px-1 md:px-2">
                <div className="flex-grow flex bg-gray-100/50 rounded-xl md:rounded-2xl border-2 border-transparent focus-within:border-[#003366] focus-within:bg-white shadow-inner p-1 md:p-1.5 transition-all group">
                    <input 
                      type="text" value={inputText} onChange={e => setInputText(e.target.value)} onKeyDown={e => e.key === 'Enter' && processAction(inputText)}
                      placeholder="Descreva sua conduta..." className="flex-grow bg-transparent px-3 py-2 md:px-5 md:py-2.5 outline-none font-medium text-[#003366] text-xs md:text-base placeholder:text-gray-400 min-w-0" disabled={isProcessing}
                    />
                    <button onClick={() => processAction(inputText)} disabled={isProcessing || !inputText.trim()} className="bg-[#003366] text-white p-2.5 md:p-3.5 rounded-lg md:rounded-xl active:scale-95 hover:bg-[#D4A017] transition-all shadow-xl disabled:opacity-10 shrink-0">
                      <Send size={16} className="md:w-5 md:h-5" />
                    </button>
                </div>
                <button onClick={handleRequestHelp} disabled={isProcessing} className="bg-orange-50 text-orange-600 h-full px-4 py-2.5 md:px-7 md:py-4 rounded-xl md:rounded-2xl font-black uppercase text-[9px] md:text-[10px] border border-orange-100 hover:bg-orange-600 hover:text-white transition-all shadow-sm shrink-0 flex items-center justify-center">
                  SOS
                </button>
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
};

export default DynamicOsceView;