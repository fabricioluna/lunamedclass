import React, { useState, useEffect, useRef } from 'react';
import { OsceStation, ClinicalState } from '../types';
import { getAIResponse } from '../services/aiService';

interface OsceAIViewProps {
  station: OsceStation;
  onBack: () => void;
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

const OsceAIView: React.FC<OsceAIViewProps> = ({ station, onBack }) => {
  const defaultSetting = 'Consultório/Sala de Emergência padrão.';
  const currentSetting = station.setting || defaultSetting;
  
  // --- LUNA ENGINE 2.0: ESTADOS DO MOTOR PÚRO ---
  const [currentPhaseId, setCurrentPhaseId] = useState<string | null>(station.initialPhaseId || null);
  const [vitals, setVitals] = useState<ClinicalState | null>(station.initialVitals || null);
  const [currentBg, setCurrentBg] = useState<string | undefined>(undefined);

  // Efeito Visual de Tensão (Paciente Crítico)
  const isCritical = vitals && (vitals.hr === 0 || vitals.sat < 90 || parseInt(vitals.bp.split('/')[0]) < 90);

  // Inicializa a fase se ela existir no JSON
  useEffect(() => {
    if (station.phases && currentPhaseId) {
      const initialPhase = station.phases[currentPhaseId];
      if (initialPhase) {
        setVitals(initialPhase.vitals);
        setCurrentBg(initialPhase.backgroundUrl);
      }
    }
  }, []);

  const [messages, setMessages] = useState<{role: 'user'|'patient'|'system', text: string}[]>([
    { 
      role: 'system', 
      text: `🚨 LUNA ENGINE: SIMULAÇÃO CLÍNICA IMERSIVA\n\n📍 AMBIENTE:\n${currentSetting}\n\n📝 CENÁRIO:\n${station.scenario}\n\n🎯 MISSÃO:\n${station.task}\n\n---\n💬 O Narrador ditará o ritmo da cena. Aja como um médico real: descreva suas condutas, passos de procedimentos e comunicação com exatidão!` 
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [feedback, setFeedback] = useState('');

  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, feedback, isLoading]);

  // --- COMUNICAÇÃO COM A IA (STATE MACHINE) ---
  const fetchAdvancedAI = async (prompt: string, context: string, phaseRules?: any) => {
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // Forçamos o modo RPG já que legados foram abandonados
        body: JSON.stringify({ prompt, context, mode: 'rpg', phaseRules }),
      });
      if (!response.ok) throw new Error("Erro na API");
      return await response.json(); 
    } catch (error) {
      console.error(error);
      return { text: "Desculpe, falha de comunicação com o motor do simulador. Tente novamente." };
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
      .map(m => `${m.role === 'user' ? 'Médico' : 'Narrador'}: ${m.text}`)
      .join('\n');

    let phaseRules = null;
    let context = "";

    if (station.phases && currentPhaseId) {
      const currentPhase = station.phases[currentPhaseId];
      phaseRules = {
        transitions: currentPhase.transitions,
        narrative: currentPhase.narrative
      };

      context = `Você é o NARRADOR (Mestre) de uma simulação médica regida por uma Máquina de Estados (Luna Engine).
      CENÁRIO GERAL: "${station.scenario}".
      INVENTÁRIO/MATERIAIS NA SALA: ${station.inventory && station.inventory.length > 0 ? station.inventory.join(', ') : 'Nenhum material extra listado. Apenas recursos básicos.'}.
      
      ESTADO ATUAL DO PACIENTE (FASE: ${currentPhaseId}):
      "${currentPhase.narrative}"
      
      REGRAS CRÍTICAS:
      1. Aja como Narrador e Juiz clínico implacável.
      2. Se o aluno pedir um procedimento, verifique mentalmente se ele citou os passos de biossegurança e técnica adequados, e se o item está no inventário.
      3. Se a conduta do aluno ativar os GATILHOS da fase atual, chame IMEDIATAMENTE a ferramenta 'change_phase'.
      4. Se ele errar ou fizer algo inútil, narre que não houve melhora. NUNCA sugira o que ele deve fazer a seguir.
      
      Histórico da Simulação:
      ${chatHistory}`;
    }

    const prompt = `Médico (Aluno): ${userMsg}\nNarrador:`;

    const aiData = await fetchAdvancedAI(prompt, context, phaseRules);
    let cleanResponse = aiData.text.replace(/^Narrador:\s*/i, '').trim();
    
    // Motor Lógico: Mudança de Fase Visual e Fisiológica
    if (aiData.newPhaseId && station.phases && station.phases[aiData.newPhaseId]) {
      const nextPhase = station.phases[aiData.newPhaseId];
      setCurrentPhaseId(aiData.newPhaseId);
      setVitals(nextPhase.vitals);
      if (nextPhase.backgroundUrl) setCurrentBg(nextPhase.backgroundUrl);
    } 
    else if (aiData.vitalsUpdate) {
      // Fallback para estações de RPG que apenas atualizam vitais sem fases fixas
      setVitals(aiData.vitalsUpdate);
    }

    setMessages(prev => [...prev, { role: 'patient', text: cleanResponse }]);
    setIsLoading(false);
  };

