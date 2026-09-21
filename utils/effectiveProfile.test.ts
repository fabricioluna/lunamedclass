import { describe, it, expect } from 'vitest';
import { withClaimRole } from './effectiveProfile';
import type { UserProfile } from '../services/authService';

const baseProfile: UserProfile = {
  uid: 'u1',
  displayName: 'Fulano',
  email: 'fulano@example.com',
  photoURL: null,
  role: 'student',
  periodId: 'p1',
  createdAt: '2026-01-01T00:00:00.000Z',
  lastLogin: '2026-01-01T00:00:00.000Z',
};

describe('withClaimRole', () => {
  it('promove a admin quando o claim existe, mesmo com role "student" no documento', () => {
    expect(withClaimRole(baseProfile, true).role).toBe('admin');
  });

  it('não rebaixa nem altera nada quando não há claim', () => {
    expect(withClaimRole(baseProfile, false)).toBe(baseProfile);
  });

  it('preserva os demais campos ao promover', () => {
    const result = withClaimRole(baseProfile, true);
    expect(result).toEqual({ ...baseProfile, role: 'admin' });
  });
});
