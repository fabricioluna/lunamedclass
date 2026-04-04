import React, { useState, useEffect, useRef } from 'react';
import { OsceStation, ClinicalState, DynamicOsceStation } from '../types';
import { getAIResponse, fetchAdvancedAI } from '../services/aiService'; 
import { LogOut, Send, Activity } from 'lucide-react'; 

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
          return <strong key={index} className="text-[#003366] font-black">{part.slice(2, -2)}</strong>;
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
  
  const [visibleVitals, setVisibleVitals] = useState({
    hr: false,
    bp: false,
    sat: false,
    rr: false
  });

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
  
  const isAnyVitalVisible = visibleVitals.hr || visibleVitals.bp || visibleVitals.sat || visibleVitals.rr;
  const isCritical = vitals && (
    (visibleVitals.hr && vitals.hr === 0) || 
    (visibleVitals.sat && vitals.sat < 90) || 
    (visibleVitals.bp && vitals.bp && parseInt(vitals.bp.split('/')[0]) < 90)
  );

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

  const handleSend = async () => {
    if (!input.trim() || isLoading || isFinished) return;
    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setIsLoading(true);

    const msgLower = userMsg.toLowerCase();
    if (!/(n[aã]o|deslig|tirar|remover)/i.test(msgLower)) {
      setVisibleVitals(prev => {
        const next = { ...prev };
        if (/(monitor|sinais vitais|ssvv|triagem|par[âa]metros)/i.test(msgLower)) {
          next.hr = next.bp = next.sat = next.rr = true;
        }
        if (/(press[aã]o|pa\b|esfigmo|tens[aã]o)/i.test(msgLower)) next.bp = true;
        if (/(frequ[êe]ncia card[íi]aca|fc\b|pulso|batimento|cora[çc][aã]o|card[íi]ac|ausculta\scard)/i.test(msgLower)) next.hr = true;
        if (/(ox[ií]metr|satura|spo2|sp\s*o2|o2\b|oxigen)/i.test(msgLower)) next.sat = true;
        if (/(frequ[êe]ncia respirat[óo]ria|fr\b|respira|pulm|incurs[õo]es|ausculta\spulm)/i.test(msgLower)) next.rr = true;
        return next;
      });
    }

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

      // LUNA ENGINE: Foco puro em Anamnese e Atendimento (Sem Fisiologia Dinâmica)
      context = isAiMode 
        ? `Você é o PACIENTE desta simulação. Persona: "${currentPhase.narrative}".
           1. Responda em 1ª pessoa, de forma natural e com linguagem leiga.
           2. O objetivo desta consulta é TREINO DE ANAMNESE E CONDUTA INICIAL.
           3. Se o médico prescrever medicamentos ou tratamentos, reaja apenas verbalmente (ex: "Obrigado doutor", ou "Tem certeza? Eu tenho alergia a isso").
           Histórico: ${chatHistory}`
        : `Você é o NARRADOR (Mestre). CENÁRIO: "${dynamicStation.scenario}". 
           FASE ATUAL: "${currentPhase.narrative}".
           Histórico: ${chatHistory}`;
    }

    const prompt = `Médico (Aluno): ${userMsg}\n${isAiMode ? 'Paciente' : 'Narrador'}:`;
    
    const aiData = await fetchAdvancedAI(prompt, context, phaseRules);
    let cleanResponse = aiData.text.replace(/^(Narrador|Paciente):\s*/i, '').trim();
    
    if (aiData.vitalsUpdate) {
      setVitals(aiData.vitalsUpdate);
    }

    if (aiData.newPhaseId && dynamicStation.phases?.[aiData.newPhaseId]) {
      const nextPhase = dynamicStation.phases[aiData.newPhaseId];
      setCurrentPhaseId(aiData.newPhaseId);
      
      if (nextPhase.vitals) {
        setVitals(nextPhase.vitals);
      }
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

    const context = `Você é um PRECEPTOR MÉDICO SÊNIOR avaliando um aluno de medicina.
    Cenário: "${dynamicStation.scenario}". Missão do aluno: "${dynamicStation.task}".`;

    const prompt = `Avalie com máximo rigor a transcrição clínica abaixo:\n\n${chatHistory}\n
    Gere um relatório detalhado obrigando a seguinte estrutura exata:
    🤝 POSTURA E COMUNICAÇÃO: (Avaliando empatia e clareza com o paciente)
    ✅ PONTOS FORTES: (O que o aluno investigou ou fez corretamente)
    ⚠️ PONTOS FRACOS E OMISSÕES: (O que faltou investigar, erros graves ou dados negligenciados)
    🎯 CONDUTA ESPERADA (Gabarito): (Como um médico especialista conduziria este caso de forma ideal)
    📊 NOTA FINAL: (Apenas um número de 0 a 10)`;

    const response = await getAIResponse(prompt, context, true);
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

      {vitals && !isFinished && (
        <div className={`border-2 shadow-xl rounded-2xl p-4 md:p-6 mb-4 flex justify-around items-center font-mono transition-all duration-700 ${isAnyVitalVisible ? 'bg-[#0a0f18]/95 border-gray-800 text-green-500' : 'bg-gray-900 border-gray-800 text-gray-600'}`}>
          {isAnyVitalVisible ? (
            <>
              <div className="flex flex-col items-center animate-in fade-in zoom-in">
                <span className="text-[10px] text-gray-400 uppercase">FC</span>
                <span className={`text-4xl font-black transition-opacity duration-1000 ${visibleVitals.hr ? '' : 'opacity-20'}`}>
                  {visibleVitals.hr ? vitals.hr : '--'}
                </span>
              </div>
              <div className="flex flex-col items-center animate-in fade-in zoom-in">
                <span className="text-[10px] text-gray-400 uppercase">PA</span>
                <span className={`text-4xl font-black transition-opacity duration-1000 ${visibleVitals.bp ? 'text-blue-400' : 'opacity-20 text-gray-500'}`}>
                  {visibleVitals.bp ? vitals.bp : '--/--'}
                </span>
              </div>
              <div className="flex flex-col items-center animate-in fade-in zoom-in">
                <span className="text-[10px] text-gray-400 uppercase">SpO2</span>
                <span className={`text-4xl font-black transition-opacity duration-1000 ${visibleVitals.sat ? '' : 'opacity-20'}`}>
                  {visibleVitals.sat ? `${vitals.sat}%` : '--%'}
                </span>
              </div>
              <div className="flex flex-col items-center animate-in fade-in zoom-in">
                <span className="text-[10px] text-gray-400 uppercase">FR</span>
                <span className={`text-4xl font-black transition-opacity duration-1000 ${visibleVitals.rr ? 'text-purple-400' : 'opacity-20 text-gray-500'}`}>
                  {visibleVitals.rr ? vitals.rr : '--'}
                </span>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center w-full py-2">
              <Activity size={24} className="mb-2 opacity-30 animate-pulse" />
              <span className="text-xs tracking-[0.2em] uppercase font-black opacity-50">Sinais Vitais Ocultos</span>
              <span className="text-[9px] mt-1 text-gray-500 font-bold">Solicite a aferição específica (ex: "medir pressão" ou "palpar pulso")</span>
            </div>
          )}
        </div>
      )}

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
        ) : feedback ? (
            <div className="animate-in fade-in zoom-in duration-700 relative z-10">
                <div className="bg-white p-6 md:p-10 rounded-[1.5rem] shadow-xl border border-gray-200 text-gray-800">
                    <h3 className="text-xl font-black uppercase flex items-center gap-3 mb-6 border-b border-gray-100 pb-4 text-[#003366]">
                      🎓 Relatório do Preceptor
                    </h3>
                    <div className="text-sm md:text-base leading-relaxed whitespace-pre-wrap font-medium space-y-4">
                      {formatFeedback(feedback)}
                    </div>
                </div>
            </div>
        ) : (
            <div className="flex flex-col items-center justify-center h-full animate-in fade-in duration-500">
              <div className="bg-blue-50/80 backdrop-blur-sm p-8 rounded-[2rem] border border-blue-100 flex flex-col items-center shadow-lg">
                <div className="w-16 h-16 relative mb-6">
                   <div className="absolute inset-0 border-4 border-blue-200 rounded-full"></div>
                   <div className="absolute inset-0 border-4 border-[#003366] rounded-full border-t-transparent animate-spin"></div>
                   <Activity size={24} className="absolute inset-0 m-auto text-[#D4A017] animate-pulse" />
                </div>
                <h3 className="text-lg font-black uppercase tracking-widest text-center mb-2 text-[#003366]">Avaliando Conduta...</h3>
                <p className="text-sm font-bold text-gray-500 text-center max-w-xs">
                  O Preceptor de IA está analisando a sua anamnese e elaborando o feedback clínico. Aguarde...
                </p>
              </div>
            </div>
        )}
        
        {isLoading && !isFinished && <div className="text-[#D4A017] font-black animate-pulse p-4">Digitando...</div>}
        <div ref={chatEndRef} />
      </div>

      <div className="shrink-0 bg-white/40 backdrop-blur-xl p-3 -mx-4 -mb-2 relative z-20 border-t border-white/40">
        {!isFinished ? (
          <div className="flex flex-col gap-3">
            <div className="flex gap-2">
              <input type="text" value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSend()} placeholder={isAiMode ? "Pergunte ao paciente..." : "Sua conduta..."} className="flex-grow p-4 bg-white rounded-2xl border-2 border-transparent focus:border-[#D4A017] outline-none font-medium text-[#003366]" disabled={isLoading} />
              <button onClick={handleSend} disabled={isLoading || !input.trim()} className="bg-[#D4A017] text-[#003366] font-black px-8 rounded-2xl shadow-lg active:scale-95 transition-all"><Send size={18} /></button>
            </div>
            <button onClick={handleFinish} disabled={isLoading || messages.length < 2} className="w-full bg-red-50 text-red-600 border-2 border-red-100 py-3 rounded-2xl font-black uppercase text-[11px] tracking-widest hover:bg-red-600 hover:text-white transition-all">🛑 Encerrar Atendimento</button>
          </div>
        ) : (
          <div className="flex justify-center py-2">
            <button onClick={onBack} className="w-full md:w-1/2 flex items-center justify-center gap-3 bg-[#D4A017] text-[#003366] py-4 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl hover:scale-105 transition-all"><LogOut size={18}/> Sair da Consulta</button>
          </div>
        )}
      </div>
    </div>
  );
};

export default OsceAIView;