  const handleFinish = async () => {
    setIsLoading(true);
    setIsFinished(true);

    const chatHistory = messages
      .filter(m => m.role !== 'system')
      .map(m => `${m.role === 'user' ? 'Médico' : 'Narrador'}: ${m.text}`)
      .join('\n');

    const context = `Você é um PRECEPTOR MÉDICO SÊNIOR avaliando um aluno no simulador Luna Engine.
    Cenário: "${station.scenario}".
    Checklist Oficial a ser cumprido: ${station.checklist.join(', ')}.
    `;

    const prompt = `Avalie a transcrição abaixo:
    \n${chatHistory}\n
    
    Gere uma avaliação didática, rígida e construtiva. Use **negrito** para destaque. Siga esta estrutura:

    🤝 POSTURA, TÉCNICA E BIOSSEGURANÇA:
    (Avalie a conduta geral)

    🎯 ACERTOS CLÍNICOS E CHECKLIST:
    (O que ele fez certo com base no checklist)

    ⚠️ O QUE FALTOU OU ERROS FATAIS:
    (Falhas graves, perda de tempo ou itens não cumpridos)

    💡 ESSÊNCIA DO CASO:
    (A lição central)

    📊 NOTA FINAL (0 a 10):
    (Nota rigorosa baseada no desempenho técnico)`;

    const response = await getAIResponse(prompt, context);
    setFeedback(response);
    setIsLoading(false);
  };

