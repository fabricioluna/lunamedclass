// Não precisamos mais do import do GoogleGenerativeAI aqui, pois o front-end não chama mais a IA diretamente. Toda a segurança e chamadas estão no backend (Vercel).

/**
 * Função base para comunicação direta ou via API.
 */
export const getAIResponse = async (prompt: string, context: string = "", isFinalEvaluation: boolean = false) => {
  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, context, isFinalEvaluation }), // <-- Injetamos o parâmetro aqui
    });
    const data = await response.json();
    return data.text; 
  } catch (error) {
    return "Erro na comunicação com o servidor.";
  }
};

/**
 * FUNÇÃO AVANÇADA (Utilizada pelo OsceAIView)
 * Blindada contra erro 404 no localhost.
 */
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

/**
 * GERAÇÃO DE DICAS PARA O LABORATÓRIO
 */
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
 * AVALIADOR RPG (SINÔNIMOS)
 */
export const evaluateRpgAction = async (userAction: string, availableTransitions: any[], narrative: string) => {
  if (!availableTransitions.length) return null;
  const prompt = `Juiz clínico. Cenário: "${narrative}". Ação: "${userAction}". Opções: ${availableTransitions.map((t, i) => `ID[${i}]: ${t.triggers[0]}`).join(', ')}. RESPONDA APENAS: MATCH: [ID] ou MATCH: NONE.`;
  
  try {
    const res = await getAIResponse(prompt, "Avaliador RPG.");
    const match = res.toUpperCase().match(/MATCH:\s*(\d+)/);
    return match ? availableTransitions[parseInt(match[1])] : null;
  } catch { return null; }
};

/**
 * GERADOR SOS
 */
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