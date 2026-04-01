// views/OsceModeSelectionView.tsx
import React from 'react';

interface OsceModeSelectionViewProps {
  onSelectMode: (mode: 'static' | 'ai' | 'rpg') => void;
  onBack: () => void;
}

const OsceModeSelectionView: React.FC<OsceModeSelectionViewProps> = ({ onSelectMode, onBack }) => {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12 animate-in fade-in duration-500">
      <button onClick={onBack} className="text-[#003366] font-bold mb-8 flex items-center gap-2 hover:text-[#D4A017] transition-all">
        <span>←</span> Voltar à Disciplina
      </button>

      <div className="text-center mb-12">
        <h2 className="text-4xl font-black text-[#003366] uppercase tracking-tighter">Simulados de Prática</h2>
        <p className="text-gray-500 font-medium text-lg">Escolha como deseja treinar hoje</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* CARD ESTÁTICO */}
        <button onClick={() => onSelectMode('static')} className="bg-white p-8 rounded-[2.5rem] border-2 border-blue-100 hover:border-blue-500 transition-all shadow-sm hover:shadow-xl flex flex-col items-center text-center group">
          <span className="text-6xl mb-6 group-hover:scale-110 transition-transform">📋</span>
          <h3 className="text-lg font-black text-[#003366] uppercase mb-2">Simulado Estático</h3>
          <p className="text-xs text-gray-500">Checklists sequenciais e protocolos técnicos.</p>
        </button>

        {/* CARD IA */}
        <button onClick={() => onSelectMode('ai')} className="bg-white p-8 rounded-[2.5rem] border-2 border-green-100 hover:border-green-500 transition-all shadow-sm hover:shadow-xl flex flex-col items-center text-center group">
          <span className="text-6xl mb-6 group-hover:scale-110 transition-transform">🤖</span>
          <h3 className="text-lg font-black text-[#003366] uppercase mb-2">Paciente Virtual</h3>
          <p className="text-xs text-gray-500">Anamnese livre conversando com a IA.</p>
        </button>

        {/* CARD RPG */}
        <button onClick={() => onSelectMode('rpg')} className="bg-white p-8 rounded-[2.5rem] border-2 border-purple-100 hover:border-purple-500 transition-all shadow-sm hover:shadow-xl flex flex-col items-center text-center group">
          <span className="text-6xl mb-6 group-hover:scale-110 transition-transform">🎮</span>
          <h3 className="text-lg font-black text-[#003366] uppercase mb-2">Simulado RPG</h3>
          <p className="text-xs text-gray-500">Decisões com consequências e sinais vitais dinâmicos.</p>
        </button>
      </div>
    </div>
  );
};

export default OsceModeSelectionView;