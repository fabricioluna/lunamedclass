import React, { useState, useMemo } from 'react';
import { SimulationInfo, Question } from '../types';

interface QuizSetupViewProps {
  discipline: SimulationInfo;
  availableQuestions: Question[];
  onStart: (filteredQuestions: Question[]) => void;
  onBack: () => void;
}

const QuizSetupView: React.FC<QuizSetupViewProps> = ({ discipline, availableQuestions, onStart, onBack }) => {
  const [selectedThemes, setSelectedThemes] = useState<string[]>([]);
  const [selectedQuizTitles, setSelectedQuizTitles] = useState<string[]>([]); 
  const [quantity, setQuantity] = useState(10);
  const [orderMode, setOrderMode] = useState<'random' | 'sequential'>('random'); 

  // Identifica todos os títulos de simulados únicos nesta disciplina
  const uniqueQuizTitles = useMemo(() => {
    const titles = availableQuestions
      .filter(q => q.disciplineId === discipline.id && q.quizTitle)
      .map(q => q.quizTitle!);
    return Array.from(new Set(titles));
  }, [availableQuestions, discipline.id]);

  // Conta quantas questões estão disponíveis com os filtros atuais
  const totalAvailableInSelectedThemes = useMemo(() => {
    return availableQuestions.filter(q => {
      if (q.disciplineId !== discipline.id) return false;
      
      // Se selecionou algum título específico, a questão DEVE pertencer a ele
      if (selectedQuizTitles.length > 0 && q.quizTitle && !selectedQuizTitles.includes(q.quizTitle)) {
        return false;
      }
      
      // Se não selecionou título, obedece ao filtro de temas
      if (selectedQuizTitles.length === 0 && !selectedThemes.includes(q.theme)) {
        return false;
      }

      return true;
    }).length;
  }, [availableQuestions, discipline.id, selectedThemes, selectedQuizTitles]);

  const toggleTheme = (theme: string) => {
    // Se o usuário clicar num tema, apagamos a seleção de "Simulado Fechado"
    setSelectedQuizTitles([]);
    setSelectedThemes(prev => 
      prev.includes(theme) ? prev.filter(t => t !== theme) : [...prev, theme]
    );
  };

  const toggleQuizTitle = (title: string) => {
    // Se o usuário clicar num simulado fechado, apagamos a seleção de "Temas soltos"
    setSelectedThemes([]);
    setSelectedQuizTitles(prev => 
      prev.includes(title) ? prev.filter(t => t !== title) : [...prev, title]
    );
  };

  const handleQuantityChange = (val: number) => {
    if (isNaN(val)) return;
    const clampedVal = Math.max(0, Math.min(val, totalAvailableInSelectedThemes));
    setQuantity(clampedVal);
  };

  const handleStart = () => {
    if (selectedThemes.length === 0 && selectedQuizTitles.length === 0) {
      alert("Por favor, selecione ao menos um tema ou um simulado específico.");
      return;
    }

    if (quantity < 1) {
      alert("A quantidade mínima de questões é 1.");
      return;
    }

    let filtered = availableQuestions.filter(q => {
      if (q.disciplineId !== discipline.id) return false;
      if (selectedQuizTitles.length > 0) {
        return q.quizTitle && selectedQuizTitles.includes(q.quizTitle);
      }
      return selectedThemes.includes(q.theme);
    });
    
    // ORDENAÇÃO
    if (orderMode === 'random') {
      filtered = [...filtered].sort(() => Math.random() - 0.5);
    } else {
      // Se for sequencial, a ordem base do array já é a ordem de upload, mas podemos garantir usando o ID (timestamp)
      filtered = [...filtered].sort((a, b) => a.id.localeCompare(b.id));
    }

    // Corta a quantidade desejada
    filtered = filtered.slice(0, quantity);
    
    onStart(filtered);
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-12 animate-in fade-in zoom-in duration-500">
      <button 
        onClick={onBack} 
        className="group flex items-center text-[#003366] font-bold mb-8 hover:text-[#D4A017] transition-all"
      >
        <span className="mr-2 transition-transform group-hover:-translate-x-1">←</span> 
        Voltar à Disciplina
      </button>
      
      <div className="bg-white rounded-[2.5rem] p-8 md:p-12 shadow-2xl border border-gray-100 mb-20">
        <div className="text-center mb-10">
          <div className="text-5xl mb-4">{discipline.icon}</div>
          <h2 className="text-3xl font-black text-[#003366] uppercase mb-2 tracking-tighter">
            Simulado Teórico
          </h2>
          <p className="text-[#D4A017] text-[10px] font-black uppercase tracking-[0.3em]">{discipline.title}</p>
        </div>

        {/* MODO 1: SIMULADOS FECHADOS (Se houver algum cadastrado) */}
        {uniqueQuizTitles.length > 0 && (
          <div className="mb-10 bg-blue-50/50 p-6 rounded-3xl border border-blue-100">
            <label className="block text-[10px] font-black uppercase tracking-widest text-blue-800 mb-4 text-center">Simulados Completos</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {uniqueQuizTitles.map(title => {
                const count = availableQuestions.filter(q => q.disciplineId === discipline.id && q.quizTitle === title).length;
                const isSelected = selectedQuizTitles.includes(title);
                return (
                  <button
                    key={title}
                    onClick={() => toggleQuizTitle(title)}
                    className={`p-4 rounded-2xl text-left transition-all border-2 flex justify-between items-start gap-3 group shadow-sm
                      ${isSelected ? 'border-blue-600 bg-blue-600 text-white shadow-lg scale-[1.02]' : 'border-blue-100 bg-white text-blue-900 hover:border-blue-300'}
                    `}
                  >
                    <span className="text-xs font-black uppercase tracking-tight leading-snug">📄 {title}</span>
                    <span className={`text-[9px] font-black px-2 py-0.5 rounded-full shrink-0 mt-0.5 ${isSelected ? 'bg-white/20 text-white' : 'bg-blue-100 text-blue-700'}`}>{count} Q</span>
                  </button>
                );
              })}
            </div>
            <p className="text-center text-[9px] font-bold text-gray-400 mt-4 uppercase tracking-widest">OU CRIE UM SIMULADO MISTO ABAIXO</p>
          </div>
        )}

        {/* MODO 2: EIXOS TEMÁTICOS (Gerador Misto) */}
        <div className={`mb-12 ${selectedQuizTitles.length > 0 ? 'opacity-30 grayscale pointer-events-none transition-all' : 'transition-all'}`}>
          <div className="flex justify-between items-center mb-6">
            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Banco de Questões Misto</label>
            <div className="flex gap-4">
               <button onClick={() => setSelectedThemes(discipline.themes)} className="text-[9px] font-bold text-[#003366] uppercase underline hover:text-[#D4A017] transition-colors">Todos Temas</button>
               <button onClick={() => setSelectedThemes([])} className="text-[9px] font-bold text-red-500 uppercase underline hover:text-red-700 transition-colors">Nenhum</button>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {discipline.themes.map(theme => {
              const count = availableQuestions.filter(q => q.disciplineId === discipline.id && q.theme === theme).length;
              const isSelected = selectedThemes.includes(theme);
              return (
                <button
                  key={theme}
                  onClick={() => toggleTheme(theme)}
                  className={`p-4 rounded-2xl text-left transition-all border-2 flex justify-between items-start gap-3 group
                    ${isSelected ? 'border-[#003366] bg-[#003366] text-white shadow-lg' : 'border-gray-100 bg-gray-50 text-gray-400 hover:border-gray-200'}
                  `}
                >
                  <span className="text-xs font-bold uppercase tracking-tight leading-snug">{theme}</span>
                  <span className={`text-[9px] font-black px-2 py-0.5 rounded-full shrink-0 mt-0.5 ${isSelected ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-500'}`}>{count} Q</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* CONFIGURAÇÕES DE ENTREGA (ORDEM E QUANTIDADE) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
          
          <div className="p-6 bg-gray-50 rounded-3xl border border-gray-100 flex flex-col justify-center">
            <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-4 text-center">Quantidade</label>
            <div className="flex items-center justify-center gap-4">
              <button onClick={() => handleQuantityChange(quantity - 1)} className="w-10 h-10 bg-white rounded-xl border border-gray-200 text-[#003366] font-black flex items-center justify-center hover:bg-[#D4A017] transition-colors">-</button>
              <div className="relative">
                <input type="number" value={quantity} onChange={(e) => handleQuantityChange(parseInt(e.target.value))} className="w-20 bg-white p-3 rounded-2xl border-2 border-[#003366] outline-none text-[#003366] font-black text-center text-xl" min="1" max={totalAvailableInSelectedThemes} />
                <span className="absolute -bottom-6 left-0 right-0 text-center text-[9px] font-bold text-gray-400 uppercase">Máx: {totalAvailableInSelectedThemes}</span>
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
          disabled={(selectedThemes.length === 0 && selectedQuizTitles.length === 0) || totalAvailableInSelectedThemes === 0}
          className={`w-full py-6 rounded-[2rem] font-black uppercase text-sm tracking-[0.2em] shadow-xl transition-all
            ${(selectedThemes.length > 0 || selectedQuizTitles.length > 0) && totalAvailableInSelectedThemes > 0
              ? 'bg-[#003366] text-white hover:bg-[#D4A017] hover:text-[#003366] hover:scale-[1.02]' 
              : 'bg-gray-200 text-gray-400 cursor-not-allowed'}
          `}
        >
          {(selectedThemes.length === 0 && selectedQuizTitles.length === 0) ? 'Selecione o Conteúdo' : `Gerar Simulado (${quantity})`}
        </button>
      </div>
    </div>
  );
};

export default QuizSetupView;