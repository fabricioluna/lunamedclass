import type { UserProfile } from '../services/authService';

// Regra de negócio pura da trava de período em routes/AppRoutes.tsx (lição do 5.2: closure
// dentro de componente não é testável isoladamente).
//
// Só `role === 'student'` é travado por período — admin/professor sempre navegam livre (mesmo
// comportamento de antes desta função existir). Um aluno sem periodId ainda (onboarding)
// também não é travado. Fora isso, o aluno só acessa o próprio periodId ou um período extra
// liberado por um admin em extraPeriodIds (ex.: aluno que também monitora outro período).
export const canAccessPeriod = (
  profile: Pick<UserProfile, 'role' | 'periodId' | 'extraPeriodIds'> | null | undefined,
  periodId: string
): boolean => {
  if (!profile || profile.role !== 'student') return true;
  if (!profile.periodId) return true;
  if (profile.periodId === periodId) return true;
  return !!profile.extraPeriodIds?.includes(periodId);
};
