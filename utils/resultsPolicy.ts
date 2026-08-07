import { QuizResult } from '../types';

// Decisão "por enquanto" (2026-08-06, com o usuário): só Simulado Teórico conta pra
// nota/estatística/pesquisa. Lab, OSCE (estático/RPG/IA) ficam de fora até a confiabilidade
// desses modos ser revisada. Reversível: adicionar o tipo de volta em COUNTED_RESULT_TYPES
// (e religar OSCE_ANALYTICS_ENABLED, abaixo).
export const COUNTED_RESULT_TYPES: NonNullable<QuizResult['type']>[] = ['teorico'];

export const isCountedResultType = (type?: QuizResult['type']): boolean =>
  !!type && COUNTED_RESULT_TYPES.includes(type);

// features/admin/components/AdminAnalytics.tsx ("Research Analytics") é 100% dados de OSCE —
// como OSCE não conta mais resultado, a tela inteira fica desativada por enquanto.
export const OSCE_ANALYTICS_ENABLED = false;
