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
  const defaultSetting = 'Consultório médico padrão. Disponível: maca, pia, estetoscópio, esfigmomanômetro, termômetro, oftalmoscópio, otoscópio, martelo de reflexos, lanterna, luvas e espátulas.';
  const currentSetting = station.setting || defaultSetting;
  
  // Verifica se é modo RPG para ativar as regras narrativas
  const isRPG = station.mode === 'rpg';

  // --- NOVO: ESTADO DO MONITOR CLÍNICO ---
  const [vitals, setVitals] = useState<ClinicalState | null>(station.initialVitals || null);

  const [messages, setMessages] = useState<{role: 'user'|'patient'|'system', text: string}[]>([
    { 
      role: 'system', 
      text: isRPG 
        ? `🚨 MODO RPG IMERSIVO INICIADO\n\n📍 AMBIENTE:\n${currentSetting}\n\n📝 CENÁRIO:\n${station.scenario}\n\n🎯 SUA MISSÃO:\n${station.task}\n\n---\n💬 O Narrador descreverá a cena. Aja rápido e comente suas condutas!` 
        : `🩺 SIMULAÇÃO INICIADA\n\n📍 AMBIENTE:\n${currentSetting}\n\n📝 CENÁRIO CLÍNICO:\n${station.scenario}\n\n🎯 TAREFA:\n${station.task}\n\n---\n💬 O paciente acaba de entrar e aguarda a sua abordagem...` 
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

  // --- NOVA FUNÇÃO: COMUNICAÇÃO AVANÇADA (CAPTURA SINAIS VITAIS) ---
  const fetchAdvancedAI = async (prompt: string, context: string, mode?: string) => {
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, context, mode }),
      });
      if (!response.ok) throw new Error("Erro na API");
      return await response.json(); // Retorna { text, vitalsUpdate }
    } catch (error) {
      console.error(error);
      return { text: "Desculpe, tive um problema de comunicação. Tente novamente." };
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
      .map(m => `${m.role === 'user' ? 'Médico' : (isRPG ? 'Narrador' : 'Paciente')}: ${m.text}`)
      .join('\n');

    let context = "";
    if (isRPG) {
      context = `Você é o NARRADOR (Game Master) de um simulador médico de emergência.
      CENÁRIO: "${station.scenario}".
      AMBIENTE: "${currentSetting}".
      
      REGRAS DO RPG:
      1. Narre o que o aluno VÊ, OUVE e SENTE. Não dê o diagnóstico.
      2. Reaja às intervenções médicas do aluno. Se ele fizer a coisa certa, o paciente melhora; se errar ou demorar, piora.
      3. Seja realista com o tempo clínico (Ex: Adrenalina não faz efeito em 1 segundo, RCP cansa, etc).
      4. IMPORTANTE: Use a ferramenta 'update_vitals' sempre que o estado clínico do paciente mudar.
      
      Histórico da Simulação:
      ${chatHistory}`;
    } else {
      context = `Você é um PACIENTE simulado interagindo com um estudante de medicina em um exame OSCE. 
      CENÁRIO: "${station.scenario}".
      AMBIENTE: "${currentSetting}".
      
      REGRAS:
      1. Incorpore a persona. Responda apenas o perguntado.
      2. Não entregue o diagnóstico de mão beijada.
      3. Forneça achados físicos IMEDIATAMENTE se o aluno disser que vai examinar a área.
      
      Histórico:
      ${chatHistory}`;
    }

    const prompt = `Médico (Aluno): ${userMsg}\n${isRPG ? 'Narrador:' : 'Paciente/Sistema:'}`;

    // Chama a nossa nova rota avançada
    const aiData = await fetchAdvancedAI(prompt, context, station.mode);
    let cleanResponse = aiData.text.replace(/^Paciente:\s*/i, '').replace(/^Paciente\/Sistema:\s*/i, '').replace(/^Narrador:\s*/i, '').trim();
    
    // Atualiza o monitor se a IA enviou novos sinais vitais (Function Calling)
    if (aiData.vitalsUpdate) {
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
      .map(m => `${m.role === 'user' ? 'Médico' : (isRPG ? 'Narrador' : 'Paciente')}: ${m.text}`)
      .join('\n');

    const context = `Você é um PRECEPTOR MÉDICO SÊNIOR avaliando um aluno em uma estação OSCE simulada.
    Cenário Original: "${station.scenario}".
    Checklist Oficial: ${station.checklist.join(', ')}.
    Ambiente Disponível: "${currentSetting}".
    `;

    const prompt = `Abaixo está a transcrição da simulação do aluno:
    \n${chatHistory}\n
    
    Gere uma avaliação final didática focada em se o aluno cumpriu o checklist.
    Siga EXATAMENTE esta estrutura (use negrito **texto** para destaque):

    🤝 POSTURA E COMUNICAÇÃO (SOFT SKILLS):
    (Avalie conduta e profissionalismo)

    🎯 ACERTOS CLÍNICOS E USO DO AMBIENTE:
    (Diga quais itens do checklist ele investigou bem)

    ⚠️ O QUE FALTOU OU PODE MELHORAR:
    (Aponte falhas graves ou omissões do checklist)

    💡 ESSÊNCIA DO CASO:
    (A lição central que este caso ensina)

    📊 NOTA FINAL (0 a 10):
    (Nota baseada no desempenho técnico)`;

    // Feedback continua usando a rota simples pois não altera sinais vitais
    const response = await getAIResponse(prompt, context);
    setFeedback(response);
    setIsLoading(false);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 pt-6 pb-2 h-[88vh] flex flex-col">
      
      {/* HEADER */}
      <div className="flex justify-between items-center mb-3 border-b pb-3 shrink-0">
        <button onClick={onBack} className="text-[#003366] font-black uppercase text-[10px] flex items-center gap-2 hover:text-[#D4A017]">
          <span>←</span> Encerrar
        </button>
        <div className="text-right">
          <span className="text-[10px] font-black text-[#D4A017] uppercase tracking-widest">
            {isRPG ? 'Simulação Imersiva (RPG)' : 'Paciente Virtual'}
          </span>
          <h2 className="text-xl font-black text-[#003366] uppercase tracking-tighter">{station.title}</h2>
        </div>
      </div>

      {/* --- NOVO: MONITOR MULTIPARÂMETRO (Só aparece se houver sinais vitais) --- */}
      {vitals && !isFinished && (
        <div className="bg-black border-4 border-gray-800 rounded-2xl p-4 md:p-6 mb-4 flex justify-around items-center text-green-500 font-mono shadow-inner animate-in fade-in slide-in-from-top-4">
          <div className="flex flex-col items-center">
             <span className="text-[10px] md:text-xs text-gray-400 tracking-widest mb-1">FC (bpm)</span>
             <span className={`text-4xl md:text-5xl font-black ${vitals.hr === 0 ? 'text-red-600 animate-pulse' : 'text-green-400 drop-shadow-[0_0_8px_rgba(74,222,128,0.8)]'}`}>
               {vitals.hr}
             </span>
          </div>
          <div className="flex flex-col items-center">
             <span className="text-[10px] md:text-xs text-gray-400 tracking-widest mb-1">PA (mmHg)</span>
             <span className="text-4xl md:text-5xl font-black text-blue-400 drop-shadow-[0_0_8px_rgba(96,165,250,0.8)]">
               {vitals.bp}
             </span>
          </div>
          <div className="flex flex-col items-center">
             <span className="text-[10px] md:text-xs text-gray-400 tracking-widest mb-1">SpO2 (%)</span>
             <span className={`text-4xl md:text-5xl font-black ${vitals.sat < 90 ? 'text-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.8)]' : 'text-green-400 drop-shadow-[0_0_8px_rgba(74,222,128,0.8)]'}`}>
               {vitals.sat}
             </span>
          </div>
          <div className="hidden md:flex flex-col items-center">
             <span className="text-[10px] md:text-xs text-gray-400 tracking-widest mb-1">FR (irpm)</span>
             <span className="text-4xl md:text-5xl font-black text-purple-400 drop-shadow-[0_0_8px_rgba(192,132,252,0.8)]">
               {vitals.rr}
             </span>
          </div>
        </div>
      )}

      {/* DICAS */}
      {!isFinished && !isRPG && (
        <div className="bg-blue-50/50 p-3 rounded-xl mb-3 border border-blue-100 text-sm shrink-0">
          <p className="font-bold text-[#003366] mb-1 flex items-center gap-2"><span>💡</span> Dicas de Ouro:</p>
          <ul className="list-disc pl-5 space-y-1 text-gray-600 text-[11px] font-medium">
            <li>Aja como na vida real. O paciente reage ao seu tom de voz.</li>
            <li>Só use os instrumentos listados no ambiente.</li>
          </ul>
        </div>
      )}

      {/* CHAT AREA */}
      <div className="flex-grow overflow-y-auto space-y-5 p-4 md:p-6 bg-white rounded-[1.5rem] shadow-inner mb-4 border border-gray-100 flex flex-col">
        {messages.map((msg, i) => (
           <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : msg.role === 'system' ? 'justify-center' : 'justify-start'}`}>
             <div className={`whitespace-pre-wrap leading-relaxed ${
               msg.role === 'user' ? 'p-4 max-w-[85%] md:max-w-[70%] rounded-2xl bg-[#003366] text-white rounded-br-sm shadow-md font-medium text-sm md:text-base' :
               msg.role === 'system' ? 'p-5 md:p-8 w-full rounded-[1.5rem] bg-yellow-50/80 text-yellow-900 text-sm md:text-base text-left border-2 border-yellow-200 shadow-sm font-medium mb-2' :
               'p-4 max-w-[85%] md:max-w-[70%] rounded-2xl bg-gray-50 text-[#003366] font-medium rounded-bl-sm border border-gray-200 shadow-sm text-sm md:text-base'
             }`}>
               {msg.role === 'patient' && isRPG && <span className="text-xs font-black text-[#D4A017] uppercase block mb-1">NARRADOR</span>}
               {msg.text}
             </div>
           </div>
        ))}
        
        {isLoading && !isFinished && (
          <div className="flex justify-start">
            <div className="p-4 bg-gray-50 rounded-2xl rounded-bl-sm border border-gray-200 flex items-center gap-2">
              <div className="w-2 h-2 bg-[#003366] rounded-full animate-bounce"></div>
              <div className="w-2 h-2 bg-[#003366] rounded-full animate-bounce delay-75"></div>
              <div className="w-2 h-2 bg-[#003366] rounded-full animate-bounce delay-150"></div>
            </div>
          </div>
        )}

        {isLoading && isFinished && !feedback && (
          <div className="flex justify-center mt-6 animate-in fade-in duration-500">
            <div className="bg-white p-6 rounded-[1.5rem] shadow-lg border-2 border-dashed border-[#D4A017] flex flex-col items-center justify-center gap-4 text-[#003366] w-full md:w-3/4">
              <div className="text-4xl animate-spin text-[#D4A017]">⏳</div>
              <div className="text-center">
                <h4 className="font-black uppercase tracking-widest text-sm mb-1">Avaliando Simulação</h4>
                <p className="text-xs font-medium text-gray-500">O Preceptor está escrevendo o seu relatório...</p>
              </div>
            </div>
          </div>
        )}
        
        {isFinished && feedback && (
           <div className="flex justify-center mt-6 animate-in fade-in duration-700">
             <div className="bg-[#003366] w-full p-6 md:p-10 rounded-[1.5rem] shadow-xl border-t-8 border-[#D4A017] text-white">
                <h3 className="text-xl font-black uppercase tracking-tighter flex items-center gap-3 mb-6 border-b border-white/10 pb-4">
                  <span>🎓</span> Relatório do Preceptor
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
      <div className="shrink-0 bg-white pt-1">
        {!isFinished ? (
          <div className="flex flex-col gap-3">
            <div className="flex gap-2 relative">
              <input
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSend()}
                placeholder={isRPG ? "Descreva sua conduta médica (ex: 'Checo pulso e inicio RCP')" : "Escreva a sua ação ou pergunta aqui..."}
                className="flex-grow p-4 bg-gray-50 rounded-2xl border-2 border-gray-200 focus:border-[#D4A017] outline-none transition-all font-medium text-[#003366]"
                disabled={isLoading}
              />
              <button 
                onClick={handleSend} 
                disabled={isLoading || !input.trim()} 
                className="bg-[#D4A017] text-[#003366] font-black px-6 md:px-8 rounded-2xl hover:bg-[#003366] hover:text-white transition-all disabled:opacity-50 flex items-center justify-center text-xl shadow-md"
              >
                ➤
              </button>
            </div>
            
            <button 
              onClick={handleFinish} 
              disabled={isLoading || messages.length < 3}
              className="w-full bg-red-50 text-red-600 border-2 border-red-200 hover:bg-red-500 hover:text-white hover:border-red-500 py-3 rounded-2xl font-black uppercase text-[11px] tracking-widest transition-all disabled:opacity-40 flex items-center justify-center gap-2 shadow-sm"
            >
              <span>🛑</span> Finalizar Atendimento e Avaliar
            </button>
          </div>
        ) : (
          <button 
            onClick={onBack}
            className="w-full bg-[#D4A017] text-[#003366] py-4 rounded-2xl font-black uppercase text-sm tracking-widest shadow-xl hover:scale-105 transition-all"
          >
            Voltar para o Menu
          </button>
        )}
      </div>
    </div>
  );
};

export default OsceAIView;