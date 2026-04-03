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
 */
export const generateLabTips = async (answer: string, question: string) => {
  const prompt = `Você é um professor de medicina.
  A pergunta foi: "${question}" e a resposta correta é: "${answer}".
  Retorne um objeto JSON ESTRITO com as chaves: "identification", "location", "functions".
  Não use markdown. Retorne APENAS o JSON puro.`;

  try {
    const responseText = await getAIResponse(prompt, "Geração de dicas estruturadas para laboratório virtual.");
    const cleanText = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(cleanText);
  } catch (error) {
    return {
      identification: "Dica visual não disponível no momento.",
      location: "Erro ao processar localização.",
      functions: "Verifique sua conexão e tente novamente."
    };
  }
};

/**
 * MOTOR RPG HÍBRIDO: AVALIADOR DE CONDUTA (INTELIGÊNCIA SEMÂNTICA)
 * Usa âncora Regex para extrair a decisão da IA mesmo que ela escreva texto indesejado.
 */
export const evaluateRpgAction = async (userAction: string, availableTransitions: any[], narrative: string) => {
  if (!availableTransitions || availableTransitions.length === 0) return null;

  const prompt = `
  Você é o juiz clínico de um simulador de medicina. Seja MUITO FLEXÍVEL com sinônimos e erros de digitação.
  Cenário do paciente: "${narrative}".
  
  Conduta digitada pelo aluno: "${userAction}"
  
  Caminhos aceitos no sistema (Índice e Gatilhos Esperados):
  ${availableTransitions.map((t, i) => `ID [${i}]: ${t.triggers.join(', ')}`).join('\n')}
  
  Sua Tarefa: Avalie a INTENÇÃO CLÍNICA da conduta do aluno. Se a intenção corresponder práticamente a uma das opções, é um acerto.
  Exemplos: "ver monitor", "instalar monitorização", "ver sinais" equivalem a "Monitor".
  
  RESPONDA OBRIGATORIAMENTE COM ESTA ESTRUTURA EXATA:
  Se for um acerto, responda: MATCH: [NUMERO DO ID] (Exemplo: MATCH: 0)
  Se for uma conduta absurda, perigosa ou totalmente fora de contexto, responda: MATCH: NONE
  `;

  try {
    const responseText = await getAIResponse(prompt, "Avaliador Clínico RPG.");
    
    // LOG PARA O DOUTOR LUNA VER NO F12:
    console.log(`[Luna Engine] Aluno digitou: "${userAction}"`);
    console.log(`[Luna Engine] Resposta Bruta da IA:`, responseText);

    const cleanResponse = responseText.toUpperCase();
    
    if (cleanResponse.includes("MATCH: NONE")) {
        return null;
    }

    // Procura exatamente pelo padrão "MATCH: numero" usando Regex
    const matchResult = cleanResponse.match(/MATCH:\s*(\d+)/);
    
    if (matchResult && matchResult[1]) {
        const index = parseInt(matchResult[1], 10);
        if (index >= 0 && index < availableTransitions.length) {
            return availableTransitions[index];
        }
    }

    // Se falhar o Regex, fazemos um fallback buscando apenas um número isolado na string
    const fallbackMatch = cleanResponse.match(/\b(\d+)\b/);
    if (fallbackMatch && fallbackMatch[1]) {
        const fallbackIndex = parseInt(fallbackMatch[1], 10);
        if (fallbackIndex >= 0 && fallbackIndex < availableTransitions.length) {
            return availableTransitions[fallbackIndex];
        }
    }

    return null;
  } catch (error) {
    console.error("[Luna Engine] Erro ao avaliar ação de RPG:", error);
    return null;
  }
};

/**
 * MOTOR RPG HÍBRIDO: BOTÃO DE SOCORRO (GERADOR DE DISTRATORES INTELIGENTES)
 */
export const generateRpgOptions = async (validTransitions: any[], narrative: string) => {
    if (!validTransitions || validTransitions.length === 0) return [];

    const targetTransition = validTransitions[0];
    const correctTrigger = targetTransition.triggers[0];

    const prompt = `
    Cenário Clínico Atual: "${narrative}".
    Conduta Médica Correta e Esperada: "${correctTrigger}".
    
    Aja como uma banca examinadora de prova de residência médica. Gere 4 condutas médicas INCORRETAS (distratores). 
    REGRAS VITAIS:
    1. NÃO PODEM SER ABSURDOS (ex: dar alta num infarto).
    2. Precisam fazer SENTIDO CLÍNICO no contexto, mas estarem erradas por uma questão de prioridade, contraindicação ou dosagem.
    
    Retorne ESTRITAMENTE um array JSON contendo 5 strings (a Conduta Correta misturada com as 4 incorretas que você criar).
    Não adicione explicações, nem markdown. APENAS o array no formato:
    ["Distrator Plausível 1", "Conduta Correta", "Distrator Plausível 2", "Distrator Plausível 3", "Distrator Plausível 4"]
    `;

    try {
        const responseText = await getAIResponse(prompt, "Gerador de Distratores Clínicos.");
        
        // LOG PARA O DOUTOR LUNA VER NO F12:
        console.log(`[Luna Engine] JSON Bruto gerado para as Opções (SOS):`, responseText);

        let cleanText = responseText.replace(/```json/gi, '').replace(/```/g, '').trim();
        const startIdx = cleanText.indexOf('[');
        const endIdx = cleanText.lastIndexOf(']');
        if (startIdx !== -1 && endIdx !== -1) {
            cleanText = cleanText.substring(startIdx, endIdx + 1);
        }

        let optionsArray = JSON.parse(cleanText);
        
        if (Array.isArray(optionsArray)) {
            if (!optionsArray.includes(correctTrigger)) {
                optionsArray[0] = correctTrigger;
            }
            
            for (let i = optionsArray.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [optionsArray[i], optionsArray[j]] = [optionsArray[j], optionsArray[i]];
            }

            return optionsArray.slice(0, 5).map(opt => ({
                text: opt,
                isCorrect: opt === correctTrigger,
                transitionRef: opt === correctTrigger ? targetTransition : null
            }));
        }
        throw new Error("Formato não é um array válido.");
    } catch (error) {
        console.error("[Luna Engine] Falha no gerador de distratores da IA, usando fallback.", error);
        
        const fallbacks = [
            "Aguardar evolução clínica sem intervir no momento",
            "Prescrever Dipirona 500mg EV e observar",
            "Solicitar tomografia de corpo inteiro imediatamente",
            "Encaminhar para ambulatório geral sem estabilização"
        ];
        
        let safeArray = [correctTrigger, ...fallbacks];
        for (let i = safeArray.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [safeArray[i], safeArray[j]] = [safeArray[j], safeArray[i]];
        }

        return safeArray.map(opt => ({
            text: opt,
            isCorrect: opt === correctTrigger,
            transitionRef: opt === correctTrigger ? targetTransition : null
        }));
    }
};