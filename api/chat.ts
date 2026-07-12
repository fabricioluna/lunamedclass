import { GoogleGenerativeAI } from '@google/generative-ai';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    const { prompt, context, mode, phaseRules, isFinalEvaluation } = req.body;
    
    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ error: 'Chave de API não configurada no servidor Vercel.' });
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    
    // RESTAURADO PARA O GEMINI 2.5 ORIGINAL DO SEU CÓDIGO
    const targetModel = isFinalEvaluation ? 'gemini-2.5-pro' : 'gemini-2.5-flash';
    
    const fullPrompt = `CONTEXTO ATUAL: ${context}\n\nCONDUTA DO ALUNO: ${prompt}`;
    
    const UNIVERSAL_RULES = `
    VOCÊ É UM MESTRE DE RPG MÉDICO E NARRADOR IMERSIVO, O MELHOR SIMULADOR MÉDICO DO MUNDO.
    
    DIRETRIZES INSTITUCIONAIS E DE NARRATIVA:
    1. HUMANIDADE: Responda sempre com realismo.
    2. BIOSSEGURANÇA: Exija permissão para tocar no paciente e lavagem de mãos/EPIs.
    3. REAÇÃO IMEDIATA: Toda ação gera uma consequência visual ou sonora. Se for iatrogenia, piore os vitais drasticamente.
    4. PODER DE VIDA E MORTE: Se a conduta for fatal, você pode levar o paciente a óbito chamando 'update_vitals' com hr: 0.
    5. ESTADO DINÂMICO: Descreva o que o aluno VÊ, OUVE e SENTE.
    6. MÁQUINA DE ESTADOS: Use os 'phaseRules' como marcos técnicos. Se acertar, avance. Se errar, narre a consequência.
    7. ENCERRAMENTO: Se pedir para finalizar, chame 'change_phase' com nextPhaseId: "FINISH".
    8. NUNCA diga "Essa conduta não surtiu efeito". Narre o que acontece.
    9. NÃO DÊ O DIAGNÓSTICO. O raciocínio clínico deve ser 100% do aluno.
    `;

    let toolsArray: any[] = [];
    let systemInstructionText = UNIVERSAL_RULES;

    if (mode === 'rpg' || mode === 'clinical' || mode === 'ai') { 
      if (mode !== 'ai') {
        toolsArray.push({
          name: "update_vitals",
          description: "Altera os sinais vitais no monitor.",
          parameters: {
            type: "OBJECT",
            properties: {
              hr: { type: "INTEGER" },
              bp: { type: "STRING" },
              sat: { type: "INTEGER" },
              rr: { type: "INTEGER" },
              status: { type: "STRING" }
            },
            required: ["hr", "bp", "sat", "rr", "status"]
          }
        });
      }

      if (phaseRules && phaseRules.transitions) {
        const transitionsText = phaseRules.transitions.map((t: any) => 
          `- Gatilho: [${t.triggers.join(', ')}]. Se atingir, chame 'change_phase' com nextPhaseId = "${t.nextPhaseId}".`
        ).join('\n');

        systemInstructionText = `${UNIVERSAL_RULES}\n\nREGRAS DE TRANSIÇÃO:\n${transitionsText}`;
        
        toolsArray.push({
          name: "change_phase",
          description: "Avança fase ou encerra (FINISH).",
          parameters: {
            type: "OBJECT",
            properties: { nextPhaseId: { type: "STRING" } },
            required: ["nextPhaseId"]
          }
        });
      }
    }

    const modelOptions: any = {
      model: targetModel,
      systemInstruction: systemInstructionText,
    };

    if (toolsArray.length > 0) {
        modelOptions.tools = [{ functionDeclarations: toolsArray }];
    }

    const model = genAI.getGenerativeModel(modelOptions);
    const result = await model.generateContent(fullPrompt);
    const response = result.response;
    
    let functionCallData = null;
    let newPhaseId = null;
    
    const functionCalls = response.functionCalls();
    if (functionCalls && functionCalls.length > 0) {
      for (const call of functionCalls) {
        if (call.name === "update_vitals") {
          functionCallData = call.args; 
        } else if (call.name === "change_phase") {
          newPhaseId = (call.args as any).nextPhaseId; 
        }
      }
    }

    return res.status(200).json({ 
      text: response.text() || "...", 
      vitalsUpdate: functionCallData,
      newPhaseId: newPhaseId,
      modelUsed: targetModel 
    });

  } catch (error: any) {
    console.error("Erro no Servidor:", error);
    return res.status(500).json({ error: 'Falha na Engine', details: error.message || String(error) });
  }
}