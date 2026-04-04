/**
 * LUNA ENGINE - AI SERVICE
 * Versão: 2.5 (Otimizada para SOS Iterativo e Multi-Ação)
 */

export const getAIResponse = async (prompt: string, context: string = "", isFinalEvaluation: boolean = false) => {
  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, context, isFinalEvaluation }),
    });
    const data = await response.json();
    return data.text; 
  } catch (error) {
    console.error("Erro na comunicação com o servidor:", error);
    return "Erro na comunicação com o servidor.";
  }
};

export const fetchAdvancedAI = async (prompt: string, context: string, phaseRules?: any) => {
  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, context, mode: 'rpg', phaseRules }),
    });
    if (!response.ok) throw new Error("Erro de resposta do servidor");
    return await response.json(); 
  } catch (error) {
    return { text: "O servidor de produção não respondeu corretamente." };
  }
};

export const generateLabTips = async (answer: string, question: string) => {
  const prompt = `Professor de medicina. Pergunta: "${question}", Resposta: "${answer}". Retorne JSON puro (sem markdown): {"identification": "...", "location": "...", "functions": "..."}`;
  try {
    const responseText = await getAIResponse(prompt, "Geração de dicas laboratoriais.");
    const cleanText = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(cleanText);
  } catch (error) {
    return { identification: "Erro ao gerar dica.", location: "-", functions: "-" };
  }
};

/**
 * AVALIADOR RPG MULTITAREFA
 * Identifica múltiplas ações em uma única frase e retorna um array de objetos de transição.
 */
export const evaluateRpgAction = async (userAction: string, availableTransitions: any[], narrative: string) => {
  if (!availableTransitions.length) return [];
  
  const prompt = `Juiz clínico. Cenário atual: "${narrative}".
  O aluno tomou a seguinte conduta: "${userAction}".
  
  Gatilhos disponíveis:
  ${availableTransitions.map((t, i) => `ID[${i}]: ${t.triggers.join(' | ')}`).join('\n')}
  
  Identifique os IDs das ações executadas. Responda apenas com o array JSON de inteiros (ex: [0, 2]).`;
  
  try {
    const res = await getAIResponse(prompt, "Avaliador de Conduta.");
    const clean = res.replace(/```json/g, '').replace(/```/g, '').trim();
    const startIdx = clean.indexOf('[');
    const endIdx = clean.lastIndexOf(']') + 1;
    
    if (startIdx !== -1 && endIdx !== -1) {
        const matchArray = JSON.parse(clean.substring(startIdx, endIdx));
        if (Array.isArray(matchArray)) {
            return matchArray.filter(id => availableTransitions[id]).map(id => availableTransitions[id]);
        }
    }
    return [];
  } catch { 
    return []; 
  }
};

/**
 * GERADOR DE OPÇÕES SOS (DICA DINÂMICA)
 * Gera opções com IDs únicos para permitir a exclusão individual no frontend após erro.
 */
export const generateRpgOptions = async (validTransitions: any[], narrative: string) => {
    if (!validTransitions.length) return [];
    
    const correctOption = validTransitions[0].triggers[0];
    
    // Prompt ultra-seco para reduzir a latência de geração
    const prompt = `Cenário: "${narrative}". Resposta correta: "${correctOption}". 
    Gere 3 distratores médicos plausíveis mas incorretos. 
    Retorne APENAS um array JSON: ["${correctOption}", "distrator1", "distrator2", "distrator3"]`;

    try {
        const res = await getAIResponse(prompt, "Geração de SOS Instantâneo.");
        const clean = res.replace(/```json/g, '').replace(/```/g, '').trim();
        const start = clean.indexOf('[');
        const end = clean.lastIndexOf(']') + 1;
        
        let stringArray = JSON.parse(clean.substring(start, end));
        
        // Garantia de integridade: a resposta correta deve estar no array
        if (!stringArray.includes(correctOption)) {
            stringArray[0] = correctOption;
        }

        // Mapeamento para objetos com IDs únicos para controle de UI (Exclusão)
        return stringArray.map((text: string) => ({
            id: Math.random().toString(36).substring(2, 11), // ID randômico para filtro no frontend
            text: text,
            isCorrect: text === correctOption,
            transitionRef: text === correctOption ? validTransitions[0] : null
        })).sort(() => Math.random() - 0.5); // Embaralha as opções

    } catch (error) {
        // Fallback de segurança caso a IA falhe
        return [{ 
            id: 'emergency-id', 
            text: correctOption, 
            isCorrect: true, 
            transitionRef: validTransitions[0] 
        }];
    }
};