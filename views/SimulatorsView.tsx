import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock } from 'lucide-react';
import { AVAILABLE_SIMULATOR_TYPES, COMING_SOON_SIMULATOR_TYPES } from '../features/simulators/simulatorTypesConfig';

// Nível 1 da navegação de Simuladores: escolher o TIPO primeiro (Lab, OSCE...), só depois a
// disciplina que tem esse conteúdo. Simulado Teórico fica de fora desta lista por decisão do
// usuário — continua acessível só pelo caminho Período → Disciplina → Simulado, como sempre
// foi; o fluxo por Área de Conhecimento já construído (`/simulators/teorico`) segue existindo
// no código, só não está linkado daqui por enquanto.
//
// Título/descrição/ícone/destino de cada tipo vêm de features/simulators/simulatorTypesConfig.tsx
// (fonte única, compartilhada com o seletor de disciplina em routes/AppRoutes.tsx).
const SimulatorsView: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">

        <div className="text-center mb-12">
          <h2 className="text-3xl font-black tracking-tight text-[#003366] sm:text-4xl uppercase">
            Simuladores
          </h2>
          <p className="mt-3 max-w-2xl mx-auto text-base text-gray-500 sm:mt-4">
            Conheça os tipos de simulado disponíveis no portal.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {AVAILABLE_SIMULATOR_TYPES.map((type) => (
            <div
              key={type.slug}
              onClick={() => navigate(`/simulators/${type.slug}`)}
              className="relative bg-white border border-gray-200 rounded-2xl p-6 shadow-sm flex flex-col justify-between group transform transition-all hover:shadow-xl hover:border-[#D4A017] cursor-pointer hover:-translate-y-1"
            >
              <div>
                <div className="p-3 bg-[#003366]/5 rounded-xl group-hover:bg-[#003366]/10 transition-colors w-fit mb-4">
                  {type.icon}
                </div>
                <h3 className="text-lg font-bold text-[#003366] group-hover:text-[#D4A017] transition-colors">
                  {type.title}
                </h3>
                <p className="mt-2 text-sm text-gray-500 leading-relaxed">
                  {type.description}
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-gray-100 flex items-center justify-end text-xs font-black tracking-wider uppercase text-[#003366] group-hover:text-[#D4A017] transition-colors">
                Acessar &rarr;
              </div>
            </div>
          ))}

          {COMING_SOON_SIMULATOR_TYPES.map((type) => (
            <div
              key={type.title}
              className="relative bg-white border border-gray-100 rounded-2xl p-6 shadow-sm flex flex-col justify-between opacity-70 grayscale cursor-not-allowed"
            >
              <div className="absolute top-4 right-4 bg-gray-400/90 text-white px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest shadow-lg flex items-center gap-1 z-10">
                <Clock size={11} /> Em breve
              </div>
              <div>
                <div className="p-3 bg-[#003366]/5 rounded-xl w-fit mb-4">
                  {type.icon}
                </div>
                <h3 className="text-lg font-bold text-[#003366]">
                  {type.title}
                </h3>
                <p className="mt-2 text-sm text-gray-500 leading-relaxed">
                  {type.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SimulatorsView;
