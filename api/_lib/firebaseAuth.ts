import { createPublicKey, verify as cryptoVerify } from 'node:crypto';

// Verificação do ID token do Firebase Auth no servidor, SEM firebase-admin e sem segredo: o token é
// um JWT RS256 assinado pelo Google, e as chaves públicas são abertas. Verifica assinatura,
// emissor, audiência (o projeto) e validade — o que a documentação do Firebase manda checar.
//
// Por que existe: /api/chat nunca teve controle de acesso (só limite por IP — ver CLAUDE.md).
// Endpoints novos que chamam a IA (hoje /api/rpg-match) exigem usuário logado por aqui.

export interface GoogleJwk {
  kid: string;
  kty: string;
  n: string;
  e: string;
  alg?: string;
  use?: string;
}

export interface VerifyOptions {
  projectId: string;
  getKeys: (forceRefresh?: boolean) => Promise<GoogleJwk[]>;
  now?: number; // ms — injetável para teste
}

export interface VerifiedUser {
  uid: string;
  email?: string;
}

export class AuthError extends Error {}

const MAX_CLOCK_SKEW_S = 300;

const decodeJson = (part: string): Record<string, unknown> => {
  try {
    const value = JSON.parse(Buffer.from(part, 'base64url').toString('utf8')) as unknown;
    if (typeof value !== 'object' || value === null || Array.isArray(value)) throw new Error();
    return value as Record<string, unknown>;
  } catch {
    throw new AuthError('Token malformado.');
  }
};

export async function verifyFirebaseIdToken(token: string, { projectId, getKeys, now = Date.now() }: VerifyOptions): Promise<VerifiedUser> {
  const parts = token.split('.');
  if (parts.length !== 3 || parts.some((p) => p.length === 0)) throw new AuthError('Token malformado.');
  const [headerPart, payloadPart, signaturePart] = parts;

  const header = decodeJson(headerPart);
  const payload = decodeJson(payloadPart);

  if (header.alg !== 'RS256') throw new AuthError('Algoritmo não aceito.');
  if (typeof header.kid !== 'string') throw new AuthError('Token sem kid.');

  // Chave desconhecida pode ser rotação do Google: tenta uma vez com a lista renovada.
  let key = (await getKeys()).find((k) => k.kid === header.kid);
  if (!key) key = (await getKeys(true)).find((k) => k.kid === header.kid);
  if (!key) throw new AuthError('Chave de assinatura desconhecida.');

  const validSignature = cryptoVerify(
    'RSA-SHA256',
    Buffer.from(`${headerPart}.${payloadPart}`),
    createPublicKey({ key: { kty: key.kty, n: key.n, e: key.e }, format: 'jwk' }),
    Buffer.from(signaturePart, 'base64url')
  );
  if (!validSignature) throw new AuthError('Assinatura inválida.');

  const nowS = Math.floor(now / 1000);
  const { exp, iat, auth_time: authTime, aud, iss, sub, email } = payload;

  if (typeof exp !== 'number' || exp <= nowS) throw new AuthError('Token expirado.');
  if (typeof iat !== 'number' || iat > nowS + MAX_CLOCK_SKEW_S) throw new AuthError('Token emitido no futuro.');
  if (typeof authTime === 'number' && authTime > nowS + MAX_CLOCK_SKEW_S) throw new AuthError('Autenticação no futuro.');
  if (aud !== projectId) throw new AuthError('Audiência incorreta.');
  if (iss !== `https://securetoken.google.com/${projectId}`) throw new AuthError('Emissor incorreto.');
  if (typeof sub !== 'string' || sub.length === 0 || sub.length > 128) throw new AuthError('Token sem usuário.');

  return { uid: sub, email: typeof email === 'string' ? email : undefined };
}

// --- Chaves públicas do Google, com cache em memória respeitando o max-age da resposta ---------

const GOOGLE_JWKS_URL = 'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com';
const DEFAULT_TTL_MS = 60 * 60_000;

let cachedKeys: { keys: GoogleJwk[]; expiresAt: number } | null = null;

export async function getGoogleKeys(forceRefresh = false, now: number = Date.now()): Promise<GoogleJwk[]> {
  if (!forceRefresh && cachedKeys && cachedKeys.expiresAt > now) return cachedKeys.keys;

  const response = await fetch(GOOGLE_JWKS_URL);
  if (!response.ok) throw new Error(`Falha ao buscar as chaves do Google: HTTP ${response.status}`);

  const body = (await response.json()) as { keys?: GoogleJwk[] };
  const keys = Array.isArray(body.keys) ? body.keys : [];
  const maxAge = /max-age=(\d+)/.exec(response.headers.get('cache-control') ?? '')?.[1];

  cachedKeys = { keys, expiresAt: now + (maxAge ? Number(maxAge) * 1000 : DEFAULT_TTL_MS) };
  return keys;
}

export const bearerToken = (header: string | string[] | undefined): string | null => {
  const value = Array.isArray(header) ? header[0] : header;
  const match = /^Bearer\s+(\S+)$/i.exec(value ?? '');
  return match ? match[1] : null;
};
