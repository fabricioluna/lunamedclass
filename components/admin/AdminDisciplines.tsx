import React from 'react';
import { SimulationInfo } from '../../types';
import { Lock, Unlock } from 'lucide-react';
import { ROOMS } from '../../constants';

interface AdminDisciplinesProps {
  disciplines: SimulationInfo[];
  onToggleVisibility: (disciplineId: string, isHidden: boolean) => void;
}

const AdminDisciplines: React.FC<AdminDisciplinesProps> = ({ disciplines, onToggleVisibility }) => {
  return (
    <div className="bg-white p-8 rounded-[2.5rem] border shadow-sm animate-in zoom-in duration-500">
      <h3 className="text-xl font-black text-[#003366] mb-2 uppercase tracking-tighter">Controle de Acesso</h3>
      <p className="text-sm text-gray-500 mb-8 font-medium">Bloqueie ou libere o acesso dos alunos aos módulos de cada sala em tempo real.</p>

      <div className="space-y-8">
        {ROOMS.map(room => {
          const roomDiscs = disciplines.filter(d => d.roomId === room.id);
          if (roomDiscs.length === 0) return null;

          return (
            <div key={room.id} className="bg-gray-50 p-6 rounded-3xl border border-gray-100">
              <h4 className="text-lg font-black text-[#D4A017] mb-4 uppercase tracking-widest">{room.name}</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {roomDiscs.map(disc => (
                  <div key={disc.id} className={`flex items-center justify-between p-4 rounded-2xl border bg-white transition-all ${disc.isHidden ? 'border-red-200 shadow-sm' : 'border-emerald-200 shadow-md'}`}>
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl ${disc.isHidden ? 'bg-red-50 grayscale' : 'bg-emerald-50'}`}>
                        {disc.icon}
                      </div>
                      <div>
                        <p className={`font-bold text-xs truncate max-w-[120px] ${disc.isHidden ? 'text-gray-400' : 'text-[#003366]'}`}>{disc.title}</p>
                        <p className={`text-[9px] font-black uppercase tracking-widest ${disc.isHidden ? 'text-red-500' : 'text-emerald-500'}`}>
                          {disc.isHidden ? 'Bloqueado' : 'Liberado'}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => onToggleVisibility(disc.id, !!disc.isHidden)}
                      className={`p-2.5 rounded-xl transition-all ${disc.isHidden ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' : 'bg-red-100 text-red-700 hover:bg-red-200'}`}
                      title={disc.isHidden ? 'Liberar Módulo' : 'Bloquear Módulo'}
                    >
                      {disc.isHidden ? <Unlock size={18} /> : <Lock size={18} />}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default AdminDisciplines;