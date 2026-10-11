import { describe, it, expect } from 'vitest';
import { generateKeyPairSync, sign } from 'node:crypto';
import { verifyFirebaseIdToken, AuthError, bearerToken, GoogleJwk } from './firebaseAuth';

const PROJECT = 'projeto-teste';
const NOW = 1_800_000_000_000; // ms

const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
const { privateKey: outroPrivate } = generateKeyPairSync('rsa', { modulusLength: 2048 });
const publicJwk = publicKey.export({ format: 'jwk' }) as { kty: string; n: string; e: string };
const keys: GoogleJwk[] = [{ kid: 'k1', kty: publicJwk.kty, n: publicJwk.n, e: publicJwk.e }];

const b64 = (value: unknown) => Buffer.from(JSON.stringify(value)).toString('base64url');

const makeToken = (
  claims: Record<string, unknown> = {},
  { kid = 'k1', alg = 'RS256', key = privateKey }: { kid?: string; alg?: string; key?: typeof privateKey } = {}
) => {
  const nowS = NOW / 1000;
  const payload = { iss: `https://securetoken.google.com/${PROJECT}`, aud: PROJECT, sub: 'uid-123', iat: nowS - 60, exp: nowS + 3600, auth_time: nowS - 60, email: 'aluno@exemplo.com', ...claims };
  const signingInput = `${b64({ alg, kid, typ: 'JWT' })}.${b64(payload)}`;
  const signature = sign('RSA-SHA256', Buffer.from(signingInput), key).toString('base64url');
  return `${signingInput}.${signature}`;
};

const options = { projectId: PROJECT, getKeys: async () => keys, now: NOW };

describe('verifyFirebaseIdToken', () => {
  it('aceita um token válido e devolve uid e e-mail', async () => {
    await expect(verifyFirebaseIdToken(makeToken(), options)).resolves.toEqual({ uid: 'uid-123', email: 'aluno@exemplo.com' });
  });

  it('recusa token expirado', async () => {
    const token = makeToken({ exp: NOW / 1000 - 10 });
    await expect(verifyFirebaseIdToken(token, options)).rejects.toThrow(/expirado/);
  });

  it('recusa audiência de outro projeto', async () => {
    await expect(verifyFirebaseIdToken(makeToken({ aud: 'outro-projeto' }), options)).rejects.toThrow(/Audiência/);
  });

  it('recusa emissor incorreto', async () => {
    await expect(verifyFirebaseIdToken(makeToken({ iss: 'https://evil.example.com' }), options)).rejects.toThrow(/Emissor/);
  });

  it('recusa token assinado com outra chave (assinatura falsificada)', async () => {
    await expect(verifyFirebaseIdToken(makeToken({}, { key: outroPrivate }), options)).rejects.toThrow(/Assinatura/);
  });

  it('recusa quando o conteúdo é alterado depois de assinado', async () => {
    const [h, , s] = makeToken().split('.');
    const forjado = `${h}.${b64({ iss: `https://securetoken.google.com/${PROJECT}`, aud: PROJECT, sub: 'admin', iat: NOW / 1000 - 60, exp: NOW / 1000 + 3600 })}.${s}`;
    await expect(verifyFirebaseIdToken(forjado, options)).rejects.toThrow(/Assinatura/);
  });

  it('recusa algoritmo diferente de RS256 (inclui "none")', async () => {
    await expect(verifyFirebaseIdToken(makeToken({}, { alg: 'HS256' }), options)).rejects.toThrow(/Algoritmo/);
    const semAssinatura = `${b64({ alg: 'none', kid: 'k1' })}.${b64({ sub: 'x' })}.assinatura`;
    await expect(verifyFirebaseIdToken(semAssinatura, options)).rejects.toThrow(AuthError);
  });

  it('recusa kid desconhecido, tentando antes renovar as chaves uma vez', async () => {
    const chamadas: boolean[] = [];
    const getKeys = async (force?: boolean) => { chamadas.push(!!force); return keys; };
    await expect(verifyFirebaseIdToken(makeToken({}, { kid: 'desconhecido' }), { ...options, getKeys })).rejects.toThrow(/desconhecida/);
    expect(chamadas).toEqual([false, true]);
  });

  it('aceita kid que só aparece depois da renovação (rotação de chaves do Google)', async () => {
    let renovou = false;
    const getKeys = async (force?: boolean) => { if (force) renovou = true; return renovou ? keys : []; };
    await expect(verifyFirebaseIdToken(makeToken(), { ...options, getKeys })).resolves.toMatchObject({ uid: 'uid-123' });
  });

  it('recusa token sem usuário e token emitido no futuro', async () => {
    await expect(verifyFirebaseIdToken(makeToken({ sub: '' }), options)).rejects.toThrow(/usuário/);
    await expect(verifyFirebaseIdToken(makeToken({ iat: NOW / 1000 + 4000 }), options)).rejects.toThrow(/futuro/);
  });

  it('recusa lixo que não é JWT', async () => {
    await expect(verifyFirebaseIdToken('isto-nao-e-um-token', options)).rejects.toThrow(/malformado/);
    await expect(verifyFirebaseIdToken('a.b.c', options)).rejects.toThrow(AuthError);
  });
});

describe('bearerToken', () => {
  it('extrai o token do cabeçalho Authorization', () => {
    expect(bearerToken('Bearer abc.def.ghi')).toBe('abc.def.ghi');
    expect(bearerToken('bearer xyz')).toBe('xyz');
  });

  it('devolve null quando o cabeçalho falta ou não é Bearer', () => {
    expect(bearerToken(undefined)).toBeNull();
    expect(bearerToken('Basic abc')).toBeNull();
    expect(bearerToken('Bearer ')).toBeNull();
  });
});
