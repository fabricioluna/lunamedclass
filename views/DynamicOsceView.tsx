import React, { useState, useEffect, useRef, useCallback } from 'react';
import { DynamicOsceStation, SimulationPhase, ClinicalState } from '../types';
import { Activity, MessageSquare, ShieldCheck, AlertTriangle, ChevronRight, RotateCcw, Award, Timer, BarChart3, Send, HelpCircle, Volume2, VolumeX, UserCircle, History, Zap } from 'lucide-react';
import { fetchAdvancedAI, generateRpgOptions } from '../services/aiService';

// ============================================================================
// LUNA ENGINE: Sintetizador de Áudio Clínico (Web Audio API) - INTEGRAL
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
        playTone(950, 'square', 0.15, 0.04);
        setTimeout(() => playTone(1250, 'square', 0.15, 0.04), 150);
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
  const [inputText, setInputText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [sosOptions, setSosOptions] = useState<any[] | null>(null);

  const currentPhase = station.phases[currentPhaseId];
  const chatEndRef = useRef<HTMLDivElement>(null);

  const isCritical = isMonitorConnected && (
    vitals.sat < 90 || vitals.hr > 130 || vitals.hr < 45 || 
    (vitals.bp ? parseInt(vitals.bp.split('/')[0]) < 85 : false)
  );

  const { playSuccess, playError, isMuted, toggleMute, initAudio } = useClinicalAudio(vitals.hr, isMonitorConnected, isCritical);

  useEffect(() => {
    if (!currentPhase) { setIsFinished(true); return; }
    if (currentPhase.vitals) setVitals(currentPhase.vitals);
    setDynamicNarrative(currentPhase.narrative);
    setSosOptions(null);
  }, [currentPhaseId]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history, isProcessing]);

  const handleTextSubmit = async () => {
    initAudio();
    if (!inputText.trim() || isProcessing || !currentPhase) return;
    const userText = inputText.trim();
    setInputText('');
    setHistory(prev => [...prev, { role: 'user', text: userText }]);
    setIsProcessing(true);

    const monitorKeywords = /(monitor|ox[ií]metr|sinais vitais|ssvv|press[aã]o|eletro|ecg|cabos|satura[çc][aã]o|frequ[êe]ncia)/i;
    if (monitorKeywords.test(userText)) setIsMonitorConnected(true);

    try {
      const res = await fetchAdvancedAI(userText, `Cena Atual: ${dynamicNarrative}`, { transitions: currentPhase.transitions });
      if (res.newPhaseId && res.newPhaseId !== currentPhaseId) {
          playSuccess();
          setScores(prev => ({ ...prev, tecnica: prev.tecnica + 1.0 }));
          setCurrentPhaseId(res.newPhaseId);
      } else if (res.vitalsUpdate && (res.vitalsUpdate.hr > 125 || res.vitalsUpdate.sat < 90)) {
          playError();
          setScores(prev => ({ ...prev, tecnica: prev.tecnica - 0.5 }));
      }
      if (res.vitalsUpdate) setVitals(res.vitalsUpdate);
      if (res.text) {
        setDynamicNarrative(res.text);
        setHistory(prev => [...prev, { role: 'narrator', text: res.text }]);
      }
    } catch (err) {
      setHistory(prev => [...prev, { role: 'narrator', text: "A equipe aguarda ordens." }]);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRequestHelp = async () => {
    initAudio(); setIsProcessing(true);
    const options = await generateRpgOptions(currentPhase.transitions || [], dynamicNarrative || currentPhase.narrative);
    setSosOptions(options); setIsProcessing(false);
  };

  const handleSosChoice = (option: any) => {
    initAudio();
    if (option.isCorrect && option.transitionRef) {
        playSuccess();
        setScores(prev => ({ ...prev, tecnica: prev.tecnica + 0.5 }));
        setCurrentPhaseId(option.transitionRef.nextPhaseId);
        setSosOptions(null);
    } else {
        playError();
        setScores(prev => ({ ...prev, tecnica: prev.tecnica - 1.0 }));
        setSosOptions(prev => prev ? prev.filter(o => o.id !== option.id) : null);
        setHistory(prev => [...prev, { role: 'narrator', text: `Tentativa falha: "${option.text}"` }]);
    }
  };

  if (isFinished) return <div className="h-screen flex items-center justify-center bg-white"><button onClick={onBack} className="bg-[#003366] text-white px-10 py-4 rounded-2xl font-black">VOLTAR AO MENU</button></div>;

  return (
    <div className="max-w-[1600px] mx-auto px-4 h-screen flex flex-col overflow-hidden bg-gray-50/50">
      
      {/* HEADER INTEGRAL */}
      <div className="flex justify-between items-center py-1.5 shrink-0 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <Zap size={14} className="text-blue-600 fill-blue-600"/>
          <h2 className="text-[10px] font-black text-[#003366] uppercase tracking-tighter">{station.title}</h2>
        </div>
        <div className="flex gap-2">
          <button onClick={() => { initAudio(); toggleMute(); }} className="p-1.5 bg-white rounded-lg shadow-sm border border-gray-100">
            {isMuted ? <VolumeX size={14}/> : <Volume2 size={14} className="text-blue-600"/>}
          </button>
          <button onClick={onBack} className="p-1.5 bg-white rounded-lg shadow-sm border border-gray-100 hover:text-red-500 transition-all"><RotateCcw size={14}/></button>
        </div>
      </div>

      <div className="flex-grow grid grid-cols-12 gap-3 overflow-hidden py-3">
        
        {/* COLUNA ESQUERDA: MONITOR GRANDE + HISTÓRICO PEQUENO */}
        <div className="lg:col-span-3 flex flex-col gap-3 overflow-hidden h-full">
          
          {/* MONITOR AUMENTADO (GIGANTE) */}
          <div className={`bg-[#0a0f18] p-8 rounded-[2.5rem] border-4 transition-all duration-500 shrink-0 ${isCritical ? 'border-red-600 shadow-2xl animate-pulse' : 'border-gray-800 shadow-lg'}`}>
            <div className="flex justify-between items-center mb-6 border-b border-white/5 pb-2">
              <span className="text-[10px] font-black uppercase text-gray-400 tracking-[0.2em]">Monitorização Crítica</span>
              <Activity className={isMonitorConnected ? 'text-green-500 animate-pulse' : 'text-gray-700'} size={16}/>
            </div>
            {isMonitorConnected ? (
              <div className="space-y-10 font-mono">
                <div className="flex justify-between items-end border-b border-white/5 pb-4">
                    <span className="text-xs text-gray-500 font-black uppercase">FC</span>
                    <span className={`${vitals.hr > 120 || vitals.hr < 50 ? 'text-red-500' : 'text-green-500'} text-7xl font-black leading-none tracking-tighter`}>{vitals.hr}</span>
                </div>
                <div className="flex justify-between items-end border-b border-white/5 pb-4">
                    <span className="text-xs text-gray-500 font-black uppercase">PA</span>
                    <span className="text-blue-400 text-5xl font-black leading-none">{vitals.bp}</span>
                </div>
                <div className="flex justify-between items-end">
                    <span className="text-xs text-gray-500 font-black uppercase">SpO2</span>
                    <span className={`${vitals.sat < 92 ? 'text-red-500' : 'text-green-400'} text-7xl font-black leading-none tracking-tighter`}>{vitals.sat}%</span>
                </div>
              </div>
            ) : (
              <div className="py-20 text-center text-gray-700 text-[10px] font-black uppercase tracking-widest leading-none">Aguardando<br/>Monitorização</div>
            )}
            <div className={`mt-8 py-3 px-3 rounded-xl text-[12px] font-bold text-center uppercase tracking-widest ${isMonitorConnected ? (isCritical ? 'bg-red-900/40 text-red-200 shadow-inner' : 'bg-green-900/20 text-green-400') : 'bg-gray-800 text-gray-600'}`}>
                {isMonitorConnected ? vitals.status : 'Aparelho Offline'}
            </div>
          </div>

          {/* HISTÓRICO DE LOGS (DIMINUÍDO) */}
          <div className="bg-white p-4 rounded-3xl border border-gray-100 h-[180px] shrink-0 overflow-hidden flex flex-col shadow-sm">
             <div className="flex items-center gap-2 mb-3 border-b pb-2 shrink-0">
               <History size={12} className="text-gray-400"/>
               <span className="text-[8px] font-black uppercase text-gray-400 tracking-widest">Logs de Conduta</span>
             </div>
             <div className="overflow-y-auto space-y-2 flex-grow custom-scrollbar">
                {history.filter(h => h.role === 'user').map((h, i) => (
                    <div key={i} className="text-[8px] text-gray-400 leading-snug italic pl-2 border-l-2 border-blue-50">"{h.text}"</div>
                ))}
             </div>
          </div>
        </div>

        {/* COLUNA DIREITA: CENÁRIO + CHAT ENXUTO + INPUT */}
        <div className="lg:col-span-9 flex flex-col gap-3 overflow-hidden h-full">
          
          {/* QUADRO DO CENÁRIO (ESTRUTURA FIXA NO TOPO) */}
          <div className="bg-[#003366] text-white p-5 rounded-3xl shadow-xl shrink-0 border-l-[6px] border-[#D4A017] min-h-[120px] max-h-[140px] flex flex-col overflow-hidden relative">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16"></div>
            <div className="flex items-center gap-2 mb-2 shrink-0">
                <ShieldCheck size={14} className="text-[#D4A017]"/>
                <span className="text-[8px] font-black uppercase tracking-[0.3em] opacity-70">Contexto da Emergência</span>
            </div>
            <p className="text-sm md:text-lg font-medium leading-relaxed whitespace-pre-wrap overflow-y-auto custom-scrollbar-white pr-3">
                {dynamicNarrative}
            </p>
          </div>

          {/* ÁREA DE CONVERSA (ALTURA REDUZIDA PARA ALINHAMENTO) */}
          <div className="h-[42vh] bg-white rounded-3xl border border-gray-100 shadow-inner flex flex-col overflow-hidden relative shrink-0">
            <div className="flex-grow overflow-y-auto p-5 space-y-5 bg-gray-50/20 custom-scrollbar">
              {history.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center opacity-10">
                      <UserCircle size={50} strokeWidth={1} className="text-[#003366] mb-3"/>
                      <p className="font-black uppercase text-[10px] tracking-[0.4em] text-[#003366]">Diga algo para iniciar</p>
                  </div>
              ) : (
                  history.map((msg, i) => (
                      <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-2`}>
                          <div className={`max-w-[85%] p-4 md:p-5 rounded-[2rem] text-sm md:text-base shadow-sm border ${
                              msg.role === 'user' 
                              ? 'bg-[#003366] text-white border-blue-700 rounded-tr-none' 
                              : 'bg-white border-gray-100 text-gray-800 rounded-tl-none font-medium'
                          }`}>
                              {msg.role === 'narrator' && <span className="block text-[8px] font-black text-blue-500 uppercase mb-1 tracking-widest">Narrador</span>}
                              {msg.text}
                          </div>
                      </div>
                  ))
              )}
              {isProcessing && <div className="flex justify-start animate-pulse"><div className="bg-gray-200 h-10 w-24 rounded-3xl rounded-tl-none"></div></div>}
              <div ref={chatEndRef} />
            </div>
          </div>

          {/* INPUTÁREA ROBUSTA (AQUI O USUÁRIO ESCREVE) */}
          <div className="p-4 bg-white border-t border-gray-100 shrink-0 shadow-lg rounded-3xl">
              {sosOptions ? (
                <div className="animate-in slide-in-from-bottom-2 space-y-4 p-2">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[9px] font-black text-orange-600 uppercase flex items-center gap-2"><HelpCircle size={12}/> Ajuda do Plantonista</span>
                    <button onClick={() => setSosOptions(null)} className="text-[9px] font-black text-gray-400 hover:text-red-500 uppercase">Voltar</button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {sosOptions.map(opt => (
                      <button key={opt.id} onClick={() => handleSosChoice(opt)} className="bg-white border-2 border-orange-100 p-4 rounded-2xl text-left text-xs font-bold hover:border-orange-500 hover:bg-orange-50/50 transition-all flex justify-between items-center group shadow-sm">
                          <span className="leading-snug pr-4">{opt.text}</span>
                          <ChevronRight className="text-orange-200 group-hover:text-orange-500 shrink-0" size={16}/>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex gap-3 items-center max-w-5xl mx-auto px-2">
                  <div className="flex-grow flex bg-gray-100/50 rounded-2xl border-2 border-transparent focus-within:border-blue-600 focus-within:bg-white shadow-inner p-1.5 transition-all group">
                      <input 
                        type="text" 
                        value={inputText} 
                        onChange={e => setInputText(e.target.value)} 
                        onKeyDown={e => e.key === 'Enter' && handleTextSubmit()}
                        placeholder="O que você deseja fazer agora?" 
                        className="flex-grow bg-transparent px-5 py-2.5 outline-none font-medium text-[#003366] text-sm md:text-base placeholder:text-gray-400"
                        disabled={isProcessing}
                      />
                      <button 
                        onClick={handleTextSubmit} 
                        disabled={isProcessing || !inputText.trim()} 
                        className="bg-[#003366] text-white p-3.5 rounded-xl active:scale-95 hover:bg-blue-700 transition-all shadow-xl disabled:opacity-10"
                      >
                        <Send size={20} />
                      </button>
                  </div>
                  <button 
                    onClick={handleRequestHelp} 
                    disabled={isProcessing}
                    className="bg-orange-50 text-orange-600 h-full px-7 py-4 rounded-2xl font-black uppercase text-[10px] border border-orange-100 hover:bg-orange-600 hover:text-white transition-all shadow-sm shrink-0"
                  >
                    Dica
                  </button>
                </div>
              )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DynamicOsceView;