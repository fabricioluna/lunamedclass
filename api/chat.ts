import { GoogleGenerativeAI } from '@google/generative-ai';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    const { prompt, context, mode, phaseRules, isFinalEvaluation } = req.body;
    
    // 1. CHECAGEM DE SEGURANÇA DA CHAVE API
    if (!process.env.GEMINI_API_KEY) {
      console.error("ERRO FATAL: GEMINI_API_KEY não encontrada no backend da Vercel.");
      return res.status(500).json({ error: 'Chave de API não configurada no servidor Vercel.', details: 'Missing GEMINI_API_KEY' });
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const targetModel = isFinalEvaluation ? 'gemini-1.5-pro' : 'gemini-1.5-flash';
    
    const fullPrompt = `CONTEXTO ATUAL: ${context}\n\nCONDUTA DO ALUNO: ${prompt}`;
    
    // =======================================================================
    // CÓRTEX MÉDICO UNIVERSAL - LUNA ENGINE 3.0 (REALISMO ABSOLUTO)
    // =======================================================================
    const UNIVERSAL_RULES = `
    VOCÊ É UM MESTRE DE RPG MÉDICO E NARRADOR IMERSIVO, O MELHOR SIMULADOR MÉDICO DO MUNDO.
    
    DIRETRIZES INSTITUCIONAIS E DE NARRATIVA:
    1. HUMANIDADE: Responda sempre com realismo. Se o aluno interagir socialmente, responda como a equipe ou o paciente. Não seja robótico.
    2. BIOSSEGURANÇA: Exija permissão para tocar no paciente e lavagem de mãos/EPIs. Se falhar, narre a hesitação da equipe e o risco imediato.
    3. REAÇÃO IMEDIATA: Toda ação gera uma consequência visual ou sonora. Se for iatrogenia (ex: dar sal), você DEVE piorar os vitais drasticamente e narrar o caos na sala.
    4. PODER DE VIDA E MORTE: Se a conduta for fatal ou houver demora crítica, você pode levar o paciente a óbito chamando 'update_vitals' com hr: 0, bp: "0/0", sat: 0.
    5. ESTADO DINÂMICO: Sua resposta passará a ser a "Nova Realidade" da cena. Descreva o que o aluno VÊ, OUVE e SENTE.
    6. MÁQUINA DE ESTADOS: Use os 'phaseRules' apenas como marcos técnicos. Se o aluno acertar, avance. Se errar, narre a consequência e mantenha-o na fase para correção.
    7. ENCERRAMENTO: Se o aluno pedir para "finalizar", "encerrar" ou "colher feedback", aceite e chame 'change_phase' com nextPhaseId: "FINISH".
    8. NUNCA diga "Essa conduta não surtiu efeito". Narre o que acontece: "O monitor apita e o paciente começa a suar frio".
    9. NÃO DÊ O DIAGNÓSTICO. O raciocínio clínico deve ser 100% do aluno.
    `;

    let toolsArray: any[] = [];
    let systemInstructionText = UNIVERSAL_RULES;

    if (mode === 'rpg' || mode === 'clinical' || mode === 'ai') { 
      if (mode !== 'ai') {
        toolsArray.push({
          name: "update_vitals",
          description: "Altera os sinais vitais no monitor. Use para refletir melhora, piora ou óbito (hr:0).",
          parameters: {
            type: "OBJECT",
            properties: {
              hr: { type: "INTEGER", description: "FC" },
              bp: { type: "STRING", description: "PA" },
              sat: { type: "INTEGER", description: "SatO2" },
              rr: { type: "INTEGER", description: "FR" },
              status: { type: "STRING", description: "Status visual (ex: Estável, Crítico, Óbito)" }
            },
            required: ["hr", "bp", "sat", "rr", "status"]
          }
        });
      }

      if (phaseRules && phaseRules.transitions) {
        const transitionsText = phaseRules.transitions.map((t: any) => 
          `- Gatilho Técnico: [${t.triggers.join(', ')}]. Se o aluno atingir isso, chame 'change_phase' com nextPhaseId = "${t.nextPhaseId}".`
        ).join('\n');

        systemInstructionText = `${UNIVERSAL_RULES}\n\nREGRAS DE TRANSIÇÃO TÉCNICA:\n${transitionsText}\n\nLOGICA DE EXECUÇÃO:\n- Conduta Social: Resposta apenas narrativa.\n- Acerto Técnico: Narre o sucesso e chame 'change_phase'.\n- Erro/Iatrogenia: Narre a consequência e chame 'update_vitals' com dados degradados.`;
        
        toolsArray.push({
          name: "change_phase",
          description: "Avança para a próxima fase clínica ou encerra a simulação (FINISH).",
          parameters: {
            type: "OBJECT",
            properties: { nextPhaseId: { type: "STRING" } },
            required: ["nextPhaseId"]
          }
        });
      }
    }

    // 2. CONFIGURAÇÃO DO MODELO COM O SDK ESTÁVEL
    const modelOptions: any = {
      model: targetModel,
      systemInstruction: systemInstructionText,
    };

    if (toolsArray.length > 0) {
        modelOptions.tools = [{ functionDeclarations: toolsArray }];
    }

    const model = genAI.getGenerativeModel(modelOptions);

    // 3. EXECUÇÃO DA IA
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
    // 4. RETORNA O ERRO REAL PARA O FRONTEND (Facilita o debug se falhar)
    return res.status(500).json({ error: 'Falha na Engine de Simulação.', details: error.message || String(error) });
  }
}