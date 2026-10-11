import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const authMock = vi.hoisted(() => ({ currentUser: null as null | { getIdToken: () => Promise<string> } }));
vi.mock('../firebase', () => ({ auth: authMock }));

import { matchTypedAction, MatchError } from './rpgMatchService';

const input = {
  narrative: 'Você está diante da porta.',
  options: ['Higienizar as mãos', 'Colocar a máscara cirúrgica', 'Abrir a porta'],
  text: 'lavo as mãos com álcool',
};

const resposta = (status: number, body: unknown = {}) => ({ ok: status >= 200 && status < 300, status, json: async () => body }) as Response;

const fetchMock = vi.fn();

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
  authMock.currentUser = { getIdToken: async () => 'id-token-do-aluno' };
});

afterEach(() => {
  vi.unstubAllGlobals();
});

const falha = async (promise: Promise<unknown>) => {
  try {
    await promise;
  } catch (error) {
    return error;
  }
  throw new Error('deveria ter falhado');
};

describe('matchTypedAction', () => {
  it('o texto igual a uma conduta se resolve localmente, sem rede e sem exigir login', async () => {
    authMock.currentUser = null;
    await expect(matchTypedAction({ ...input, text: 'Higienizar as mãos' })).resolves.toEqual({ kind: 'match', index: 0 });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('manda o texto, a narrativa e as condutas à API com o token do aluno', async () => {
    fetchMock.mockResolvedValue(resposta(200, { index: 0, multiple: false }));

    await expect(matchTypedAction(input)).resolves.toEqual({ kind: 'match', index: 0 });

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/rpg-match');
    expect(init.headers.Authorization).toBe('Bearer id-token-do-aluno');
    expect(JSON.parse(init.body)).toEqual({ narrative: input.narrative, options: input.options, text: 'lavo as mãos com álcool' });
  });

  it('corta o texto em 300 caracteres antes de enviar', async () => {
    fetchMock.mockResolvedValue(resposta(200, { index: null, multiple: false }));
    await matchTypedAction({ ...input, text: 'x'.repeat(500) });
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).text).toHaveLength(300);
  });

  it('devolve "várias ações" e "nenhuma conduta" conforme a API', async () => {
    fetchMock.mockResolvedValueOnce(resposta(200, { index: null, multiple: true }));
    await expect(matchTypedAction(input)).resolves.toEqual({ kind: 'multiple' });
    fetchMock.mockResolvedValueOnce(resposta(200, { index: null, multiple: false }));
    await expect(matchTypedAction(input)).resolves.toEqual({ kind: 'none' });
  });

  it('sem usuário logado falha com "login" e não chama a API', async () => {
    authMock.currentUser = null;
    const error = await falha(matchTypedAction(input));
    expect(error).toBeInstanceOf(MatchError);
    expect((error as MatchError).reason).toBe('login');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('401 vira "login", 429 vira "busy" e 5xx vira "unavailable"', async () => {
    fetchMock.mockResolvedValueOnce(resposta(401));
    expect(((await falha(matchTypedAction(input))) as MatchError).reason).toBe('login');
    fetchMock.mockResolvedValueOnce(resposta(429));
    expect(((await falha(matchTypedAction(input))) as MatchError).reason).toBe('busy');
    fetchMock.mockResolvedValueOnce(resposta(502));
    expect(((await falha(matchTypedAction(input))) as MatchError).reason).toBe('unavailable');
  });

  it('erro de rede e resposta que não é JSON viram "unavailable"', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'));
    expect(((await falha(matchTypedAction(input))) as MatchError).reason).toBe('unavailable');
    fetchMock.mockResolvedValueOnce({ ok: true, status: 200, json: async () => { throw new Error('não é json'); } } as unknown as Response);
    expect(((await falha(matchTypedAction(input))) as MatchError).reason).toBe('unavailable');
  });

  it('um índice absurdo na resposta é tratado como "nenhuma conduta"', async () => {
    fetchMock.mockResolvedValue(resposta(200, { index: 42, multiple: false }));
    await expect(matchTypedAction(input)).resolves.toEqual({ kind: 'none' });
  });
});
