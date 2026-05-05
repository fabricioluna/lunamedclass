import React, { useState, useEffect } from 'react';
import { Question } from '../types.ts';
import { ArrowLeft, ArrowRight, Scissors, SkipForward, LayoutGrid, X } from 'lucide-react';

interface InteractiveQuizProps {
  questions: Question[];
  onFinish: (score: number, answers: Record<string, number>) => void;
  onAnswerQuestion?: (questionId: string, isCorrect: boolean, theme: string) => void;
  storageKey: string;
  resumeState?: any;
}

const InteractiveQuiz: React.FC<InteractiveQuizProps> = ({ questions, onFinish, onAnswerQuestion, storageKey, resumeState }) => {
  const [currentIndex, setCurrentIndex] = useState(resumeState?.currentIndex || 0);
  const [answers, setAnswers] = useState<Record<string, number>>(resumeState?.answers || {});
  const [score, setScore] = useState(resumeState?.score || 0);
  const [draftAnswers, setDraftAnswers] = useState<Record<string, number>>(resumeState?.draftAnswers || {});
  const [eliminatedOptions, setEliminatedOptions] = useState<Record<string, number[]>>(resumeState?.eliminatedOptions || {});
  const [isGridOpen, setIsGridOpen] = useState(false);

  useEffect(() => {
    const stateToSave = {
      currentIndex,
      answers,
      score,
      draftAnswers,
      eliminatedOptions
    };
    localStorage.setItem(storageKey, JSON.stringify(stateToSave));
  }, [currentIndex, answers, score, draftAnswers, eliminatedOptions, storageKey]);

  const handleSelectOption = (questionId: string, optionIndex: number) => {
    if (answers[questionId] !== undefined) return; 
    if (eliminatedOptions[questionId]?.includes(optionIndex)) return; 

    setDraftAnswers((prev: Record<string, number>) => ({ ...prev, [questionId]: optionIndex }));
  };

  const toggleEliminateOption = (questionId: string, optionIndex: number) => {
    if (answers[questionId] !== undefined) return; 

    setEliminatedOptions((prev: Record<string, number[]>) => {
      const currentEliminated = prev[questionId] || [];
      const isEliminated = currentEliminated.includes(optionIndex);
      let newEliminated;

      if (isEliminated) {
        newEliminated = currentEliminated.filter(idx => idx !== optionIndex);
      } else {
        newEliminated = [...currentEliminated, optionIndex];
      }

      return { ...prev, [questionId]: newEliminated };
    });

    if (draftAnswers[questionId] === optionIndex) {
      setDraftAnswers((prev: Record<string, number>) => {
        const newDrafts = { ...prev };
        delete newDrafts[questionId];
        return newDrafts;
      });
    }
  };

  const confirmAnswer = (questionId: string, correctIndex: number) => {
    const selectedOpt = draftAnswers[questionId];
    if (selectedOpt === undefined || answers[questionId] !== undefined) return;

    setAnswers((prev: Record<string, number>) => ({ ...prev, [questionId]: selectedOpt }));
    
    const isCorrect = selectedOpt === correctIndex;
    if (isCorrect) {
      setScore((prev: number) => prev + 1);
    }

    if (onAnswerQuestion) {
      const q = questions.find(x => x.id === questionId);
      if (q) onAnswerQuestion(questionId, isCorrect, q.theme);
    }
  };

  const nextQuestion = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((prev: number) => prev + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const prevQuestion = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev: number) => prev - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const jumpToQuestion = (index: number) => {
    setCurrentIndex(index);
    setIsGridOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const q = questions[currentIndex];
  const userAnswer = answers[q.id];
  const isAnswered = userAnswer !== undefined;
  const isCorrect = isAnswered && userAnswer === q.answer;
  const isLastQuestion = currentIndex === questions.length - 1;
  const progress = ((currentIndex + 1) / questions.length) * 100;
  
  const unansweredCount = questions.length - Object.keys(answers).length;

  return (
    <div className="space-y-6 pb-32">
      
      {/* --- BARRA DE PROGRESSO SUPERIOR --- */}
      <div className="sticky top-20 z-40 bg-[#f4f7f6]/90 backdrop-blur-md py-4 border-b border-gray-200/50">
        <div className="flex justify-between items-end mb-2 px-2">
          <div className="flex flex-col">
            <span className="text-[9px] font-black text-[#003366] uppercase tracking-[0.2em]">Sessão de Prática</span>
            <span className="text-lg font-black text-[#003366]">Evolução</span>
          </div>
          <div className="text-right">
            <span className="text-xl font-black text-[#D4A017]">{Math.round(progress)}%</span>
            <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest">Questão {currentIndex + 1} de {questions.length}</p>
          </div>
        </div>
        <div className="w-full bg-gray-200 h-1.5 rounded-full overflow-hidden">
          <div 
            className="bg-[#003366] h-full transition-all duration-700 ease-in-out" 
            style={{ width: `${progress}%` }}
          ></div>
        </div>
      </div>

      {/* --- CARD PRINCIPAL DA QUESTÃO --- */}
      <div className="animate-in fade-in slide-in-from-right-4 duration-500">
        <div 
          className={`bg-white rounded-[2rem] shadow-lg transition-all duration-700 overflow-hidden border-2
            ${isAnswered 
              ? (isCorrect ? 'border-green-500 shadow-green-100' : 'border-red-400 shadow-red-100') 
              : 'border-transparent'}
          `}
        >
          {q.image && (
            <div className="w-full h-48 md:h-64 bg-gray-100 border-b overflow-hidden group">
              <img 
                src={q.image} 
                alt="Material Prático" 
                className="w-full h-full object-contain transition-transform duration-500 group-hover:scale-105"
              />
            </div>
          )}

          <div className="p-5 md:p-8">
            <div className="flex flex-wrap items-center gap-2 mb-5">
              <span className="bg-[#003366] text-white px-3 py-1 rounded-full font-black text-[10px] uppercase tracking-widest">
                Questão {currentIndex + 1}
              </span>
              <span className="bg-orange-50 text-[#D4A017] px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border border-orange-100">
                {q.theme}
              </span>
            </div>
            
            <h4 className="text-lg md:text-xl font-bold text-[#003366] mb-6 leading-relaxed tracking-tight">
              {q.q}
            </h4>

            <div className="grid gap-3">
              {q.options.map((opt, optIdx) => {
                const isEliminated = eliminatedOptions[q.id]?.includes(optIdx);
                const isDrafted = draftAnswers[q.id] === optIdx;

                let wrapperClass = "relative flex items-stretch w-full rounded-xl border-2 transition-all duration-300 ";
                let letterClass = "flex-shrink-0 w-8 h-8 rounded-lg border-2 flex items-center justify-center font-black text-xs transition-all ";
                let textClass = "text-sm md:text-[15px] leading-snug transition-all duration-300 ";

                if (!isAnswered) {
                  if (isEliminated) {
                    wrapperClass += "border-gray-200 bg-gray-50 opacity-50";
                    letterClass += "border-gray-300 text-gray-400 bg-gray-200";
                    textClass += "text-gray-400 line-through";
                  } else if (isDrafted) {
                    wrapperClass += "border-[#003366] bg-blue-50/50 ring-2 ring-blue-50 shadow-sm";
                    letterClass += "bg-[#003366] border-[#003366] text-white shadow-md";
                    textClass += "text-[#003366] font-semibold";
                  } else {
                    wrapperClass += "border-gray-100 bg-white hover:border-[#D4A017] hover:shadow-sm group";
                    letterClass += "border-gray-200 text-gray-400 group-hover:border-[#D4A017] group-hover:bg-[#D4A017] group-hover:text-white";
                    textClass += "text-gray-700";
                  }
                } else {
                  if (optIdx === q.answer) {
                    wrapperClass += "border-green-500 bg-green-50 ring-2 ring-green-100";
                    letterClass += "bg-green-500 border-green-500 text-white shadow-md";
                    textClass += "text-green-900 font-bold";
                  } else if (optIdx === userAnswer) {
                    wrapperClass += "border-red-500 bg-red-50";
                    letterClass += "bg-red-500 border-red-500 text-white";
                    textClass += "text-red-900 font-semibold";
                  } else {
                    wrapperClass += "border-gray-100 bg-gray-50 opacity-40";
                    letterClass += "border-gray-200 text-gray-300 bg-gray-100";
                    textClass += "text-gray-400";
                  }
                }

                return (
                  <div key={optIdx} className={wrapperClass}>
                    <button
                      disabled={isAnswered || isEliminated}
                      onClick={() => handleSelectOption(q.id, optIdx)}
                      className="flex-1 text-left p-3 md:p-4 flex items-center gap-3 outline-none focus:outline-none"
                    >
                      <span className={letterClass}>
                        {String.fromCharCode(65 + optIdx)}
                      </span>
                      <span className={textClass}>{opt}</span>
                    </button>
                    
                    {!isAnswered && (
                      <div className="flex items-center pr-3">
                        <button
                          onClick={() => toggleEliminateOption(q.id, optIdx)}
                          className={`p-2 rounded-lg transition-all ${
                            isEliminated 
                              ? 'bg-red-100 text-red-500 hover:bg-red-200' 
                              : 'bg-gray-100 text-gray-400 hover:bg-gray-200 hover:text-gray-700'
                          }`}
                          title={isEliminated ? "Restaurar alternativa" : "Eliminar alternativa"}
                        >
                          <Scissors size={16} />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {!isAnswered && draftAnswers[q.id] !== undefined && (
              <div className="mt-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <button
                  onClick={() => confirmAnswer(q.id, q.answer)}
                  className="w-full bg-[#003366] text-white py-3.5 rounded-xl font-black uppercase tracking-widest text-xs hover:bg-[#D4A017] hover:text-[#003366] transition-all shadow-md"
                >
                  Confirmar Resposta
                </button>
              </div>
            )}

            {isAnswered && (
              <div className={`mt-6 p-5 md:p-6 rounded-2xl animate-in fade-in slide-in-from-top-4 duration-500 border
                ${isCorrect ? 'bg-green-50 border-green-200 text-green-900' : 'bg-red-50 border-red-200 text-red-900'}
              `}>
                <div className="flex items-center gap-3 mb-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shadow-sm
                    ${isCorrect ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}
                  `}>
                    {isCorrect ? '✓' : '✕'}
                  </div>
                  <div>
                    <h5 className="font-black text-[10px] uppercase tracking-[0.1em] opacity-70">
                      {isCorrect ? 'Acerto Técnico' : 'Ponto de Revisão'}
                    </h5>
                    <p className="font-bold text-sm md:text-base">Feedback Acadêmico</p>
                  </div>
                </div>
                <p className="text-xs md:text-sm leading-relaxed font-medium opacity-90 italic">
                  {q.explanation}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* --- BOTÕES ANTERIOR E PRÓXIMA (Permite Pular) --- */}
        <div className="mt-6 flex justify-between items-center gap-3">
          <button 
            onClick={prevQuestion}
            disabled={currentIndex === 0}
            className={`flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all
              ${currentIndex === 0 ? 'bg-gray-100 text-gray-300 cursor-not-allowed' : 'bg-white border-2 border-[#003366] text-[#003366] hover:bg-gray-50 shadow-sm'}
            `}
          >
            <ArrowLeft size={14} /> Anterior
          </button>
          
          {!isLastQuestion ? (
            <button 
              onClick={nextQuestion}
              className={`flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all
                ${isAnswered ? 'bg-[#003366] text-white hover:bg-[#D4A017] hover:text-[#003366] shadow-md' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'}
              `}
            >
              {isAnswered ? 'Próxima' : 'Pular' } {isAnswered ? <ArrowRight size={14} /> : <SkipForward size={14} />}
            </button>
          ) : (
            <button 
              onClick={() => onFinish(score, answers)}
              className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all bg-[#D4A017] text-[#003366] hover:scale-105 shadow-md"
            >
              Ver Relatório
            </button>
          )}
        </div>
      </div>

      {/* --- MENU GRID DE NAVEGAÇÃO RÁPIDA (Drawer) --- */}
      {isGridOpen && (
        <div className="fixed inset-0 z-[60] flex flex-col justify-end pointer-events-auto">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setIsGridOpen(false)}></div>
          <div className="bg-white rounded-t-[2rem] p-6 pb-24 shadow-2xl relative z-10 animate-in slide-in-from-bottom-8 duration-300 max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-black text-[#003366] uppercase tracking-widest text-sm">Navegação do Simulado</h3>
              <button onClick={() => setIsGridOpen(false)} className="p-2 bg-gray-100 rounded-full text-gray-500 hover:bg-gray-200">
                <X size={16} />
              </button>
            </div>
            
            <div className="flex items-center gap-4 mb-6 text-[10px] font-bold uppercase tracking-widest text-gray-400">
              <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-green-500"></div> Acertos</div>
              <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-red-500"></div> Erros</div>
              <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-gray-200"></div> Pendentes</div>
            </div>

            <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 gap-3">
              {questions.map((quest, idx) => {
                const isQAnswered = answers[quest.id] !== undefined;
                const isQCorrect = isQAnswered && answers[quest.id] === quest.answer;
                
                let btnClass = "aspect-square rounded-xl font-black text-sm flex items-center justify-center transition-all ";
                
                if (idx === currentIndex) {
                  btnClass += "ring-4 ring-[#D4A017] ring-offset-2 ";
                }

                if (!isQAnswered) {
                  btnClass += "bg-gray-100 text-gray-400 hover:bg-gray-200";
                } else if (isQCorrect) {
                  btnClass += "bg-green-500 text-white shadow-sm";
                } else {
                  btnClass += "bg-red-500 text-white shadow-sm";
                }

                return (
                  <button key={idx} onClick={() => jumpToQuestion(idx)} className={btnClass}>
                    {idx + 1}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* --- BARRA FLUTUANTE INFERIOR --- */}
      <div className="fixed bottom-6 left-0 right-0 z-50 px-4 pointer-events-none">
        <div className="max-w-md mx-auto bg-[#003366] text-white p-3 rounded-3xl shadow-xl flex items-center justify-between border-2 border-[#D4A017] pointer-events-auto">
          
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsGridOpen(true)}
              className="bg-white/10 p-3 rounded-xl hover:bg-white/20 transition-all flex items-center gap-2"
              title="Abrir mapa de questões"
            >
              <LayoutGrid size={18} className="text-[#D4A017]" />
              {unansweredCount > 0 && (
                <span className="bg-[#D4A017] text-[#003366] text-[9px] font-black px-1.5 py-0.5 rounded-md">
                  {unansweredCount} pendentes
                </span>
              )}
            </button>
            
            <div className="hidden sm:block">
              <p className="text-[8px] font-black uppercase tracking-widest text-blue-200">Progresso</p>
              <div className="flex items-baseline gap-1">
                <span className="text-sm font-black text-white">{Object.keys(answers).length}</span>
                <span className="text-[10px] font-bold opacity-40">/ {questions.length} resp.</span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center pl-2 border-l border-white/10">
            <div className="pr-3 text-right">
              <p className="text-[8px] font-black uppercase tracking-widest text-blue-200">Pontuação</p>
              <div className="flex items-baseline gap-1">
                <span className="text-xl font-black text-[#D4A017]">{score}</span>
                <span className="text-[10px] font-bold opacity-40">/ {questions.length}</span>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default InteractiveQuiz;