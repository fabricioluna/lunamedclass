import { GoogleGenerativeAI } from "@google/generative-ai";

/**
 * Função base para comunicação direta ou via API.
 */
export const getAIResponse = async (prompt: string, context: string = "") => {
  const isLocalhost = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
  
  if (isLocalhost) {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY; // Agora com VITE_
    if (!apiKey) return "Erro: VITE_GEMINI_API_KEY não configurada no .env local.";
    
    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      const result = await model.generateContent(`CONTEXTO: ${context}\n\nCOMANDO: ${prompt}`);
      return result.response.text();
    } catch (err) {
      console.error("Falha no Gemini Localhost:", err);
      return "Erro na conexão direta com Gemini.";
    }
  }

  // PRODUÇÃO (Vercel)
  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, context }),
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
  const isLocalhost = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";

  if (isLocalhost) {
    console.log("[Luna Engine] Executando lógica de fase localmente...");
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (!apiKey) return { text: "Erro: Configure VITE_GEMINI_API_KEY no .env" };

    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      
      const localPrompt = `
        ${context}
        REGRAS DE TRANSIÇÃO (JSON): ${JSON.stringify(phaseRules)}
        AÇÃO DO MÉDICO: ${prompt}
        
        Responda em formato JSON puro:
        {
          "text": "Sua resposta",
          "newPhaseId": "ID da fase caso o aluno tenha acertado uma transição, ou null"
        }
      `;
      
      const result = await model.generateContent(localPrompt);
      const resText = result.response.text().replace(/```json/g, '').replace(/```/g, '').trim();
      return JSON.parse(resText);
    } catch (err) {
      console.error("Erro no motor de fases local:", err);
      return { text: "O motor de fases local falhou. Verifique o console." };
    }
  }

  // Se NÃO for localhost, aí sim tentamos o fetch (Vercel)
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
  const prompt = `Professor de medicina. Pergunta: "${question}", Resposta: "${answer}". Retorne JSON: identification, location, functions.`;
  try {
    const responseText = await getAIResponse(prompt, "Geração de dicas.");
    return JSON.parse(responseText.replace(/```json/g, '').replace(/```/g, '').trim());
  } catch (error) {
    return { identification: "Erro local.", location: "-", functions: "-" };
  }
};

/**
 * AVALIADOR RPG (SINÔNIMOS)
 */
export const evaluateRpgAction = async (userAction: string, availableTransitions: any[], narrative: string) => {
  if (!availableTransitions.length) return null;
  const prompt = `Juiz clínico. Cenário: "${narrative}". Ação: "${userAction}". Opções: ${availableTransitions.map((t, i) => `ID[${i}]: ${t.triggers[0]}`).join(', ')}. RESPONDA: MATCH: [ID] ou MATCH: NONE.`;
  
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
    const prompt = `Cenário: "${narrative}". Correta: "${correct}". Gere 4 distratores médicos reais. Retorne array JSON de 5 strings.`;
    try {
        const res = await getAIResponse(prompt, "SOS.");
        const clean = res.replace(/```json/g, '').replace(/```/g, '').trim();
        let arr = JSON.parse(clean.substring(clean.indexOf('['), clean.lastIndexOf(']') + 1));
        if (!arr.includes(correct)) arr[0] = correct;
        arr.sort(() => Math.random() - 0.5);
        return arr.map((opt: string) => ({ text: opt, isCorrect: opt === correct, transitionRef: opt === correct ? validTransitions[0] : null }));
    } catch { return [{ text: correct, isCorrect: true, transitionRef: validTransitions[0] }]; }
};