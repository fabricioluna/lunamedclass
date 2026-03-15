import React, { useState } from 'react';
import { Question } from '../types';
import { ArrowLeft, ArrowRight } from 'lucide-react';

interface InteractiveQuizProps {
  questions: Question[];
  onFinish: (score: number, answers: Record<string, number>) => void;
  // NOVO: Evento disparado no EXATO MOMENTO em que o aluno responde
  onAnswerQuestion?: (questionId: string, isCorrect: boolean, theme: string) => void;
}

const InteractiveQuiz: React.FC<InteractiveQuizProps> = ({ questions, onFinish, onAnswerQuestion }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [score, setScore] = useState(0);

  const handleOptionClick = (questionId: string, optionIndex: number, correctIndex: number) => {
    if (answers[questionId] !== undefined) return;

    setAnswers(prev => ({ ...prev, [questionId]: optionIndex }));
    const isCorrect = optionIndex === correctIndex;
    
    if (isCorrect) {
      setScore(prev => prev + 1);
    }

    // AVISAR A BASE DE DADOS IMEDIATAMENTE ("Gota a Gota")
    if (onAnswerQuestion) {
      const q = questions.find(x => x.id === questionId);
      if (q) onAnswerQuestion(questionId, isCorrect, q.theme);
    }
  };

  const nextQuestion = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(prev => prev + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const prevQuestion = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const q = questions[currentIndex];
  const userAnswer = answers[q.id];
  const isAnswered = userAnswer !== undefined;
  const isCorrect = isAnswered && userAnswer === q.answer;
  const answeredCount = Object.keys(answers).length;
  const isLastQuestion = currentIndex === questions.length - 1;
  const isCompleted = answeredCount === questions.length;
  const progress = ((currentIndex + 1) / questions.length) * 100;

  return (
    <div className="space-y-8 pb-40">
      {/* Progress Bar */}
      <div className="sticky top-20 z-40 bg-[#f4f7f6]/80 backdrop-blur-md py-6 border-b border-gray-200/50">
        <div className="flex justify-between items-end mb-3 px-2">
          <div className="flex flex-col">
            <span className="text-[10px] font-black text-[#003366] uppercase tracking-[0.2em]">Sessão de Prática</span>
            <span className="text-xl font-black text-[#003366]">Evolução</span>
          </div>
          <div className="text-right">
            <span className="text-2xl font-black text-[#D4A017]">{Math.round(progress)}%</span>
            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Questão {currentIndex + 1} de {questions.length}</p>
          </div>
        </div>
        <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden">
          <div 
            className="bg-[#003366] h-full transition-all duration-700 ease-in-out" 
            style={{ width: `${progress}%` }}
          ></div>
        </div>
      </div>

      {/* Main Question Card */}
      <div className="animate-in fade-in slide-in-from-right-4 duration-500">
        <div 
          className={`bg-white rounded-[2.5rem] shadow-xl transition-all duration-700 overflow-hidden border-2
            ${isAnswered 
              ? (isCorrect ? 'border-green-500 shadow-green-100' : 'border-red-400 shadow-red-100') 
              : 'border-transparent'}
          `}
        >
          {q.image && (
            <div className="w-full h-64 md:h-96 bg-gray-100 border-b overflow-hidden group">
              <img 
                src={q.image} 
                alt="Material Prático" 
                className="w-full h-full object-contain transition-transform duration-500 group-hover:scale-105"
              />
            </div>
          )}

          <div className="p-8 md:p-12">
            <div className="flex flex-wrap items-center gap-3 mb-8">
              <span className="bg-[#003366] text-white px-4 py-1.5 rounded-full font-black text-xs uppercase tracking-widest">
                Questão {currentIndex + 1}
              </span>
              <span className="bg-orange-50 text-[#D4A017] px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border border-orange-100">
                {q.theme}
              </span>
            </div>
            
            <h4 className="text-xl md:text-2xl font-bold text-[#003366] mb-10 leading-[1.6] tracking-tight">
              {q.q}
            </h4>

            <div className="grid gap-4">
              {q.options.map((opt, optIdx) => {
                let buttonClass = "w-full text-left p-6 rounded-2xl border-2 transition-all duration-300 flex items-center gap-5 ";
                
                if (!isAnswered) {
                  buttonClass += "border-gray-50 bg-gray-50 hover:border-[#D4A017] hover:bg-white hover:shadow-lg group";
                } else {
                  if (optIdx === q.answer) {
                    buttonClass += "border-green-500 bg-green-50 text-green-900 font-bold ring-4 ring-green-100";
                  } else if (optIdx === userAnswer) {
                    buttonClass += "border-red-500 bg-red-50 text-red-900";
                  } else {
                    buttonClass += "border-gray-50 text-gray-300 opacity-50";
                  }
                }

                return (
                  <button
                    key={optIdx}
                    disabled={isAnswered}
                    onClick={() => handleOptionClick(q.id, optIdx, q.answer)}
                    className={buttonClass}
                  >
                    <span className={`flex-shrink-0 w-10 h-10 rounded-xl border-2 flex items-center justify-center font-black text-sm transition-all
                      ${!isAnswered ? 'border-gray-200 group-hover:border-[#D4A017] group-hover:bg-[#D4A017] group-hover:text-white' : 
                        optIdx === q.answer ? 'bg-green-500 border-green-500 text-white shadow-lg' : 
                        optIdx === userAnswer ? 'bg-red-500 border-red-500 text-white' : 'border-gray-100 text-gray-200'}
                    `}>
                      {String.fromCharCode(65 + optIdx)}
                    </span>
                    <span className="text-sm md:text-base leading-relaxed">{opt}</span>
                  </button>
                );
              })}
            </div>

            {isAnswered && (
              <div className={`mt-10 p-8 rounded-3xl animate-in fade-in slide-in-from-top-4 duration-700 border
                ${isCorrect ? 'bg-green-50 border-green-200 text-green-900' : 'bg-red-50 border-red-200 text-red-900'}
              `}>
                <div className="flex items-center gap-4 mb-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xl shadow-sm
                    ${isCorrect ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}
                  `}>
                    {isCorrect ? '✓' : '✕'}
                  </div>
                  <div>
                    <h5 className="font-black text-xs uppercase tracking-[0.2em] opacity-70">
                      {isCorrect ? 'Acerto Técnico' : 'Ponto de Revisão'}
                    </h5>
                    <p className="font-bold text-lg">Feedback Acadêmico</p>
                  </div>
                </div>
                <p className="text-sm md:text-base leading-relaxed font-medium opacity-90 italic">
                  {q.explanation}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Local Navigation Controls */}
        <div className="mt-8 flex justify-between items-center gap-4">
          <button 
            onClick={prevQuestion}
            disabled={currentIndex === 0}
            className={`flex-1 flex items-center justify-center gap-3 py-5 rounded-2xl font-black uppercase text-xs tracking-widest transition-all
              ${currentIndex === 0 ? 'bg-gray-100 text-gray-300 cursor-not-allowed' : 'bg-white border-2 border-[#003366] text-[#003366] hover:bg-gray-50'}
            `}
          >
            <ArrowLeft size={16} /> Anterior
          </button>
          
          {!isLastQuestion ? (
            <button 
              onClick={nextQuestion}
              disabled={!isAnswered}
              className={`flex-1 flex items-center justify-center gap-3 py-5 rounded-2xl font-black uppercase text-xs tracking-widest transition-all
                ${!isAnswered ? 'bg-gray-100 text-gray-300 cursor-not-allowed' : 'bg-[#003366] text-white hover:bg-[#D4A017] hover:text-[#003366] shadow-lg'}
              `}
            >
              Próxima <ArrowRight size={16} />
            </button>
          ) : (
            <div className="flex-1"></div>
          )}
        </div>
      </div>

      {/* Floating Score Bar */}
      <div className="fixed bottom-8 left-0 right-0 z-50 px-4 pointer-events-none">
        <div className="max-w-md mx-auto bg-[#003366] text-white p-5 rounded-[2rem] shadow-2xl flex items-center justify-between border-2 border-[#D4A017] pointer-events-auto">
          <div className="flex items-center space-x-5 pl-2">
            <div className="bg-white/10 p-3 rounded-2xl">
              <span className="text-2xl">📊</span>
            </div>
            <div>
              <p className="text-[9px] font-black uppercase tracking-widest text-blue-200">Pontuação</p>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-black text-[#D4A017]">{score}</span>
                <span className="text-xs font-bold opacity-40">/ {questions.length}</span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center">
            {isCompleted && isLastQuestion ? (
              <button 
                onClick={() => onFinish(score, answers)}
                className="bg-[#D4A017] text-[#003366] px-8 py-3.5 rounded-2xl font-black uppercase text-xs tracking-widest hover:scale-105 transition-all shadow-xl"
              >
                Ver Relatório
              </button>
            ) : (
              <div className="pr-4 text-right">
                <p className="text-[8px] font-black uppercase tracking-widest text-orange-300">{isCompleted ? 'Finalize na última' : 'Responda todas'}</p>
                <div className="flex gap-1 mt-1 justify-end">
                   {questions.map((quest, i) => (
                     <div 
                      key={i} 
                      className={`h-1 rounded-full transition-all duration-300
                        ${i === currentIndex ? 'w-4 bg-[#D4A017]' : answers[quest.id] !== undefined ? 'w-2 bg-green-400' : 'w-2 bg-white/10'}`}
                      ></div>
                   ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default InteractiveQuiz;