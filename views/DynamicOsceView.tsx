import React, { useState, useEffect } from 'react';
import { DynamicOsceStation, SimulationPhase, ClinicalState } from '../types';
import { Activity, MessageSquare, ShieldCheck, AlertTriangle, ChevronRight, RotateCcw, Award, CheckCircle2, Timer, BarChart3 } from 'lucide-react';

interface DynamicOsceViewProps {
  station: DynamicOsceStation;
  onBack: () => void;
  // O onSaveResult agora envia o pacote completo para suas estatísticas e a nota do aluno
  onSaveResult?: (score: number, total: number, timeSpent: number, analytics: any) => void; 
}

const DynamicOsceView: React.FC<DynamicOsceViewProps> = ({ station, onBack, onSaveResult }) => {
  // --- ESTADOS DA ENGINE ---
  const [currentPhaseId, setCurrentPhaseId] = useState<string>(station.initialPhaseId);
  const [vitals, setVitals] = useState<ClinicalState>(station.initialVitals || {
    hr: 80, bp: "120/80", sat: 98, rr: 16, status: "Estável"
  });
  
  // Pontuação real baseada nos deltas do JSON
  const [scores, setScores] = useState({ tecnica: 0, comunicacao: 0, biosseguranca: 0 });
  const [history, setHistory] = useState<{ narrative: string, choice: string, feedback: string, phaseId: string }[]>([]);
  const [isFinished, setIsFinished] = useState(false);
  const [lastFeedback, setLastFeedback] = useState<string | null>(null);
  const [startTime] = useState(Date.now());

  const currentPhase: SimulationPhase = station.phases[currentPhaseId];

  // Atualiza vitais ao mudar de fase
  useEffect(() => {
    if (currentPhase?.vitals) {
      setVitals(currentPhase.vitals);
    }
  }, [currentPhaseId]);

  const handleChoice = (t: any) => {
    // 1. Atualizar pontuação real (extraída do nó selecionado no JSON)
    const delta = t.scoreDelta || t.pontuacao_delta || { tecnica: 0, comunicacao: 0, biosseguranca: 0 };
    
    const newScores = {
      tecnica: scores.tecnica + (delta.tecnica || delta.Tecnica || 0),
      comunicacao: scores.comunicacao + (delta.comunicacao || delta.Comunicacao || 0),
      biosseguranca: scores.biosseguranca + (delta.biosseguranca || delta.Biosseguranca || 0)
    };
    
    setScores(newScores);

    // 2. Registrar histórico detalhado para estatística
    setHistory(prev => [...prev, {
      narrative: currentPhase.narrative,
      choice: t.triggers[0],
      feedback: t.feedbackText,
      phaseId: currentPhaseId
    }]);

    setLastFeedback(t.feedbackText);

    // 3. Lógica de Finalização (Vitória ou Erro Fatal)
    if (t.isFatalError || t.nextPhaseId === 'FINISH') {
      const timeSpent = Math.floor((Date.now() - startTime) / 1000);
      
      // CÁLCULO DA NOTA NORMAL (0 a 10)
      // Somamos os pontos e normalizamos (ajuste a lógica conforme sua escala de pontos do JSON)
      const totalRaw = newScores.tecnica + newScores.comunicacao + newScores.biosseguranca;
      const finalGrade = t.isFatalError ? 0 : Math.min(Math.max(totalRaw, 0), 10);

      // PACOTE DE BIG DATA (Para seus relatórios e publicações)
      const analyticsData = {
        stationId: station.id,
        stationTitle: station.title,
        disciplineId: station.disciplineId,
        theme: station.theme,
        isFatalError: t.isFatalError || false,
        lastPhaseBeforeExit: currentPhaseId,
        performanceMap: newScores,
        fullDecisionPath: history,
        completedAt: new Date().toISOString()
      };

      if (onSaveResult) {
        onSaveResult(finalGrade, 10, timeSpent, analyticsData);
      }
      
      setIsFinished(true);
      return;
    }

    // 4. Navegar para o próximo nó
    setCurrentPhaseId(t.nextPhaseId);
  };

  // --- COMPONENTES DE INTERFACE ---
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
    // Normalização visual: assume-se que 10 é o topo da categoria
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
                {isSuccess ? 'Simulação Concluída' : 'Desfecho Desfavorável'}
            </h2>
            <p className="text-[#D4A017] font-bold uppercase text-xs tracking-[0.2em] relative z-10">Feedback de Competências</p>
          </div>
          
          <div className="p-8 md:p-12 space-y-10">
            {/* NOTA NORMAL DO ALUNO */}
            <div className="flex flex-col items-center justify-center py-6 bg-gray-50 rounded-[2rem] border border-gray-100">
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] mb-2">Sua Nota Final</span>
                <div className="flex items-baseline gap-1">
                    <span className={`text-6xl font-black ${isSuccess ? 'text-[#003366]' : 'text-red-600'}`}>{totalScore.toFixed(1)}</span>
                    <span className="text-gray-300 font-bold">/ 10</span>
                </div>
            </div>

            {/* BREAKDOWN POR COMPETÊNCIA (PARA FEEDBACK) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <CompetencyBar label="Técnica" value={scores.tecnica} color="bg-blue-500" icon={ShieldCheck} />
              <CompetencyBar label="Comunicação" value={scores.comunicacao} color="bg-green-500" icon={MessageSquare} />
              <CompetencyBar label="Segurança" value={scores.biosseguranca} color="bg-purple-500" icon={Activity} />
            </div>

            {/* TIMELINE DE DECISÕES (ESTATÍSTICA VISUAL) */}
            <div className="space-y-4">
              <h3 className="font-black text-[#003366] uppercase text-sm flex items-center gap-2 border-b pb-2">
                <BarChart3 size={18} className="text-[#D4A017]"/> Revisão de Conduta
              </h3>
              <div className="space-y-3 max-h-[250px] overflow-y-auto pr-2 custom-scrollbar">
                {history.map((step, i) => (
                  <div key={i} className="p-4 bg-gray-50 rounded-2xl border border-gray-100 hover:bg-white transition-all">
                    <p className="text-[9px] font-black text-gray-400 uppercase mb-1">Ação {i+1} • {step.choice}</p>
                    <p className="text-sm text-gray-700 leading-relaxed font-medium italic">"{step.feedback}"</p>
                  </div>
                ))}
              </div>
            </div>

            <button 
              onClick={onBack} 
              className="w-full bg-[#003366] text-white py-5 rounded-2xl font-black uppercase tracking-widest hover:bg-[#D4A017] hover:text-[#003366] transition-all shadow-lg flex items-center justify-center gap-3"
            >
              Salvar Desempenho e Sair <ChevronRight size={20}/>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* HEADER DA ESTAÇÃO */}
      <div className="flex justify-between items-center mb-8 bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 bg-purple-100 text-purple-600 text-[8px] font-black uppercase rounded">Modo RPG</span>
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
        {/* MONITOR CLÍNICO (LADO ESQUERDO) */}
        <div className="lg:col-span-3 space-y-4">
          <div className="bg-white p-6 rounded-[2rem] shadow-xl border-t-8 border-[#003366]">
            <h3 className="text-[10px] font-black text-[#003366] uppercase mb-6 tracking-widest flex items-center gap-2">
              <Activity size={14} className="animate-pulse text-red-500" /> Sinais Vitais
            </h3>
            <div className="grid grid-cols-1 gap-3">
              <VitalParam label="FC" value={vitals.hr} unit="bpm" icon={Activity} color="text-red-500" />
              <VitalParam label="PA" value={vitals.bp} unit="mmHg" icon={ShieldCheck} color="text-blue-500" />
              <VitalParam label="SatO2" value={vitals.sat} unit="%" icon={Activity} color="text-green-600" />
              <VitalParam label="FR" value={vitals.rr} unit="irpm" icon={Activity} color="text-purple-500" />
            </div>
            <div className="mt-6 pt-4 border-t border-gray-50">
                <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest block mb-2 text-center">Status do Paciente</span>
                <div className="bg-gray-900 text-green-400 py-2 px-3 rounded-lg text-center font-mono text-[10px] uppercase tracking-tighter shadow-inner">
                    {vitals.status}
                </div>
            </div>
          </div>
          
          <div className="bg-[#003366] p-6 rounded-[2.5rem] text-white shadow-lg">
             <h4 className="text-[10px] font-black text-[#D4A017] uppercase mb-2 tracking-widest flex items-center gap-2">
                 <ShieldCheck size={12}/> Sua Missão
             </h4>
             <p className="text-xs font-medium leading-relaxed opacity-90">{station.task}</p>
          </div>
        </div>

        {/* NARRATIVA E DECISÕES (LADO DIREITO) */}
        <div className="lg:col-span-9 space-y-6">
          <div className="bg-white p-10 rounded-[3rem] shadow-2xl border border-gray-50 min-h-[450px] flex flex-col relative overflow-hidden">
            {/* Overlay sutil de profundidade */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-gray-50 rounded-full -mr-32 -mt-32 opacity-50"></div>
            
            <div className="flex-grow relative z-10">
              <span className="inline-block bg-blue-50 text-[#003366] px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest mb-6">Cenário Clínico</span>
              <p className="text-xl md:text-2xl text-gray-800 font-bold leading-relaxed mb-10">
                {currentPhase?.narrative}
              </p>
            </div>

            {/* FEEDBACK IMEDIATO (SISTEMA DE MESTRE DE RPG) */}
            {lastFeedback && (
              <div className="bg-yellow-50 p-5 rounded-2xl border-l-4 border-yellow-400 mb-8 flex items-start gap-4 animate-in fade-in slide-in-from-left-4 relative z-10">
                <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center shrink-0">
                    <AlertTriangle className="text-yellow-600" size={20} />
                </div>
                <div>
                    <span className="text-[9px] font-black text-yellow-600 uppercase tracking-widest block mb-1">Nota do Preceptor</span>
                    <p className="text-sm font-bold text-yellow-900 italic leading-snug">{lastFeedback}</p>
                </div>
              </div>
            )}

            {/* OPÇÕES DE CONDUTA MÉDICA */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative z-10">
              {currentPhase?.transitions.map((t, idx) => (
                <button
                  key={idx}
                  onClick={() => handleChoice(t)}
                  className="flex items-center justify-between p-6 rounded-[1.5rem] border-2 border-gray-100 bg-white hover:border-[#D4A017] hover:shadow-xl transition-all group text-left shadow-sm"
                >
                  <span className="text-sm font-black text-[#003366] group-hover:text-[#D4A017] pr-4">{t.triggers[0]}</span>
                  <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center group-hover:bg-[#D4A017] transition-colors shrink-0">
                    <ChevronRight size={18} className="text-gray-300 group-hover:text-white transition-all group-hover:translate-x-0.5" />
                  </div>
                </button>
              ))}
            </div>
          </div>

          <p className="text-center text-[9px] font-black text-gray-300 uppercase tracking-[0.5em]">
            Luna Engine 2.0 • Data Analytics Enabled
          </p>
        </div>
      </div>
    </div>
  );
};

export default DynamicOsceView;