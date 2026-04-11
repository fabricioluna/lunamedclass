import React, { useState } from 'react';
import { Microscope, Play, User, Activity, Pill, ClipboardList, FilterX, LayoutGrid } from 'lucide-react';
import { LabSimulation, SimulationInfo } from '../types';

interface Props {
  disciplineId: string;
  simulations: LabSimulation[];
  disciplines: SimulationInfo[];
  categoryFilter?: string | null;
  onStart: (sim: LabSimulation) => void;
}

const LabListView: React.FC<Props> = ({ disciplineId, simulations, disciplines, categoryFilter, onStart }) => {
  const discipline = disciplines.find(d => d.id === disciplineId);
  
  // LUNA ENGINE 2.0: Estado local para as abas. Inicia com o filtro externo (se houver) ou 'Todos'
  const [activeTab, setActiveTab] = useState<string>(
    categoryFilter ? categoryFilter.charAt(0).toUpperCase() + categoryFilter.slice(1).toLowerCase() : 'Todos'
  );

  // Verifica se é uma Unidade Curricular para exibir os filtros avançados
  const isUC = disciplineId.toLowerCase().startsWith('uc') || discipline?.title.toLowerCase().startsWith('uc');

  // Filtro Híbrido: Verifica a disciplina e depois a aba selecionada na UI
  const filtered = simulations.filter(s => {
    const matchesDiscipline = s.disciplineId === disciplineId;
    const matchesCategory = activeTab === 'Todos' ? true : s.category?.toLowerCase() === activeTab.toLowerCase();
    return matchesDiscipline && matchesCategory;
  });

  // UI/UX Imersiva: Retorna o ícone correto baseado na categoria filtrada
  const getCategoryIcon = (cat: string | null | undefined, size = 20) => {
    switch(cat?.toLowerCase()) {
      case 'anatomia': return <Activity size={size} />;
      case 'histologia': return <Microscope size={size} />;
      case 'farmacologia': return <Pill size={size} />;
      case 'exames': return <ClipboardList size={size} />;
      case 'todos': return <LayoutGrid size={size} />;
      default: return <Microscope size={size} />;
    }
  };

  const tabs = [
    { id: 'Todos', label: 'Todos' },
    { id: 'Anatomia', label: 'Anatomia' },
    { id: 'Histologia', label: 'Histologia' },
    { id: 'Farmacologia', label: 'Farmacologia' },
    { id: 'Exames', label: 'Exames' }
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 py-12 animate-in fade-in slide-in-from-bottom-8 duration-700">
      <div className="text-center mb-8 relative">
        <div className="w-20 h-20 bg-[#003366]/5 rounded-3xl flex items-center justify-center text-[#003366] mx-auto mb-6 shadow-sm border border-gray-100 transition-all duration-300">
          {/* O Ícone principal muda de acordo com a aba */}
          {getCategoryIcon(activeTab !== 'Todos' ? activeTab : null, 40)}
        </div>
        <h2 className="text-3xl md:text-4xl font-black text-[#003366] mb-3 tracking-tighter uppercase transition-colors">
          Laboratório Virtual
        </h2>
        
        {/* SELO DE RASTREAMENTO VISUAL */}
        <div className="flex items-center justify-center gap-2 mb-2">
          <p className="text-[#D4A017] font-black text-[10px] uppercase tracking-[0.3em]">{discipline?.title}</p>
        </div>
      </div>

      {/* ======================================================== */}
      {/* BARRA DE NAVEGAÇÃO DE CATEGORIAS (TABS) - SEMPRE VISÍVEL */}
      {/* ======================================================== */}
      {isUC && (
        <div className="flex flex-wrap items-center justify-center gap-2 md:gap-3 mb-10 animate-in fade-in zoom-in duration-500">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 md:px-6 py-3 rounded-2xl text-[10px] md:text-xs font-black uppercase tracking-widest transition-all duration-300 border-2 ${
                activeTab === tab.id
                  ? 'bg-[#003366] border-[#003366] text-white shadow-lg scale-105'
                  : 'bg-white border-transparent text-gray-400 hover:text-[#D4A017] hover:border-gray-100 hover:shadow-sm'
              }`}
            >
              {getCategoryIcon(tab.id, 16)}
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {/* RENDERIZAÇÃO DA LISTA DE SIMULADOS */}
      <div className="space-y-6">
        {filtered.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-[3rem] border-2 border-dashed border-gray-200 flex flex-col items-center justify-center shadow-sm animate-in fade-in">
            <FilterX size={48} className="text-gray-300 mb-4" />
            <p className="text-gray-500 font-bold text-sm uppercase tracking-widest">
              Nenhum simulado de <span className="text-[#D4A017]">{activeTab !== 'Todos' ? activeTab : 'laboratório'}</span> disponível.
            </p>
            <p className="text-gray-400 text-xs font-medium mt-2 max-w-md px-4">
              A coordenação ou professores ainda não cadastraram peças para esta área. Os botões permanecem ativos para quando houver conteúdo.
            </p>
          </div>
        ) : (
          filtered.map(sim => (
            <div key={sim.id} className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-6 group hover:border-[#D4A017] transition-all animate-in fade-in slide-in-from-bottom-4">
               <div>
                 {/* BADGE DA CATEGORIA NA LISTAGEM */}
                 <div className="flex items-center gap-2 mb-3">
                   {sim.category ? (
                     <span className="flex items-center gap-1 bg-[#f4f7f6] text-[#003366] px-2.5 py-1 rounded-md text-[9px] font-black uppercase tracking-widest border border-gray-200">
                       {getCategoryIcon(sim.category, 12)}
                       {sim.category}
                     </span>
                   ) : (
                     <span className="flex items-center gap-1 bg-gray-50 text-gray-400 px-2.5 py-1 rounded-md text-[9px] font-black uppercase tracking-widest border border-gray-100">
                       Geral
                     </span>
                   )}
                 </div>
                 
                 <h3 className="text-xl font-black text-[#003366] mb-2 leading-tight">{sim.title}</h3>
                 <p className="text-gray-500 text-sm font-medium mb-4">{sim.description}</p>
                 
                 <div className="flex flex-wrap items-center gap-4">
                   <span className="flex items-center gap-1.5 text-[10px] font-black text-[#D4A017] uppercase tracking-widest">
                     <User size={14}/> {sim.author}
                   </span>
                   <span className="flex items-center gap-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                     <Play size={14}/> {sim.questions.length} Lâminas/Peças
                   </span>
                 </div>
               </div>
               
               <button 
                 onClick={() => onStart(sim)} 
                 className="bg-[#003366] text-white px-8 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest flex items-center gap-3 shadow-lg hover:bg-[#D4A017] hover:scale-105 transition-all shrink-0 w-full md:w-auto justify-center group-hover:shadow-xl"
               >
                 <span className="text-[#D4A017]">{getCategoryIcon(sim.category, 16)}</span> Iniciar Prática
               </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default LabListView;