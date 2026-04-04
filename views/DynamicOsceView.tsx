import React, { useState, useEffect, useRef, useCallback } from 'react';
import { DynamicOsceStation, SimulationPhase, ClinicalState } from '../types';
import { Activity, MessageSquare, ShieldCheck, AlertTriangle, ChevronRight, RotateCcw, Award, Timer, BarChart3, Send, HelpCircle, Volume2, VolumeX, UserCircle, History, Zap, XCircle, CheckCircle2 } from 'lucide-react';
import { fetchAdvancedAI, generateRpgOptions, generateFinalFeedback } from '../services/aiService';

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

  const currentPhase = station.phases[currentPhaseId];
  // ALTERAÇÃO DE SCROLL: Referência ao container inteiro em vez do elemento final
  const chatContainerRef = useRef<HTMLDivElement>(null);

  const isCritical = isMonitorConnected && (vitals.sat < 90 || vitals.hr > 125 || vitals.hr < 45 || vitals.hr === 0);
  const { playSuccess, playError, isMuted, toggleMute, initAudio } = useClinicalAudio(vitals.hr, isMonitorConnected, isCritical);

  useEffect(() => {
    if (!currentPhase) { handleFinishSim('success'); return; }
    if (currentPhase.vitals && !isProcessing) setVitals(currentPhase.vitals);
    setDynamicNarrative(currentPhase.narrative);
    setSosOptions(null);
  }, [currentPhaseId]);

  // ALTERAÇÃO DE SCROLL: Forçar o scroll APENAS dentro do chat
  useEffect(() => {
    if (chatContainerRef.current) {
        const container = chatContainerRef.current;
        container.scrollTo({
            top: container.scrollHeight,
            behavior: 'smooth'
        });
    }
    if (vitals.hr === 0 && isMonitorConnected && !isFinished) {
       handleFinishSim('death');
    }
  }, [history, isProcessing, vitals.hr, isFinished]);

  const handleFinishSim = async (reason: 'success' | 'death' | 'manual') => {
    setEndReason(reason);
    setIsFinished(true);
    setIsProcessing(true);
    try {
      const feedback = await generateFinalFeedback(history, station.title);
      setFinalFeedback(feedback);
    } catch (err) {
      console.error("Erro ao gerar feedback final:", err);
    } finally {
      setIsProcessing(false);
    }
  };

  const processAction = async (text: string) => {
    initAudio();
    if (!text.trim() || isProcessing || !currentPhase) return;
    setIsProcessing(true);
    setHistory(prev => [...prev, { role: 'user', text }]);
    setInputText('');

    if (/(monitor|ox[ií]metr|sinais vitais|ssvv|press[aã]o|eletro|ecg|cabos|satura[çc][aã]o|frequ[êe]ncia)/i.test(text)) setIsMonitorConnected(true);

    try {
      const res = await fetchAdvancedAI(text, `Cena: ${dynamicNarrative}`, { transitions: currentPhase.transitions });
      
      if (res.newPhaseId === "FINISH") {
        handleFinishSim('success');
        return;
      }

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

  const handleSosChoice = async (option: any) => {
    setSosOptions(null);
    await processAction(option.text); 
  };

  const handleManualEnd = () => {
    if(window.confirm("Deseja encerrar o atendimento para colher o feedback final?")) {
      handleFinishSim('manual');
    }
  };

  if (isFinished) return (
    <div className="h-screen w-full flex flex-col items-center justify-center bg-gray-50 p-6 text-center overflow-y-auto">
        <div className="max-w-2xl w-full bg-white p-8 md:p-12 rounded-[3rem] shadow-2xl border border-gray-100 animate-in zoom-in-95 duration-500">
            {endReason === 'death' ? <XCircle size={80} className="text-red-500 mb-6 mx-auto animate-pulse" /> : <Award size={80} className="text-[#003366] mb-6 mx-auto animate-bounce" />}
            <h2 className="text-3xl font-black text-[#003366] uppercase mb-4 tracking-tighter">
              {endReason === 'death' ? "ÓBITO CONFIRMADO" : "SIMULAÇÃO ENCERRADA"}
            </h2>
            
            {!finalFeedback ? (
              <div className="py-10 flex flex-col items-center">
                <div className="w-10 h-10 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin mb-4"></div>
                <p className="text-gray-400 font-bold text-[10px] uppercase tracking-widest">Luna está avaliando seu desempenho...</p>
              </div>
            ) : (
              <div className="text-left space-y-6 animate-in fade-in duration-700">
                <div className="bg-blue-50/50 p-5 rounded-2xl border border-blue-100">
                  <h4 className="text-[10px] font-black text-[#003366] uppercase mb-2">🤝 Postura e Comunicação</h4>
                  <p className="text-gray-600 text-sm italic">"{finalFeedback.postura}"</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-green-50 p-4 rounded-2xl">
                    <h4 className="text-[10px] font-black text-green-600 uppercase mb-2">🎯 Acertos</h4>
                    <ul className="text-[11px] text-green-700 space-y-1">
                      {finalFeedback.acertos.map((a:string, i:number) => <li key={i}>• {a}</li>)}
                    </ul>
                  </div>
                  <div className="bg-red-50 p-4 rounded-2xl">
                    <h4 className="text-[10px] font-black text-red-600 uppercase mb-2">⚠️ Omissões</h4>
                    <ul className="text-[11px] text-red-700 space-y-1">
                      {finalFeedback.omissoes.map((o:string, i:number) => <li key={i}>• {o}</li>)}
                    </ul>
                  </div>
                </div>
                <div className="bg-[#003366] p-6 rounded-3xl flex justify-between items-center shadow-xl">
                  <div>
                    <span className="text-blue-300 text-[10px] font-black uppercase">Nota Final</span>
                    <div className="text-4xl font-black text-white">{Number(finalFeedback.nota).toFixed(1)}</div>
                  </div>
                  <button 
                    onClick={() => {
                      if(onSaveResult && finalFeedback) onSaveResult(finalFeedback.nota, 10, 0, { history, feedback: finalFeedback });
                      onBack();
                    }} 
                    className="bg-[#D4A017] text-white px-10 py-4 rounded-2xl font-black uppercase text-xs hover:scale-105 transition-all shadow-lg"
                  >
                    Finalizar
                  </button>
                </div>
              </div>
            )}
        </div>
    </div>
  );

  return (
    <div className="h-screen w-full flex flex-col overflow-hidden bg-gray-100 select-none">
      
      {/* HEADER FIXO */}
      <header className="h-[56px] bg-white border-b border-gray-200 flex justify-between items-center px-6 shrink-0 z-50 shadow-sm">
        <div className="flex items-center gap-2">
          <Zap size={18} className="text-blue-600 fill-blue-600"/>
          <h2 className="text-[12px] font-black text-[#003366] uppercase tracking-wider">{station.title}</h2>
        </div>
        <div className="flex gap-4 items-center">
          <button onClick={handleManualEnd} className="bg-red-50 text-red-600 px-4 py-1.5 rounded-full text-[10px] font-black uppercase border border-red-100 hover:bg-red-600 hover:text-white transition-all shadow-sm flex items-center gap-2">
            <XCircle size={14}/> Finalizar Atendimento
          </button>
          <RotateCcw size={18} className="text-gray-300 cursor-pointer hover:text-red-500" onClick={onBack}/>
        </div>
      </header>

      {/* ÁREA DE TRABALHO PRINCIPAL */}
      <main className="flex-grow flex flex-col md:flex-row p-3 gap-3 overflow-hidden">
        
        {/* COLUNA ESQUERDA - FOCO EM VITAIS MAIORES */}
        <aside className="w-full md:w-[340px] flex flex-col gap-3 h-auto md:h-full overflow-hidden shrink-0">
          
          {/* MONITOR CARDIÁCO - AUMENTADO CONFORME SOLICITADO */}
          <div className={`bg-[#0a0f18] p-6 rounded-3xl border-4 transition-all duration-500 shrink-0 ${isCritical ? 'border-red-600 shadow-[0_0_20px_rgba(220,0,0,0.4)] animate-pulse' : 'border-gray-800 shadow-lg'}`}>
            <div className="flex justify-between items-center mb-4 border-b border-white/5 pb-2">
              <div className="flex items-center gap-2">
                <Activity className={isMonitorConnected ? 'text-green-500' : 'text-gray-700'} size={16}/>
                <span className="text-[10px] font-black uppercase text-gray-500 tracking-widest">Sinais Vitais</span>
              </div>
              <button onClick={() => { initAudio(); toggleMute(); }} className="text-gray-600 hover:text-white transition-colors">
                {isMuted ? <VolumeX size={18}/> : <Volume2 size={18}/>}
              </button>
            </div>

            {isMonitorConnected ? (
              <div className="space-y-4 font-mono">
                <div className="flex justify-between items-end border-b border-white/5 pb-2">
                    <span className="text-[10px] text-gray-500 font-black">FC</span>
                    <span className={`${vitals.hr > 120 || vitals.hr < 45 || vitals.hr === 0 ? 'text-red-500' : 'text-green-500'} text-5xl font-black leading-none`}>{vitals.hr}</span>
                </div>
                <div className="flex justify-between items-end border-b border-white/5 pb-2">
                    <span className="text-[10px] text-gray-500 font-black">PA</span>
                    <span className="text-blue-400 text-3xl font-black leading-none">{vitals.bp}</span>
                </div>
                <div className="flex justify-between items-end">
                    <span className="text-[10px] text-gray-500 font-black">SpO2</span>
                    <span className={`${vitals.sat < 92 ? 'text-red-500' : 'text-green-400'} text-4xl font-black leading-none`}>{vitals.sat}%</span>
                </div>
              </div>
            ) : (
              <div className="py-14 text-center text-gray-800 text-[11px] font-black uppercase tracking-widest leading-relaxed opacity-40 italic">Aguardando Conexão</div>
            )}
            
            <div className={`mt-4 py-2 px-3 rounded-xl text-[10px] font-bold text-center uppercase tracking-widest ${isMonitorConnected ? (isCritical ? 'bg-red-900/40 text-red-200' : 'bg-gray-800 text-green-400') : 'bg-gray-800/50 text-gray-600'}`}>
                {isMonitorConnected ? vitals.status : 'OFFLINE'}
            </div>
          </div>

          {/* HISTÓRICO - DIMINUÍDO CONFORME SOLICITADO */}
          <div className="bg-white p-4 rounded-3xl border border-gray-200 flex-grow max-h-[120px] md:max-h-none overflow-hidden flex flex-col shadow-sm">
             <div className="flex items-center gap-2 mb-3 border-b pb-2 shrink-0">
               <History size={14} className="text-gray-400"/>
               <span className="text-[10px] font-black uppercase text-gray-400">Histórico Compacto</span>
             </div>
             <div className="overflow-y-auto space-y-2 flex-grow custom-scrollbar pr-2">
                {history.filter(h => h.role === 'user').map((h, i) => (
                    <div key={i} className="text-[10px] text-gray-400 italic border-l-2 border-blue-100 pl-2 leading-tight">"{h.text}"</div>
                ))}
             </div>
          </div>
        </aside>

        {/* COLUNA DIREITA - CENÁRIO E CHAT */}
        <section className="flex-grow flex flex-col gap-3 h-full overflow-hidden">
          
          {/* CENÁRIO - AUMENTADO PARA CABER TEXTO COMPLETO */}
          <div className="bg-[#003366] text-white p-4 rounded-3xl shadow-xl shrink-0 border-l-[6px] border-[#D4A017] min-h-[100px] max-h-[25vh] flex flex-col overflow-hidden relative">
            <div className="flex items-center gap-2 mb-1 shrink-0 opacity-70">
                <ShieldCheck size={14} className="text-[#D4A017]"/>
                <span className="text-[9px] font-black uppercase tracking-[0.3em]">Contexto Clínico</span>
            </div>
            <div className="overflow-y-auto custom-scrollbar-white pr-2">
              <p className="text-sm md:text-base font-medium leading-relaxed italic">{dynamicNarrative}</p>
            </div>
          </div>

          {/* CHAT - QUADRO DE CONVERSA OTIMIZADO COM REF NA DIV PAI */}
          <div className="flex-grow flex-1 min-h-0 bg-white rounded-[2.5rem] border border-gray-200 shadow-inner flex flex-col overflow-hidden relative">
            {/* Div Container de Mensagens - onde ocorre o scroll isolado */}
            <div ref={chatContainerRef} className="flex-grow overflow-y-auto p-6 space-y-6 bg-gray-50/20 custom-scrollbar">
              {history.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center opacity-10">
                      <UserCircle size={60} strokeWidth={1} className="text-[#003366] mb-2"/>
                      <p className="font-black uppercase text-[11px] tracking-[0.4em]">Protocolo Luna Engine</p>
                  </div>
              ) : (
                  history.map((msg, i) => (
                      <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-2`}>
                          <div className={`max-w-[80%] p-3 px-5 rounded-2xl text-sm shadow-sm border ${
                              msg.role === 'user' 
                              ? 'bg-[#003366] text-white border-blue-800 rounded-tr-none' 
                              : 'bg-white border-gray-100 text-gray-800 rounded-tl-none font-medium'
                          }`}>
                              {msg.role === 'narrator' && <span className="block text-[8px] font-black text-blue-500 uppercase mb-0.5 tracking-widest">Equipe / Paciente</span>}
                              {msg.text}
                          </div>
                      </div>
                  ))
              )}
              {isProcessing && (
                <div className="flex justify-start items-center gap-2 animate-pulse">
                  <div className="bg-gray-200 h-10 w-24 rounded-3xl"></div>
                  <span className="text-[10px] font-black text-gray-300 uppercase"> Luna está analisando...</span>
                </div>
              )}
            </div>

            {/* BARRA DE INPUT - FIXA NO RODAPÉ */}
            <div className="p-4 bg-white border-t border-gray-100 shrink-0">
                {sosOptions ? (
                  <div className="animate-in slide-in-from-bottom-2 space-y-4">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-[10px] font-black text-orange-600 uppercase flex items-center gap-2"><HelpCircle size={14}/> SOS MÉDICO</span>
                      <button onClick={() => setSosOptions(null)} className="text-[10px] font-black text-gray-400 hover:text-red-500 uppercase">Voltar</button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {sosOptions.map(opt => (
                        <button key={opt.id} onClick={() => handleSosChoice(opt)} className="bg-white border-2 border-orange-100 p-4 rounded-3xl text-left text-xs font-bold hover:border-orange-500 hover:bg-orange-50/50 transition-all flex justify-between items-center group shadow-sm">
                            <span className="leading-snug pr-4 truncate">{opt.text}</span>
                            <ChevronRight className="text-orange-200 group-hover:text-orange-500 shrink-0" size={18}/>
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
                          onKeyDown={e => e.key === 'Enter' && processAction(inputText)}
                          placeholder="Digite sua conduta clínica..." 
                          className="flex-grow bg-transparent px-5 py-2.5 outline-none font-medium text-[#003366] text-sm md:text-base placeholder:text-gray-400"
                          disabled={isProcessing}
                        />
                        <button 
                          onClick={() => processAction(inputText)} 
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
                      SOS
                    </button>
                  </div>
                )}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default DynamicOsceView;