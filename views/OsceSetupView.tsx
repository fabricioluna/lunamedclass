import React, { useState, useEffect } from 'react';
import { SimulationInfo, OsceStation, AcademicUnit } from '../types';
import { Milestone, Layers } from 'lucide-react';
import { db } from '../firebase';
import { ref, get } from 'firebase/database';

interface OsceSetupViewProps {
  discipline: SimulationInfo;
  availableStations?: OsceStation[]; // Opcional, pois não dependeremos mais do Global Fetch
  selectedUnit: AcademicUnit; 
  onStart: (station: OsceStation) => void;
  onBack: () => void;
  setupMode?: 'static' | 'rpg' | 'ai' | 'lab' | 'all'; 
}

const OsceSetupView: React.FC<OsceSetupViewProps> = ({ 
  discipline, 
  selectedUnit,
  onStart, 
  onBack, 
  setupMode = 'all' 
}) => {
  const [selectedTheme, setSelectedTheme] = useState<string | null>(null);
  
  // === NOVO: BUSCA SOB DEMANDA (ON-DEMAND FETCHING) ===
  const [localStations, setLocalStations] = useState<OsceStation[]>([]);
  const [isFetching, setIsFetching] = useState(true);

  const isUC = discipline.category === 'UC';

  useEffect(() => {
    const fetchStationsOnDemand = async () => {
      try {
        setIsFetching(true);
        // Bate no banco apenas uma vez (get) e fecha a conexão
        const snapshot = await get(ref(db, 'osce'));
        
        if (snapshot.exists()) {
          const data = snapshot.val();
          const parsedStations = Object.keys(data)
            .filter(k => data[k])
            .map(k => ({ ...data[k], firebaseId: k })) as OsceStation[];
            
          // REPLICA A REGRA DE NEGÓCIO QUE ANTES FICAVA NO APP.TSX
          const filteredStations = parsedStations.filter(s => {
            const isCorrectDisc = s.disciplineId === discipline.id;
            const sUnit = s.unit || 'N1';
            const isCorrectUnit = isUC ? true : sUnit === selectedUnit;
            
            if (!isCorrectDisc || !isCorrectUnit) return false;
            
            if (setupMode === 'static') return s.mode === 'clinical'; 
            if (setupMode === 'rpg') return s.mode === 'rpg';
            if (setupMode === 'ai') return s.mode === 'ai';
            return true;
          });

          setLocalStations(filteredStations);
        }
      } catch (error) {
        console.error("Erro ao sincronizar as estações clínicas:", error);
      } finally {
        setIsFetching(false);
      }
    };

    fetchStationsOnDemand();
  }, [discipline.id, isUC, selectedUnit, setupMode]);
  // ======================================================

  // LUNA ENGINE 2.0: Lógica de Cabeçalho Contextual
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
    headerSubtitle = 'Decisões dinâmicas e vitais em tempo real';
  } else if (setupMode === 'static') {
    headerEmoji = '📋';
    headerTitle = 'Simulado Estático';
    headerSubtitle = 'Checklists sequenciais e protocolos oficiais';
  }

  const handleSurpriseAll = () => {
    if (localStations.length === 0) return;
    const randomStation = localStations[Math.floor(Math.random() * localStations.length)];
    onStart(randomStation);
  };

  const handleSurpriseTheme = (theme: string) => {
    const filtered = localStations.filter(s => s.theme === theme);
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
      
      {/* FEEDBACK VISUAL DE CARREGAMENTO SOB DEMANDA */}
      {isFetching && (
        <div className="flex flex-col items-center justify-center py-24 bg-white rounded-[2.5rem] shadow-xl border border-gray-100 mb-8">
           <div className="w-12 h-12 border-4 border-[#003366]/10 border-t-[#D4A017] rounded-full animate-spin mb-4"></div>
           <h3 className="text-[#003366] font-black uppercase tracking-widest text-xs">Sincronizando Simulações Clínicas...</h3>
           <p className="text-gray-400 text-[10px] font-bold mt-2 uppercase">Preparando Luna Engine 2.0</p>
        </div>
      )}

      {/* SÓ MOSTRA O CONTEÚDO SE JÁ TERMINOU DE BAIXAR AS ESTAÇÕES */}
      {!isFetching && (
        <div className="bg-white rounded-[2.5rem] p-8 md:p-12 shadow-2xl border border-gray-100">
          {/* CABEÇALHO DINÂMICO COM CONTEXTO DE UNIDADE */}
          <div className="text-center mb-10 border-b pb-8">
            <div className="text-5xl mb-4">{headerEmoji}</div>
            <div className="flex flex-col items-center gap-2 mb-4">
              <h2 className="text-3xl font-black text-[#003366] uppercase mb-2 tracking-tighter">
                {headerTitle}
              </h2>
              
              {/* BADGE DE UNIDADE: Essencial para Habilidades Médicas */}
              {!isUC && (
                <div className="flex items-center gap-1.5 bg-blue-50 text-[#003366] px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-blue-100 shadow-sm">
                  {selectedUnit === 'N1' ? <Milestone size={12} /> : <Layers size={12} />}
                  Unidade {selectedUnit}
                </div>
              )}
            </div>
            <p className="text-[#D4A017] text-[10px] font-black uppercase tracking-[0.3em]">
              {headerSubtitle}
            </p>
          </div>

          {localStations.length === 0 ? (
             <div className="text-center py-12 bg-gray-50 rounded-[2rem] border-2 border-dashed border-gray-200">
                <span className="text-4xl opacity-20 block mb-4">📁</span>
                <p className="text-gray-400 font-bold uppercase tracking-widest text-[10px]">
                  Nenhuma estação disponível para a {isUC ? 'disciplina' : `Unidade ${selectedUnit}`} neste modo.
                </p>
             </div>
          ) : selectedTheme === null ? (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
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
                      <p className="text-[10px] font-bold opacity-80 uppercase tracking-widest">
                        Sorteia entre as {localStations.length} estações da {isUC ? 'UC' : `Unidade ${selectedUnit}`}
                      </p>
                    </div>
                  </div>
                  <div className="font-black text-2xl opacity-0 group-hover:opacity-100 group-hover:translate-x-2 transition-all">→</div>
                </button>

                {discipline.themes.map(theme => {
                  const count = localStations.filter(s => s.theme === theme).length;
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
                        Caso Surpresa neste Eixo
                      </h3>
                      <p className="text-[10px] font-bold opacity-80 uppercase tracking-widest">
                        Sorteia um cenário aleatório de {selectedTheme}
                      </p>
                    </div>
                  </div>
                  <div className="font-black text-xl opacity-0 group-hover:opacity-100 group-hover:translate-x-2 transition-all">→</div>
                </button>

                {localStations.filter(s => s.theme === selectedTheme).map((station, index) => (
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
                          
                          {/* TAG DE UNIDADE PARA CONFERÊNCIA FINAL */}
                          {!isUC && (
                            <span className="bg-blue-50 text-[#003366] text-[8px] font-black uppercase px-2 py-0.5 rounded border border-blue-100">
                              {station.unit || 'N1'}
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
      )}
    </div>
  );
};

export default OsceSetupView;