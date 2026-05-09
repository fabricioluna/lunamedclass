import React from 'react';
import { Period } from '../types.ts'; 

interface PeriodSelectionViewProps {
  periods: Period[];
  onSelectPeriod: (periodId: string) => void;
}

const PeriodSelectionView: React.FC<PeriodSelectionViewProps> = ({ periods, onSelectPeriod }) => {
  return (
    <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-20 animate-in fade-in duration-700">
      <div className="text-center mb-16">
        <div className="inline-block bg-[#003366]/10 text-[#003366] px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] mb-4">
          🌙 Luna MedClass • Produção Independente
        </div>
        <h2 className="text-4xl md:text-6xl font-black text-[#003366] uppercase tracking-tighter mb-6">
          Escolha sua <span className="text-[#D4A017]">Jornada</span>
        </h2>
        <p className="text-gray-500 text-sm md:text-lg max-w-2xl mx-auto font-light leading-relaxed">
          Selecione seu período acadêmico para acessar simulados adaptativos, 
          materiais de apoio e ferramentas exclusivas da Luna Engine 2.0.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-10 max-w-5xl mx-auto">
        {periods.map(period => (
          <button
            key={period.id}
            onClick={() => onSelectPeriod(period.id)}
            className="group relative bg-white border-2 border-gray-100 rounded-[3rem] p-10 text-center hover:border-[#D4A017] hover:shadow-[0_30px_60px_-15px_rgba(0,51,102,0.15)] transition-all duration-500 overflow-hidden flex flex-col items-center"
          >
            {/* Brasão Gigante de Fundo (Marca d'água) */}
            {period.crest && (
              <img 
                src={period.crest} 
                className="absolute w-80 h-80 opacity-[0.03] -bottom-10 -right-10 grayscale group-hover:scale-125 transition-transform duration-700 pointer-events-none object-contain rounded-full" 
                alt=""
              />
            )}
            
            <div className="relative z-10 flex flex-col items-center w-full">
              {/* Espaço do Brasão Principal */}
              <div className="mb-8 transform group-hover:scale-105 transition-all duration-500">
                {period.crest ? (
                  <div className="w-48 h-48 md:w-64 md:h-64 flex items-center justify-center bg-white rounded-full p-6 shadow-2xl border-4 border-gray-50 group-hover:border-[#D4A017]/30 transition-all overflow-hidden">
                    <img 
                      src={period.crest} 
                      alt={`Brasão ${period.name}`} 
                      className="w-full h-full object-contain"
                    />
                  </div>
                ) : (
                  <div className="w-48 h-48 md:w-64 md:h-64 flex items-center justify-center bg-gray-50 rounded-full text-7xl shadow-inner p-6 border-4 border-white">
                    {period.icon}
                  </div>
                )}
              </div>

              <h3 className="text-3xl font-black text-[#003366] tracking-tight mb-3 group-hover:text-[#D4A017] transition-colors uppercase">
                {period.name}
              </h3>
              
              <div className="h-1 w-12 bg-[#D4A017] mb-6 rounded-full opacity-40"></div>

              <p className="text-gray-500 text-sm md:text-base mb-10 font-light leading-relaxed max-w-xs h-12">
                {period.description}
              </p>
              
              <div className="flex items-center gap-8 pt-8 border-t border-gray-100 w-full justify-center">
                <div className="text-center">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Semestre</p>
                  <p className="text-sm font-black text-[#003366]">{period.semester}</p>
                </div>
                <div className="w-px h-8 bg-gray-200"></div>
                <div className="text-center">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Carga</p>
                  <p className="text-sm font-black text-[#003366]">{period.workload}</p>
                </div>
              </div>
            </div>
            
            <div className="mt-8 opacity-0 group-hover:opacity-100 transition-all duration-500 translate-y-4 group-hover:translate-y-0">
               <span className="bg-[#003366] text-white text-[10px] font-black px-8 py-3 rounded-full tracking-[0.2em] uppercase shadow-lg">
                 Acessar Conteúdo
               </span>
            </div>
          </button>
        ))}
      </div>
    </main>
  );
};

export default PeriodSelectionView;