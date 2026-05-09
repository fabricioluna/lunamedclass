import React, { useMemo } from 'react';
import { SimulationInfo } from '../../types';
import { Lock, Unlock, ShieldAlert } from 'lucide-react';
import { PERIODS } from '../../constants'; // <-- IMPORT CORRIGIDO PARA PERIODS

/**
 * Interface rigorosa para controle granular de funcionalidades.
 * Reflete os módulos descritos no ecossistema Luna MedClass.
 */
interface AvailableFeature {
  id: 'quiz' | 'lab_osce' | 'materials' | 'references' | 'ai';
  label: string;
}

interface AdminDisciplinesProps {
  disciplines: SimulationInfo[];
  onToggleStatus: (disciplineId: string, currentStatus: 'active' | 'locked' | string) => Promise<void> | void;
  onToggleFeature: (disciplineId: string, featureId: string, isCurrentlyLocked: boolean) => Promise<void> | void;
}

// Constante movida para fora do componente para evitar re-alocação de memória
const AVAILABLE_FEATURES: AvailableFeature[] = [
  { id: 'quiz', label: 'Teórico' },
  { id: 'lab_osce', label: 'Prática' },
  { id: 'materials', label: 'Materiais' },
  { id: 'references', label: 'Referências' },
  { id: 'ai', label: 'IA (Paciente)' }
];

const AdminDisciplines: React.FC<AdminDisciplinesProps> = ({ 
  disciplines, 
  onToggleStatus, 
  onToggleFeature 
}) => {

  return (
    <div className="bg-white p-8 rounded-[2.5rem] border shadow-sm animate-in zoom-in duration-500">
      <div className="flex items-center gap-3 mb-2">
        <ShieldAlert className="text-[#003366]" size={28} />
        <h3 className="text-xl font-black text-[#003366] uppercase tracking-tighter">
          Controle de Acesso
        </h3>
      </div>
      <p className="text-sm text-gray-500 mb-8 font-medium">
        Bloqueie a disciplina inteira ou desligue funcionalidades específicas de cada módulo conforme as diretrizes pedagógicas.
      </p>

      <div className="space-y-8">
        {PERIODS.map(period => { // <-- ALTERADO PARA period
          const periodDiscs = disciplines.filter(d => d.periodId === period.id); // <-- ALTERADO PARA periodId
          if (periodDiscs.length === 0) return null;

          return (
            <div key={period.id} className="bg-gray-50 p-6 rounded-3xl border border-gray-100">
              <h4 className="text-lg font-black text-[#D4A017] mb-4 uppercase tracking-widest">
                {period.name}
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {periodDiscs.map(disc => {
                  const isLocked = disc.status === 'locked';
                  const lockedFeatures = disc.lockedFeatures || [];
                  
                  return (
                    <div 
                      key={disc.id} 
                      className={`flex flex-col p-4 rounded-2xl border bg-white transition-all duration-300 ${
                        isLocked 
                          ? 'border-red-200 shadow-sm' 
                          : 'border-emerald-200 shadow-md hover:shadow-lg'
                      }`}
                    >
                      {/* TOPO: CONTROLE TOTAL DO MÓDULO */}
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl transition-transform ${
                            isLocked ? 'bg-red-50 grayscale scale-95' : 'bg-emerald-50 scale-100'
                          }`}>
                            {disc.icon}
                          </div>
                          <div>
                            <p className={`font-bold text-xs truncate max-w-[120px] ${
                              isLocked ? 'text-gray-400' : 'text-[#003366]'
                            }`}>
                              {disc.title}
                            </p>
                            <p className={`text-[9px] font-black uppercase tracking-widest ${
                              isLocked ? 'text-red-500' : 'text-emerald-500'
                            }`}>
                              {isLocked ? 'Módulo Fechado' : 'Módulo Aberto'}
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => onToggleStatus(disc.id, disc.status)}
                          className={`p-2.5 rounded-xl transition-all active:scale-90 ${
                            isLocked 
                              ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' 
                              : 'bg-red-100 text-red-700 hover:bg-red-200'
                          }`}
                          title={isLocked ? 'Abrir Módulo Completo' : 'Fechar Módulo Completo'}
                        >
                          {isLocked ? <Unlock size={18} /> : <Lock size={18} />}
                        </button>
                      </div>

                      {/* BASE: CONTROLE GRANULAR DAS FUNCIONALIDADES */}
                      <div className={`border-t border-gray-100 pt-3 grid grid-cols-2 gap-2 transition-opacity duration-300 ${
                        isLocked ? 'opacity-40 pointer-events-none grayscale' : 'opacity-100'
                      }`}>
                        <div className="col-span-2 text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1">
                          Funcionalidades do Ecossistema
                        </div>
                        {AVAILABLE_FEATURES.map(feature => {
                          // A funcionalidade de IA (Luna Engine 2.0) é restrita a HM1 e HM2
                          if (feature.id === 'ai' && !['hm1', 'hm2'].includes(disc.id)) return null;

                          const isFeatureLocked = lockedFeatures.includes(feature.id);

                          return (
                            <button
                              key={feature.id}
                              onClick={() => onToggleFeature(disc.id, feature.id, isFeatureLocked)}
                              className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg border text-[9px] font-bold uppercase tracking-wider transition-all active:scale-95 ${
                                isFeatureLocked 
                                  ? 'bg-red-50 border-red-100 text-red-600 hover:bg-red-100' 
                                  : 'bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100'
                              }`}
                              title={isFeatureLocked ? 'Desbloquear Recurso' : 'Bloquear Recurso'}
                            >
                              <span>{feature.label}</span>
                              {isFeatureLocked 
                                ? <Lock size={10} className="text-red-500 animate-pulse" /> 
                                : <Unlock size={10} className="text-emerald-500" />
                              }
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default AdminDisciplines;