import React from 'react';
import { Microscope, Play, User } from 'lucide-react';
import { LabSimulation, SimulationInfo } from '../types.ts';

interface Props {
  disciplineId: string;
  simulations: LabSimulation[];
  disciplines: SimulationInfo[];
  onStart: (sim: LabSimulation) => void;
}

const LabListView: React.FC<Props> = ({ disciplineId, simulations, disciplines, onStart }) => {
  const discipline = disciplines.find(d => d.id === disciplineId);
  const filtered = simulations.filter(s => s.disciplineId === disciplineId);

  return (
    <div className="max-w-5xl mx-auto px-4 py-12 animate-in fade-in slide-in-from-bottom-8 duration-700">
      <div className="text-center mb-12">
        <div className="w-20 h-20 bg-[#003366]/5 rounded-3xl flex items-center justify-center text-[#003366] mx-auto mb-6 shadow-sm border border-gray-100">
          <Microscope size={40} />
        </div>
        <h2 className="text-3xl md:text-4xl font-black text-[#003366] mb-3 tracking-tighter uppercase">Laboratório Virtual</h2>
        <p className="text-[#D4A017] font-black text-[10px] uppercase tracking-[0.3em]">{discipline?.title}</p>
      </div>

      <div className="space-y-6">
        {filtered.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-[3rem] border-2 border-dashed border-gray-200 text-gray-400 font-bold text-sm">
            Nenhum simulado de laboratório disponível no momento.
          </div>
        ) : (
          filtered.map(sim => (
            <div key={sim.id} className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-6 group hover:border-[#D4A017] transition-all">
               <div>
                 <h3 className="text-xl font-black text-[#003366] mb-2">{sim.title}</h3>
                 <p className="text-gray-500 text-sm font-medium mb-4">{sim.description}</p>
                 <div className="flex flex-wrap items-center gap-4">
                   <span className="flex items-center gap-1.5 text-[10px] font-black text-[#D4A017] uppercase tracking-widest"><User size={14}/> {sim.author}</span>
                   <span className="flex items-center gap-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-widest"><Play size={14}/> {sim.questions.length} Lâminas/Peças</span>
                 </div>
               </div>
               <button 
                 onClick={() => onStart(sim)} 
                 className="bg-[#003366] text-white px-8 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest flex items-center gap-3 shadow-lg hover:bg-[#D4A017] hover:scale-105 transition-all shrink-0 w-full md:w-auto justify-center"
               >
                 <Microscope size={16} /> Iniciar Prática
               </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default LabListView;