import React, { useState, useEffect } from 'react';
import { OsceStation, StaticOsceStation } from '../types';

interface OsceViewProps {
  station: OsceStation;
  onBack: () => void;
}

const OsceView: React.FC<OsceViewProps> = ({ station, onBack }) => {
  const [selectedActions, setSelectedActions] = useState<number[]>([]);
  const [isFinished, setIsFinished] = useState(false);
  const [score, setScore] = useState(0);
  const [timer, setTimer] = useState(0);

  // === PROTEÇÃO DE MOTOR (TYPE GUARD) ===
  // Se a estação for do modo RPG, esta view (estática) não deve processá-la.
  // Isso evita erros de "undefined" ao tentar acessar actionCloud ou correctOrderIndices.
  if (station.mode === 'rpg') {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <h2 className="text-2xl font-black text-[#003366] mb-4 uppercase">Estação em Modo RPG</h2>
        <p className="text-gray-600 mb-8 font-medium">
          Esta estação utiliza o motor Luna Engine 2.0 e deve ser aberta no simulador dinâmico.
        </p>
        <button onClick={onBack} className="bg-[#003366] text-white px-8 py-4 rounded-2xl font-bold uppercase text-xs tracking-widest">
          Voltar para Seleção
        </button>
      </div>
    );
  }

  // A partir daqui, o TypeScript sabe que 'station' é uma StaticOsceStation
  const staticStation = station as StaticOsceStation;

  // IDENTIFICADOR AUTOMÁTICO DE UC
  const isUC = staticStation.disciplineId.toLowerCase().startsWith('uc');

  const safeActionCloud = staticStation.actionCloud || [];
  const safeOrderIndices = staticStation.correctOrderIndices || [];

  useEffect(() => {
    let interval: any;
    if (!isFinished) {
      interval = setInterval(() => setTimer(t => t + 1), 1000);
    }
    return () => clearInterval(interval);
  }, [isFinished]);

  const toggleAction = (index: number) => {
    if (isFinished) return;
    if (selectedActions.includes(index)) {
      setSelectedActions(prev => prev.filter(i => i !== index));
    } else {
      setSelectedActions(prev => [...prev, index]);
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const calculateDetailedScore = () => {
    let points = 0;
    const maxPoints = safeOrderIndices.length * 1.5;

    safeOrderIndices.forEach((correctIdx, position) => {
      const userIndex = selectedActions.indexOf(correctIdx);
      if (userIndex !== -1) {
        points += 1.0; 
        if (userIndex === position) points += 0.5; 
      }
    });

    const errors = selectedActions.filter(i => !safeOrderIndices.includes(i)).length;
    points = Math.max(0, points - (errors * 0.5));

    const final = maxPoints > 0 ? (points / maxPoints) * 10 : 0;
    setScore(parseFloat(final.toFixed(1)));
    setIsFinished(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 pb-40">
      <div className="flex justify-between items-center mb-10 border-b pb-6">
        <button onClick={onBack} className="text-[#003366] font-black uppercase text-xs flex items-center gap-2 hover:text-[#D4A017] transition-colors">
          <span>←</span> Sair da Estação
        </button>
        <div className="text-right">
          <span className="text-[10px] font-black text-[#D4A017] uppercase tracking-widest">{staticStation.theme}</span>
          <h2 className="text-2xl font-black text-[#003366] uppercase tracking-tighter">{staticStation.title}</h2>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div className="lg:col-span-1 space-y-6">
          
          <div className="bg-white p-8 rounded-[2rem] shadow-xl border-t-8 border-[#003366]">
            <h3 className="text-[10px] font-black text-[#003366] uppercase mb-4 tracking-widest flex items-center gap-2">
              <span>{isUC ? '🔬' : '📋'}</span> {isUC ? 'Contexto da Bancada' : 'Cenário Clínico'}
            </h3>
            <p className="text-gray-700 leading-relaxed text-base md:text-lg font-medium mb-6">"{staticStation.scenario}"</p>
            
            {staticStation.setting && (
               <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100">
                  <h4 className="text-[9px] font-black text-blue-800 uppercase mb-1 tracking-widest">📍 Ambiente</h4>
                  <p className="text-xs text-blue-900 font-medium">{staticStation.setting}</p>
               </div>
            )}
          </div>

          <div className="bg-[#003366] p-8 rounded-[2rem] shadow-xl text-white">
            <h3 className="text-[10px] font-black text-[#D4A017] uppercase mb-4 tracking-widest">🎯 Comandos</h3>
            <p className="text-sm font-bold leading-relaxed">{staticStation.task}</p>
          </div>

          {staticStation.tip && (
            <div className="bg-yellow-50 p-6 rounded-[2rem] border border-yellow-200 shadow-sm animate-in fade-in duration-500">
              <h3 className="text-[10px] font-black text-yellow-600 uppercase mb-2 tracking-widest flex items-center gap-2">
                <span>💡</span> Dica do Preceptor
              </h3>
              <p className="text-sm font-medium text-yellow-800 leading-relaxed">{staticStation.tip}</p>
            </div>
          )}

          {!isFinished && (
            <div className="bg-white p-6 rounded-2xl border border-gray-100 flex items-center justify-between">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Cronômetro</span>
              <span className={`text-xl font-mono font-bold ${timer > 480 ? 'text-red-500' : 'text-[#003366]'}`}>
                {formatTime(timer)}
              </span>
            </div>
          )}
        </div>

        <div className="lg:col-span-2">
          {!isFinished ? (
            <div className="bg-white p-10 rounded-[2.5rem] shadow-2xl">
              <h3 className="text-xl font-black text-[#003366] uppercase mb-8">
                {isUC ? 'Nuvem de Identificações / Ações' : 'Nuvem de Condutas'}
              </h3>
              
              <div className="mb-10">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-4">Sua Sequência:</label>
                <div className="min-h-[120px] bg-gray-50 rounded-3xl p-6 flex flex-wrap gap-3 border-2 border-dashed border-gray-200">
                  {selectedActions.length === 0 && <p className="text-gray-300 text-xs italic m-auto">Toque nas ações abaixo na ordem correta...</p>}
                  {selectedActions.map((idx, i) => (
                    <div key={i} className="bg-white px-4 py-2 rounded-xl shadow-sm border text-xs font-bold text-[#003366] flex items-center gap-2 animate-in zoom-in">
                      <span className="bg-[#003366] text-white w-5 h-5 rounded flex items-center justify-center text-[9px]">{i + 1}</span>
                      {safeActionCloud[idx]}
                      <button onClick={() => toggleAction(idx)} className="ml-2 text-red-400 hover:text-red-600">✕</button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {safeActionCloud.map((action, idx) => (
                  <button
                    key={idx}
                    disabled={selectedActions.includes(idx)}
                    onClick={() => toggleAction(idx)}
                    className={`p-4 rounded-2xl text-left text-xs font-bold transition-all border-2
                      ${selectedActions.includes(idx) 
                        ? 'bg-gray-100 border-gray-100 text-gray-300 opacity-50' 
                        : 'bg-white border-gray-100 text-[#003366] hover:border-[#D4A017] hover:shadow-md'}
                    `}
                  >
                    {action}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-10 animate-in fade-in duration-700">
              <div className="bg-white p-10 rounded-[2.5rem] shadow-2xl text-center border-b-8 border-[#D4A017]">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] mb-2">Desempenho Final</p>
                <h4 className="text-7xl font-black text-[#003366]">{score}</h4>
                <p className="text-sm font-bold text-[#D4A017] mt-2">Checklist concluído em {formatTime(timer)}</p>
              </div>

              <div className="bg-white p-10 rounded-[2.5rem] shadow-2xl">
                <h4 className="text-lg font-black text-[#003366] uppercase mb-8 pb-4 border-b flex items-center gap-3">
                  <span>📊</span> Análise de Conduta
                </h4>
                
                <div className="space-y-4">
                  {selectedActions.map((actionIdx, userPos) => {
                    const correctPos = safeOrderIndices.indexOf(actionIdx);
                    const isCorrect = correctPos !== -1;
                    const onTime = correctPos === userPos;

                    return (
                      <div key={userPos} className={`p-5 rounded-2xl border-2 flex items-center justify-between gap-4
                        ${!isCorrect ? 'bg-red-50 border-red-100' : onTime ? 'bg-green-50 border-green-100' : 'bg-yellow-50 border-yellow-100'}
                      `}>
                        <div className="flex items-center gap-4">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black shadow-sm
                            ${!isCorrect ? 'bg-red-500 text-white' : onTime ? 'bg-green-500 text-white' : 'bg-yellow-500 text-white'}
                          `}>
                            {userPos + 1}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-gray-800">{safeActionCloud[actionIdx]}</p>
                            <p className="text-[10px] font-black uppercase tracking-widest mt-1">
                              {!isCorrect ? '❌ Ação Incorreta' : onTime ? '✅ Perfeito' : `⚠️ Fora de Ordem (Era o ${correctPos + 1}º)`}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="bg-[#003366] p-10 rounded-[2.5rem] shadow-2xl text-white">
                <h4 className="text-lg font-black text-[#D4A017] uppercase mb-8 pb-4 border-b border-white/10 flex items-center gap-3">
                  <span>🏆</span> Gabarito Padrão-Ouro
                </h4>
                <div className="space-y-3">
                  {safeOrderIndices.map((idx, i) => (
                    <div key={i} className="flex items-start gap-4 p-4 bg-white/5 rounded-2xl border border-white/10">
                      <span className="text-[#D4A017] font-black text-sm">{i + 1}.</span>
                      <p className="text-sm font-medium">{safeActionCloud[idx]}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-6 flex justify-center">
                <button 
                  onClick={onBack}
                  className="bg-[#D4A017] text-[#003366] px-12 py-5 rounded-[2rem] font-black uppercase text-xs tracking-widest shadow-xl hover:scale-105 transition-all"
                >
                  Voltar e Treinar Outra
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {!isFinished && (
        <div className="fixed bottom-10 left-0 right-0 px-4 z-50">
          <div className="max-w-md mx-auto">
            <button 
              onClick={calculateDetailedScore}
              className="w-full bg-[#003366] text-white py-6 rounded-[2rem] font-black uppercase text-sm tracking-[0.2em] shadow-2xl border-2 border-[#D4A017] hover:bg-[#D4A017] hover:text-[#003366] transition-all"
            >
              Finalizar Atendimento
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default OsceView;