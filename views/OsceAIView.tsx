import React, { useState, useEffect, useRef } from 'react';
import { OsceStation, ClinicalState, DynamicOsceStation } from '../types';
import { getAIResponse } from '../services/aiService';
import { LogOut, Send } from 'lucide-react';

interface OsceAIViewProps {
  station: OsceStation;
  onBack: () => void;
  onSaveResult?: (score: number, total: number, timeSpent: number, analytics: any) => void;
}

const formatFeedback = (text: string) => {
  const parts = text.split(/(\*\*.*?\*\*)/g);
  return (
    <>
      {parts.map((part, index) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={index} className="text-[#D4A017] font-black">{part.slice(2, -2)}</strong>;
        }
        return <span key={index}>{part}</span>;
      })}
    </>
  );
};

const OsceAIView: React.FC<OsceAIViewProps> = ({ station, onBack, onSaveResult }) => {
  const dynamicStation = station as DynamicOsceStation;
  const isAiMode = dynamicStation.mode === 'ai';
  
  const [currentPhaseId, setCurrentPhaseId] = useState<string | null>(dynamicStation.initialPhaseId || null);
  const [vitals, setVitals] = useState<ClinicalState | null>(dynamicStation.initialVitals || null);
  const [currentBg, setCurrentBg] = useState<string | undefined>(undefined);
  const [timer, setTimer] = useState(0);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [messages, setMessages] = useState<{role: 'user'|'patient'|'system', text: string}[]>([
    { 
      role: 'system', 
      text: isAiMode 
        ? `🧪 PACIENTE VIRTUAL: FOCO EM ANAMNESE\n\n📝 CENÁRIO:\n${dynamicStation.scenario}\n\n🎯 MISSÃO:\n${dynamicStation.task}\n\n---\n💬 Inicie a conversa com o paciente. Explore a história clínica e antecedentes com empatia.`
        : `🚨 LUNA ENGINE: SIMULAÇÃO CLÍNICA (RPG)\n\n📝 CENÁRIO:\n${dynamicStation.scenario}\n\n🎯 MISSÃO:\n${dynamicStation.task}\n\n---\n💬 O Narrador ditará o ritmo da cena. Descreva suas condutas técnicas e comunicação com exatidão!` 
    }
  ]);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const currentSetting = dynamicStation.setting || (isAiMode ? 'Consultório médico.' : 'Sala de Emergência.');
  const isCritical = vitals && (vitals.hr === 0 || vitals.sat < 90 || (vitals.bp && parseInt(vitals.bp.split('/')[0]) < 90));

  useEffect(() => {
    let interval: any;
    if (!isFinished) {
      interval = setInterval(() => setTimer(t => t + 1), 1000);
    }
    return () => clearInterval(interval);
  }, [isFinished]);

  useEffect(() => {
    if (dynamicStation.phases && currentPhaseId) {
      const phase = dynamicStation.phases[currentPhaseId];
      if (phase) {
        setVitals(phase.vitals);
        setCurrentBg(phase.backgroundUrl);
      }
    }
  }, [dynamicStation, currentPhaseId]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, feedback, isLoading]);

  const fetchAdvancedAI = async (prompt: string, context: string, phaseRules?: any) => {
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, context, mode: 'rpg', phaseRules }),
      });
      if (!response.ok) throw new Error("Erro na API");
      return await response.json(); 
    } catch (error) {
      console.error(error);
      return { text: "Falha de comunicação com o motor. Tente novamente." };
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading || isFinished) return;
    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setIsLoading(true);

    const chatHistory = messages
      .filter(m => m.role !== 'system')
      .map(m => `${m.role === 'user' ? 'Médico' : (isAiMode ? 'Paciente' : 'Narrador')}: ${m.text}`)
      .join('\n');

    let phaseRules = null;
    let context = "";

    if (dynamicStation.phases && currentPhaseId) {
      const currentPhase = dynamicStation.phases[currentPhaseId];
      phaseRules = {
        transitions: currentPhase.transitions,
        narrative: currentPhase.narrative
      };

      context = isAiMode 
        ? `Você é o PACIENTE desta simulação. Persona: "${currentPhase.narrative}".
           1. Responda em 1ª pessoa, de forma natural.
           2. Use linguagem leiga.
           3. Se houver uma 'Hidden Info', não revele de imediato.
           Histórico: ${chatHistory}`
        : `Você é o NARRADOR (Mestre). CENÁRIO: "${dynamicStation.scenario}". 
           FASE ATUAL: "${currentPhase.narrative}".
           Histórico: ${chatHistory}`;
    }

    const prompt = `Médico (Aluno): ${userMsg}\n${isAiMode ? 'Paciente' : 'Narrador'}:`;
    const aiData = await fetchAdvancedAI(prompt, context, phaseRules);
    let cleanResponse = aiData.text.replace(/^(Narrador|Paciente):\s*/i, '').trim();
    
    if (aiData.newPhaseId && dynamicStation.phases?.[aiData.newPhaseId]) {
      const nextPhase = dynamicStation.phases[aiData.newPhaseId];
      setCurrentPhaseId(aiData.newPhaseId);
      setVitals(nextPhase.vitals);
      if (nextPhase.backgroundUrl) setCurrentBg(nextPhase.backgroundUrl);
    } 

    setMessages(prev => [...prev, { role: 'patient', text: cleanResponse }]);
    setIsLoading(false);
  };

  const handleFinish = async () => {
    setIsLoading(true);
    setIsFinished(true);

    const chatHistory = messages
      .filter(m => m.role !== 'system')
      .map(m => `${m.role === 'user' ? 'Médico' : (isAiMode ? 'Paciente' : 'Narrador')}: ${m.text}`)
      .join('\n');

    const context = `Você é um PRECEPTOR MÉDICO SÊNIOR.
    Cenário: "${dynamicStation.scenario}".
    Checklist: ${dynamicStation.checklist?.join(', ') || 'Geral'}.
    Modo: ${isAiMode ? 'Virtual' : 'RPG'}.`;

    const prompt = `Avalie rigidamente a transcrição:\n${chatHistory}\n
    Estrutura:
    🤝 POSTURA E COMUNICAÇÃO:
    🎯 ACERTOS E CHECKLIST:
    ⚠️ OMISSÕES OU ERROS:
    💡 ESSÊNCIA DO CASO:
    📊 NOTA FINAL (0 a 10):`;

    const response = await getAIResponse(prompt, context);
    setFeedback(response);

    const gradeMatch = response.match(/NOTA FINAL.*:\s*(\d+(\.\d+)?)/i);
    const finalGrade = gradeMatch ? parseFloat(gradeMatch[1]) : 0;

    if (onSaveResult) {
      onSaveResult(finalGrade, 10, timer, {
        stationId: dynamicStation.id,
        mode: dynamicStation.mode,
        timeSpent: timer,
        grade: finalGrade,
        theme: dynamicStation.theme,
        disciplineId: dynamicStation.disciplineId
      });
    }
    setIsLoading(false);
  };

  return (
    <div 
      className={`max-w-5xl mx-auto px-4 pt-6 pb-2 h-[88vh] flex flex-col relative transition-all duration-1000 ${isCritical ? 'shadow-[inset_0_0_100px_rgba(220,38,38,0.4)]' : ''}`}
      style={currentBg ? {
        backgroundImage: `linear-gradient(rgba(240, 244, 248, 0.88), rgba(240, 244, 248, 0.95)), url(${currentBg})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      } : { backgroundColor: '#F0F4F8' }}
    >
      {/* HEADER */}
      <div className="flex justify-between items-center mb-3 border-b border-gray-300/50 pb-3 shrink-0 relative z-20">
        <button onClick={onBack} className="text-[#003366] font-black uppercase text-[10px] flex items-center gap-2 hover:text-[#D4A017] bg-white/50 px-3 py-1 rounded-lg backdrop-blur-sm">
          <span>←</span> Sair
        </button>
        <div className="text-right">
          <span className={`text-[10px] font-black uppercase tracking-widest ${isCritical ? 'text-red-500 animate-pulse' : 'text-[#D4A017]'}`}>
            {isAiMode ? 'PACIENTE VIRTUAL' : 'LUNA ENGINE (RPG)'}
          </span>
          <h2 className="text-xl font-black text-[#003366] uppercase tracking-tighter">{dynamicStation.title}</h2>
        </div>
      </div>

      {/* MONITOR */}
      {vitals && !isFinished && (
        <div className="bg-[#0a0f18]/95 border-2 border-gray-800 shadow-xl rounded-2xl p-4 md:p-6 mb-4 flex justify-around items-center text-green-500 font-mono animate-in fade-in">
          <div className="flex flex-col items-center">
             <span className="text-[10px] text-gray-400 uppercase">FC</span>
             <span className="text-4xl font-black">{vitals.hr}</span>
          </div>
          <div className="flex flex-col items-center">
             <span className="text-[10px] text-gray-400 uppercase">PA</span>
             <span className="text-4xl font-black text-blue-400">{vitals.bp}</span>
          </div>
          <div className="flex flex-col items-center">
             <span className="text-[10px] text-gray-400 uppercase">SpO2</span>
             <span className="text-4xl font-black">{vitals.sat}%</span>
          </div>
        </div>
      )}

      {/* CHAT / RELATÓRIO */}
      <div className="flex-grow overflow-y-auto space-y-5 p-4 md:p-6 bg-white/60 backdrop-blur-lg rounded-[1.5rem] shadow-inner mb-4 border border-white/50 flex flex-col relative z-10">
        {!isFinished ? (
            messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : msg.role === 'system' ? 'justify-center' : 'justify-start'} relative z-10`}>
                    <div className={`whitespace-pre-wrap leading-relaxed ${
                        msg.role === 'user' ? 'p-4 max-w-[85%] md:max-w-[70%] rounded-2xl bg-[#003366] text-white shadow-lg' :
                        msg.role === 'system' ? 'p-5 md:p-8 w-full rounded-[1.5rem] bg-yellow-100 text-yellow-900 border-2 border-yellow-300 shadow-md' :
                        'p-4 max-w-[85%] md:max-w-[70%] rounded-2xl bg-white text-[#003366] border border-gray-200 shadow-lg'
                    }`}>
                        {msg.role === 'patient' && <span className="text-[10px] font-black text-[#D4A017] uppercase block mb-1">{isAiMode ? 'PACIENTE' : 'NARRADOR'}</span>}
                        {msg.text}
                    </div>
                </div>
            ))
        ) : feedback && (
            <div className="animate-in fade-in duration-700 relative z-10">
                <div className="bg-[#003366] p-6 md:p-10 rounded-[1.5rem] shadow-2xl text-white">
                    <h3 className="text-xl font-black uppercase flex items-center gap-3 mb-6 border-b border-white/10 pb-4">
                        <span>🎓</span> Avaliação do Preceptor
                    </h3>
                    <div className="text-sm md:text-base leading-relaxed whitespace-pre-wrap font-medium space-y-4">
                        {formatFeedback(feedback)}
                    </div>
                </div>
            </div>
        )}
        {isLoading && !isFinished && <div className="text-[#D4A017] font-black animate-pulse p-4">Digitando...</div>}
        <div ref={chatEndRef} />
      </div>

      {/* INPUTS / CONTROLES FINAIS */}
      <div className="shrink-0 bg-white/40 backdrop-blur-xl p-3 -mx-4 -mb-2 relative z-20 border-t border-white/40">
        {!isFinished ? (
          <div className="flex flex-col gap-3">
            <div className="flex gap-2">
              <input
                type="text" value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSend()}
                placeholder={isAiMode ? "Pergunte ao paciente..." : "Sua conduta..."}
                className="flex-grow p-4 bg-white rounded-2xl border-2 border-transparent focus:border-[#D4A017] outline-none font-medium text-[#003366]"
                disabled={isLoading}
              />
              <button onClick={handleSend} disabled={isLoading || !input.trim()} className="bg-[#D4A017] text-[#003366] font-black px-8 rounded-2xl shadow-lg active:scale-95 transition-all">
                <Send size={18} />
              </button>
            </div>
            <button onClick={handleFinish} disabled={isLoading || messages.length < 2} className="w-full bg-red-50 text-red-600 border-2 border-red-100 py-3 rounded-2xl font-black uppercase text-[11px] tracking-widest hover:bg-red-600 hover:text-white transition-all">
              🛑 Encerrar Atendimento
            </button>
          </div>
        ) : (
          <div className="flex justify-center py-2">
            <button onClick={onBack} className="w-full md:w-1/2 flex items-center justify-center gap-3 bg-[#D4A017] text-[#003366] py-4 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl hover:scale-105 transition-all">
              <LogOut size={18}/> Sair da Consulta
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default OsceAIView;