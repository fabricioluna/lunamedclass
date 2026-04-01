// services/aiService.ts

/**
 * Função base para comunicação com a API de Chat da LunaMedClass.
 * Realiza a chamada ao endpoint seguro para processamento de linguagem natural.
 */
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

/**
 * GERAÇÃO DE DICAS PARA O LABORATÓRIO VIRTUAL
 * Atua como um professor especialista para gerar metadados estruturados (JSON)
 * sobre estruturas anatômicas, histológicas ou patológicas.
 */
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
    // Usamos a função interna para solicitar a resposta à IA
    const responseText = await getAIResponse(prompt, "Geração de dicas estruturadas para laboratório virtual.");
    
    // Limpeza de possíveis formatações markdown que a IA possa incluir por engano
    const cleanText = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
    
    return JSON.parse(cleanText);
  } catch (error) {
    console.error("Erro ao gerar/processar as dicas da IA:", error);
    // Retorno de segurança (Fallback) para evitar quebra da interface
    return {
      identification: "Dica visual não disponível no momento.",
      location: "Erro ao processar localização.",
      functions: "Verifique sua conexão e tente novamente."
    };
  }
};