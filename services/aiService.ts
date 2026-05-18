/**
 * LUNA ENGINE - AI SERVICE 
 * Versão: 4.0 (Blindada - Resiliência e Fallback)
 */

export interface SosOption {
  id: string;
  text: string;
  isCorrect: boolean;
  transitionRef: any | null;
}

// ============================================================================
// CORE DA LUNA ENGINE: Fetch com Timeout e Retry Automático
// ============================================================================
const fetchWithRetry = async (url: string, options: RequestInit, retries = 2, timeoutMs = 20000) => {
  for (let i = 0; i <= retries; i++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, { ...options, signal: controller.signal });
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP Error: ${response.status}`);
      }

      return await response.json();
    } catch (error: any) {
      clearTimeout(timeoutId);
      
      // Se for a última tentativa, repassa o erro para acionar o Fallback da UI
      if (i === retries) throw error;
      
      console.warn(`[Luna Engine] Instabilidade detectada. Tentativa ${i + 1} falhou. Retentando em 1.5s...`);
      await new Promise(res => setTimeout(res, 1500)); // Aguarda 1.5s antes de tentar novamente
    }
  }
};

// ============================================================================
// REQUISIÇÕES PADRÃO (Chat de Feedback e RPG Simples)
// ============================================================================
export const getAIResponse = async (prompt: string, context: string = "", isFinalEvaluation: boolean = false) => {
  try {
    const data = await fetchWithRetry('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, context, isFinalEvaluation }),
    }, 2, 20000); // Tenta 3 vezes no total, com 20s de limite cada

    return data.response || data.text || "Sem resposta da engine."; 
  } catch (error) {
    console.error("[Luna Engine] Erro Crítico de Conexão:", error);
    return "⚠️ [SISTEMA] Doutor(a), a conexão com o prontuário eletrônico está instável. Por favor, reavalie os dados e tente enviar novamente em alguns segundos.";
  }
};

// ============================================================================
// REQUISIÇÕES AVANÇADAS (RPG Dinâmico com Mudança de Sinais Vitais)
// ============================================================================
export const fetchAdvancedAI = async (prompt: string, context: string, phaseRules?: any) => {
  try {
    const data = await fetchWithRetry('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, context, mode: 'rpg', phaseRules }),
    }, 2, 25000); // 25s de limite, pois o RPG processa Sinais Vitais JSON
    
    return data; 
  } catch (error) {
    console.warn("[Luna Engine] Fallback Imersivo ativado no RPG:", error);
    return { 
      // Resposta imersiva que impede o app de quebrar
      text: "⚠️ [BIP DO MONITOR] Doutor(a), perdemos temporariamente o sinal com a central de monitorização. O paciente segue sob nossos cuidados locais. Por favor, repita sua última conduta para validarmos no sistema.", 
      vitalsUpdate: null, 
      newPhaseId: null 
    };
  }
};

// ============================================================================
// PARSER DE JSON ULTRA-RESILIENTE
// ============================================================================
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
    console.error("[Luna Engine] Falha ao parsear JSON da IA:", text);
    return null;
  }
};

// ============================================================================
// AVALIADOR DE FEEDBACK
// ============================================================================
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
    return feedback || { postura: "Avaliação indisponível devido a instabilidade.", acertos: [], omissoes: [], nota: 5.0 };
  } catch (err) {
    return { postura: "Erro na conexão com o preceptor virtual.", acertos: [], omissoes: [], nota: 0.0 };
  }
};

// ============================================================================
// EXTRATOR DE AÇÕES (Para comparar o texto livre com os botões)
// ============================================================================
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

// ============================================================================
// GERADOR DE BOTÕES SOS
// ============================================================================
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
        // Fallback de Segurança se a IA falhar: Devolve a conduta correta como única opção salvadora
        return [{ 
            id: 'emergency-fallback', 
            text: `[Conduta Padrão] ${correctTrigger}`, 
            isCorrect: true, 
            transitionRef: validTransitions[0] 
        }];
    }
};