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
    if (!response.ok) throw new Error("Erro 404 ou 500");
    return await response.json(); 
  } catch (error) {
    return { text: "O servidor de produção não respondeu corretamente." };
  }
};

export const generateLabTips = async (answer: string, question: string) => {
  const prompt = `Professor de medicina. Pergunta: "${question}", Resposta: "${answer}". Retorne JSON puro (sem markdown): {"identification": "...", "location": "...", "functions": "..."}`;
  try {
    const responseText = await getAIResponse(prompt, "Geração de dicas.");
    const cleanText = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(cleanText);
  } catch (error) {
    return { identification: "Erro ao gerar dica.", location: "-", functions: "-" };
  }
};

/**
 * AVALIADOR RPG MULTITAREFA (Otimizado)
 * Agora compreende múltiplas condutas simultâneas em uma única frase.
 */
export const evaluateRpgAction = async (userAction: string, availableTransitions: any[], narrative: string) => {
  if (!availableTransitions.length) return [];
  
  const prompt = `Juiz clínico. Cenário atual: "${narrative}".
  O aluno tomou a seguinte conduta composta: "${userAction}".
  
  Opções de gatilho disponíveis na fase atual:
  ${availableTransitions.map((t, i) => `ID[${i}]: ${t.triggers.join(' | ')}`).join('\n')}
  
  Identifique TODAS as opções numéricas que o aluno executou simultaneamente nesta frase.
  Responda APENAS com um array JSON de inteiros. 
  Exemplo se acertou a 0 e a 2: [0, 2]
  Exemplo se não acertou nenhuma: []`;
  
  try {
    const res = await getAIResponse(prompt, "Avaliador RPG Múltiplo.");
    const clean = res.replace(/```json/g, '').replace(/```/g, '').trim();
    const startIdx = clean.indexOf('[');
    const endIdx = clean.lastIndexOf(']') + 1;
    
    if (startIdx !== -1 && endIdx !== -1) {
        const matchArray = JSON.parse(clean.substring(startIdx, endIdx));
        if (Array.isArray(matchArray)) {
            // Retorna um array com todos os objetos de transição atingidos
            return matchArray.filter(id => availableTransitions[id]).map(id => availableTransitions[id]);
        }
    }
    return [];
  } catch { 
    return []; 
  }
};

export const generateRpgOptions = async (validTransitions: any[], narrative: string) => {
    if (!validTransitions.length) return [];
    const correct = validTransitions[0].triggers[0];
    const prompt = `Cenário: "${narrative}". Correta: "${correct}". Gere 4 distratores médicos reais curtos. Retorne APENAS um array JSON puro de 5 strings.`;
    try {
        const res = await getAIResponse(prompt, "SOS.");
        const clean = res.replace(/```json/g, '').replace(/```/g, '').trim();
        let arr = JSON.parse(clean.substring(clean.indexOf('['), clean.lastIndexOf(']') + 1));
        if (!arr.includes(correct)) arr[0] = correct;
        arr.sort(() => Math.random() - 0.5);
        return arr.map((opt: string) => ({ text: opt, isCorrect: opt === correct, transitionRef: opt === correct ? validTransitions[0] : null }));
    } catch { return [{ text: correct, isCorrect: true, transitionRef: validTransitions[0] }]; }
};