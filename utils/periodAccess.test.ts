import { describe, it, expect } from 'vitest';
import { canAccessPeriod } from './periodAccess';
import type { UserProfile } from '../services/authService';

const student = (patch: Partial<UserProfile> = {}): UserProfile => ({
  uid: 'u1',
  displayName: 'Fulano',
  email: 'fulano@example.com',
  photoURL: null,
  role: 'student',
  periodId: 'p1',
  createdAt: '2026-01-01T00:00:00.000Z',
  lastLogin: '2026-01-01T00:00:00.000Z',
  ...patch,
});

describe('canAccessPeriod', () => {
  it('libera o próprio período', () => {
    expect(canAccessPeriod(student({ periodId: 'p1' }), 'p1')).toBe(true);
  });

  it('bloqueia outro período por padrão', () => {
    expect(canAccessPeriod(student({ periodId: 'p1' }), 'p2')).toBe(false);
  });

  it('libera período extra concedido por um admin', () => {
    expect(canAccessPeriod(student({ periodId: 'p1', extraPeriodIds: ['p2'] }), 'p2')).toBe(true);
  });

  it('continua bloqueando período que não é nem o próprio nem um extra', () => {
    expect(canAccessPeriod(student({ periodId: 'p1', extraPeriodIds: ['p2'] }), 'p3')).toBe(false);
  });

  it('não trava aluno sem periodId ainda (onboarding)', () => {
    expect(canAccessPeriod(student({ periodId: undefined }), 'p2')).toBe(true);
  });

  it('não trava admin', () => {
    expect(canAccessPeriod(student({ role: 'admin', periodId: 'p1' }), 'p2')).toBe(true);
  });

  it('não trava professor', () => {
    expect(canAccessPeriod(student({ role: 'professor', periodId: 'p1' }), 'p2')).toBe(true);
  });

  it('não trava quando não há perfil (visitante)', () => {
    expect(canAccessPeriod(null, 'p2')).toBe(true);
  });
});
