import { GoogleGenAI } from '@google/genai';

export default async function handler(req: any, res: any) {
  // Apenas aceitar requisições POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    // LUNA ENGINE 2.0: Injeção do parâmetro isFinalEvaluation para Roteamento Dual-Engine
    const { prompt, context, mode, phaseRules, isFinalEvaluation } = req.body;

    // Inicia a IA com a chave de ambiente SECRETA do servidor
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    
    const fullPrompt = `Contexto acadêmico: ${context}\n\nPergunta/Ação do aluno: ${prompt}`;
    
    // Objeto de configuração base do Gemini
    let config: any = {};

    // =======================================================================
    // CÓRTEX MÉDICO UNIVERSAL
    // =======================================================================
    const UNIVERSAL_RULES = `
    DIRETRIZES CLÍNICAS E PEDAGÓGICAS INSTITUCIONAIS:
    1. Biossegurança: O aluno DEVE declarar que lavou as mãos e colocou EPIs adequados antes de qualquer exame físico ou procedimento invasivo. Penalize condutas que quebrem isso.
    2. Emergências: Em cenários extra-hospitalares ou de trauma, a "Segurança da Cena" deve ser o primeiro passo. Siga rigorosamente a sistematização ABCDE e protocolos BLS (AHA).
    3. Habilidades Clínicas: Em consultas, exija comunicação empática, apresentação profissional e estruturação lógica da anamnese e exame físico (inspeção, palpação, percussão, ausculta).
    4. Pressão Clínica (Ação de Narrador): Se o aluno hesitar, fizer perguntas irrelevantes em uma emergência ou tomar atitudes sem foco, narre ativamente o agravamento do quadro.
    NÃO DÊ O DIAGNÓSTICO AO ALUNO. VOCÊ É APENAS O NARRADOR/AVALIADOR DA CENA.
    `;

    // === MÁQUINA DE ESTADOS (STATE MACHINE) ===
    if (mode === 'rpg' || mode === 'clinical') { 
      
      if (phaseRules && phaseRules.transitions) {
        const transitionsText = phaseRules.transitions.map((t: any) => 
          `- Se a conduta do aluno corresponder a algum destes gatilhos: [${t.triggers.join(', ')}], chame a ferramenta 'change_phase' com nextPhaseId = "${t.nextPhaseId}" e use esta narrativa na resposta: "${t.feedbackText}"`
        ).join('\n');

        config.systemInstruction = `Você é o Juiz e Narrador de uma simulação médica regida por uma Máquina de Estados. 
        O aluno deve tomar a conduta correta para avançar.
        
        ${UNIVERSAL_RULES}
        
        REGRAS DE TRANSIÇÃO PARA A FASE ATUAL:
        ${transitionsText}
        
        INSTRUÇÕES CRÍTICAS:
        1. Se a ação do aluno NÃO corresponder aos gatilhos, diga que a ação não surtiu efeito, que faltou biossegurança (se aplicável), ou que o paciente piorou. NUNCA diga o que ele tem que fazer.
        2. SE a ação do aluno ativar um gatilho, você DEVE EXECUTAR a ferramenta 'change_phase' enviando o ID da próxima fase.`;
        
        config.tools = [{
          functionDeclarations: [{
            name: "change_phase",
            description: "Avança a simulação para a próxima fase clínica quando o aluno acerta a conduta médica estipulada nos gatilhos.",
            parameters: {
              type: "OBJECT",
              properties: {
                nextPhaseId: { type: "STRING", description: "O ID da próxima fase correspondente ao acerto do aluno (ex: 'fase_2')" }
              },
              required: ["nextPhaseId"]
            }
          }]
        }];
      } else {
        // RPG LEGACY: APENAS SINAIS VITAIS LIVRES
        config.systemInstruction = `Você é o Mestre de Jogo (Narrador) de um simulador médico de UTI/Emergência realista. Narre o ambiente, os sons e as reações do paciente. SEMPRE responda com um texto descritivo. 
        
        ${UNIVERSAL_RULES}
        
        SE a condição do paciente evoluir (melhorar ou piorar) devido ao tempo ou devido à intervenção do aluno, VOCÊ DEVE utilizar a ferramenta 'update_vitals' para alterar os parâmetros do monitor cardíaco da tela do aluno.`;
        
        config.tools = [{
          functionDeclarations: [{
            name: "update_vitals",
            description: "Atualiza os sinais vitais do paciente no monitor multiparamétrico da tela do aluno em resposta a uma conduta médica.",
            parameters: {
              type: "OBJECT",
              properties: {
                hr: { type: "INTEGER", description: "Frequência Cardíaca" },
                bp: { type: "STRING", description: "Pressão Arterial" },
                sat: { type: "INTEGER", description: "Saturação de Oxigênio" },
                rr: { type: "INTEGER", description: "Frequência Respiratória" },
                status: { type: "STRING", description: "Breve status clínico visual" }
              },
              required: ["hr", "bp", "sat", "rr", "status"]
            }
          }]
        }];
      }
    }

    // =======================================================================
    // ROTEAMENTO DUAL-ENGINE (Performance vs Precisão)
    // Se for uma avaliação final estruturada, usa o modelo PRO. 
    // Caso contrário (chat em tempo real), usa o modelo FLASH.
    // =======================================================================
    const targetModel = isFinalEvaluation ? 'gemini-2.5-pro' : 'gemini-2.5-flash';

    // Chamada à Google usando o SDK dinâmico
    const response = await ai.models.generateContent({
        model: targetModel,
        contents: fullPrompt,
        config: config
    });

    // === INTERCEPTAÇÃO DOS SINAIS VITAIS OU MUDANÇA DE FASE ===
    let functionCallData = null;
    let newPhaseId = null;
    
    if (response.functionCalls && response.functionCalls.length > 0) {
      const call = response.functionCalls[0];
      
      if (call.name === "update_vitals") {
        // Type casting para os sinais vitais
        functionCallData = call.args as { hr: number, bp: string, sat: number, rr: number, status: string }; 
      } else if (call.name === "change_phase") {
        // Correção cirúrgica: Asserção de tipo explícita para o compilador TS
        const args = call.args as { nextPhaseId: string };
        newPhaseId = args.nextPhaseId; 
      }
    }

    return res.status(200).json({ 
      text: response.text || "...", 
      vitalsUpdate: functionCallData,
      newPhaseId: newPhaseId,
      modelUsed: targetModel // Opcional: devolvemos o modelo usado para fins de debug/analytics no frontend
    });

  } catch (error) {
    console.error("Erro interno no Servidor Vercel:", error);
    return res.status(500).json({ error: 'Falha ao comunicar com a Inteligência Artificial.' });
  }
}