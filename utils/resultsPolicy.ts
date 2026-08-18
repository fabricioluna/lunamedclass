import { QuizResult } from '../types';

// Decisão "por enquanto" (2026-08-06, com o usuário): só Simulado Teórico contava pra
// nota/estatística/pesquisa. Lab e OSCE (estático/RPG/IA) ficaram de fora até a confiabilidade
// desses modos ser revisada. Reversível: adicionar o tipo de volta em COUNTED_RESULT_TYPES
// (e religar OSCE_ANALYTICS_ENABLED, abaixo).
//
// Revisto em 2026-08-18 (item 6.5): `laboratorio` VOLTA A CONTAR, porque o usuário testou os
// flashcards e não achou o desempenho no dashboard — o Lab agora grava **1 resultado por
// sessão** de flashcards (não 1 por lâmina; ver D11 no PLANO: 1 doc por lâmina daria ~4.000
// leituras por abertura do dashboard num semestre). OSCE segue fora.
export const COUNTED_RESULT_TYPES: NonNullable<QuizResult['type']>[] = ['teorico', 'laboratorio'];

export const isCountedResultType = (type?: QuizResult['type']): boolean =>
  !!type && COUNTED_RESULT_TYPES.includes(type);

// features/admin/components/AdminAnalytics.tsx ("Research Analytics") é 100% dados de OSCE —
// como OSCE não conta mais resultado, a tela inteira fica desativada por enquanto.
export const OSCE_ANALYTICS_ENABLED = false;
