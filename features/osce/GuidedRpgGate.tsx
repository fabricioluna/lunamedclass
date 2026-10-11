import React, { useState } from 'react';
import { GuidedOsceStation } from '../../types';
import GuidedRpgView, { GuidedOsceAnalytics, TypedMatchInput } from './GuidedRpgView';
import ProtectedRoute from '../auth/ProtectedRoute';
import { useAuth } from '../../contexts/AuthContext';
import { matchTypedAction } from '../../services/rpgMatchService';
import type { MatchResult } from '../../utils/typedMatch';
import { Keyboard, ListChecks, RotateCcw } from 'lucide-react';

interface GuidedRpgGateProps {
  station: GuidedOsceStation;
  onBack: () => void;
  onSaveResult?: (score: number, total: number, timeSpent: number, analytics: GuidedOsceAnalytics) => void;
  matchAction?: (input: TypedMatchInput) => Promise<MatchResult>; // injetável para teste
}

type Mode = 'choose' | 'choices' | 'typed';

// Porta de entrada do RPG guiado: o MESMO caso pode ser jogado com alternativas (aberto, sem login)
// ou digitando a conduta (mais difícil). O modo digitado chama a IA a cada ação, então exige
// usuário logado — a <ProtectedRoute> mostra o login no lugar e libera o caso depois.
const GuidedRpgGate: React.FC<GuidedRpgGateProps> = ({ station, onBack, onSaveResult, matchAction = matchTypedAction }) => {
  const [mode, setMode] = useState<Mode>('choose');
  const { currentUser } = useAuth();

  if (mode === 'choices') {
    return <GuidedRpgView station={station} onBack={onBack} onSaveResult={onSaveResult} interaction="choices" />;
  }

  if (mode === 'typed') {
    return (
      <ProtectedRoute>
        <GuidedRpgView station={station} onBack={onBack} onSaveResult={onSaveResult} interaction="typed" matchAction={matchAction} />
      </ProtectedRoute>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-12 animate-in fade-in zoom-in duration-500">
      <button onClick={onBack} className="group flex items-center text-[#003366] font-black uppercase text-[10px] mb-8 gap-2 hover:text-[#D4A017] transition-colors">
        <RotateCcw size={14} /> Sair do Caso
      </button>

      <div className="bg-white rounded-[2.5rem] p-8 md:p-12 shadow-2xl border border-gray-100">
        <div className="text-center mb-10 border-b pb-8">
          <div className="text-5xl mb-4">🎮</div>
          <p className="text-[10px] font-black text-[#D4A017] uppercase tracking-widest mb-2">{station.theme}</p>
          <h2 className="text-2xl md:text-3xl font-black text-[#003366] uppercase tracking-tighter">{station.title}</h2>
          <p className="text-gray-500 text-sm font-medium mt-4">{station.scenes.length} cenas · o mesmo caso nos dois modos</p>
        </div>

        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-6 text-center">Como você quer jogar?</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <button
            onClick={() => setMode('choices')}
            className="text-left bg-gray-50 hover:bg-white p-8 rounded-[2rem] border-2 border-transparent hover:border-[#D4A017] transition-all hover:shadow-xl group"
          >
            <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center mb-4"><ListChecks size={24} /></div>
            <h3 className="text-lg font-black text-[#003366] uppercase tracking-tight mb-2">Com alternativas</h3>
            <p className="text-xs text-gray-500 font-medium leading-relaxed">
              A cada cena você escolhe a conduta entre as opções. Bom para aprender a sequência. Não precisa de login.
            </p>
          </button>

          <button
            onClick={() => setMode('typed')}
            className="text-left bg-gray-50 hover:bg-white p-8 rounded-[2rem] border-2 border-transparent hover:border-[#D4A017] transition-all hover:shadow-xl group"
          >
            <div className="w-12 h-12 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center mb-4"><Keyboard size={24} /></div>
            <h3 className="text-lg font-black text-[#003366] uppercase tracking-tight mb-2 flex items-center gap-2 flex-wrap">
              Digitando a ação
              <span className="bg-purple-100 text-purple-700 text-[8px] font-black uppercase px-2 py-0.5 rounded border border-purple-200">mais difícil</span>
            </h3>
            <p className="text-xs text-gray-500 font-medium leading-relaxed">
              Sem alternativas: você descreve com as suas palavras o que faz, e o caso reage. Uma IA só interpreta o que você escreveu; a correção vem do roteiro. Dicas custam pontos.
            </p>
            {!currentUser && (
              <p className="text-[10px] font-black uppercase tracking-widest text-orange-600 mt-4">Exige login — você entra na próxima tela</p>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default GuidedRpgGate;
