/**
 * LUNA ENGINE - AI SERVICE 
 * Versão: 3.0 (Realismo Clínico & Consequências Dinâmicas)
 * Foco: Processamento de Multi-ações e SOS Gamificado
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
    return data.text || "Sem resposta da engine."; 
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
 * Helper para extrair JSON de respostas da IA que podem conter Markdown
 */
const extractJson = (text: string) => {
  try {
    const clean = text.replace(/```json/g, '').replace(/```/g, '').trim();
    // Ajuste técnico para aceitar tanto objetos {} quanto arrays []
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
 * NOVO: GERA FEEDBACK FINAL ESTRUTURADO (DEBRIEFING)
 * Implementado para atender ao requisito de encerramento do simulado.
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
    const res = await getAIResponse(prompt, "Avaliador de Debriefing 3.0");
    const feedback = extractJson(res);
    return feedback || { postura: "Avaliação indisponível.", acertos: [], omissoes: [], nota: 5.0 };
  } catch (err) {
    return { postura: "Erro ao processar feedback.", acertos: [], omissoes: [], nota: 0.0 };
  }
};

/**
 * AVALIADOR MULTITAREFA: Identifica múltiplas ações em uma sentença
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
    const res = await getAIResponse(prompt, "Avaliador de Conduta 3.0");
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
 * GERADOR DE OPÇÕES SOS (DICA DINÂMICA COM CONSEQUÊNCIA)
 * Cria 1 opção correta e 3 distratores médicos plausíveis para o contexto.
 */
export const generateRpgOptions = async (validTransitions: any[], narrative: string): Promise<SosOption[]> => {
    if (!validTransitions.length) return [];
    
    // Pegamos o primeiro gatilho da transição correta como a "frase de ouro"
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

        // Garante que a opção correta está no pool
        if (!stringArray.some(s => s.toLowerCase().includes(correctTrigger.toLowerCase()))) {
            stringArray[0] = correctTrigger;
        }

        return stringArray.map((text: string) => {
            const isThisCorrect = text.toLowerCase().includes(correctTrigger.toLowerCase());
            return {
                id: Math.random().toString(36).substring(2, 11),
                text: text,
                isCorrect: isThisCorrect,
                // O transitionRef é crucial: se for a correta, ele carrega o destino da fase
                transitionRef: isThisCorrect ? validTransitions[0] : null
            };
        }).sort(() => Math.random() - 0.5);

    } catch (error) {
        // Fallback de segurança integral
        return [{ 
            id: 'emergency-fallback', 
            text: correctTrigger, 
            isCorrect: true, 
            transitionRef: validTransitions[0] 
        }];
    }
};

/**
 * NOVO: GERA DICAS DE ANATOMIA PARA O LABORATÓRIO VIRTUAL
 * Integrado ao processo de Ingestão de Dados (Upload) para garantir que
 * as dicas de identificação, localização e função sejam blindadas.
 */
export const generateAnatomyHints = async (structure: string) => {
  const prompt = `Atue como um especialista em anatomia médica. O aluno precisa identificar a estrutura: "${structure}". Gere 3 dicas diretas. Retorne APENAS um JSON válido no formato exato: {"identification": "Como identificar visualmente", "location": "Onde se localiza", "functions": "Qual a principal função"}. Sem marcações markdown ou textos fora do JSON.`;

  try {
    const res = await getAIResponse(prompt, "Assistente de Laboratório Morfofuncional");
    const parsed = extractJson(res);
    
    return {
      identification: parsed?.identification || 'N/A',
      location: parsed?.location || 'N/A',
      functions: parsed?.functions || 'N/A'
    };
  } catch (error) {
    console.error(`Luna Engine: Falha crítica ao gerar dicas para ${structure}`, error);
    return { identification: 'N/A', location: 'N/A', functions: 'N/A' };
  }
};