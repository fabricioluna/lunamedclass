import React, { useState, useEffect } from 'react';
import { LabSimulation } from '../types.ts';
import { Microscope, MapPin, Activity, ChevronRight, ChevronLeft, Eye } from 'lucide-react';

interface Props {
  simulation: LabSimulation;
  onBack: () => void;
}

const LabQuizView: React.FC<Props> = ({ simulation, onBack }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isRevealed, setIsRevealed] = useState(false);

  const q = simulation.questions[currentIndex];

  useEffect(() => {
    setIsRevealed(false);
  }, [currentIndex]);

  const handleNext = () => { if (currentIndex < simulation.questions.length - 1) setCurrentIndex(currentIndex + 1); };
  const handlePrev = () => { if (currentIndex > 0) setCurrentIndex(currentIndex - 1); };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 animate-in fade-in duration-500 pb-32">
      
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-xl font-black text-[#003366]">{simulation.title}</h2>
          <p className="text-[10px] font-black uppercase text-[#D4A017] tracking-[0.2em]">{simulation.author}</p>
        </div>
        <div className="bg-white px-4 py-2 rounded-xl shadow-sm border font-black text-[#003366] text-xs">
          {currentIndex + 1} / {simulation.questions.length}
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] p-6 md:p-10 shadow-xl border border-gray-100">
        
        {/* Container da Imagem */}
        <div className="w-full h-64 md:h-[400px] bg-black rounded-[1.5rem] mb-8 overflow-hidden shadow-inner flex items-center justify-center relative">
          <img 
            src={q.imageUrl} 
            alt="Lâmina/Peça" 
            className="w-full h-full object-contain"
            onError={(e) => (e.currentTarget.src = 'https://via.placeholder.com/800x400.png?text=Erro+ao+carregar+imagem')}
          />
        </div>

        <h3 className="text-2xl font-black text-[#003366] text-center mb-8">{q.question}</h3>

        {!isRevealed ? (
          <button 
            onClick={() => setIsRevealed(true)}
            className="w-full md:w-2/3 mx-auto bg-[#003366] text-white py-5 rounded-2xl font-black uppercase text-xs tracking-[0.2em] flex items-center justify-center gap-3 hover:bg-[#D4A017] hover:text-[#003366] hover:scale-105 transition-all shadow-xl"
          >
            <Eye size={20}/> Revelar Resposta e Dicas
          </button>
        ) : (
          <div className="animate-in slide-in-from-top-4 duration-500">
            <div className="bg-green-50 border-2 border-green-200 p-6 rounded-2xl text-center mb-8">
              <p className="text-[10px] font-black uppercase text-green-600 tracking-[0.2em] mb-2">Resposta Oficial</p>
              <p className="text-2xl font-black text-green-800">{q.answer}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-blue-50/50 p-6 rounded-2xl border border-blue-100 flex flex-col items-start">
                 <div className="bg-blue-100 p-2 rounded-lg text-blue-700 mb-4"><Microscope size={20}/></div>
                 <h4 className="text-[10px] font-black uppercase tracking-widest text-blue-800 mb-2">Como Identificar</h4>
                 <p className="text-sm text-gray-700 font-medium">{q.aiIdentification || 'Dica não disponível.'}</p>
              </div>
              <div className="bg-amber-50/50 p-6 rounded-2xl border border-amber-100 flex flex-col items-start">
                 <div className="bg-amber-100 p-2 rounded-lg text-amber-700 mb-4"><MapPin size={20}/></div>
                 <h4 className="text-[10px] font-black uppercase tracking-widest text-amber-800 mb-2">Localização</h4>
                 <p className="text-sm text-gray-700 font-medium">{q.aiLocation || 'Dica não disponível.'}</p>
              </div>
              <div className="bg-emerald-50/50 p-6 rounded-2xl border border-emerald-100 flex flex-col items-start">
                 <div className="bg-emerald-100 p-2 rounded-lg text-emerald-700 mb-4"><Activity size={20}/></div>
                 <h4 className="text-[10px] font-black uppercase tracking-widest text-emerald-800 mb-2">Função Principal</h4>
                 <p className="text-sm text-gray-700 font-medium">{q.aiFunctions || 'Dica não disponível.'}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-between items-center mt-8">
        <button onClick={handlePrev} disabled={currentIndex === 0} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 text-[#003366] disabled:opacity-30 flex items-center gap-2 font-black uppercase text-[10px] hover:bg-gray-50 transition-all">
          <ChevronLeft size={16}/> Anterior
        </button>
        
        {currentIndex === simulation.questions.length - 1 && isRevealed ? (
          <button onClick={onBack} className="bg-[#D4A017] text-[#003366] px-8 py-4 rounded-2xl shadow-lg border border-transparent font-black uppercase text-[10px] hover:scale-105 transition-all tracking-widest">
            Finalizar Prática
          </button>
        ) : (
          <button onClick={handleNext} disabled={currentIndex === simulation.questions.length - 1} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 text-[#003366] disabled:opacity-30 flex items-center gap-2 font-black uppercase text-[10px] hover:bg-gray-50 transition-all">
            Próxima <ChevronRight size={16}/>
          </button>
        )}
      </div>
    </div>
  );
};

export default LabQuizView;