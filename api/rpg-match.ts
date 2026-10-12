import { GoogleGenerativeAI, type ModelParams } from '@google/generative-ai';
import { createRateLimiter, getClientIp } from './_lib/rateLimit.js';
import { AuthError, bearerToken, getGoogleKeys, verifyFirebaseIdToken } from './_lib/firebaseAuth.js';
import { classifyAction, validateMatchRequest } from './_lib/rpgMatch.js';

// Classifica a conduta digitada pelo aluno no RPG digitado (item 6.17). EXIGE usuário logado
// (ID token do Firebase) — diferente do /api/chat, que segue sem controle de acesso.
//
// Limites: por IP um teto folgado (uma sala inteira pode sair pelo mesmo IP) e por usuário o
// teto que realmente protege o custo. São em memória (zeram em cold start): mitigação, não
// garantia — ver api/_lib/rateLimit.ts.

// Mesmo projectId de firebase.ts (o ID token do aluno é emitido para ele).
const PROJECT_ID = 'monitor-virtual-fms';
const MODEL = 'gemini-3.6-flash';

const ipLimiter = createRateLimiter({ shortWindowMs: 60_000, shortMax: 120, longWindowMs: 60 * 60_000, longMax: 2000, maxTracked: 5000 });
const userLimiter = createRateLimiter({ shortWindowMs: 60_000, shortMax: 20, longWindowMs: 60 * 60_000, longMax: 300, maxTracked: 5000 });

interface RpgMatchRequest {
  method?: string;
  headers: Record<string, string | string[] | undefined>;
  body: unknown;
}

interface RpgMatchResponse {
  status: (code: number) => { json: (body: unknown) => void };
}

export default async function handler(req: RpgMatchRequest, res: RpgMatchResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  if (ipLimiter(getClientIp(req.headers))) {
    return res.status(429).json({ error: 'Muitas requisições. Aguarde um minuto e tente novamente.' });
  }

  const token = bearerToken(req.headers.authorization);
  if (!token) {
    return res.status(401).json({ error: 'Entre na sua conta para jogar digitando.' });
  }

  let uid: string;
  try {
    ({ uid } = await verifyFirebaseIdToken(token, { projectId: PROJECT_ID, getKeys: getGoogleKeys }));
  } catch (error) {
    if (error instanceof AuthError) {
      return res.status(401).json({ error: 'Sessão inválida ou expirada. Entre novamente.' });
    }
    console.error('Falha ao verificar o token:', error);
    return res.status(503).json({ error: 'Não foi possível verificar a sua sessão agora.' });
  }

  if (userLimiter(uid)) {
    return res.status(429).json({ error: 'Muitas ações em pouco tempo. Aguarde um minuto e tente novamente.' });
  }

  const validation = validateMatchRequest(req.body);
  if (!validation.ok) {
    return res.status(400).json({ error: validation.error });
  }

  if (!process.env.GEMINI_API_KEY) {
    return res.status(500).json({ error: 'Chave de API não configurada no servidor.' });
  }

  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

    const result = await classifyAction(validation.value, async (system, user) => {
      // Mesmo cast do /api/chat: a SDK tipa o schema diferente do que a API aceita.
      const model = genAI.getGenerativeModel({
        model: MODEL,
        systemInstruction: system,
        // Teto folgado de propósito: em modelos com "raciocínio", os tokens de raciocínio contam no limite de
        // saída — com um teto curto o JSON vinha cortado e toda frase livre virava "não entendi".
        generationConfig: { temperature: 0, responseMimeType: 'application/json', maxOutputTokens: 1024 },
      } as unknown as ModelParams);
      const response = await model.generateContent(user);
      const text = response.response.text();
      if (!text.trim()) console.warn('rpg-match: resposta vazia do modelo');
      return text;
    });

    return res.status(200).json(result);
  } catch (error) {
    console.error('Falha ao classificar a ação:', error);
    // Sem detalhes do erro para o cliente: o jogo cai no plano B (alternativas).
    return res.status(502).json({ error: 'Não foi possível interpretar a sua ação agora.' });
  }
}
