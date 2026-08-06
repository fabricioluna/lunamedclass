// Limitador de requisições em memória, por IP. Não é um limite distribuído (cada
// instância serverless da Vercel tem seu próprio estado, que zera em cold start) — é um
// teto suave contra abuso casual (script em loop, curl repetido), não uma garantia dura.
// Uma garantia dura exigiria um store externo (Vercel KV/Upstash), que precisa ser
// provisionado manualmente no dashboard da Vercel — fora do escopo deste item.

const SHORT_WINDOW_MS = 60_000;
const SHORT_WINDOW_MAX = 10;
const LONG_WINDOW_MS = 60 * 60_000;
const LONG_WINDOW_MAX = 60;

const MAX_TRACKED_IPS = 5000;

const requestLog = new Map<string, number[]>();

export function isRateLimited(ip: string, now: number = Date.now()): boolean {
  const timestamps = (requestLog.get(ip) ?? []).filter((t) => now - t < LONG_WINDOW_MS);

  const recentCount = timestamps.filter((t) => now - t < SHORT_WINDOW_MS).length;
  const limited = recentCount >= SHORT_WINDOW_MAX || timestamps.length >= LONG_WINDOW_MAX;

  if (!limited) {
    timestamps.push(now);
  }
  requestLog.set(ip, timestamps);

  if (requestLog.size > MAX_TRACKED_IPS) {
    for (const [key, times] of requestLog) {
      if (times.length === 0 || now - times[times.length - 1] >= LONG_WINDOW_MS) {
        requestLog.delete(key);
      }
    }
  }

  return limited;
}

export function getClientIp(headers: Record<string, string | string[] | undefined>): string {
  const forwarded = headers['x-forwarded-for'];
  const value = Array.isArray(forwarded) ? forwarded[0] : forwarded;
  const firstIp = value?.split(',')[0]?.trim();
  return firstIp || 'unknown';
}
