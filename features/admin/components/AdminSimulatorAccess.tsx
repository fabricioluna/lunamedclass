import React from 'react';
import { Lock, Unlock, Gamepad2 } from 'lucide-react';
import { AVAILABLE_SIMULATOR_TYPES } from '../../simulators/simulatorTypesConfig';
import { SimulatorLocks } from '../../../types';

interface AdminSimulatorAccessProps {
  simulatorLocks: SimulatorLocks;
  onToggleSimulatorLock: (slug: string, isLocked: boolean) => Promise<void> | void;
}

// Trava por TIPO de simulador (Paciente Virtual, OSCE RPG, OSCE Estático, os 4 Labs) — diferente
// da trava por disciplina abaixo: esta vale pro card em /simulators, visível a visitante
// deslogado (D6-style). Mesmo aviso da trava por disciplina: é curadoria de UI, não Security
// Rule — um aluno com o SDK do Firebase ainda lê o conteúdo por trás. Ver PLANO-REESTRUTURACAO.md.
const AdminSimulatorAccess: React.FC<AdminSimulatorAccessProps> = ({
  simulatorLocks,
  onToggleSimulatorLock,
}) => {
  return (
    <div className="bg-white p-8 rounded-[2.5rem] border shadow-sm animate-in zoom-in duration-500 mb-8">
      <div className="flex items-center gap-3 mb-2">
        <Gamepad2 className="text-[#003366]" size={28} />
        <h3 className="text-xl font-black text-[#003366] uppercase tracking-tighter">
          Acesso aos Simuladores (/simulators)
        </h3>
      </div>
      <p className="text-sm text-gray-500 mb-6 font-medium">
        Bloqueia o card do tipo de simulador na tela pública de navegação — visitante deslogado já
        vê o card desabilitado, e o link direto pra qualquer disciplina desse tipo para de
        funcionar mesmo pra aluno logado. Não afeta os outros tipos.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {AVAILABLE_SIMULATOR_TYPES.map((type) => {
          const isLocked = simulatorLocks[type.slug] === true;
          return (
            <button
              key={type.slug}
              onClick={() => onToggleSimulatorLock(type.slug, !isLocked)}
              className={`flex items-center justify-between gap-3 p-4 rounded-2xl border-2 text-left transition-all ${
                isLocked
                  ? 'bg-red-50 border-red-200 hover:border-red-300'
                  : 'bg-green-50 border-green-200 hover:border-green-300'
              }`}
            >
              <span className="text-xs font-black text-[#003366] uppercase tracking-tight leading-tight">
                {type.title}
              </span>
              {isLocked ? (
                <Lock className="text-red-500 shrink-0" size={18} />
              ) : (
                <Unlock className="text-green-600 shrink-0" size={18} />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default AdminSimulatorAccess;
