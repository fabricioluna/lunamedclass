import type { UserProfile } from '../services/authService';

// users/{uid}.role é decorativo (D5) e pode ficar defasado — ex.: perfil recriado como 'student'
// no primeiro login pós-migração. Quem manda é o Custom Claim `admin` no ID token, então a UI
// (Header, fluxo de períodos) enxerga o role já reconciliado com ele.
export const withClaimRole = (profile: UserProfile, isAdminClaim: boolean): UserProfile =>
  isAdminClaim && profile.role !== 'admin' ? { ...profile, role: 'admin' } : profile;
