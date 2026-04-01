import React, { useState, useEffect } from 'react';
import { DynamicOsceStation, SimulationPhase, ClinicalState } from '../types';
import { Activity, MessageSquare, ShieldCheck, AlertTriangle, ChevronRight, RotateCcw } from 'lucide-react';

interface DynamicOsceViewProps {
  station: DynamicOsceStation;
  onBack: () => void;
}

const DynamicOsceView: React.FC<DynamicOsceViewProps> = ({ station, onBack }) => {
  // --- ESTADOS DA ENGINE ---
  const [currentPhaseId, setCurrentPhaseId] = useState<string>(station.initialPhaseId);
  const [vitals, setVitals] = useState<ClinicalState>(station.initialVitals || {
    hr: 80, bp: "120/80", sat: 98, rr: 16, status: "Estável"
  });
  const [scores, setScores] = useState({ tecnica: 0, comunicacao: 0, biosseguranca: 0 });
  const [history, setHistory] = useState<{ narrative: string, choice: string, feedback: string }[]>([]);
  const [isFinished, setIsFinished] = useState(false);
  const [lastFeedback, setLastFeedback] = useState<string | null>(null);

  const currentPhase: SimulationPhase = station.phases[currentPhaseId];

  // Atualiza vitais ao mudar de fase
  useEffect(() => {
    if (currentPhase?.vitals) {
      setVitals(currentPhase.vitals);
    }
  }, [currentPhaseId]);

  const handleChoice = (trigger: string, nextId: string, feedback: string, isFatal?: boolean) => {
    // 1. Registrar no histórico para o debriefing
    setHistory(prev => [...prev, {
      narrative: currentPhase.narrative,
      choice: trigger,
      feedback: feedback
    }]);

    setLastFeedback(feedback);

    // 2. Checar erro fatal
    if (isFatal) {
      setIsFinished(true);
      return;
    }

    // 3. Mudar de fase ou finalizar
    if (nextId === 'FINISH') {
      setIsFinished(true);
    } else {
      setCurrentPhaseId(nextId);
    }
  };

  // --- COMPONENTES INTERNOS ---
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

  if (isFinished) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 animate-in zoom-in duration-500">
        <div className="bg-white rounded-[3rem] shadow-2xl overflow-hidden border border-gray-100">
          <div className="bg-[#003366] p-10 text-center text-white">
            <h2 className="text-3xl font-black uppercase tracking-tighter mb-2">Simulação Encerrada</h2>
            <p className="text-[#D4A017] font-bold uppercase text-xs tracking-[0.2em]">Debriefing & Performance</p>
          </div>
          
          <div className="p-10 space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-6 bg-blue-50 rounded-2xl text-center">
                <ShieldCheck className="mx-auto mb-2 text-blue-600" />
                <span className="block text-[10px] font-black uppercase text-blue-800">Técnica</span>
                <span className="text-2xl font-black text-[#003366]">8.5</span>
              </div>
              <div className="p-6 bg-green-50 rounded-2xl text-center">
                <MessageSquare className="mx-auto mb-2 text-green-600" />
                <span className="block text-[10px] font-black uppercase text-green-800">Comunicação</span>
                <span className="text-2xl font-black text-[#003366]">9.0</span>
              </div>
              <div className="p-6 bg-purple-50 rounded-2xl text-center">
                <Activity className="mx-auto mb-2 text-purple-600" />
                <span className="block text-[10px] font-black uppercase text-purple-800">Raciocínio</span>
                <span className="text-2xl font-black text-[#003366]">7.0</span>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-black text-[#003366] uppercase text-sm border-b pb-2">Linha do Tempo das Decisões</h3>
              {history.map((step, i) => (
                <div key={i} className="flex gap-4 p-4 bg-gray-50 rounded-xl border border-gray-100">
                  <div className="w-6 h-6 rounded-full bg-[#003366] text-white flex items-center justify-center text-[10px] font-bold shrink-0">{i+1}</div>
                  <div>
                    <p className="text-xs font-bold text-gray-500 mb-1">Ação: {step.choice}</p>
                    <p className="text-sm text-gray-800 italic">"{step.feedback}"</p>
                  </div>
                </div>
              ))}
            </div>

            <button onClick={onBack} className="w-full bg-[#D4A017] text-[#003366] py-5 rounded-2xl font-black uppercase tracking-widest hover:scale-[1.02] transition-all shadow-lg">
              Finalizar e Sair
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* HEADER DINÂMICO */}
      <div className="flex justify-between items-center mb-8 bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100">
        <div>
          <span className="text-[10px] font-black text-[#D4A017] uppercase tracking-widest">{station.theme}</span>
          <h2 className="text-2xl font-black text-[#003366] uppercase tracking-tighter">{station.title}</h2>
        </div>
        <button onClick={onBack} className="text-gray-400 hover:text-red-500 transition-colors">
          <RotateCcw size={20} />
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* LADO ESQUERDO: MONITOR DE SINAIS VITAIS */}
        <div className="lg:col-span-3 space-y-4">
          <div className="bg-white p-6 rounded-[2rem] shadow-xl border-t-8 border-[#003366]">
            <h3 className="text-[10px] font-black text-[#003366] uppercase mb-6 tracking-widest flex items-center gap-2">
              <Activity size={14} className="animate-pulse" /> Monitor de Vagas
            </h3>
            
            <div className="grid grid-cols-1 gap-3">
              <VitalParam label="FC" value={vitals.hr} unit="bpm" icon={Activity} color="text-red-500" />
              <VitalParam label="PA" value={vitals.bp} unit="mmHg" icon={ShieldCheck} color="text-blue-500" />
              <VitalParam label="SatO2" value={vitals.sat} unit="%" icon={Activity} color="text-green-500" />
              <VitalParam label="FR" value={vitals.rr} unit="irpm" icon={Activity} color="text-purple-500" />
            </div>

            <div className="mt-6 pt-6 border-t border-gray-100">
              <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-2">Estado Clínico</span>
              <div className="bg-gray-50 p-3 rounded-xl text-center">
                <span className="text-xs font-black text-[#003366] uppercase">{vitals.status}</span>
              </div>
            </div>
          </div>

          <div className="bg-[#003366] p-6 rounded-[2rem] text-white">
             <h4 className="text-[10px] font-black text-[#D4A017] uppercase mb-2 tracking-widest">Objetivo</h4>
             <p className="text-xs font-medium leading-relaxed opacity-90">{station.task}</p>
          </div>
        </div>

        {/* LADO DIREITO: NARRATIVA E AÇÕES */}
        <div className="lg:col-span-9 space-y-6">
          
          {/* PAINEL DE NARRATIVA */}
          <div className="bg-white p-10 rounded-[3rem] shadow-2xl border border-gray-50 min-h-[300px] flex flex-col">
            <div className="flex-grow">
              <span className="inline-block bg-blue-50 text-[#003366] px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest mb-6">Cenário Atual</span>
              <p className="text-xl md:text-2xl text-gray-700 font-medium leading-relaxed mb-10">
                {currentPhase?.narrative}
              </p>
            </div>

            {/* FEEDBACK DA ÚLTIMA AÇÃO */}
            {lastFeedback && (
              <div className="bg-yellow-50 p-4 rounded-2xl border border-yellow-100 mb-8 flex items-start gap-3 animate-in fade-in slide-in-from-left-4">
                <AlertTriangle className="text-yellow-600 shrink-0" size={18} />
                <p className="text-xs font-bold text-yellow-800 italic">{lastFeedback}</p>
              </div>
            )}

            {/* OPÇÕES DE DECISÃO */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {currentPhase?.transitions.map((t, idx) => (
                <button
                  key={idx}
                  onClick={() => handleChoice(t.triggers[0], t.nextPhaseId, t.feedbackText, t.isFatalError)}
                  className="flex items-center justify-between p-5 rounded-2xl border-2 border-gray-100 bg-gray-50 hover:bg-white hover:border-[#D4A017] hover:shadow-lg transition-all group text-left"
                >
                  <span className="text-sm font-black text-[#003366] group-hover:text-[#D4A017]">{t.triggers[0]}</span>
                  <ChevronRight size={18} className="text-gray-300 group-hover:text-[#D4A017] group-hover:translate-x-1 transition-all" />
                </button>
              ))}
            </div>
          </div>

          <p className="text-center text-[10px] font-black text-gray-300 uppercase tracking-[0.4em]">
            Luna Engine 2.0 • Simulação Baseada em RPG
          </p>
        </div>
      </div>
    </div>
  );
};

export default DynamicOsceView;