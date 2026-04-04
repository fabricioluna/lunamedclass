import React from 'react';
import DisciplineCard from '../components/DisciplineCard';
import { SimulationInfo, Room } from '../types';
import { Lock } from 'lucide-react'; // <-- IMPORTAÇÃO DO ÍCONE DE CADEADO

interface HomeViewProps {
  room: Room;
  disciplines: SimulationInfo[];
  onSelectDiscipline: (id: string) => void;
}

const HomeView: React.FC<HomeViewProps> = ({ room, disciplines, onSelectDiscipline }) => {
  const activeDisciplines = disciplines.filter(s => s.status === 'active' || s.status === 'coming-soon');
  const otherDisciplines = disciplines.filter(s => s.status === 'locked');

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-16 border-b border-gray-200 pb-10 gap-6">
        <div className="text-left flex-1">
          <div className="inline-block bg-[#003366]/10 text-[#003366] px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest mb-3">
            {room.icon} Portal Acadêmico
          </div>
          <h2 className="text-3xl md:text-4xl font-black text-[#003366] uppercase tracking-tighter">
            {room.name}
          </h2>
          <p className="text-gray-500 text-sm mt-2 max-w-xl">
            {room.description}
          </p>
        </div>
        <div className="flex items-center space-x-6 bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex-shrink-0">
          <div className="text-center">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Carga Semestral</p>
            <p className="text-xl font-black text-[#003366]">{room.workload}</p>
          </div>
          <div className="h-10 w-px bg-gray-200"></div>
          <div className="text-center px-2">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Semestre</p>
            <p className="text-xs font-black text-[#D4A017] uppercase italic">{room.semester}</p>
          </div>
        </div>
      </div>

      <div className="mb-12">
        {activeDisciplines.length === 0 ? (
          <div className="text-center py-10 bg-white rounded-2xl border border-gray-100 shadow-sm">
            <p className="text-gray-400 font-medium">Nenhuma disciplina ativa encontrada nesta sala.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {activeDisciplines.map(disc => (
              <div key={disc.id} className={`relative transition-all duration-300 ${disc.isHidden ? 'opacity-60 grayscale' : ''}`}>
                
                {/* O card fica insensível a cliques se estiver bloqueado */}
                <div className={disc.isHidden ? 'pointer-events-none' : ''}>
                  <DisciplineCard info={disc} onSelect={onSelectDiscipline} />
                </div>

                {/* Película de bloqueio por cima do card */}
                {disc.isHidden && (
                  <div
                    className="absolute inset-0 z-10 flex items-center justify-center cursor-not-allowed rounded-[2.5rem]"
                    onClick={() => alert("Este módulo está temporariamente bloqueado pela administração.")}
                  >
                    <div className="bg-red-500/90 backdrop-blur-sm text-white px-4 py-2 rounded-full text-xs font-black uppercase tracking-widest shadow-2xl flex items-center gap-2">
                      <Lock size={16} /> Bloqueado
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {otherDisciplines.length > 0 && (
        <div className="mt-20">
          <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.3em] mb-8">Conteúdo Longitudinal</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {otherDisciplines.map(disc => (
              <DisciplineCard key={disc.id} info={disc} onSelect={() => {}} />
            ))}
          </div>
        </div>
      )}

      <section className="bg-[#003366] p-10 rounded-[2.5rem] shadow-2xl mt-20 text-white relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 text-9xl opacity-10">🌙</div>
        <div className="relative z-10">
          <h4 className="font-black text-2xl mb-4 tracking-tight uppercase italic">LUNA <span className="text-[#D4A017]">MEDCLASS</span></h4>
          <p className="text-blue-100 text-sm leading-relaxed max-w-3xl font-light">
            O portal <strong>Luna MedClass</strong> foca na <strong>prática deliberada</strong>. Recomendamos que você utilize os simulados como ferramenta de diagnóstico: identifique suas lacunas de conhecimento e use os <strong>resumos compartilhados</strong> para reforçar o aprendizado colaborativo.
          </p>
        </div>
      </section>
    </main>
  );
};

export default HomeView;