import React from 'react';
import { SimulationInfo, Summary } from '../types';

interface DisciplineViewProps {
  disciplineId: string;
  disciplines: SimulationInfo[];
  summaries: Summary[];
  onBack: () => void;
  onSelectOption: (type: string) => void;
}

const DisciplineView: React.FC<DisciplineViewProps> = ({ disciplineId, disciplines, summaries, onBack, onSelectOption }) => {
  const discipline = disciplines.find(d => d.id === disciplineId);
  if (!discipline) return null;

  // IDENTIFICADOR AUTOMÁTICO DE UC
  const isUC = disciplineId.toLowerCase().startsWith('uc');

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 animate-in fade-in slide-in-from-bottom-8 duration-700 pb-32">
      <button 
        onClick={onBack} 
        className="group flex items-center text-[#003366] font-bold mb-8 hover:text-[#D4A017] transition-all"
      >
        <span className="mr-2 transition-transform group-hover:-translate-x-1">←</span> 
        Voltar ao Início
      </button>

      <div className="bg-white rounded-[3rem] p-8 md:p-14 shadow-2xl border border-gray-100 mb-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#f4f7f6] rounded-full -mr-20 -mt-20 opacity-50"></div>
        <div className="flex flex-col md:flex-row gap-8 items-center md:items-start relative z-10">
          <div className="w-32 h-32 bg-[#003366] rounded-full flex items-center justify-center text-6xl shadow-xl border-4 border-white shrink-0">
            {discipline.icon}
          </div>
          <div className="text-center md:text-left">
            <span className="bg-green-100 text-green-700 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest mb-4 inline-block shadow-sm">
              Módulo Liberado
            </span>
            <h1 className="text-4xl md:text-5xl font-black text-[#003366] mb-4 tracking-tighter leading-tight">
              {discipline.title}
            </h1>
            <p className="text-gray-600 text-lg leading-relaxed max-w-2xl font-medium">
              {discipline.description}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
        <button onClick={() => onSelectOption('quiz-setup')} className="bg-white p-6 md:p-8 rounded-[2rem] text-left hover:shadow-xl transition-all group border-2 border-transparent hover:border-[#D4A017]">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-blue-50 text-[#003366] rounded-xl flex items-center justify-center text-2xl group-hover:bg-[#003366] group-hover:text-white transition-colors">📝</div>
            <div className="text-gray-300 group-hover:text-[#D4A017] transition-colors">→</div>
          </div>
          <h3 className="text-xl font-black text-[#003366] mb-2 uppercase tracking-tight">Simulado Teórico</h3>
          <p className="text-xs text-gray-500 font-medium">Avalie seus conhecimentos com questões de múltipla escolha.</p>
        </button>

        {/* BOTÃO PRÁTICO INTELIGENTE (LABORATÓRIO vs OSCE) */}
        <button 
          onClick={() => onSelectOption(isUC ? 'lab-list' : 'osce-setup')} 
          className="bg-white p-6 md:p-8 rounded-[2rem] text-left hover:shadow-xl transition-all group border-2 border-transparent hover:border-[#D4A017]"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-blue-50 text-[#003366] rounded-xl flex items-center justify-center text-2xl group-hover:bg-[#003366] group-hover:text-white transition-colors">
              {isUC ? '🔬' : '🩺'}
            </div>
            <div className="text-gray-300 group-hover:text-[#D4A017] transition-colors">→</div>
          </div>
          <h3 className="text-xl font-black text-[#003366] mb-2 uppercase tracking-tight">
            {isUC ? 'Laboratório Virtual' : 'Simulado Prático (OSCE)'}
          </h3>
          <p className="text-xs text-gray-500 font-medium">
            {isUC 
              ? 'Treine a identificação visual de lâminas histológicas e peças anatômicas.' 
              : 'Treine o passo a passo de exames clínicos de forma gamificada.'}
          </p>
        </button>

        {disciplineId === 'hm2' && (
          <button onClick={() => onSelectOption('osce-ai-setup')} className="bg-gradient-to-br from-[#003366] to-[#001f3f] text-white p-6 md:p-8 rounded-[2rem] text-left hover:scale-105 transition-all shadow-xl group relative overflow-hidden md:col-span-2">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-5 rounded-full -mr-10 -mt-10 blur-2xl"></div>
            <div className="flex items-center justify-between mb-4 relative z-10">
              <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center text-3xl group-hover:bg-[#D4A017] group-hover:text-[#003366] transition-all">🤖</div>
              <div className="w-8 h-8 rounded-full border-2 border-white/20 flex items-center justify-center group-hover:border-[#D4A017] group-hover:text-[#D4A017] font-black">→</div>
            </div>
            <h3 className="text-xl font-black uppercase tracking-tight mb-2 relative z-10 text-[#D4A017]">Paciente Virtual por IA</h3>
            <p className="text-xs opacity-90 font-medium leading-relaxed relative z-10">Pratique sua anamnese conversando livremente pelo chat com um paciente simulado pela nossa Inteligência Artificial.</p>
          </button>
        )}

        <button onClick={() => onSelectOption('summaries-list')} className="bg-white p-6 md:p-8 rounded-[2rem] text-left hover:shadow-xl transition-all group border-2 border-transparent hover:border-[#D4A017]">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-blue-50 text-[#003366] rounded-xl flex items-center justify-center text-2xl group-hover:bg-[#003366] group-hover:text-white transition-colors">📂</div>
            <div className="text-gray-300 group-hover:text-[#D4A017] transition-colors">→</div>
          </div>
          <h3 className="text-xl font-black text-[#003366] mb-2 uppercase tracking-tight">Central de Materiais</h3>
          <p className="text-xs text-gray-500 font-medium">Acesse resumos, roteiros de aulas práticas e materiais extras da turma.</p>
        </button>

        <button onClick={() => onSelectOption('references-view')} className="bg-white p-6 md:p-8 rounded-[2rem] text-left hover:shadow-xl transition-all group border-2 border-transparent hover:border-[#D4A017]">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-blue-50 text-[#003366] rounded-xl flex items-center justify-center text-2xl group-hover:bg-[#003366] group-hover:text-white transition-colors">📚</div>
            <div className="text-gray-300 group-hover:text-[#D4A017] transition-colors">→</div>
          </div>
          <h3 className="text-xl font-black text-[#003366] mb-2 uppercase tracking-tight">Referências Bibliográficas</h3>
          <p className="text-xs text-gray-500 font-medium">Links diretos para os livros oficiais na biblioteca da faculdade.</p>
        </button>
      </div>
    </div>
  );
};

export default DisciplineView;