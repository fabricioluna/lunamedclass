import { GoogleGenAI } from '@google/genai';

export default async function handler(req: any, res: any) {
  // Apenas aceitar requisições POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    // Adicionamos a captura da variável "mode" enviada pelo frontend
    const { prompt, context, mode } = req.body;

    // Inicia a IA com a chave de ambiente SECRETA do servidor
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    
    const fullPrompt = `Contexto acadêmico (FMS): ${context}\n\nPergunta do aluno: ${prompt}`;
    
    // Objeto de configuração base do Gemini
    let config: any = {};

    // === A MÁGICA: SE FOR MODO RPG, ENSINAMOS A IA A USAR O MONITOR ===
    if (mode === 'rpg') {
      config.systemInstruction = "Você é o Mestre de Jogo (Narrador) de um simulador médico de UTI/Emergência realista. Narre o ambiente, os sons e as reações do paciente. SEMPRE responda com um texto descritivo. SE a condição do paciente evoluir (melhorar ou piorar) devido ao tempo ou devido à intervenção do aluno, VOCÊ DEVE utilizar a ferramenta 'update_vitals' para alterar os parâmetros do monitor cardíaco da tela do aluno.";
      
      config.tools = [{
        functionDeclarations: [{
          name: "update_vitals",
          description: "Atualiza os sinais vitais do paciente no monitor multiparamétrico da tela do aluno em resposta a uma conduta médica, evolução natural da doença ou piora clínica.",
          parameters: {
            type: "OBJECT",
            properties: {
              hr: { type: "INTEGER", description: "Frequência Cardíaca (ex: 80, 0 para assistolia)" },
              bp: { type: "STRING", description: "Pressão Arterial (ex: '120/80', 'N/A' se sem pulso)" },
              sat: { type: "INTEGER", description: "Saturação de Oxigênio (ex: 98, 0 se sem pulso)" },
              rr: { type: "INTEGER", description: "Frequência Respiratória (ex: 16, 0 se apneia)" },
              status: { type: "STRING", description: "Breve status clínico visual (ex: 'cianótico', 'corado', 'sudoreico', 'inconsciente')" }
            },
            required: ["hr", "bp", "sat", "rr", "status"]
          }
        }]
      }];
    }

    // Chamada à Google usando o SDK
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: fullPrompt,
        config: config
    });

    // === INTERCEPTAÇÃO DOS SINAIS VITAIS ===
    let functionCallData = null;
    
    // O novo SDK armazena as chamadas de função no array functionCalls
    if (response.functionCalls && response.functionCalls.length > 0) {
      const call = response.functionCalls[0];
      if (call.name === "update_vitals") {
        functionCallData = call.args; // Captura os sinais vitais gerados pela IA (hr, bp, sat, etc)
      }
    }

    // Devolvemos a resposta limpa para o frontend, INCLUINDO os sinais vitais ocultos!
    // Nota de segurança: O seu app atual só lê o ".text", então nada do que já existe vai quebrar.
    return res.status(200).json({ 
      text: response.text || "...", 
      vitalsUpdate: functionCallData 
    });

  } catch (error) {
    console.error("Erro interno no Servidor Vercel:", error);
    return res.status(500).json({ error: 'Falha ao comunicar com a Inteligência Artificial.' });
  }
}