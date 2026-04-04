import React, { useState, useEffect, useRef } from 'react';
import { DynamicOsceStation, SimulationPhase, ClinicalState } from '../types';
import { Activity, MessageSquare, ShieldCheck, AlertTriangle, ChevronRight, RotateCcw, Award, Timer, BarChart3, Send, HelpCircle } from 'lucide-react';
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
  
  // LUNA ENGINE: Estado do Monitor Inteligente (Inicia offline)
  const [isMonitorConnected, setIsMonitorConnected] = useState(false);

  const [scores, setScores] = useState({ tecnica: 0, comunicacao: 0, biosseguranca: 0 });
  const [history, setHistory] = useState<{ narrative: string, choice: string, feedback: string, phaseId: string }[]>([]);
  const [isFinished, setIsFinished] = useState(false);
  const [lastFeedback, setLastFeedback] = useState<string | null>(null);
  const [startTime] = useState(Date.now());
  const [endTime, setEndTime] = useState<number | null>(null);

  const [inputText, setInputText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [sosOptions, setSosOptions] = useState<{ text: string, isCorrect: boolean, transitionRef: any }[] | null>(null);

  // Registro de Tracking (Estatísticas do Aluno)
  const [rpgTracking, setRpgTracking] = useState({
    hintsRequested: 0,
    textErrors: 0,
    hintErrors: 0
  });

  const currentPhase: SimulationPhase | undefined = station.phases[currentPhaseId];
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Atualização de Fase e Tratamento de Erros
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

    if (t.isFatalError || t.nextPhaseId === 'FINISH') {
      const timeSpent = Math.floor((Date.now() - startTime) / 1000);
      setEndTime(timeSpent);
      
      const totalRaw = newScores.tecnica + newScores.comunicacao + newScores.biosseguranca;
      const finalGrade = t.isFatalError ? 0 : Math.min(Math.max(totalRaw, 0), 10);

      const analyticsData = {
        stationId: station.id,
        stationTitle: station.title,
        disciplineId: station.disciplineId,
        theme: station.theme,
        isFatalError: t.isFatalError || false,
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

    setCurrentPhaseId(t.nextPhaseId);
  };

  const handleTextSubmit = async () => {
    if (!inputText.trim() || isProcessing || !currentPhase) return;
    setIsProcessing(true);
    setLastFeedback(null);

    const userText = inputText.trim();
    const transitions = currentPhase.transitions || []; 

    // LUNA ENGINE: Deteção Universal do Monitor
    // Regex que apanha menções a sinais vitais e monitorização
    const monitorKeywords = /(monitor|ox[ií]metr|sinais vitais|ssvv|press[aã]o|eletro|ecg|cabos|satura[çc][aã]o|frequ[êe]ncia)/i;
    const isAskingForMonitor = monitorKeywords.test(userText) && !/(n[aã]o|deslig|tirar|remover)/i.test(userText);

    if (transitions.length === 0) {
      setIsProcessing(false);
      return; 
    }

    // Avalia no Backend (Vercel)
    const matchedTransition = await evaluateRpgAction(userText, transitions, currentPhase.narrative);

    if (matchedTransition) {
        // Se a ação envolver monitor e acertar a transição, liga-se
        if (isAskingForMonitor && !isMonitorConnected) setIsMonitorConnected(true);
        executeTransition(matchedTransition, `Conduta Clínica: "${userText}"`);
    } else if (isAskingForMonitor && !isMonitorConnected) {
        // FALLBACK: O aluno pediu o monitor, a IA não achou gatilho, mas é um comando válido!
        setIsMonitorConnected(true);
        setLastFeedback("Monitor multiparamétrico instalado com sucesso. Os dados vitais apareceram na tela.");
        setScores(prev => ({ ...prev, tecnica: prev.tecnica + 0.5 })); // Reward: +0.5 pontos
        setHistory(prev => [...prev, {
            narrative: currentPhase.narrative,
            choice: `Conduta Universal: "${userText}"`,
            feedback: "Monitorização instalada pela equipe de enfermagem.",
            phaseId: currentPhaseId
        }]);
    } else {
        // Erro real: Conduta inútil ou perigosa
        setRpgTracking(prev => ({ ...prev, textErrors: prev.textErrors + 1 }));
        setLastFeedback("A conduta descrita não gerou efeito esperado ou não está indicada no protocolo atual. Verifique o quadro clínico e tente uma intervenção focada.");
        setScores(prev => ({ ...prev, tecnica: prev.tecnica - 0.5 }));
        setHistory(prev => [...prev, {
            narrative: currentPhase.narrative,
            choice: `Tentativa sem efeito: "${userText}"`,
            feedback: "Conduta clinicamente não reconhecida pela equipe.",
            phaseId: currentPhaseId
        }]);
    }
    
    setIsProcessing(false);
    setInputText('');
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleRequestHelp = async () => {
      if (!currentPhase) return;
      setIsProcessing(true);
      setRpgTracking(prev => ({ ...prev, hintsRequested: prev.hintsRequested + 1 }));
      setLastFeedback("Consultando o Plantonista Chefe. Escolha uma das opções sugeridas (Penalidade na nota aplicada):");
      
      const transitions = currentPhase.transitions || [];
      const options = await generateRpgOptions(transitions, currentPhase.narrative);
      
      setSosOptions(options);
      setIsProcessing(false);
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSosChoice = (option: any) => {
      if (option.isCorrect && option.transitionRef) {
          executeTransition(option.transitionRef, `Auxílio Solicitado: ${option.text}`, true);
      } else {
          setRpgTracking(prev => ({ ...prev, hintErrors: prev.hintErrors + 1 }));
          setLastFeedback(`[ERRO CRÍTICO] A equipe barrou sua conduta! A escolha "${option.text}" poderia prejudicar o paciente. Reveja as opções.`);
          setScores(prev => ({ ...prev, tecnica: prev.tecnica - 1.0 })); 
      }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
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
          <div 
            className={`h-full transition-all duration-1000 ${color}`} 
            style={{ width: `${percentage}%` }}
          />
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
          <div className={`${isSuccess ? 'bg-[#003366]' : 'bg-red-900'} p-10 text-center text-white relative transition-colors`}>
            <div className="absolute top-4 left-1/2 -translate-x-1/2 opacity-10"><Award size={80}/></div>
            <h2 className="text-3xl font-black uppercase tracking-tighter mb-2 relative z-10">
                {isSuccess ? 'Simulação Concluída' : 'Desfecho Desfavorável (Erro Fatal)'}
            </h2>
            <p className="text-[#D4A017] font-bold uppercase text-xs tracking-[0.2em] relative z-10">Feedback de Competências Clínicas</p>
          </div>
          
          <div className="p-8 md:p-12 space-y-10">
            <div className="flex flex-col items-center justify-center py-6 bg-gray-50 rounded-[2rem] border border-gray-100">
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] mb-2">Sua Nota Final</span>
                <div className="flex items-baseline gap-1">
                    <span className={`text-6xl font-black ${isSuccess ? 'text-[#003366]' : 'text-red-600'}`}>{totalScore.toFixed(1)}</span>
                    <span className="text-gray-300 font-bold">/ 10</span>
                </div>
                {endTime && (
                  <span className="text-[10px] font-bold text-gray-500 mt-2 uppercase tracking-widest">
                    Tempo de Resolução: {formatTime(endTime)}
                  </span>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <CompetencyBar label="Técnica" value={scores.tecnica} color="bg-blue-500" icon={ShieldCheck} />
              <CompetencyBar label="Comunicação" value={scores.comunicacao} color="bg-green-500" icon={MessageSquare} />
              <CompetencyBar label="Segurança" value={scores.biosseguranca} color="bg-purple-500" icon={Activity} />
            </div>

            <div className="space-y-4">
              <h3 className="font-black text-[#003366] uppercase text-sm flex items-center gap-2 border-b pb-2">
                <BarChart3 size={18} className="text-[#D4A017]"/> Revisão de Conduta Histórica
              </h3>
              <div className="space-y-3 max-h-[250px] overflow-y-auto pr-2 custom-scrollbar">
                {history.map((step, i) => (
                  <div key={i} className="p-4 bg-gray-50 rounded-2xl border border-gray-100 hover:bg-white transition-all">
                    <p className="text-[9px] font-black text-[#003366] uppercase mb-1">Ação {i+1} • {step.choice}</p>
                    <p className="text-sm text-gray-700 leading-relaxed font-medium italic">"{step.feedback}"</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-4 flex justify-center">
              <button 
                onClick={onBack} 
                className="w-full md:w-2/3 bg-[#003366] text-white py-5 rounded-2xl font-black uppercase tracking-widest hover:bg-[#D4A017] hover:text-[#003366] transition-all shadow-lg flex items-center justify-center gap-3"
              >
                Salvar Desempenho e Sair <ChevronRight size={20}/>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!currentPhase) return null;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 pb-32">
      <div className="flex justify-between items-center mb-8 bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 bg-purple-100 text-purple-600 text-[8px] font-black uppercase rounded border border-purple-200">Híbrido IA</span>
            <span className="text-[10px] font-black text-[#D4A017] uppercase tracking-widest">{station.theme}</span>
          </div>
          <h2 className="text-2xl font-black text-[#003366] uppercase tracking-tighter">{station.title}</h2>
        </div>
        <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-2 text-gray-400 font-bold text-xs bg-gray-50 px-4 py-2 rounded-full">
                <Timer size={14} />
                <span>Simulação em Curso</span>
            </div>
            <button onClick={onBack} className="text-gray-400 hover:text-red-500 transition-colors p-2">
              <RotateCcw size={20} />
            </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-3 space-y-4">
          
          {/* LUNA ENGINE: PAINEL DO MONITOR INTELIGENTE */}
          <div className="bg-white p-6 rounded-[2rem] shadow-xl border-t-8 border-[#003366] sticky top-4 transition-all duration-500">
            <h3 className="text-[10px] font-black text-[#003366] uppercase mb-6 tracking-widest flex items-center gap-2">
              <Activity size={14} className={isMonitorConnected ? "animate-pulse text-red-500" : "text-gray-400"} />
              Sinais Vitais {!isMonitorConnected && <span className="text-red-500 ml-1">(OFFLINE)</span>}
            </h3>

            {isMonitorConnected ? (
              <div className="grid grid-cols-1 gap-3 animate-in fade-in zoom-in duration-500">
                <VitalParam label="FC" value={vitals.hr} unit="bpm" icon={Activity} color="text-red-500" />
                <VitalParam label="PA" value={vitals.bp} unit="mmHg" icon={ShieldCheck} color="text-blue-500" />
                <VitalParam label="SatO2" value={vitals.sat} unit="%" icon={Activity} color="text-green-600" />
                <VitalParam label="FR" value={vitals.rr} unit="irpm" icon={Activity} color="text-purple-500" />
              </div>
            ) : (
              <div className="bg-[#0a0f18] rounded-2xl p-6 flex flex-col items-center justify-center text-center border-2 border-gray-800 h-[260px] shadow-[inset_0_0_30px_rgba(0,0,0,0.8)] animate-in fade-in">
                <Activity size={40} className="text-gray-800 mb-3" />
                <span className="text-red-500/80 font-mono text-xs uppercase tracking-widest font-black animate-pulse">Monitor Desligado</span>
                <span className="text-gray-500 text-[10px] mt-3 font-bold px-4 leading-relaxed">
                  Instale a monitorização no paciente para acender a tela.
                </span>
              </div>
            )}

            <div className="mt-6 pt-4 border-t border-gray-50">
                <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest block mb-2 text-center">Status Fisiológico</span>
                <div className={`py-2 px-3 rounded-lg text-center font-mono text-[10px] uppercase tracking-tighter shadow-inner transition-colors duration-500 ${isMonitorConnected ? 'bg-gray-900 text-green-400' : 'bg-gray-100 text-gray-400'}`}>
                    {isMonitorConnected ? vitals.status : 'AGUARDANDO CONEXÃO'}
                </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-9 space-y-6">
          <div className="bg-white p-8 md:p-10 rounded-[3rem] shadow-2xl border border-gray-50 flex flex-col relative overflow-hidden min-h-[450px]">
            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-50 rounded-full -mr-32 -mt-32 opacity-50"></div>
            
            <div className="relative z-10 mb-8 flex-grow">
              <span className="inline-block bg-blue-50 text-[#003366] px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest mb-4">Mestre de Sala (Narrador)</span>
              <p className="text-xl md:text-2xl text-gray-800 font-medium leading-relaxed">
                {currentPhase.narrative}
              </p>
            </div>

            {lastFeedback && (
              <div className="bg-yellow-50 p-6 rounded-[2rem] border-l-4 border-yellow-400 mb-8 flex items-start gap-4 animate-in fade-in slide-in-from-left-4 relative z-10">
                <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center shrink-0">
                    {lastFeedback.includes("rejeitada") || lastFeedback.includes("ERRO") ? <AlertTriangle className="text-red-500" size={24} /> : <Activity className="text-yellow-600" size={24} />}
                </div>
                <div>
                    <span className="text-[10px] font-black text-yellow-600 uppercase tracking-widest block mb-1">Atualização do Quadro</span>
                    <p className="text-sm font-bold text-yellow-900 leading-snug">{lastFeedback}</p>
                </div>
              </div>
            )}

            <div className="mt-auto pt-6 border-t border-gray-100 relative z-10">
                {sosOptions ? (
                    <div className="animate-in slide-in-from-bottom-4">
                        <span className="inline-block bg-orange-100 text-orange-800 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest mb-4">Múltipla Escolha (Plantonista)</span>
                        <div className="grid grid-cols-1 gap-3">
                            {sosOptions.map((opt, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => handleSosChoice(opt)}
                                    className="text-left p-4 rounded-2xl border-2 border-gray-100 bg-white hover:border-[#D4A017] hover:shadow-md transition-all text-sm font-bold text-gray-700"
                                >
                                    {opt.text}
                                </button>
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col sm:flex-row gap-3">
                        <div className="flex-grow flex bg-gray-50 rounded-2xl border-2 border-transparent focus-within:border-[#D4A017] transition-all overflow-hidden p-2">
                            <input
                                type="text"
                                value={inputText}
                                onChange={e => setInputText(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleTextSubmit()}
                                placeholder="Descreva sua conduta médica, exames ou medicação..."
                                disabled={isProcessing}
                                className="w-full bg-transparent p-3 outline-none font-medium text-[#003366] text-sm"
                            />
                            <button 
                                onClick={handleTextSubmit} 
                                disabled={isProcessing || !inputText.trim()} 
                                className="bg-[#003366] text-white px-6 rounded-xl font-black shadow-md hover:bg-[#D4A017] hover:text-[#003366] transition-all disabled:opacity-50"
                            >
                                <Send size={18} />
                            </button>
                        </div>
                        
                        <button 
                            onClick={handleRequestHelp}
                            disabled={isProcessing}
                            className="bg-orange-50 text-orange-600 border-2 border-orange-100 px-6 rounded-2xl font-black uppercase text-[10px] tracking-widest flex flex-col items-center justify-center hover:bg-orange-600 hover:text-white transition-all min-w-[120px] disabled:opacity-50 shadow-sm"
                        >
                            <HelpCircle size={18} className="mb-1"/> SOS Dica
                        </button>
                    </div>
                )}
                {isProcessing && <p className="text-center text-xs font-bold text-[#D4A017] mt-4 animate-pulse">A inteligência artificial está avaliando sua conduta...</p>}
            </div>
            <div ref={chatEndRef} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default DynamicOsceView;