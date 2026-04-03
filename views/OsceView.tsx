import React, { useState, useEffect } from 'react';
import { OsceStation, StaticOsceStation } from '../types';
import { 
  ClipboardList, 
  Timer, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  ChevronRight, 
  RotateCcw, 
  Map,
  Trophy,
  History,
  FlaskConical,
  Download // Adicionado ícone de Download
} from 'lucide-react';

interface OsceViewProps {
  station: OsceStation;
  onBack: () => void;
  onSaveResult?: (score: number, total: number, timeSpent: number, analytics: any) => void;
}

const OsceView: React.FC<OsceViewProps> = ({ station, onBack, onSaveResult }) => {
  const [selectedActions, setSelectedActions] = useState<number[]>([]);
  const [isFinished, setIsFinished] = useState(false);
  const [score, setScore] = useState(0);
  const [timer, setTimer] = useState(0);

  // === PROTEÇÃO DE MOTOR (TYPE GUARD) ===
  if (station.mode !== 'clinical') {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <AlertCircle size={48} className="mx-auto text-red-500 mb-4" />
        <h2 className="text-2xl font-black text-[#003366] mb-4 uppercase">Modo Incompatível</h2>
        <p className="text-gray-600 mb-8 font-medium">
          Esta estação requer o motor {station.mode === 'rpg' ? 'Luna Engine (RPG)' : 'Paciente Virtual (IA)'}.
        </p>
        <button onClick={onBack} className="bg-[#003366] text-white px-8 py-4 rounded-2xl font-bold uppercase text-xs tracking-widest hover:bg-[#D4A017] transition-all">
          Voltar para Seleção
        </button>
      </div>
    );
  }

  const staticStation = station as StaticOsceStation;
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

    const finalGrade = maxPoints > 0 ? (points / maxPoints) * 10 : 0;
    const finalRounded = parseFloat(finalGrade.toFixed(1));
    
    setScore(finalRounded);

    const analytics = {
      stationId: station.id,
      mode: 'static-cloud',
      timeSpent: timer,
      userSequence: selectedActions.map(idx => safeActionCloud[idx]),
      correctSequence: safeOrderIndices.map(idx => safeActionCloud[idx]),
      totalErrors: errors,
      efficiency: (finalRounded / (timer || 1)).toFixed(4),
      grade: finalRounded
    };

    if (onSaveResult) {
      onSaveResult(finalRounded, 10, timer, analytics);
    }

    setIsFinished(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDownloadPDF = () => {
    window.print();
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 pb-40 print:p-0 print:m-0">
      
      {/* HEADER (OCULTO NA IMPRESSÃO) */}
      <div className="flex justify-between items-center mb-10 border-b pb-6 print:hidden">
        <button onClick={onBack} className="text-[#003366] font-black uppercase text-[10px] flex items-center gap-2 hover:text-[#D4A017] transition-colors">
          <RotateCcw size={14} /> Sair da Estação
        </button>
        <div className="text-right">
          <span className="text-[10px] font-black text-[#D4A017] uppercase tracking-widest">{staticStation.theme}</span>
          <h2 className="text-2xl font-black text-[#003366] uppercase tracking-tighter">📋 SIMULADO ESTÁTICO</h2>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 print:block">
        
        {/* CONTEXTO DA ESTAÇÃO */}
        <div className="lg:col-span-1 space-y-6 print:mb-8">
          
          {/* CABEÇALHO DO RELATÓRIO (SÓ APARECE NO PDF) */}
          <div className="hidden print:block border-b-4 border-[#003366] pb-6 mb-8">
              <h1 className="text-3xl font-black text-[#003366] uppercase">Relatório de Simulação Prática</h1>
              <p className="text-sm font-bold text-gray-500 mt-2 uppercase tracking-widest">Luna MedClass • OSCE Estático</p>
              <div className="grid grid-cols-2 gap-4 mt-6">
                  <div><p className="text-[10px] font-black text-gray-400 uppercase">Estação / Disciplina</p><p className="font-bold text-[#003366]">{staticStation.title} ({staticStation.disciplineId})</p></div>
                  <div><p className="text-[10px] font-black text-gray-400 uppercase">Data da Execução</p><p className="font-bold text-[#003366]">{new Date().toLocaleDateString('pt-BR')}</p></div>
              </div>
          </div>

          <div className="bg-white p-8 rounded-[2rem] shadow-xl border-t-8 border-[#003366] print:shadow-none print:border-t-0 print:border-l-4 print:rounded-none print:p-4">
            <h3 className="text-[10px] font-black text-[#003366] uppercase mb-4 tracking-widest flex items-center gap-2">
              {isUC ? <FlaskConical size={14} className="print:hidden"/> : <ClipboardList size={14} className="print:hidden"/>} 
              {isUC ? 'Contexto da Bancada' : 'Cenário Clínico'}
            </h3>
            <p className="text-gray-700 leading-relaxed font-medium mb-6 print:text-sm">"{staticStation.scenario}"</p>
            <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 print:bg-transparent print:border-gray-200">
              <h4 className="text-[9px] font-black text-blue-800 uppercase mb-1 tracking-widest">🎯 Missão</h4>
              <p className="text-xs text-blue-900 font-bold">{staticStation.task}</p>
            </div>
          </div>

          {!isFinished && (
            <div className="bg-white p-6 rounded-2xl border border-gray-100 flex items-center justify-between shadow-sm print:hidden">
              <span className="flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                <Timer size={14} /> Cronômetro
              </span>
              <span className={`text-xl font-mono font-bold ${timer > 480 ? 'text-red-500 animate-pulse' : 'text-[#003366]'}`}>
                {formatTime(timer)}
              </span>
            </div>
          )}
        </div>

        {/* ÁREA DE INTERAÇÃO E RESULTADOS */}
        <div className="lg:col-span-2 print:block">
          {!isFinished ? (
            <div className="space-y-8 print:hidden">
              {/* NUVEM DE SELEÇÃO DO ALUNO (OCULTA NO PDF) */}
              <div className="bg-white p-8 rounded-[2.5rem] shadow-2xl border-2 border-dashed border-blue-100">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-4 flex items-center gap-2">
                  <History size={12}/> Sua Sequência de Ações:
                </label>
                <div className="flex flex-wrap gap-3 min-h-[120px] items-start content-start">
                  {selectedActions.length === 0 && (
                    <p className="text-gray-300 text-sm italic w-full text-center py-8">Toque nas ações da nuvem abaixo na ordem correta...</p>
                  )}
                  {selectedActions.map((idx, i) => (
                    <div key={i} className="bg-white pl-2 pr-4 py-2 rounded-xl shadow-md border-2 border-[#003366] text-xs font-black text-[#003366] flex items-center gap-3 animate-in zoom-in">
                      <span className="bg-[#003366] text-white w-6 h-6 rounded-lg flex items-center justify-center text-[10px]">{i + 1}</span>
                      {safeActionCloud[idx]}
                      <button onClick={() => toggleAction(idx)} className="text-red-400 hover:text-red-600 transition-colors">✕</button>
                    </div>
                  ))}
                </div>
              </div>

              {/* OPÇÕES DA NUVEM (OCULTA NO PDF) */}
              <div className="bg-white p-10 rounded-[3rem] shadow-sm border border-gray-100">
                <h3 className="text-[10px] font-black text-gray-400 uppercase mb-8 tracking-[0.2em] text-center">
                  {isUC ? 'Nuvem de Itens e Procedimentos' : 'Nuvem de Ações e Condutas'}
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {safeActionCloud.map((action, idx) => (
                    <button
                      key={idx}
                      disabled={selectedActions.includes(idx)}
                      onClick={() => toggleAction(idx)}
                      className={`p-5 rounded-2xl text-left text-xs font-bold transition-all border-2
                        ${selectedActions.includes(idx) 
                          ? 'bg-gray-50 border-gray-50 text-gray-200 opacity-40 cursor-not-allowed' 
                          : 'bg-white border-gray-100 text-[#003366] hover:border-[#D4A017] hover:shadow-xl active:scale-95'}
                      `}
                    >
                      {action}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            
            // === RESULTADOS E PDF ===
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-10 duration-700 print:space-y-4">
              
              {/* BOX DE NOTA */}
              <div className="bg-white p-10 rounded-[3rem] shadow-2xl text-center border-b-8 border-[#D4A017] relative overflow-hidden print:shadow-none print:border-2 print:border-gray-200 print:rounded-2xl print:p-6">
                <div className="absolute top-0 right-0 p-8 opacity-10 text-[#003366] print:hidden"><Trophy size={120}/></div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] mb-2">Desempenho Técnico</p>
                <h4 className="text-8xl font-black text-[#003366] tracking-tighter print:text-5xl">{score.toFixed(1)}</h4>
                <div className="mt-4 flex items-center justify-center gap-4">
                    <span className="px-4 py-1 bg-blue-50 text-blue-600 rounded-full text-[10px] font-black uppercase tracking-widest print:bg-transparent print:border print:border-blue-200">
                        Tempo de Execução: {formatTime(timer)}
                    </span>
                    <span className="px-4 py-1 bg-purple-50 text-purple-600 rounded-full text-[10px] font-black uppercase tracking-widest print:bg-transparent print:border print:border-purple-200">
                        {selectedActions.length} Etapas Realizadas
                    </span>
                </div>
              </div>

              {/* AVALIAÇÃO DA PERFORMANCE (A ESCOLHA DO ALUNO) */}
              <div className="bg-white p-10 rounded-[3rem] shadow-xl border border-gray-100 print:p-0 print:shadow-none print:border-none">
                <h4 className="text-lg font-black text-[#003366] uppercase mb-8 flex items-center gap-3 print:mb-4 print:text-sm print:border-b print:pb-2">
                  <Map size={20} className="text-[#D4A017] print:hidden"/> Análise Passo a Passo
                </h4>
                <div className="space-y-3 print:space-y-1">
                  {selectedActions.length === 0 && (
                    <p className="text-sm text-red-500 font-bold">Nenhuma ação foi selecionada.</p>
                  )}
                  {selectedActions.map((actionIdx, userPos) => {
                    const correctPos = safeOrderIndices.indexOf(actionIdx);
                    const isCorrect = correctPos !== -1;
                    const onTime = correctPos === userPos;

                    return (
                      <div key={userPos} className={`p-5 rounded-2xl border-2 flex items-center justify-between gap-4 transition-all print:p-2 print:border-b print:rounded-none
                        ${!isCorrect ? 'bg-red-50 border-red-100 print:bg-white' : onTime ? 'bg-green-50 border-green-100 print:bg-white' : 'bg-yellow-50 border-yellow-100 print:bg-white'}
                      `}>
                        <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-black shadow-sm print:w-6 print:h-6 print:rounded print:text-xs print:shadow-none
                            ${!isCorrect ? 'bg-red-500 text-white print:text-red-600 print:border print:border-red-200 print:bg-transparent' : onTime ? 'bg-green-600 text-white print:text-green-600 print:border print:border-green-200 print:bg-transparent' : 'bg-yellow-500 text-white print:text-yellow-600 print:border print:border-yellow-200 print:bg-transparent'}
                          `}>
                            {userPos + 1}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-gray-800 print:text-xs">{safeActionCloud[actionIdx]}</p>
                            <span className={`text-[9px] font-black uppercase tracking-tighter mt-1 block print:text-[8px]
                               ${!isCorrect ? 'text-red-500' : onTime ? 'text-green-600' : 'text-yellow-600'}
                            `}>
                                {!isCorrect ? '❌ Conduta Incorreta (Penalidade)' : onTime ? '✅ Na Ordem Correta' : `⚠️ Fora de Sequência (Deveria ser o ${correctPos + 1}º)`}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* GABARITO OFICIAL */}
              <div className="grid grid-cols-1 gap-6 print:gap-4">
                <div className="bg-[#003366] p-10 rounded-[3rem] shadow-2xl text-white print:bg-white print:text-black print:p-0 print:shadow-none">
                  <h4 className="text-lg font-black text-[#D4A017] uppercase mb-8 flex items-center gap-3 border-b border-white/10 pb-4 print:border-gray-200 print:text-[#003366] print:text-sm print:mb-4">
                    <CheckCircle2 size={20} className="print:hidden"/> Gabarito Oficial (Padrão-Ouro)
                  </h4>
                  <div className="space-y-4 print:space-y-1">
                    {safeOrderIndices.map((idx, i) => (
                      <div key={i} className="flex items-center gap-4 p-4 bg-white/5 rounded-2xl border border-white/10 print:p-2 print:border-b print:border-gray-100 print:rounded-none">
                        <span className="text-[#D4A017] font-black text-xs bg-white/10 w-6 h-6 rounded flex items-center justify-center print:bg-transparent print:border print:border-gray-300 print:text-gray-600">{i + 1}</span>
                        <p className="text-sm font-medium print:text-xs">{safeActionCloud[idx]}</p>
                      </div>
                    ))}
                  </div>
                </div>
                
                {/* CHECKLIST / CRITÉRIOS DE AVALIAÇÃO */}
                {staticStation.checklist && staticStation.checklist.length > 0 && (
                  <div className="bg-white p-10 rounded-[3rem] border-2 border-gray-100 shadow-xl print:p-4 print:shadow-none print:border print:border-gray-300 print:rounded-xl">
                    <h4 className="text-lg font-black text-[#003366] uppercase mb-8 flex items-center gap-3 border-b pb-4 print:text-sm print:mb-4 print:pb-2">
                      <span className="print:hidden">📋</span> Critérios de Avaliação (Checklist)
                    </h4>
                    <ul className="space-y-3 print:space-y-1">
                      {staticStation.checklist.map((item, i) => (
                        <li key={i} className="flex items-start gap-3 text-xs font-bold text-gray-600 print:text-[10px]">
                          <span className="text-[#D4A017] print:text-gray-400">●</span> {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* BOTÕES FINAIS (OCULTOS NA IMPRESSÃO) */}
              <div className="pt-6 flex flex-col sm:flex-row justify-center gap-4 print:hidden">
                <button 
                    onClick={handleDownloadPDF} 
                    className="flex items-center justify-center gap-3 bg-[#003366] text-white px-10 py-5 rounded-[2rem] font-black uppercase text-xs tracking-widest shadow-xl hover:bg-blue-900 transition-all"
                >
                  <Download size={18}/> Baixar Relatório (PDF)
                </button>
                <button 
                    onClick={onBack} 
                    className="bg-[#D4A017] text-[#003366] px-10 py-5 rounded-[2rem] font-black uppercase text-xs tracking-widest shadow-xl hover:scale-105 active:scale-95 transition-all"
                >
                  Sair da Estação
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* BOTÃO FLUTUANTE DE ENCERRAR (OCULTO NA IMPRESSÃO) */}
      {!isFinished && selectedActions.length > 0 && (
        <div className="fixed bottom-10 left-0 right-0 px-4 z-50 animate-in slide-in-from-bottom-10 print:hidden">
          <div className="max-w-md mx-auto">
            <button 
              onClick={calculateDetailedScore}
              className="w-full bg-[#003366] text-white py-6 rounded-[2.5rem] font-black uppercase text-sm tracking-[0.2em] shadow-[0_20px_50px_rgba(0,0,0,0.3)] border-2 border-[#D4A017] hover:bg-[#D4A017] hover:text-[#003366] transition-all flex items-center justify-center gap-4"
            >
              Encerrar Simulação <ChevronRight size={20}/>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default OsceView;