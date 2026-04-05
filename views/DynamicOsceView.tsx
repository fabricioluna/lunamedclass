import React, { useState, useEffect, useRef } from 'react';
import { DynamicOsceStation, SimulationPhase, ClinicalState } from '../types';
import { Activity, MessageSquare, ShieldCheck, AlertTriangle, ChevronRight, RotateCcw, Award, Timer, BarChart3, Send, HelpCircle, Power, PowerOff } from 'lucide-react';
import { evaluateRpgAction, generateRpgOptions } from '../services/aiService';

interface DynamicOsceViewProps {
  station: DynamicOsceStation;
  onBack: () => void;
  onSaveResult?: (score: number, total: number, timeSpent: number, analytics: any) => void; 
}

const DynamicOsceView: React.FC<DynamicOsceViewProps> = ({ station, onBack, onSaveResult }) => {
  const [currentPhaseId, setCurrentPhaseId] = useState<string>(station.initialPhaseId);
  const [vitals, setVitals] = useState<ClinicalState>(station.initialVitals || {
    hr: 80, bp: "120/80", sat: 98, rr: 16, status: "Estável"
  });
  
  // Controle de Estado do Monitor (Requisito: Liga apenas se solicitado)
  const [isMonitorActive, setIsMonitorActive] = useState(false);
  
  // Controle de Biossegurança (Requisito: Lavagem de mãos/EPI)
  const [biosafetyDone, setBiosafetyDone] = useState(false);

  const [scores, setScores] = useState({ tecnica: 0, comunicacao: 0, biosseguranca: 0 });
  const [history, setHistory] = useState<{ narrative: string, choice: string, feedback: string, phaseId: string }[]>([]);
  const [isFinished, setIsFinished] = useState(false);
  const [lastFeedback, setLastFeedback] = useState<string | null>(null);
  const [startTime] = useState(Date.now());
  const [endTime, setEndTime] = useState<number | null>(null);

  const [inputText, setInputText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [sosOptions, setSosOptions] = useState<{ text: string, isCorrect: boolean, transitionRef: any }[] | null>(null);

  const [rpgTracking, setRpgTracking] = useState({
    hintsRequested: 0,
    textErrors: 0,
    hintErrors: 0
  });

  const currentPhase: SimulationPhase | undefined = station.phases[currentPhaseId];
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!currentPhase) {
        console.error("Fase não encontrada no JSON:", currentPhaseId);
        setIsFinished(true);
        return;
    }
    if (currentPhase.vitals) {
      setVitals(currentPhase.vitals);
    }
    setSosOptions(null);
    setInputText('');
  }, [currentPhaseId, currentPhase]);

  const executeTransition = (t: any, choiceLabel: string, isPenalty: boolean = false) => {
    // Validação de Segurança: Se a transição for fatal mas o aluno apenas falou "Bom dia", bloqueamos o encerramento
    const isCommunicationOnly = choiceLabel.toLowerCase().includes("bom dia") || choiceLabel.toLowerCase().includes("olá");
    const fatalTrigger = t.isFatalError && !isCommunicationOnly;

    const delta = t.scoreDelta || t.pontuacao_delta || { tecnica: 0, comunicacao: 0, biosseguranca: 0 };
    const penaltyFactor = isPenalty ? 0.3 : 1; 
    
    const newScores = {
      tecnica: scores.tecnica + ((delta.tecnica || delta.Tecnica || 0) * penaltyFactor),
      comunicacao: scores.comunicacao + ((delta.comunicacao || delta.Comunicacao || 0) * penaltyFactor),
      biosseguranca: scores.biosseguranca + ((delta.biosseguranca || delta.Biosseguranca || 0) * penaltyFactor)
    };
    
    setScores(newScores);

    setHistory(prev => [...prev, {
      narrative: currentPhase?.narrative || "Desconhecido",
      choice: choiceLabel,
      feedback: isPenalty ? `[AJUDA UTILIZADA] ${t.feedbackText}` : t.feedbackText,
      phaseId: currentPhaseId
    }]);

    setLastFeedback(t.feedbackText);

    if (fatalTrigger || t.nextPhaseId === 'FINISH') {
      const timeSpent = Math.floor((Date.now() - startTime) / 1000);
      setEndTime(timeSpent);
      
      const totalRaw = newScores.tecnica + newScores.comunicacao + newScores.biosseguranca;
      const finalGrade = fatalTrigger ? 0 : Math.min(Math.max(totalRaw, 0), 10);

      const analyticsData = {
        stationId: station.id,
        stationTitle: station.title,
        disciplineId: station.disciplineId,
        theme: station.theme,
        isFatalError: fatalTrigger || false,
        lastPhaseBeforeExit: currentPhaseId,
        performanceMap: newScores,
        fullDecisionPath: history,
        rpgTracking: rpgTracking,
        completedAt: new Date().toISOString()
      };

      if (onSaveResult) {
        onSaveResult(finalGrade, 10, timeSpent, analyticsData);
      }
      
      setIsFinished(true);
      return;
    }

    // Se não for fatal ou comunicação, avançamos a fase normalmente
    if (t.nextPhaseId && station.phases[t.nextPhaseId]) {
        setCurrentPhaseId(t.nextPhaseId);
    }
  };

  const handleTextSubmit = async () => {
    if (!inputText.trim() || isProcessing || !currentPhase) return;
    setIsProcessing(true);
    setLastFeedback(null);

    const userText = inputText.trim().toLowerCase();

    // Lógica 1: Interceptar pedido de monitor
    if (userText.includes("monitor") || userText.includes("vitais") || userText.includes("ligar")) {
        setIsMonitorActive(true);
        setLastFeedback("Monitor de sinais vitais ativado. Parâmetros em tempo real disponíveis no painel lateral.");
        setScores(prev => ({ ...prev, tecnica: prev.tecnica + 0.2 }));
        setIsProcessing(false);
        setInputText('');
        return;
    }

    // Lógica 2: Interceptar Biossegurança (Obrigatório antes de tocar)
    if (userText.includes("lavar") || userText.includes("mão") || userText.includes("epi") || userText.includes("luva")) {
        setBiosafetyDone(true);
        setLastFeedback("Biossegurança aplicada: Mãos higienizadas e EPIs conferidos.");
        setScores(prev => ({ ...prev, biosseguranca: prev.biosseguranca + 1.0 }));
        setIsProcessing(false);
        setInputText('');
        return;
    }

    const transitions = currentPhase.transitions || []; 
    if (transitions.length === 0) {
      setIsProcessing(false);
      return; 
    }

    const matchedTransition = await evaluateRpgAction(inputText, transitions, currentPhase.narrative);

    if (matchedTransition) {
        executeTransition(matchedTransition, `Conduta: "${inputText}"`);
    } else {
        setRpgTracking(prev => ({ ...prev, textErrors: prev.textErrors + 1 }));
        setLastFeedback("A conduta descrita não gerou efeito esperado. Tente ser mais específico ou verifique os sinais vitais.");
        setScores(prev => ({ ...prev, tecnica: prev.tecnica - 0.2 }));
    }
    
    setIsProcessing(false);
    setInputText('');
    setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
  };

  const handleRequestHelp = async () => {
      if (!currentPhase) return;
      setIsProcessing(true);
      setRpgTracking(prev => ({ ...prev, hintsRequested: prev.hintsRequested + 1 }));
      setLastFeedback("Consultando o Plantonista...");
      const options = await generateRpgOptions(currentPhase.transitions || [], currentPhase.narrative);
      setSosOptions(options);
      setIsProcessing(false);
  };

  const handleSosChoice = (option: any) => {
      if (option.isCorrect && option.transitionRef) {
          executeTransition(option.transitionRef, `Auxílio: ${option.text}`, true);
      } else {
          setRpgTracking(prev => ({ ...prev, hintErrors: prev.hintErrors + 1 }));
          setLastFeedback(`[ERRO] A escolha "${option.text}" é contra-indicada.`);
          setScores(prev => ({ ...prev, tecnica: prev.tecnica - 0.5 })); 
      }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const VitalParam = ({ label, value, unit, icon: Icon, color }: any) => (
    <div className="bg-black/5 p-2 md:p-3 rounded-xl border border-black/5 flex flex-col justify-center animate-in fade-in duration-500">
      <div className="flex items-center gap-1 md:gap-2 mb-0.5">
        <Icon size={12} className={`${color} shrink-0`} />
        <span className="text-[8px] md:text-[10px] font-black uppercase text-gray-500 tracking-tighter md:tracking-widest">{label}</span>
      </div>
      <div className="flex items-baseline gap-1">
        <span className={`text-sm md:text-xl font-mono font-bold ${color}`}>{value}</span>
        <span className="text-[8px] md:text-[9px] text-gray-400 font-bold">{unit}</span>
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
      <div className="max-w-4xl mx-auto px-4 py-6 md:py-12 animate-in zoom-in duration-500">
        <div className="bg-white rounded-[2rem] md:rounded-[3rem] shadow-2xl overflow-hidden border border-gray-100">
          <div className={`${isSuccess ? 'bg-[#003366]' : 'bg-red-900'} p-6 md:p-10 text-center text-white relative transition-colors`}>
            <div className="absolute top-4 left-1/2 -translate-x-1/2 opacity-10"><Award size={60} className="md:w-20 md:h-20"/></div>
            <h2 className="text-xl md:text-3xl font-black uppercase tracking-tighter mb-2 relative z-10">
                {isSuccess ? 'Simulação Concluída' : 'Desfecho Desfavorável'}
            </h2>
            <p className="text-[#D4A017] font-bold uppercase text-[10px] tracking-[0.2em] relative z-10">Feedback de Competências Clínicas</p>
          </div>
          
          <div className="p-6 md:p-12 space-y-6 md:space-y-10">
            <div className="flex flex-col items-center justify-center py-4 md:py-6 bg-gray-50 rounded-[1.5rem] md:rounded-[2rem] border border-gray-100">
                <span className="text-[8px] md:text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-1">Nota Final</span>
                <div className="flex items-baseline gap-1">
                    <span className={`text-4xl md:text-6xl font-black ${isSuccess ? 'text-[#003366]' : 'text-red-600'}`}>{totalScore.toFixed(1)}</span>
                    <span className="text-gray-300 font-bold">/ 10</span>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-8">
              <CompetencyBar label="Técnica" value={scores.tecnica} color="bg-blue-500" icon={ShieldCheck} />
              <CompetencyBar label="Comunicação" value={scores.comunicacao} color="bg-green-500" icon={MessageSquare} />
              <CompetencyBar label="Biossegurança" value={scores.biosseguranca} color="bg-purple-500" icon={Activity} />
            </div>

            <div className="space-y-4">
              <h3 className="font-black text-[#003366] uppercase text-xs md:text-sm flex items-center gap-2 border-b pb-2">
                <BarChart3 size={16} className="text-[#D4A017]"/> Revisão de Conduta
              </h3>
              <div className="space-y-3 max-h-[200px] md:max-h-[250px] overflow-y-auto pr-2 custom-scrollbar">
                {history.map((step, i) => (
                  <div key={i} className="p-3 md:p-4 bg-gray-50 rounded-xl md:rounded-2xl border border-gray-100">
                    <p className="text-[8px] md:text-[9px] font-black text-[#003366] uppercase mb-1">Ação {i+1} • {step.choice}</p>
                    <p className="text-xs md:text-sm text-gray-700 leading-relaxed font-medium italic">"{step.feedback}"</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-2 flex justify-center">
              <button onClick={onBack} className="w-full md:w-2/3 bg-[#003366] text-white py-4 md:py-5 rounded-xl md:rounded-2xl font-black uppercase text-xs md:text-sm tracking-widest hover:bg-[#D4A017] hover:text-[#003366] transition-all shadow-lg flex items-center justify-center gap-3">
                Salvar e Sair <ChevronRight size={18}/>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!currentPhase) return null;

  return (
    <div className="max-w-6xl mx-auto px-4 py-4 md:py-8 pb-32">
      <div className="flex justify-between items-center mb-4 md:mb-8 bg-white p-4 md:p-6 rounded-[1.5rem] md:rounded-[2rem] shadow-sm border border-gray-100">
        <div className="overflow-hidden">
          <div className="flex items-center gap-2 mb-1">
            <span className="px-1.5 py-0.5 bg-purple-100 text-purple-600 text-[7px] md:text-[8px] font-black uppercase rounded border border-purple-200">Luna Engine 2.0</span>
            <span className="text-[8px] md:text-[10px] font-black text-[#D4A017] uppercase tracking-tighter md:tracking-widest truncate">{station.theme}</span>
          </div>
          <h2 className="text-lg md:text-2xl font-black text-[#003366] uppercase tracking-tighter truncate">{station.title}</h2>
        </div>
        <button onClick={onBack} className="text-gray-300 hover:text-red-500 transition-colors p-2">
          <RotateCcw size={20} />
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 md:gap-8">
        <div className="lg:col-span-3">
          <div className="bg-white p-4 md:p-6 rounded-[1.5rem] md:rounded-[2rem] shadow-xl border-t-4 md:border-t-8 border-[#003366] lg:sticky lg:top-4">
            <div className="flex justify-between items-center mb-3 md:mb-6">
                <h3 className="text-[8px] md:text-[10px] font-black text-[#003366] uppercase tracking-widest flex items-center gap-2">
                    <Activity size={14} className={isMonitorActive ? "animate-pulse text-red-500" : "text-gray-300"} /> Sinais Vitais
                </h3>
                {isMonitorActive ? <Power size={14} className="text-green-500"/> : <PowerOff size={14} className="text-gray-300"/>}
            </div>
            
            {isMonitorActive ? (
                <div className="grid grid-cols-2 lg:grid-cols-1 gap-2 md:gap-3">
                  <VitalParam label="FC" value={vitals.hr} unit="bpm" icon={Activity} color="text-red-500" />
                  <VitalParam label="PA" value={vitals.bp} unit="mmHg" icon={ShieldCheck} color="text-blue-500" />
                  <VitalParam label="SatO2" value={vitals.sat} unit="%" icon={Activity} color="text-green-600" />
                  <VitalParam label="FR" value={vitals.rr} unit="irpm" icon={Activity} color="text-purple-500" />
                </div>
            ) : (
                <div className="py-8 text-center bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-tighter">Monitor Desligado</p>
                    <p className="text-[8px] text-gray-400 mt-1">Solicite "Ligar Monitor" via conduta.</p>
                </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-9 space-y-4 md:space-y-6">
          <div className="bg-white p-6 md:p-10 rounded-[2rem] md:rounded-[3rem] shadow-2xl border border-gray-50 flex flex-col relative overflow-hidden min-h-[350px] md:min-h-[450px]">
            <div className="absolute top-0 right-0 w-48 h-48 md:w-64 md:h-64 bg-blue-50 rounded-full -mr-24 -mt-24 opacity-50"></div>
            
            <div className="relative z-10 mb-6 md:mb-8 flex-grow">
              <span className="inline-block bg-blue-50 text-[#003366] px-3 py-1 rounded-full text-[8px] md:text-[10px] font-black uppercase tracking-widest mb-3 md:mb-4">Mestre de Sala</span>
              <p className="text-base md:text-2xl text-gray-800 font-medium leading-relaxed">
                {currentPhase.narrative}
              </p>
            </div>

            {lastFeedback && (
              <div className="bg-yellow-50 p-4 md:p-6 rounded-[1.5rem] md:rounded-[2rem] border-l-4 border-yellow-400 mb-6 md:mb-8 flex items-start gap-3 md:gap-4 animate-in fade-in slide-in-from-left-4 relative z-10">
                <div className="w-10 h-10 md:w-12 md:h-12 bg-yellow-100 rounded-full flex items-center justify-center shrink-0">
                    {lastFeedback.includes("ERRO") ? <AlertTriangle className="text-red-500" size={20} /> : <Activity className="text-yellow-600" size={20} />}
                </div>
                <div className="flex-grow">
                    <span className="text-[8px] md:text-[10px] font-black text-yellow-600 uppercase tracking-widest block mb-1">Feedback de Conduta</span>
                    <p className="text-xs md:text-sm font-bold text-yellow-900 leading-snug">{lastFeedback}</p>
                </div>
              </div>
            )}

            <div className="mt-auto pt-4 md:pt-6 border-t border-gray-100 relative z-10">
                {sosOptions ? (
                    <div className="animate-in slide-in-from-bottom-4">
                        <span className="inline-block bg-orange-100 text-orange-800 px-3 py-1 rounded-full text-[8px] md:text-[10px] font-black uppercase tracking-widest mb-3 md:mb-4">Opções Clínicas</span>
                        <div className="grid grid-cols-1 gap-2 md:gap-3">
                            {sosOptions.map((opt, idx) => (
                                <button key={idx} onClick={() => handleSosChoice(opt)} className="text-left p-3 md:p-4 rounded-xl md:rounded-2xl border-2 border-gray-100 bg-white hover:border-[#D4A017] hover:shadow-md transition-all text-xs md:text-sm font-bold text-gray-700">
                                    {opt.text}
                                </button>
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col sm:flex-row gap-2 md:gap-3">
                        <div className="flex-grow flex bg-gray-50 rounded-xl md:rounded-2xl border-2 border-transparent focus-within:border-[#D4A017] transition-all overflow-hidden p-1.5 md:p-2">
                            <input
                                type="text"
                                value={inputText}
                                onChange={e => setInputText(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleTextSubmit()}
                                placeholder="Ex: Lavar mãos, Ligar monitor, Administrar O2..."
                                disabled={isProcessing}
                                className="w-full bg-transparent p-2 md:p-3 outline-none font-medium text-[#003366] text-xs md:text-sm"
                            />
                            <button onClick={handleTextSubmit} disabled={isProcessing || !inputText.trim()} className="bg-[#003366] text-white px-4 md:px-6 rounded-lg md:rounded-xl font-black shadow-md hover:bg-[#D4A017] hover:text-[#003366] transition-all disabled:opacity-50">
                                <Send size={16} />
                            </button>
                        </div>
                        <button onClick={handleRequestHelp} disabled={isProcessing} className="bg-orange-50 text-orange-600 border-2 border-orange-100 px-4 py-3 md:px-6 md:py-0 rounded-xl md:rounded-2xl font-black uppercase text-[8px] md:text-[10px] tracking-widest flex sm:flex-col items-center justify-center gap-2 sm:gap-1 hover:bg-orange-600 hover:text-white transition-all min-w-[100px] md:min-w-[120px] disabled:opacity-50 shadow-sm">
                            <HelpCircle size={16} /> <span>SOS Dica</span>
                        </button>
                    </div>
                )}
                {isProcessing && <p className="text-center text-[10px] font-bold text-[#D4A017] mt-3 md:mt-4 animate-pulse">Avaliando conduta clínica...</p>}
            </div>
            <div ref={chatEndRef}></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DynamicOsceView;
