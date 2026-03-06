export const getAIResponse = async (prompt: string, context: string = "") => {
  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, context }),
    });

    if (!response.ok) {
      throw new Error(`Erro no servidor: ${response.status}`);
    }

    const data = await response.json();
    return data.text; 

  } catch (error) {
    console.error("Erro na comunicação com a API segura:", error);
    return "Desculpe, tive um problema ao processar a sua dúvida. Tente novamente em instantes.";
  }
};

// === NOVA FUNÇÃO: GERAÇÃO DE DICAS PARA O LABORATÓRIO ===
export const generateLabTips = async (answer: string, question: string) => {
  const prompt = `Você é um professor de medicina especialista em anatomia, histologia e patologia.
  A pergunta do simulado de laboratório visual foi: "${question}"
  A resposta correta esperada é: "${answer}"

  Com base APENAS nesta resposta correta, retorne um objeto JSON ESTRITO com as seguintes chaves (em inglês):
  "identification": "Dica prática e direta de como identificar visualmente essa estrutura na imagem (ex: formato, cor, características)",
  "location": "Dica de localização topográfica ou contexto no órgão",
  "functions": "Principais funções fisiológicas ou correlação clínica direta"

  Não use formatação markdown (como \`\`\`json). Retorne APENAS o objeto JSON puro e válido.`;

  try {
    // Usamos a sua própria função segura para pedir a resposta!
    const responseText = await getAIResponse(prompt, "Geração de dicas estruturadas para laboratório virtual.");
    
    // Limpamos possíveis formatações de markdown que a IA possa colocar por engano
    const cleanText = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
    
    return JSON.parse(cleanText);
  } catch (error) {
    console.error("Erro ao gerar/processar as dicas da IA:", error);
    // Retorno de segurança caso algo falhe
    return {
      identification: "Dica visual não disponível no momento.",
      location: "Erro ao processar localização.",
      functions: "Verifique sua conexão e tente novamente."
    };
  }
};