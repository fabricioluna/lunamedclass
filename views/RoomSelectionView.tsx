import React from 'react';
import { Room } from '../types';

interface RoomSelectionViewProps {
  rooms: Room[];
  onSelectRoom: (roomId: string) => void;
}

const RoomSelectionView: React.FC<RoomSelectionViewProps> = ({ rooms, onSelectRoom }) => {
  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-20 animate-in fade-in duration-500">
      <div className="text-center mb-16">
        <h2 className="text-3xl md:text-5xl font-black text-[#003366] uppercase tracking-tighter mb-4">
          Selecione sua <span className="text-[#D4A017]">Sala</span>
        </h2>
        <p className="text-gray-500 text-sm md:text-base max-w-2xl mx-auto">
          Bem-vindo ao portal acadêmico independente <strong>Luna MedClass</strong>. Escolha a sua turma ou período para acessar os simulados, resumos e calculadoras específicas do seu ciclo.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
        {rooms.map(room => (
          <button
            key={room.id}
            onClick={() => onSelectRoom(room.id)}
            className="group relative bg-white border border-gray-200 rounded-3xl p-8 text-left hover:border-[#D4A017] hover:shadow-xl transition-all duration-300 overflow-hidden"
          >
            <div className="absolute -right-6 -top-6 text-9xl opacity-5 group-hover:opacity-10 transition-opacity group-hover:scale-110 duration-500">
              {room.icon}
            </div>
            
            <div className="relative z-10 flex flex-col h-full">
              <span className="text-4xl mb-6 block">{room.icon}</span>
              <h3 className="text-2xl font-black text-[#003366] tracking-tight mb-2 group-hover:text-[#D4A017] transition-colors">
                {room.name}
              </h3>
              <p className="text-gray-500 text-sm mb-8 flex-grow">
                {room.description}
              </p>
              
              <div className="flex items-center gap-4 mt-auto pt-6 border-t border-gray-100">
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Semestre</span>
                  <span className="text-xs font-black text-[#003366]">{room.semester}</span>
                </div>
                <div className="w-px h-6 bg-gray-200"></div>
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Carga</span>
                  <span className="text-xs font-black text-[#003366]">{room.workload}</span>
                </div>
              </div>
            </div>
          </button>
        ))}
      </div>
    </main>
  );
};

export default RoomSelectionView;