import React, { useState } from 'react';
import { SimulationInfo, OsceStation } from '../types';

interface OsceSetupViewProps {
  discipline: SimulationInfo;
  availableStations: OsceStation[];
  onStart: (station: OsceStation) => void;
  onBack: () => void;
  setupMode?: 'static' | 'rpg' | 'ai' | 'lab' | 'all'; 
}

const OsceSetupView: React.FC<OsceSetupViewProps> = ({ discipline, availableStations, onStart, onBack, setupMode = 'all' }) => {
  const [selectedTheme, setSelectedTheme] = useState<string | null>(null);

  const isUC = discipline.id.toLowerCase().startsWith('uc');

  // Lógica inteligente para herdar Título e Emoji exatos dos botões anteriores
  let headerEmoji = '🩺';
  let headerTitle = 'Laboratório de Habilidades';
  let headerSubtitle = discipline.title;

  if (isUC || setupMode === 'lab') {
    headerEmoji = '🔬';
    headerTitle = 'Laboratório Virtual';
  } else if (setupMode === 'ai') {
    headerEmoji = '🤖';
    headerTitle = 'Paciente Virtual';
    headerSubtitle = 'Anamnese livre conversando com a IA';
  } else if (setupMode === 'rpg') {
    headerEmoji = '🎮';
    headerTitle = 'Simulado RPG';
    headerSubtitle = 'Decisões com consequências e vitais dinâmicos';
  } else if (setupMode === 'static') {
    headerEmoji = '📋';
    headerTitle = 'Simulado Estático';
    headerSubtitle = 'Checklists sequenciais e protocolos';
  }

  const handleSurpriseAll = () => {
    if (availableStations.length === 0) return;
    const randomStation = availableStations[Math.floor(Math.random() * availableStations.length)];
    onStart(randomStation);
  };

  const handleSurpriseTheme = (theme: string) => {
    const filtered = availableStations.filter(s => s.theme === theme);
    if (filtered.length === 0) return;
    const randomStation = filtered[Math.floor(Math.random() * filtered.length)];
    onStart(randomStation);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-12 animate-in fade-in zoom-in duration-500">
      <button 
        onClick={selectedTheme === null ? onBack : () => setSelectedTheme(null)} 
        className="group flex items-center text-[#003366] font-bold mb-8 hover:text-[#D4A017] transition-all"
      >
        <span className="mr-2 transition-transform group-hover:-translate-x-1">←</span> 
        {selectedTheme === null ? 'Voltar à Disciplina' : 'Voltar aos Eixos Temáticos'}
      </button>
      
      <div className="bg-white rounded-[2.5rem] p-8 md:p-12 shadow-2xl border border-gray-100">
        {/* CABEÇALHO DINÂMICO */}
        <div className="text-center mb-10 border-b pb-8">
          <div className="text-5xl mb-4">{headerEmoji}</div>
          <h2 className="text-3xl font-black text-[#003366] uppercase mb-2 tracking-tighter">
            {headerTitle}
          </h2>
          <p className="text-[#D4A017] text-[10px] font-black uppercase tracking-[0.3em]">
            {headerSubtitle}
          </p>
        </div>

        {availableStations.length === 0 ? (
           <div className="text-center py-10 bg-gray-50 rounded-[2rem] border-2 border-dashed border-gray-200">
              <span className="text-4xl opacity-20 block mb-4">📁</span>
              <p className="text-gray-400 font-bold uppercase tracking-widest text-[10px]">Nenhuma estação disponível no momento.</p>
           </div>
        ) : selectedTheme === null ? (
          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-6 text-center">
              1º Passo: Selecione o Eixo de Treinamento
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
              <button
                onClick={handleSurpriseAll}
                className={`sm:col-span-2 p-6 hover:bg-[#D4A017] hover:text-[#003366] rounded-[1.5rem] transition-all flex items-center justify-between group shadow-lg
                  ${setupMode === 'ai' ? 'bg-[#001f3f] text-[#D4A017]' : 'bg-[#003366] text-white'}
                `}
              >
                <div className="flex items-center gap-5 text-left">
                  <div className="text-4xl group-hover:animate-spin">🎲</div>
                  <div>
                    <h3 className="text-lg font-black uppercase tracking-tight">
                      {isUC ? 'Bancada Surpresa (Geral)' : 'Caso Surpresa (Geral)'}
                    </h3>
                    <p className="text-[10px] font-bold opacity-80 uppercase tracking-widest">Sorteia entre todas as {availableStations.length} estações</p>
                  </div>
                </div>
                <div className="font-black text-2xl opacity-0 group-hover:opacity-100 group-hover:translate-x-2 transition-all">→</div>
              </button>

              {discipline.themes.map(theme => {
                const count = availableStations.filter(s => s.theme === theme).length;
                return (
                  <button
                    key={theme}
                    disabled={count === 0}
                    onClick={() => setSelectedTheme(theme)}
                    className={`p-5 rounded-[1.5rem] border-2 text-left transition-all flex justify-between items-center group
                      ${count > 0 
                        ? 'bg-gray-50 border-transparent hover:border-[#D4A017] hover:bg-white hover:shadow-md cursor-pointer' 
                        : 'bg-gray-50 border-transparent opacity-40 cursor-not-allowed'}
                    `}
                  >
                    <div>
                      <h3 className={`font-black text-sm uppercase tracking-tight pr-4 ${count > 0 ? 'text-[#003366] group-hover:text-[#D4A017]' : 'text-gray-400'}`}>
                        {theme}
                      </h3>
                    </div>
                    <span className={`text-[10px] font-black px-3 py-1 rounded-lg ${count > 0 ? 'bg-white text-[#003366] shadow-sm' : 'bg-gray-200 text-gray-400'}`}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="animate-in slide-in-from-right-8 duration-300">
            <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-6 text-center">
              2º Passo: Selecione {isUC ? `a Bancada de ${selectedTheme}` : `o Caso de ${selectedTheme}`}
            </label>
            <div className="grid grid-cols-1 gap-4">
              <button
                onClick={() => handleSurpriseTheme(selectedTheme)}
                className="p-5 bg-[#D4A017] text-[#003366] hover:bg-[#003366] hover:text-white rounded-[1.5rem] transition-all flex items-center justify-between group shadow-md"
              >
                <div className="flex items-center gap-4 text-left">
                  <div className="text-3xl group-hover:animate-spin">🎲</div>
                  <div>
                    <h3 className="text-md font-black uppercase tracking-tight">
                      {isUC ? 'Bancada Surpresa neste Eixo' : 'Caso Surpresa neste Eixo'}
                    </h3>
                    <p className="text-[10px] font-bold opacity-80 uppercase tracking-widest">
                      {isUC ? `Sorteia uma bancada aleatória de ${selectedTheme}` : `Sorteia um caso aleatório de ${selectedTheme}`}
                    </p>
                  </div>
                </div>
                <div className="font-black text-xl opacity-0 group-hover:opacity-100 group-hover:translate-x-2 transition-all">→</div>
              </button>

              {availableStations.filter(s => s.theme === selectedTheme).map((station, index) => (
                <button
                  key={station.id}
                  onClick={() => onStart(station)}
                  className="p-5 bg-gray-50 hover:bg-white rounded-[1.5rem] border-2 border-transparent hover:border-[#D4A017] transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between group shadow-sm hover:shadow-lg"
                >
                  <div className="flex items-center gap-5 text-left">
                    <div className="w-10 h-10 shrink-0 rounded-full bg-[#003366] text-white flex items-center justify-center font-black text-sm group-hover:scale-110 transition-transform">
                      {index + 1}
                    </div>
                    <div>
                      <h3 className="text-md font-black text-[#003366] group-hover:text-[#D4A017] transition-colors leading-tight pr-4">
                        {station.title}
                      </h3>
                      {/* BADGES DE TIPO DE ESTAÇÃO */}
                      <div className="flex gap-2 mt-2">
                        {station.mode === 'rpg' ? (
                          <span className="bg-purple-100 text-purple-700 text-[8px] font-black uppercase px-2 py-0.5 rounded border border-purple-200 flex items-center gap-1">
                            🎮 Simulado RPG
                          </span>
                        ) : station.mode === 'ai' ? (
                          <span className="bg-green-100 text-green-700 text-[8px] font-black uppercase px-2 py-0.5 rounded border border-green-200 flex items-center gap-1">
                            🤖 Paciente Virtual
                          </span>
                        ) : (
                          <span className="bg-blue-100 text-blue-700 text-[8px] font-black uppercase px-2 py-0.5 rounded border border-blue-200 flex items-center gap-1">
                            📋 Simulado Estático
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-[#D4A017] font-black text-xl opacity-0 group-hover:opacity-100 group-hover:translate-x-2 transition-all self-end sm:self-center mt-2 sm:mt-0">
                    →
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default OsceSetupView;