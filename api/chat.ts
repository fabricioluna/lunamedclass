import { GoogleGenerativeAI, type ModelParams } from '@google/generative-ai';
import { ClinicalState, PhaseRules } from '../types';
import { getClientIp, isRateLimited } from './_lib/rateLimit';

interface ChatRequestBody {
  prompt: string;
  context: string;
  mode?: 'rpg' | 'clinical' | 'ai';
  phaseRules?: PhaseRules | null;
  isFinalEvaluation?: boolean;
}

interface ChatRequest {
  method?: string;
  headers: Record<string, string | string[] | undefined>;
  body: ChatRequestBody;
}

interface ChatResponse {
  status: (code: number) => { json: (body: unknown) => void };
}

interface GeminiFunctionDeclaration {
  name: string;
  description: string;
  parameters: {
    type: 'OBJECT';
    properties: Record<string, { type: 'STRING' | 'INTEGER' }>;
    required: string[];
  };
}

export default async function handler(req: ChatRequest, res: ChatResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  const clientIp = getClientIp(req.headers);
  if (isRateLimited(clientIp)) {
    return res.status(429).json({ error: 'Muitas requisições. Aguarde um minuto e tente novamente.' });
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

    const toolsArray: GeminiFunctionDeclaration[] = [];
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
        const transitionsText = phaseRules.transitions.map(t =>
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

    const modelOptions: {
      model: string;
      systemInstruction: string;
      tools?: { functionDeclarations: GeminiFunctionDeclaration[] }[];
    } = {
      model: targetModel,
      systemInstruction: systemInstructionText,
    };

    if (toolsArray.length > 0) {
        modelOptions.tools = [{ functionDeclarations: toolsArray }];
    }

    // A SDK tipa o schema de parâmetros com valores minúsculos (SchemaType), mas a API do
    // Gemini espera "OBJECT"/"STRING"/"INTEGER" maiúsculos — é o formato já testado em
    // produção (ver Etapa 0, modelUsed: gemini-2.5-flash). O cast preserva esse
    // comportamento sem recorrer a `any`.
    const model = genAI.getGenerativeModel(modelOptions as unknown as ModelParams);
    const result = await model.generateContent(fullPrompt);
    const response = result.response;

    let functionCallData: ClinicalState | null = null;
    let newPhaseId: string | null = null;

    const functionCalls = response.functionCalls();
    if (functionCalls && functionCalls.length > 0) {
      for (const call of functionCalls) {
        if (call.name === "update_vitals") {
          functionCallData = call.args as unknown as ClinicalState;
        } else if (call.name === "change_phase") {
          newPhaseId = (call.args as { nextPhaseId: string }).nextPhaseId;
        }
      }
    }

    return res.status(200).json({
      text: response.text() || "...",
      vitalsUpdate: functionCallData,
      newPhaseId: newPhaseId,
      modelUsed: targetModel
    });

  } catch (error) {
    console.error("Erro no Servidor:", error);
    const message = error instanceof Error ? error.message : String(error);
    return res.status(500).json({ error: 'Falha na Engine', details: message });
  }
}
