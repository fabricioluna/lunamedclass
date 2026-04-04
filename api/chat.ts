import { GoogleGenAI } from '@google/genai';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    const { prompt, context, mode, phaseRules, isFinalEvaluation } = req.body;
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    
    // O prompt agora enfatiza que a resposta da IA é a NOVA REALIDADE do cenário
    const fullPrompt = `CONTEXTO ATUAL: ${context}\n\nCONDUTA DO ALUNO: ${prompt}`;
    
    let config: any = {};

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

    if (mode === 'rpg' || mode === 'clinical' || mode === 'ai') { 
      let toolsArray: any[] = [];

      // Ferramenta de Monitor (Inativa apenas no modo Anamnese 'ai')
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

        config.systemInstruction = `${UNIVERSAL_RULES}
        
        REGRAS DE TRANSIÇÃO TÉCNICA:
        ${transitionsText}
        
        LOGICA DE EXECUÇÃO:
        - Conduta Social: Resposta apenas narrativa.
        - Acerto Técnico: Narre o sucesso e chame 'change_phase'.
        - Erro/Iatrogenia: Narre a consequência e chame 'update_vitals' com dados degradados.`;
        
        toolsArray.push({
          name: "change_phase",
          description: "Avança para a próxima fase clínica ou encerra a simulação (FINISH).",
          parameters: {
            type: "OBJECT",
            properties: { nextPhaseId: { type: "STRING" } },
            required: ["nextPhaseId"]
          }
        });
      } else {
        config.systemInstruction = UNIVERSAL_RULES;
      }

      config.tools = [{ functionDeclarations: toolsArray }];
    }

    const targetModel = isFinalEvaluation ? 'gemini-2.5-pro' : 'gemini-2.5-flash';
    const response = await ai.models.generateContent({
        model: targetModel,
        contents: fullPrompt,
        config: config
    });

    let functionCallData = null;
    let newPhaseId = null;
    
    if (response.functionCalls && response.functionCalls.length > 0) {
      for (const call of response.functionCalls) {
        if (call.name === "update_vitals") {
          functionCallData = call.args; 
        } else if (call.name === "change_phase") {
          newPhaseId = (call.args as any).nextPhaseId; 
        }
      }
    }

    return res.status(200).json({ 
      text: response.text || "...", 
      vitalsUpdate: functionCallData,
      newPhaseId: newPhaseId,
      modelUsed: targetModel 
    });

  } catch (error) {
    console.error("Erro no Servidor:", error);
    return res.status(500).json({ error: 'Falha na comunicação com a Engine de Simulação.' });
  }
}