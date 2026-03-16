import React, { useState, useEffect, useRef } from 'react';
import InteractiveQuiz from '../components/InteractiveQuiz';
import { Question, SimulationInfo, QuizDetail } from '../types';

interface QuizViewProps {
  questions: Question[];
  discipline: SimulationInfo;
  onBack: () => void;
  onSaveResult: (score: number, total: number, quizTitle?: string, type?: 'teorico' | 'laboratorio' | 'osce', timeSpent?: number, details?: QuizDetail[]) => void;
}

const QuizView: React.FC<QuizViewProps> = ({ questions, discipline, onBack, onSaveResult }) => {
  // Chaves do localStorage
  const storageKey = `quiz_progress_${discipline.title.replace(/\s+/g, '_')}`;
  const questionsKey = `quiz_questions_${discipline.title.replace(/\s+/g, '_')}`;

  // Lista de questões ativas (pode ser total ou só as erradas)
  const [activeQuestions, setActiveQuestions] = useState<Question[]>(questions);
  const [quizKey, setQuizKey] = useState(0); 
  const [userAnswers, setUserAnswers] = useState<Record<string, number>>({});

  const [isFinished, setIsFinished] = useState(false);
  const [finalScore, setFinalScore] = useState(0);
  const [themeStats, setThemeStats] = useState<{theme: string, correct: number, total: number}[]>([]);
  
  // Puxa o estado salvo (se houver) apenas na montagem inicial
  const [savedState, setSavedState] = useState<any>(() => {
    const saved = localStorage.getItem(storageKey);
    return saved ? JSON.parse(saved) : null;
  });

  // IDENTIFICADORES ANALÍTICOS (Novo: Session ID e Controle de Tempo)
  const [sessionId] = useState(() => `sess_${Date.now()}_${Math.random().toString(36).substring(2,9)}`);
  const lastQuestionTimeRef = useRef(Date.now());

  // Atualiza as activeQuestions se as questions originais mudarem
  useEffect(() => {
    setActiveQuestions(questions);
  }, [questions]);

  // GRAVAÇÃO PARCIAL (GOTA A GOTA COM ANALYTICS)
  const handlePartialAnswer = (questionId: string, isCorrect: boolean, theme: string) => {
    const now = Date.now();
    
    // Calcula o tempo exato gasto nesta questão (em segundos)
    let timeSpentSecs = Math.floor((now - lastQuestionTimeRef.current) / 1000);
    
    // Teto de segurança: se o aluno foi almoçar (mais de 10 min), limitamos a 3 min para não distorcer as médias globais
    if (timeSpentSecs > 600) timeSpentSecs = 180; 
    
    // Reseta o cronômetro para a próxima questão
    lastQuestionTimeRef.current = now;

    const uniqueTitles = Array.from(new Set(activeQuestions.map(q => q.quizTitle).filter(Boolean)));
    const quizName = uniqueTitles.length === 1 ? uniqueTitles[0] : 'Simulado Misto';

    onSaveResult(
      isCorrect ? 1 : 0, 
      1,                 
      quizName, 
      'teorico', 
      timeSpentSecs, // Enviando o tempo real desta questão
      [{ questionId, isCorrect, theme, sessionId } as any] // Injetando o Session ID silenciosamente
    );
  };

  const handleFinish = (score: number, answers: Record<string, number>) => {
    setFinalScore(score);
    setUserAnswers(answers);
    
    const themes = Array.from(new Set(activeQuestions.map(q => q.theme)));
    const stats = themes.map(theme => {
      const themeQs = activeQuestions.filter(q => q.theme === theme);
      const themeCorrect = themeQs.filter(q => answers[q.id] === q.answer).length;
      return { theme, correct: themeCorrect, total: themeQs.length };
    });
    
    setThemeStats(stats);
    setIsFinished(true);
    
    localStorage.removeItem(storageKey);
    localStorage.removeItem(questionsKey);
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleRetakeAll = () => {
    localStorage.setItem(questionsKey, JSON.stringify(questions)); 
    setSavedState(null); 
    localStorage.removeItem(storageKey);
    
    setActiveQuestions(questions);
    setQuizKey(k => k + 1); 
    setIsFinished(false);
    setFinalScore(0);
    lastQuestionTimeRef.current = Date.now(); // Reseta o relógio
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleRetakeWrong = () => {
    const wrongQ = activeQuestions.filter(q => userAnswers[q.id] !== q.answer);
    if (wrongQ.length === 0) return;

    localStorage.setItem(questionsKey, JSON.stringify(wrongQ)); 
    setSavedState(null);
    localStorage.removeItem(storageKey);
    
    setActiveQuestions(wrongQ);
    setQuizKey(k => k + 1);
    setIsFinished(false);
    setFinalScore(0);
    lastQuestionTimeRef.current = Date.now(); // Reseta o relógio
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const getPerformanceAdvice = () => {
    if (themeStats.length === 0) return null;
    
    const sorted = [...themeStats].sort((a, b) => (b.correct / b.total) - (a.correct / a.total));
    const strong = sorted[0];
    const weak = sorted[sorted.length - 1];
    const mainRef = discipline.references?.[0]?.title || "Material Base da Disciplina";

    return {
      strong: strong.theme,
      weak: weak.theme,
      isPerfect: finalScore === activeQuestions.length,
      recommendation: mainRef
    };
  };

  const advice = getPerformanceAdvice();
  const wrongCount = activeQuestions.filter(q => userAnswers[q.id] !== q.answer).length;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 relative">
      <div className="mb-8 flex justify-between items-center">
        <button onClick={onBack} className="text-[#003366] font-bold hover:text-[#D4A017] transition-colors">← Voltar</button>
        <div className="text-right">
          <h2 className="text-xl font-black text-[#003366] uppercase">{discipline.title}</h2>
          <p className="text-[8px] text-gray-400 uppercase font-black">{activeQuestions.length} Questões</p>
        </div>
      </div>

      {!isFinished && (
        <InteractiveQuiz 
          key={quizKey}
          questions={activeQuestions} 
          onFinish={(score, ans) => handleFinish(score, ans)} 
          onAnswerQuestion={handlePartialAnswer}
          storageKey={storageKey}
          resumeState={savedState}
        />
      )}

      {isFinished && (
        <div className="space-y-8 animate-in zoom-in duration-500 pb-20">
          <div className="bg-white p-12 md:p-16 rounded-[3rem] shadow-2xl text-center border border-gray-100">
            <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-4xl mx-auto mb-6">🏆</div>
            <h3 className="text-3xl font-black text-[#003366] mb-8 uppercase tracking-tighter">Desempenho no Simulado</h3>
            <div className="text-8xl font-black text-[#D4A017] mb-4 tracking-tighter">
              {finalScore}<span className="text-2xl text-gray-300 font-bold ml-2">/ {activeQuestions.length}</span>
            </div>
            <div className="w-full bg-gray-100 h-4 rounded-full max-w-sm mx-auto overflow-hidden shadow-inner mb-10">
              <div 
                className="bg-[#003366] h-full transition-all duration-1000" 
                style={{width: `${(finalScore / activeQuestions.length) * 100}%`}}
              ></div>
            </div>
            <p className="text-xs font-black text-gray-400 uppercase tracking-widest">
              Aproveitamento: {Math.round((finalScore / activeQuestions.length) * 100)}%
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-green-50 p-8 rounded-[2.5rem] border-2 border-green-100 flex flex-col h-full">
              <div className="flex items-center gap-3 mb-4">
                <span className="text-2xl">🌟</span>
                <h4 className="text-xs font-black uppercase text-green-800 tracking-widest">Seu Ponto Forte</h4>
              </div>
              <p className="text-xl font-black text-green-900 mb-2">{advice?.strong}</p>
              <p className="text-xs text-green-700 font-medium leading-relaxed">Parabéns! Você demonstrou domínio sólido neste eixo. Mantenha revisões periódicas para fixação.</p>
            </div>

            <div className="bg-orange-50 p-8 rounded-[2.5rem] border-2 border-orange-100 flex flex-col h-full">
              <div className="flex items-center gap-3 mb-4">
                <span className="text-2xl">📚</span>
                <h4 className="text-xs font-black uppercase text-orange-800 tracking-widest">Sugestão de Estudo</h4>
              </div>
              <p className="text-xl font-black text-orange-900 mb-2">{advice?.weak}</p>
              <div className="p-4 bg-white/60 rounded-2xl border border-orange-200 mt-auto">
                <p className="text-[9px] font-black text-orange-400 uppercase tracking-widest mb-1">Dica de Monitoria</p>
                <p className="text-xs text-orange-800 font-bold leading-tight">Recomendamos revisar os tópicos deste eixo em:<br/><span className="italic font-medium text-orange-700">"{advice?.recommendation}"</span></p>
              </div>
            </div>
          </div>

          <div className="bg-white p-10 rounded-[2.5rem] shadow-xl border border-gray-100">
            <h4 className="text-[10px] font-black uppercase text-gray-400 mb-8 tracking-[0.3em] text-center">Desempenho Detalhado por Eixo</h4>
            <div className="space-y-6">
              {themeStats.map(stat => {
                const perc = stat.correct / stat.total;
                return (
                  <div key={stat.theme}>
                    <div className="flex justify-between text-xs font-black uppercase text-[#003366] mb-2">
                      <span>{stat.theme}</span>
                      <span>{stat.correct} / {stat.total}</span>
                    </div>
                    <div className="w-full bg-gray-100 h-2.5 rounded-full overflow-hidden">
                      <div 
                        className={`h-full transition-all duration-1000 ${perc >= 0.7 ? 'bg-green-500' : perc >= 0.4 ? 'bg-[#D4A017]' : 'bg-red-500'}`} 
                        style={{width: `${perc * 100}%`}}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 mt-8">
            <button onClick={onBack} className="flex-1 bg-white border-2 border-gray-100 text-gray-400 py-5 rounded-2xl font-black uppercase text-[10px] sm:text-xs tracking-widest hover:border-[#003366] hover:text-[#003366] transition-all">Voltar ao Menu</button>
            <button onClick={handleRetakeAll} className="flex-1 bg-[#003366] text-white py-5 rounded-2xl font-black uppercase text-[10px] sm:text-xs tracking-widest hover:bg-[#D4A017] transition-all shadow-xl">🔄 Refazer Completo</button>
            <button onClick={handleRetakeWrong} disabled={wrongCount === 0} className="flex-1 bg-[#D4A017] text-[#003366] py-5 rounded-2xl font-black uppercase text-[10px] sm:text-xs tracking-widest hover:scale-105 transition-all shadow-xl disabled:opacity-50 disabled:hover:scale-100 disabled:cursor-not-allowed">🎯 Refazer Erradas</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default QuizView;