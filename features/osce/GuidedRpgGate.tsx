import React from 'react';
import { GuidedOsceStation } from '../../types';
import GuidedRpgView, { GuidedOsceAnalytics, TypedMatchInput } from './GuidedRpgView';
import ProtectedRoute from '../auth/ProtectedRoute';
import { matchTypedAction } from '../../services/rpgMatchService';
import type { MatchResult } from '../../utils/typedMatch';

interface GuidedRpgGateProps {
  station: GuidedOsceStation;
  onBack: () => void;
  onSaveResult?: (score: number, total: number, timeSpent: number, analytics: GuidedOsceAnalytics) => void;
  matchAction?: (input: TypedMatchInput) => Promise<MatchResult>; // injetável para teste
  // O formato vem do cartão que o aluno escolheu no menu: "RPG Guiado" (alternativas, sem IA e sem
  // login) ou "RPG com IA" (digitando a conduta). Sem informação, abre com alternativas.
  interaction?: 'choices' | 'typed';
}

// O MESMO caso guiado é jogado nos dois cartões. O modo digitado chama a IA a cada ação, então
// exige usuário logado — a <ProtectedRoute> mostra o login no lugar e libera o caso depois.
const GuidedRpgGate: React.FC<GuidedRpgGateProps> = ({ station, onBack, onSaveResult, matchAction = matchTypedAction, interaction = 'choices' }) => {
  if (interaction === 'typed') {
    return (
      <ProtectedRoute>
        <GuidedRpgView station={station} onBack={onBack} onSaveResult={onSaveResult} interaction="typed" matchAction={matchAction} />
      </ProtectedRoute>
    );
  }
  return <GuidedRpgView station={station} onBack={onBack} onSaveResult={onSaveResult} interaction="choices" />;
};

export default GuidedRpgGate;
