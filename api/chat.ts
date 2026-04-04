import { GoogleGenAI } from '@google/genai';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    const { prompt, context, mode, phaseRules, isFinalEvaluation } = req.body;
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const fullPrompt = `Contexto acadêmico: ${context}\n\nPergunta/Ação do aluno: ${prompt}`;
    let config: any = {};

    // =======================================================================
    // CÓRTEX MÉDICO UNIVERSAL - HUMANIZADO (LUNA ENGINE 2.5)
    // =======================================================================
    const UNIVERSAL_RULES = `
    VOCÊ É UM MESTRE DE RPG MÉDICO E NARRADOR IMERSIVO, O MELHOR SIMULADOR MÉDICO DO MUNDO.
    
    DIRETRIZES INSTITUCIONAIS E DE NARRATIVA:
    1. Responda SEMPRE com humanidade. Se o aluno der "Bom dia", se apresentar ou fizer "social", responda como os profissionais na sala ou como o paciente faria. Não seja robótico.
    2. Biossegurança: O aluno DEVE declarar permissão para tocar no paciente, lavagem de mãos e EPIs antes de tocar no paciente. Se ele falhar, narre a hesitação da equipe.
    3. REAÇÃO IMEDIATA: Toda ação do aluno deve gerar uma consequência narrativa.
      - Se ele pedir um exame desnecessário, narre o tempo passando e o paciente sofrendo.
      - Se ele der uma droga errada, use 'update_vitals' para piorar o paciente e narre o caos.
    4. Emergências: Siga rigorosamente ABCDE. Se o aluno hesitar, narre ativamente o agravamento do quadro clínico.
    5. FISIOLOGIA REAL E IMPLACÁVEL: A ferramenta 'update_vitals' DEVE refletir a biologia. Se a conduta for correta, melhore os sinais. Se for erro ou iatrogenia (ex: dar sal para hipertenso), VOCÊ DEVE PIORAR os vitais drasticamente via 'update_vitals' e narrar o mal-estar.
    6. ESTADO DINÂMICO: Sua resposta de texto passará a ser a "Nova Realidade" da cena. Descreva o que o aluno VÊ, OUVE e SENTE após a ação dele.
    7. MÁQUINA DE ESTADOS: Use os 'phaseRules' apenas como marcos. Você tem liberdade para criar "sub-fases" narrativas entre elas.
    8. NUNCA diga "Essa conduta não surtiu efeito". Narre a consequência real: "O paciente tosse, o monitor começa a apitar e a enfermeira te olha com pavor".
    9. NÃO DÊ O DIAGNÓSTICO. O raciocínio é do aluno.
    `;

    if (mode === 'rpg' || mode === 'clinical' || mode === 'ai') { 
      let toolsArray: any[] = [];

      if (mode !== 'ai') {
        toolsArray.push({
          name: "update_vitals",
          description: "Sincroniza o monitor cardíaco com a narrativa. Use SEMPRE que o paciente melhorar ou piorar.",
          parameters: {
            type: "OBJECT",
            properties: {
              hr: { type: "INTEGER", description: "FC" },
              bp: { type: "STRING", description: "PA" },
              sat: { type: "INTEGER", description: "SatO2" },
              rr: { type: "INTEGER", description: "FR" },
              status: { type: "STRING", description: "Status visual do monitor" }
            },
            required: ["hr", "bp", "sat", "rr", "status"]
          }
        });
      }

      if (phaseRules && phaseRules.transitions) {
        const transitionsText = phaseRules.transitions.map((t: any) => 
          `- Gatilho Técnico para avançar: [${t.triggers.join(', ')}]. Se o aluno fizer isso, chame 'change_phase' com nextPhaseId = "${t.nextPhaseId}".`
        ).join('\n');

        config.systemInstruction = `${UNIVERSAL_RULES}
        
        REGRAS DE TRANSIÇÃO (MÁQUINA DE ESTADOS):
        ${transitionsText}
        
        LÓGICA DE EXECUÇÃO:
        - Se for Social: Responda apenas com texto.
        - Se for Acerto Técnico: Chame 'change_phase'.
        - Se for Erro Clínico: Narre a piora e chame 'update_vitals' com dados críticos.`;
        
        toolsArray.push({
          name: "change_phase",
          description: "Avança a simulação para a próxima fase clínica.",
          parameters: {
            type: "OBJECT",
            properties: { nextPhaseId: { type: "STRING", description: "ID da próxima fase" } },
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
    console.error("Erro interno no Servidor Vercel:", error);
    return res.status(500).json({ error: 'Falha ao comunicar com a Inteligência Artificial.' });
  }
}