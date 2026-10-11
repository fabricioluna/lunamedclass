import { describe, it, expect } from 'vitest';
import { isRateLimited, getClientIp, createRateLimiter } from './rateLimit';

describe('createRateLimiter', () => {
  const limiter = () => createRateLimiter({ shortWindowMs: 1000, shortMax: 3, longWindowMs: 10_000, longMax: 5, maxTracked: 100 });

  it('cada limitador tem o seu próprio contador', () => {
    const a = limiter();
    const b = limiter();
    for (let i = 0; i < 3; i++) a('chave', 1000 + i);
    expect(a('chave', 1010)).toBe(true);
    expect(b('chave', 1010)).toBe(false);
  });

  it('respeita os limites configurados (curto e longo)', () => {
    const l = limiter();
    for (let i = 0; i < 3; i++) expect(l('u', 5000 + i)).toBe(false);
    expect(l('u', 5003)).toBe(true);
    // depois da janela curta libera, mas o teto da janela longa (5) vale
    expect(l('u', 6500)).toBe(false);
    expect(l('u', 6501)).toBe(false);
    expect(l('u', 8000)).toBe(true);
  });

  it('o limitador do /api/chat continua com os valores de sempre (10 por minuto)', () => {
    const now = Date.now();
    for (let i = 0; i < 10; i++) isRateLimited('chat-compat', now + i);
    expect(isRateLimited('chat-compat', now + 10)).toBe(true);
  });
});

describe('isRateLimited', () => {
  it('libera as primeiras 10 requisições de um IP na mesma janela curta', () => {
    const ip = 'janela-curta-ok';
    const now = Date.now();
    for (let i = 0; i < 10; i++) {
      expect(isRateLimited(ip, now + i)).toBe(false);
    }
  });

  it('bloqueia a 11ª requisição dentro de 60s', () => {
    const ip = 'janela-curta-estoura';
    const now = Date.now();
    for (let i = 0; i < 10; i++) {
      isRateLimited(ip, now + i);
    }
    expect(isRateLimited(ip, now + 10)).toBe(true);
  });

  it('libera de novo depois que a janela curta expira', () => {
    const ip = 'janela-curta-expira';
    const now = Date.now();
    for (let i = 0; i < 10; i++) {
      isRateLimited(ip, now + i);
    }
    expect(isRateLimited(ip, now + 61_000)).toBe(false);
  });

  it('bloqueia pelo teto da janela longa mesmo respeitando a janela curta', () => {
    const ip = 'janela-longa-estoura';
    const now = Date.now();
    // 6 rajadas de 10 requisições, uma por minuto: 60 no total, no teto da janela de 1h
    for (let burst = 0; burst < 6; burst++) {
      for (let i = 0; i < 10; i++) {
        isRateLimited(ip, now + burst * 60_000 + i);
      }
    }
    expect(isRateLimited(ip, now + 6 * 60_000)).toBe(true);
  });

  it('IPs diferentes não compartilham contador', () => {
    const now = Date.now();
    for (let i = 0; i < 10; i++) {
      isRateLimited('ip-a', now + i);
    }
    expect(isRateLimited('ip-b', now)).toBe(false);
  });
});

describe('getClientIp', () => {
  it('extrai o primeiro IP de x-forwarded-for com múltiplos proxies', () => {
    expect(getClientIp({ 'x-forwarded-for': '203.0.113.5, 10.0.0.1' })).toBe('203.0.113.5');
  });

  it('aceita x-forwarded-for como array (alguns runtimes normalizam assim)', () => {
    expect(getClientIp({ 'x-forwarded-for': ['198.51.100.7'] })).toBe('198.51.100.7');
  });

  it('cai para "unknown" quando o header não existe', () => {
    expect(getClientIp({})).toBe('unknown');
  });
});
