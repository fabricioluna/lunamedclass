import type { AcademicUnit } from '../types';

// Travas de funcionalidade por disciplina (aba "Acessos" do admin), agora com granularidade de
// unidade — item 6.8. Antes o bloqueio valia para N1 e N2 simetricamente, o que impedia o caso
// real do usuário: liberar o conteúdo da N1 no começo do semestre e manter a N2 fechada.
//
// Codificação dentro do MESMO array `SimulationInfo.lockedFeatures`, sem migração de dados:
//   "quiz"      → bloqueado em todas as unidades (é também o formato legado)
//   "quiz:N1"   → bloqueado só na N1
// Um documento gravado antes desta mudança continua sendo lido corretamente como "bloqueia
// tudo", que era exatamente o significado que ele tinha.

export const ALL_UNITS: AcademicUnit[] = ['N1', 'N2'];

const scopedKey = (featureId: string, unit: AcademicUnit) => `${featureId}:${unit}`;

// `unit` ausente = disciplina sem divisão de unidade (UC): só a trava global vale.
export function isFeatureLocked(
  lockedFeatures: string[] | undefined,
  featureId: string,
  unit?: AcademicUnit | null,
): boolean {
  const locks = lockedFeatures ?? [];
  if (locks.includes(featureId)) return true;
  if (!unit) return false;
  return locks.includes(scopedKey(featureId, unit));
}

export type FeatureLockState = 'all' | 'none' | 'partial';

export function getFeatureLockState(
  lockedFeatures: string[] | undefined,
  featureId: string,
  allUnits: AcademicUnit[] = ALL_UNITS,
): FeatureLockState {
  const lockedUnits = allUnits.filter((unit) => isFeatureLocked(lockedFeatures, featureId, unit));
  if (lockedUnits.length === 0) return 'none';
  if (lockedUnits.length === allUnits.length) return 'all';
  return 'partial';
}

// Liga/desliga a trava de uma funcionalidade num escopo. `scope: 'all'` mexe nas duas unidades
// de uma vez; uma unidade específica preserva a outra como está.
export function setFeatureLock(
  lockedFeatures: string[] | undefined,
  featureId: string,
  scope: AcademicUnit | 'all',
  shouldLock: boolean,
  allUnits: AcademicUnit[] = ALL_UNITS,
): string[] {
  const locks = lockedFeatures ?? [];
  // Tira qualquer registro desta funcionalidade (global ou por unidade) e reconstrói do zero —
  // evita ficar com "quiz" e "quiz:N1" ao mesmo tempo, estados que se contradizem.
  const others = locks.filter((entry) => entry !== featureId && !entry.startsWith(`${featureId}:`));

  if (scope === 'all') {
    return shouldLock ? [...others, featureId] : others;
  }

  // Destravar UMA unidade quando a trava era global exige expandir o global nas demais antes,
  // senão desbloquear a N1 desbloquearia a N2 junto, sem o admin pedir.
  const lockedUnits = new Set(allUnits.filter((unit) => isFeatureLocked(locks, featureId, unit)));
  if (shouldLock) lockedUnits.add(scope);
  else lockedUnits.delete(scope);

  if (lockedUnits.size === 0) return others;
  // Todas travadas volta à forma global: 1 entrada em vez de N, e mantém o dado legível no banco.
  if (lockedUnits.size === allUnits.length) return [...others, featureId];

  return [...others, ...allUnits.filter((unit) => lockedUnits.has(unit)).map((unit) => scopedKey(featureId, unit))];
}