  return (
    // Fundo Dinâmico com Sombra de Urgência (Vignette) se o paciente estiver crítico
    <div 
      className={`max-w-5xl mx-auto px-4 pt-6 pb-2 h-[88vh] flex flex-col relative transition-all duration-1000 ease-in-out ${isCritical ? 'shadow-[inset_0_0_100px_rgba(220,38,38,0.4)]' : ''}`}
      style={currentBg ? {
        backgroundImage: `linear-gradient(rgba(240, 244, 248, 0.88), rgba(240, 244, 248, 0.95)), url(${currentBg})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      } : { backgroundColor: '#F0F4F8' }}
    >
      
      {/* HEADER */}
      <div className="flex justify-between items-center mb-3 border-b border-gray-300/50 pb-3 shrink-0 relative z-20">
        <button onClick={onBack} className="text-[#003366] font-black uppercase text-[10px] flex items-center gap-2 hover:text-[#D4A017] bg-white/50 px-3 py-1 rounded-lg backdrop-blur-sm">
          <span>←</span> Abortar Simulação
        </button>
        <div className="text-right">
          <span className={`text-[10px] font-black uppercase tracking-widest ${isCritical ? 'text-red-500 animate-pulse' : 'text-[#D4A017]'}`}>
            {isCritical ? '⚠️ ESTADO CRÍTICO' : 'LUNA ENGINE (ATENDIMENTO)'}
          </span>
          <h2 className="text-xl font-black text-[#003366] uppercase tracking-tighter drop-shadow-sm">{station.title}</h2>
        </div>
      </div>

      {/* --- MONITOR MULTIPARÂMETRO --- */}
      {vitals && !isFinished && (
        <div className={`bg-[#0a0f18]/95 border-2 ${isCritical ? 'border-red-900/80 shadow-[0_5px_30px_rgba(220,38,38,0.3)]' : 'border-gray-800 shadow-[0_10px_30px_rgba(0,0,0,0.5)]'} rounded-2xl p-4 md:p-6 mb-4 flex justify-around items-center text-green-500 font-mono animate-in fade-in slide-in-from-top-4 relative z-20`}>
          <div className="flex flex-col items-center">
             <span className="text-[10px] md:text-xs text-gray-400 tracking-widest mb-1">FC (bpm)</span>
             <span className={`text-4xl md:text-5xl font-black transition-all duration-500 ${vitals.hr === 0 ? 'text-red-500 animate-pulse' : vitals.hr > 110 ? 'text-yellow-400' : 'text-green-400 drop-shadow-[0_0_8px_rgba(74,222,128,0.5)]'}`}>
               {vitals.hr}
             </span>
          </div>
          <div className="flex flex-col items-center">
             <span className="text-[10px] md:text-xs text-gray-400 tracking-widest mb-1">PA (mmHg)</span>
             <span className={`text-4xl md:text-5xl font-black transition-all duration-500 ${parseInt(vitals.bp.split('/')[0]) < 90 ? 'text-red-400 drop-shadow-[0_0_8px_rgba(248,113,113,0.5)]' : 'text-blue-400 drop-shadow-[0_0_8px_rgba(96,165,250,0.5)]'}`}>
               {vitals.bp}
             </span>
          </div>
          <div className="flex flex-col items-center">
             <span className="text-[10px] md:text-xs text-gray-400 tracking-widest mb-1">SpO2 (%)</span>
             <span className={`text-4xl md:text-5xl font-black transition-all duration-500 ${vitals.sat < 90 ? 'text-red-400 drop-shadow-[0_0_8px_rgba(248,113,113,0.5)]' : 'text-green-400 drop-shadow-[0_0_8px_rgba(74,222,128,0.5)]'}`}>
               {vitals.sat}
             </span>
          </div>
          <div className="hidden md:flex flex-col items-center">
             <span className="text-[10px] md:text-xs text-gray-400 tracking-widest mb-1">FR (irpm)</span>
             <span className="text-4xl md:text-5xl font-black text-purple-400 drop-shadow-[0_0_8px_rgba(192,132,252,0.5)] transition-all duration-500">
               {vitals.rr}
             </span>
          </div>
        </div>
      )}

      {/* CHAT AREA COM MARCA D'ÁGUA */}
      <div className="flex-grow overflow-y-auto space-y-5 p-4 md:p-6 bg-white/60 backdrop-blur-lg rounded-[1.5rem] shadow-inner mb-4 border border-white/50 flex flex-col relative z-10 overflow-hidden">
        
        {/* Marca D'água Dinâmica */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.03] z-0">
          <span className="text-6xl md:text-8xl font-black text-[#003366] uppercase text-center tracking-tighter leading-none origin-center -rotate-12 select-none">
            {station.theme}
          </span>
        </div>

        {messages.map((msg, i) => (
           <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : msg.role === 'system' ? 'justify-center' : 'justify-start'} relative z-10`}>
             <div className={`whitespace-pre-wrap leading-relaxed ${
               msg.role === 'user' ? 'p-4 max-w-[85%] md:max-w-[70%] rounded-2xl bg-[#003366]/95 text-white rounded-br-sm shadow-lg font-medium text-sm md:text-base backdrop-blur-sm' :
               msg.role === 'system' ? 'p-5 md:p-8 w-full rounded-[1.5rem] bg-yellow-100/90 text-yellow-900 text-sm md:text-base text-center border-2 border-yellow-300/50 shadow-md font-medium mb-2 backdrop-blur-md' :
               'p-4 max-w-[85%] md:max-w-[70%] rounded-2xl bg-white/95 text-[#003366] font-medium rounded-bl-sm border border-gray-200 shadow-lg text-sm md:text-base backdrop-blur-md'
             }`}>
               {msg.role === 'patient' && <span className="text-[10px] font-black text-[#D4A017] uppercase tracking-widest block mb-1 border-b border-gray-200 pb-1 mb-2">NARRADOR / AMBIENTE</span>}
               {msg.text}
             </div>
           </div>
        ))}
        
        {isLoading && !isFinished && (
          <div className="flex justify-start relative z-10">
            <div className="p-4 bg-white/90 backdrop-blur-sm rounded-2xl rounded-bl-sm border border-gray-200 shadow-md flex items-center gap-2">
              <div className="w-2 h-2 bg-[#D4A017] rounded-full animate-bounce"></div>
              <div className="w-2 h-2 bg-[#D4A017] rounded-full animate-bounce delay-75"></div>
              <div className="w-2 h-2 bg-[#D4A017] rounded-full animate-bounce delay-150"></div>
            </div>
          </div>
        )}

        {isLoading && isFinished && !feedback && (
          <div className="flex justify-center mt-6 animate-in fade-in duration-500 relative z-10">
            <div className="bg-white/95 backdrop-blur-xl p-6 rounded-[1.5rem] shadow-2xl border-2 border-dashed border-[#D4A017] flex flex-col items-center justify-center gap-4 text-[#003366] w-full md:w-3/4">
              <div className="text-4xl animate-spin text-[#D4A017]">⏳</div>
              <div className="text-center">
                <h4 className="font-black uppercase tracking-widest text-sm mb-1">Preceptor Avaliando</h4>
                <p className="text-xs font-medium text-gray-500">Julgando conduta, biosegurança e tempo...</p>
              </div>
            </div>
          </div>
        )}
        
        {isFinished && feedback && (
           <div className="flex justify-center mt-6 animate-in fade-in duration-700 relative z-10">
             <div className="bg-[#003366]/95 backdrop-blur-xl w-full p-6 md:p-10 rounded-[1.5rem] shadow-2xl border-t-8 border-[#D4A017] text-white">
                <h3 className="text-xl font-black uppercase tracking-tighter flex items-center gap-3 mb-6 border-b border-white/10 pb-4">
                  <span>🎓</span> Relatório de Simulação
                </h3>
                <div className="text-sm md:text-base leading-relaxed whitespace-pre-wrap font-medium space-y-4">
                  {formatFeedback(feedback)}
                </div>
             </div>
           </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* INPUT AREA */}
      <div className="shrink-0 bg-white/40 backdrop-blur-xl p-3 -mx-4 -mb-2 relative z-20 border-t border-white/40 shadow-[0_-10px_30px_rgba(0,0,0,0.05)]">
        {!isFinished ? (
          <div className="flex flex-col gap-3">
            <div className="flex gap-2 relative">
              <input
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSend()}
                placeholder="Declare sua conduta, técnica ou fala..."
                className="flex-grow p-4 bg-white/95 rounded-2xl border-2 border-transparent focus:border-[#D4A017] outline-none transition-all font-medium text-[#003366] shadow-sm"
                disabled={isLoading}
              />
              <button 
                onClick={handleSend} 
                disabled={isLoading || !input.trim()} 
                className="bg-[#D4A017] text-[#003366] font-black px-6 md:px-8 rounded-2xl hover:bg-[#003366] hover:text-white transition-all disabled:opacity-50 flex items-center justify-center text-xl shadow-lg transform active:scale-95"
              >
                ➤
              </button>
            </div>
            
            <button 
              onClick={handleFinish} 
              disabled={isLoading || messages.length < 2}
              className="w-full bg-red-50/90 text-red-600 border-2 border-red-200/50 hover:bg-red-600 hover:text-white hover:border-red-600 py-3 rounded-2xl font-black uppercase text-[11px] tracking-widest transition-all disabled:opacity-40 flex items-center justify-center gap-2 shadow-sm backdrop-blur-md"
            >
              <span>🛑</span> Finalizar Atendimento e Solicitar Preceptor
            </button>
          </div>
        ) : (
          <button 
            onClick={onBack}
            className="w-full bg-[#D4A017] text-[#003366] py-4 rounded-2xl font-black uppercase text-sm tracking-widest shadow-xl hover:scale-[1.02] transition-all"
          >
            Sair da Sala de Simulação
          </button>
        )}
      </div>
    </div>
  );
};

export default OsceAIView;