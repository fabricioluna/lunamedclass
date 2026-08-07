import React, { useState, useEffect, useMemo } from 'react';
import { Question } from '../../types';
import { fetchQuestionsOnce } from '../../services/questionsService';
import { useData } from '../../contexts/DataContext';

interface AreaQuizSetupViewProps {
  areaId: string;
  areaLabel: string;
  onBack: () => void;
  onStart: () => void;
}

// Setup do simulado de revisão cross-disciplina por Área de Conhecimento (Etapa 6) — reaproveita
// o mecanismo de embaralhar/cortar quantidade de QuizSetupView, mas filtra por
// `areaConhecimentoId` em vez de disciplina+unidade, então o banco cruza várias disciplinas.
// Subárea é um segundo filtro opcional, independente da Área (sem cascata) — só mostra as
// subáreas que de fato têm questão dentro dessa área, pra não levar a um resultado vazio.
const AreaQuizSetupView: React.FC<AreaQuizSetupViewProps> = ({ areaId, areaLabel, onBack, onStart }) => {
  const { subareasConhecimento } = useData();
  const [isFetching, setIsFetching] = useState(true);
  const [areaQuestions, setAreaQuestions] = useState<Question[]>([]);
  const [selectedSubareaIds, setSelectedSubareaIds] = useState<string[]>([]);
  const [quantity, setQuantity] = useState(10);
  const [orderMode, setOrderMode] = useState<'random' | 'sequential'>('random');

  const questionsKey = `quiz_questions_area_${areaId}`;

  useEffect(() => {
    let cancelled = false;
    setIsFetching(true);
    setSelectedSubareaIds([]);
    fetchQuestionsOnce()
      .then((all) => {
        if (cancelled) return;
        setAreaQuestions(all.filter((q) => q.areaConhecimentoId === areaId));
      })
      .catch((error) => {
        console.error('Erro ao buscar questões da área de conhecimento:', error);
      })
      .finally(() => {
        if (!cancelled) setIsFetching(false);
      });
    return () => {
      cancelled = true;
    };
  }, [areaId]);

  const availableSubareas = useMemo(() => {
    const counts = new Map<string, number>();
    areaQuestions.forEach((q) => {
      if (!q.subareaConhecimentoId) return;
      counts.set(q.subareaConhecimentoId, (counts.get(q.subareaConhecimentoId) || 0) + 1);
    });
    return subareasConhecimento
      .filter((s) => counts.has(s.id))
      .map((s) => ({ ...s, count: counts.get(s.id)! }));
  }, [areaQuestions, subareasConhecimento]);

  const filteredQuestions = useMemo(() => {
    if (selectedSubareaIds.length === 0) return areaQuestions;
    return areaQuestions.filter((q) => q.subareaConhecimentoId && selectedSubareaIds.includes(q.subareaConhecimentoId));
  }, [areaQuestions, selectedSubareaIds]);

  useEffect(() => {
    setQuantity((prev) => (filteredQuestions.length === 0 ? prev : Math.min(prev, filteredQuestions.length)));
  }, [filteredQuestions.length]);

  const toggleSubarea = (id: string) => {
    setSelectedSubareaIds((prev) => (prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]));
  };

  const handleQuantityChange = (val: number) => {
    if (isNaN(val)) return;
    setQuantity(Math.max(1, Math.min(val, filteredQuestions.length)));
  };

  const handleStart = () => {
    if (filteredQuestions.length === 0) return;

    const shuffled = [...filteredQuestions];
    if (orderMode === 'random') {
      shuffled.sort(() => Math.random() - 0.5);
    } else {
      shuffled.sort((a, b) => a.id.localeCompare(b.id));
    }

    localStorage.setItem(questionsKey, JSON.stringify(shuffled.slice(0, quantity)));
    onStart();
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-12 animate-in fade-in zoom-in duration-500">
      <button
        onClick={onBack}
        className="group flex items-center text-[#003366] font-bold mb-8 hover:text-[#D4A017] transition-all"
      >
        <span className="mr-2 transition-transform group-hover:-translate-x-1">←</span>
        Voltar às Áreas de Conhecimento
      </button>

      {isFetching ? (
        <div className="flex flex-col items-center justify-center py-24 bg-white rounded-[2.5rem] shadow-xl border border-gray-100">
          <div className="w-12 h-12 border-4 border-[#003366]/10 border-t-[#D4A017] rounded-full animate-spin mb-4"></div>
          <h3 className="text-[#003366] font-black uppercase tracking-widest text-xs">Reunindo questões de {areaLabel}...</h3>
        </div>
      ) : (
        <div className="bg-white rounded-[2.5rem] p-8 md:p-12 shadow-2xl border border-gray-100">
          <div className="text-center mb-10 border-b pb-8">
            <div className="text-5xl mb-4">📚</div>
            <h2 className="text-3xl font-black text-[#003366] uppercase mb-2 tracking-tighter">{areaLabel}</h2>
            <p className="text-[#D4A017] text-[10px] font-black uppercase tracking-[0.3em]">
              Revisão cruzando todas as disciplinas
            </p>
          </div>

          {areaQuestions.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-3xl border border-gray-100">
              <div className="text-3xl mb-3">📭</div>
              <p className="text-sm font-black uppercase tracking-widest text-[#003366]">Nenhuma questão nesta área ainda</p>
              <p className="text-xs text-gray-500 mt-2 font-medium">
                Volte quando o admin tiver marcado questões com "{areaLabel}".
              </p>
            </div>
          ) : (
            <>
              <p className="text-center text-xs font-bold text-gray-400 uppercase tracking-widest mb-8">
                {areaQuestions.length} questões disponíveis de {areaLabel}, de várias disciplinas
              </p>

              {availableSubareas.length > 0 && (
                <div className="mb-10">
                  <div className="flex justify-between items-center mb-4">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                      Estreitar por Subárea (opcional)
                    </label>
                    {selectedSubareaIds.length > 0 && (
                      <button onClick={() => setSelectedSubareaIds([])} className="text-[9px] font-bold text-red-500 uppercase underline hover:text-red-700 transition-colors">
                        Limpar
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {availableSubareas.map((s) => {
                      const isSelected = selectedSubareaIds.includes(s.id);
                      return (
                        <button
                          key={s.id}
                          onClick={() => toggleSubarea(s.id)}
                          className={`p-4 rounded-2xl text-left transition-all border-2 flex justify-between items-start gap-3 group
                            ${isSelected ? 'border-[#003366] bg-[#003366] text-white shadow-lg' : 'border-gray-100 bg-gray-50 text-gray-400 hover:border-gray-200'}
                          `}
                        >
                          <span className="text-xs font-bold uppercase tracking-tight leading-snug">{s.label}</span>
                          <span className={`text-[9px] font-black px-2 py-0.5 rounded-full shrink-0 mt-0.5 ${isSelected ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-500'}`}>{s.count} Q</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {filteredQuestions.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-3xl border border-gray-100 mb-10">
                  <p className="text-sm font-black uppercase tracking-widest text-[#003366]">Nenhuma questão nessa combinação</p>
                  <p className="text-xs text-gray-500 mt-2 font-medium">Tente selecionar outra subárea, ou limpe o filtro.</p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
                    <div className="p-6 bg-gray-50 rounded-3xl border border-gray-100 flex flex-col justify-center">
                      <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-4 text-center">Quantidade</label>
                      <div className="flex items-center justify-center gap-4">
                        <button onClick={() => handleQuantityChange(quantity - 1)} className="w-10 h-10 bg-white rounded-xl border border-gray-200 text-[#003366] font-black flex items-center justify-center hover:bg-[#D4A017] transition-colors">-</button>
                        <div className="relative">
                          <input type="number" value={quantity} onChange={(e) => handleQuantityChange(parseInt(e.target.value))} className="w-20 bg-white p-3 rounded-2xl border-2 border-[#003366] outline-none text-[#003366] font-black text-center text-xl" min="1" max={filteredQuestions.length} />
                          <span className="absolute -bottom-6 left-0 right-0 text-center text-[9px] font-bold text-gray-400 uppercase">Máx: {filteredQuestions.length}</span>
                        </div>
                        <button onClick={() => handleQuantityChange(quantity + 1)} className="w-10 h-10 bg-white rounded-xl border border-gray-200 text-[#003366] font-black flex items-center justify-center hover:bg-[#D4A017] transition-colors">+</button>
                      </div>
                    </div>

                    <div className="p-6 bg-gray-50 rounded-3xl border border-gray-100 flex flex-col justify-center">
                      <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-4 text-center">Ordem das Questões</label>
                      <div className="flex bg-gray-200 rounded-xl p-1 relative">
                        <button
                          onClick={() => setOrderMode('random')}
                          className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all z-10 ${orderMode === 'random' ? 'bg-white text-[#003366] shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                        >
                          Aleatória
                        </button>
                        <button
                          onClick={() => setOrderMode('sequential')}
                          className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all z-10 ${orderMode === 'sequential' ? 'bg-white text-[#003366] shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                        >
                          Sequencial
                        </button>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={handleStart}
                    className="w-full py-6 rounded-[2rem] font-black uppercase text-sm tracking-[0.2em] shadow-xl transition-all bg-[#003366] text-white hover:bg-[#D4A017] hover:text-[#003366] hover:scale-[1.02]"
                  >
                    Gerar Simulado ({quantity})
                  </button>
                </>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default AreaQuizSetupView;
