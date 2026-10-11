// Limitador de requisições em memória. Não é um limite distribuído (cada instância serverless da
// Vercel tem seu próprio estado, que zera em cold start) — é um teto suave contra abuso casual
// (script em loop, curl repetido), não uma garantia dura. Uma garantia dura exigiria um store
// externo (Vercel KV/Upstash), que precisa ser provisionado manualmente no dashboard da Vercel.

export interface RateLimitConfig {
  shortWindowMs: number;
  shortMax: number;
  longWindowMs: number;
  longMax: number;
  maxTracked: number;
}

// Cada endpoint cria o seu limitador: o /api/chat limita por IP; o /api/rpg-match limita por IP
// (teto folgado, porque uma sala inteira pode sair pelo mesmo IP) e por usuário (teto real).
export function createRateLimiter(config: RateLimitConfig) {
  const requestLog = new Map<string, number[]>();

  return function isLimited(key: string, now: number = Date.now()): boolean {
    const timestamps = (requestLog.get(key) ?? []).filter((t) => now - t < config.longWindowMs);

    const recentCount = timestamps.filter((t) => now - t < config.shortWindowMs).length;
    const limited = recentCount >= config.shortMax || timestamps.length >= config.longMax;

    if (!limited) {
      timestamps.push(now);
    }
    requestLog.set(key, timestamps);

    if (requestLog.size > config.maxTracked) {
      for (const [k, times] of requestLog) {
        if (times.length === 0 || now - times[times.length - 1] >= config.longWindowMs) {
          requestLog.delete(k);
        }
      }
    }

    return limited;
  };
}

// /api/chat: 10 por minuto e 60 por hora, por IP (valores originais, inalterados).
export const isRateLimited = createRateLimiter({
  shortWindowMs: 60_000,
  shortMax: 10,
  longWindowMs: 60 * 60_000,
  longMax: 60,
  maxTracked: 5000,
});

export function getClientIp(headers: Record<string, string | string[] | undefined>): string {
  const forwarded = headers['x-forwarded-for'];
  const value = Array.isArray(forwarded) ? forwarded[0] : forwarded;
  const firstIp = value?.split(',')[0]?.trim();
  return firstIp || 'unknown';
}
