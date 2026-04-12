/**
 * LUNA ENGINE - AI SERVICE 
 * Versão: 3.2 (Estável - Foco Exclusivo no Módulo OSCE e RPG)
 * Limpeza de Dead Code: Remoção das funções de Laboratório Virtual (agora via CSV).
 */

// Tipagem para as opções de ajuda (SOS)
export interface SosOption {
  id: string;
  text: string;
  isCorrect: boolean;
  transitionRef: any | null;
}

/**
 * Comunicação base com a Engine do Servidor
 */
export const getAIResponse = async (prompt: string, context: string = "", isFinalEvaluation: boolean = false) => {
  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, context, isFinalEvaluation }),
    });
    const data = await response.json();
    
    // Leitura Cirúrgica: Captura 'data.response' vindo do seu backend na Nuvem
    return data.response || data.text || "Sem resposta da engine."; 
  } catch (error) {
    console.error("Erro Crítico LUNA Engine:", error);
    return "Erro de conexão com a inteligência clínica.";
  }
};

/**
 * Engine Avançada para RPG: Processa conduta e retorna mudanças de estado e vitais
 */
export const fetchAdvancedAI = async (prompt: string, context: string, phaseRules?: any) => {
  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, context, mode: 'rpg', phaseRules }),
    });
    if (!response.ok) throw new Error("Server Heat Error");
    return await response.json(); 
  } catch (error) {
    return { 
      text: "A equipe aguarda sua decisão técnica.", 
      vitalsUpdate: null, 
      newPhaseId: null 
    };
  }
};

/**
 * Helper para extrair JSON de respostas da IA (Blindagem contra Markdown)
 */
const extractJson = (text: string) => {
  try {
    const clean = text.replace(/```json/gi, '').replace(/```/g, '').trim();
    const start = clean.indexOf('{') !== -1 && (clean.indexOf('{') < clean.indexOf('[') || clean.indexOf('[') === -1) 
      ? clean.indexOf('{') 
      : clean.indexOf('[');
    
    const end = clean.lastIndexOf(clean[start] === '{' ? '}' : ']') + 1;

    if (start === -1) return JSON.parse(clean);
    return JSON.parse(clean.substring(start, end));
  } catch (e) {
    console.error("Falha ao parsear resposta da IA:", text);
    return null;
  }
};

/**
 * GERA FEEDBACK FINAL ESTRUTURADO (DEBRIEFING DO OSCE)
 */
export const generateFinalFeedback = async (history: { role: string, text: string }[], stationTitle: string) => {
  const chatHistory = history.map(h => `${h.role === 'user' ? 'Aluno' : 'Sistema'}: ${h.text}`).join('\n');
  
  const prompt = `Você é o Preceptor Sênior da Luna MedClass.
  Analise o histórico abaixo da simulação "${stationTitle}" e forneça um feedback estruturado seguindo rigorosamente os protocolos clínicos.
  
  HISTÓRICO:
  ${chatHistory}

  REGRAS DE RESPOSTA:
  Retorne APENAS um objeto JSON (sem markdown) no seguinte formato:
  {
    "postura": "Análise da comunicação e biossegurança",
    "acertos": ["Lista de condutas corretas"],
    "omissoes": ["Lista de erros ou faltas"],
    "nota": 0.0
  }`;

  try {
    const res = await getAIResponse(prompt, "Avaliador de Debriefing");
    const feedback = extractJson(res);
    return feedback || { postura: "Avaliação indisponível.", acertos: [], omissoes: [], nota: 5.0 };
  } catch (err) {
    return { postura: "Erro ao processar feedback.", acertos: [], omissoes: [], nota: 0.0 };
  }
};

/**
 * AVALIADOR MULTITAREFA: Identifica múltiplas ações no OSCE Dinâmico
 */
export const evaluateRpgAction = async (userAction: string, availableTransitions: any[], narrative: string) => {
  if (!availableTransitions.length) return [];
  
  const prompt = `Juiz clínico de elite. 
  Cenário atual: "${narrative}".
  Ações do aluno: "${userAction}".
  
  Gatilhos técnicos disponíveis:
  ${availableTransitions.map((t, i) => `ID[${i}]: ${t.triggers.join(' | ')}`).join('\n')}
  
  Retorne APENAS um array JSON com os IDs das ações que o aluno REALIZOU (ex: [0, 2]).`;
  
  try {
    const res = await getAIResponse(prompt, "Avaliador de Conduta");
    const matchArray = extractJson(res);
    if (Array.isArray(matchArray)) {
        return matchArray
          .filter(id => availableTransitions[id])
          .map(id => availableTransitions[id]);
    }
    return [];
  } catch { 
    return []; 
  }
};

/**
 * GERADOR DE OPÇÕES SOS (DICA DINÂMICA COM CONSEQUÊNCIA PARA OSCE)
 */
export const generateRpgOptions = async (validTransitions: any[], narrative: string): Promise<SosOption[]> => {
    if (!validTransitions.length) return [];
    
    const correctTrigger = validTransitions[0].triggers[0];
    
    const prompt = `Você é um preceptor médico criando um desafio.
    Cenário: "${narrative}". 
    Conduta correta: "${correctTrigger}".
    
    Crie 3 condutas INCORRETAS que seriam plausíveis mas erradas/secundárias para este momento.
    Retorne APENAS um array JSON de strings, incluindo a correta: ["${correctTrigger}", "errada1", "errada2", "errada3"]`;

    try {
        const res = await getAIResponse(prompt, "Gerador de Desafio SOS");
        const stringArray = extractJson(res);
        
        if (!Array.isArray(stringArray)) throw new Error("Invalid SOS format");

        if (!stringArray.some(s => s.toLowerCase().includes(correctTrigger.toLowerCase()))) {
            stringArray[0] = correctTrigger;
        }

        return stringArray.map((text: string) => {
            const isThisCorrect = text.toLowerCase().includes(correctTrigger.toLowerCase());
            return {
                id: Math.random().toString(36).substring(2, 11),
                text: text,
                isCorrect: isThisCorrect,
                transitionRef: isThisCorrect ? validTransitions[0] : null
            };
        }).sort(() => Math.random() - 0.5);

    } catch (error) {
        return [{ 
            id: 'emergency-fallback', 
            text: correctTrigger, 
            isCorrect: true, 
            transitionRef: validTransitions[0] 
        }];
    }
};