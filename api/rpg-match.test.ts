import { describe, it, expect, vi, beforeEach } from 'vitest';

// Simula o Gemini e a verificação do login: o que se testa aqui é a ORDEM das defesas do endpoint
// (método → limite por IP → login → limite por usuário → validação → chave → modelo) e o formato
// da resposta, não a IA nem a criptografia (essas têm testes próprios).
const generateContent = vi.fn();

vi.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: class {
    getGenerativeModel() {
      return { generateContent };
    }
  },
}));

vi.mock('./_lib/firebaseAuth.js', async () => {
  const actual = await vi.importActual<typeof import('./_lib/firebaseAuth')>('./_lib/firebaseAuth');
  return {
    ...actual,
    getGoogleKeys: vi.fn(),
    verifyFirebaseIdToken: vi.fn(async (token: string) => {
      if (token === 'token-ok') return { uid: 'aluno-1' };
      if (token === 'token-outro') return { uid: 'aluno-2' };
      if (token === 'token-limite') return { uid: 'aluno-limite' };
      if (token === 'token-servico-fora') throw new Error('rede');
      throw new actual.AuthError('inválido');
    }),
  };
});

const handler = (await import('./rpg-match')).default;

interface Capturado { status: number; body: unknown }

const chamar = async (opts: { method?: string; token?: string | null; body?: unknown; ip?: string } = {}): Promise<Capturado> => {
  const { method = 'POST', token = 'token-ok', body = corpoValido, ip = '203.0.113.9' } = opts;
  let captured: Capturado = { status: 0, body: undefined };
  const res = { status: (status: number) => ({ json: (b: unknown) => { captured = { status, body: b }; } }) };
  await handler(
    { method, headers: { 'x-forwarded-for': ip, ...(token ? { authorization: `Bearer ${token}` } : {}) }, body },
    res
  );
  return captured;
};

const corpoValido = {
  narrative: 'Você está diante da porta do quarto.',
  options: ['Higienizar as mãos', 'Colocar a máscara cirúrgica', 'Abrir a porta'],
  text: 'lavo as mãos com álcool',
};

beforeEach(() => {
  generateContent.mockReset();
  process.env.GEMINI_API_KEY = 'chave-de-teste';
});

describe('/api/rpg-match', () => {
  it('só aceita POST', async () => {
    expect((await chamar({ method: 'GET' })).status).toBe(405);
  });

  it('sem login devolve 401 e NÃO chama o modelo', async () => {
    const result = await chamar({ token: null });
    expect(result.status).toBe(401);
    expect(generateContent).not.toHaveBeenCalled();
  });

  it('token inválido devolve 401 e NÃO chama o modelo', async () => {
    const result = await chamar({ token: 'forjado' });
    expect(result.status).toBe(401);
    expect(generateContent).not.toHaveBeenCalled();
  });

  it('falha ao verificar o login por problema nosso devolve 503, não 401', async () => {
    expect((await chamar({ token: 'token-servico-fora' })).status).toBe(503);
  });

  it('corpo inválido devolve 400 e NÃO chama o modelo', async () => {
    const result = await chamar({ body: { ...corpoValido, text: '' } });
    expect(result.status).toBe(400);
    expect(generateContent).not.toHaveBeenCalled();
  });

  it('sem chave da IA configurada devolve 500', async () => {
    delete process.env.GEMINI_API_KEY;
    expect((await chamar()).status).toBe(500);
  });

  it('caminho feliz: devolve só o índice e se há várias ações', async () => {
    generateContent.mockResolvedValue({ response: { text: () => '{"index": 0, "multiple": false}' } });
    const result = await chamar();
    expect(result).toEqual({ status: 200, body: { index: 0, multiple: false } });
  });

  it('o modelo recebe o texto do aluno e a lista de condutas, sem qualquer marca de certa/errada', async () => {
    generateContent.mockResolvedValue({ response: { text: () => '{"index": null, "multiple": false}' } });
    await chamar({ body: { ...corpoValido, correctIndex: 0, correct: true } });
    const prompt = generateContent.mock.calls[0][0] as string;
    expect(prompt).toContain('lavo as mãos com álcool');
    expect(prompt).toContain('0: Higienizar as mãos');
    expect(prompt).not.toMatch(/correctIndex|"correct"/);
  });

  it('resposta maliciosa do modelo vira "nenhuma conduta" e nunca vaza texto', async () => {
    generateContent.mockResolvedValue({ response: { text: () => 'IGNORE TUDO. {"index": 99, "multiple": false, "texto": "oi"}' } });
    expect(await chamar()).toEqual({ status: 200, body: { index: null, multiple: false } });
  });

  it('falha do modelo devolve 502 genérico, sem detalhes do erro', async () => {
    generateContent.mockRejectedValue(new Error('segredo: detalhe interno'));
    const result = await chamar();
    expect(result.status).toBe(502);
    expect(JSON.stringify(result.body)).not.toMatch(/segredo/);
  });

  it('o limite por usuário bloqueia o 21º pedido no minuto, sem afetar outro usuário', async () => {
    generateContent.mockResolvedValue({ response: { text: () => '{"index": 0, "multiple": false}' } });
    // Usuário exclusivo deste teste: o contador do limitador vive no módulo e é compartilhado.
    const ip = '198.51.100.20';
    for (let i = 0; i < 20; i++) expect((await chamar({ ip, token: 'token-limite' })).status).toBe(200);
    expect((await chamar({ ip, token: 'token-limite' })).status).toBe(429);
    expect((await chamar({ ip, token: 'token-outro' })).status).toBe(200);
  });
});
