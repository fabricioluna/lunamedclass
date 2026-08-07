import React from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen } from 'lucide-react';
import { useData } from '../../contexts/DataContext';

// Nível 2 da navegação de Simuladores: dentro do tipo "Simulado Teórico" (escolhido em
// /simulators), lista as Áreas de Conhecimento pra revisão cross-disciplina. Pública (sem
// login) por design: a lista de áreas vem de config/areasConhecimento, que tem leitura pública
// nas Security Rules. Escolher uma área e praticar de verdade exige login, igual o resto do
// app (ProtectedRoute cuida disso nas rotas /simulators/teorico/:areaId*).
const TeoricoAreaListView: React.FC = () => {
  const navigate = useNavigate();
  const { areasConhecimento } = useData();

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <button
          onClick={() => navigate('/simulators')}
          className="group flex items-center text-[#003366] font-bold mb-8 hover:text-[#D4A017] transition-all"
        >
          <span className="mr-2 transition-transform group-hover:-translate-x-1">←</span>
          Voltar aos Simuladores
        </button>

        <div className="text-center mb-12">
          <h2 className="text-3xl font-black tracking-tight text-[#003366] sm:text-4xl uppercase">
            Simulado Teórico por Área de Conhecimento
          </h2>
          <p className="mt-3 max-w-2xl mx-auto text-base text-gray-500 sm:mt-4">
            Revise por assunto, cruzando o que você já estudou em todas as disciplinas — sem
            precisar lembrar em qual UC cada tópico foi dado.
          </p>
        </div>

        {areasConhecimento.length === 0 ? (
          <div className="text-center py-16 text-gray-400 font-bold uppercase tracking-widest text-xs border-2 border-dashed border-gray-200 rounded-3xl max-w-xl mx-auto">
            Nenhuma área de conhecimento cadastrada ainda.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {areasConhecimento.map((area) => (
              <div
                key={area.id}
                onClick={() => navigate(`/simulators/teorico/${area.id}`)}
                className="relative bg-white border border-gray-200 rounded-2xl p-6 shadow-sm hover:shadow-xl hover:border-[#D4A017] transition-all cursor-pointer flex flex-col justify-between group transform hover:-translate-y-1"
              >
                <div>
                  <div className="p-3 bg-[#003366]/5 rounded-xl group-hover:bg-[#003366]/10 transition-colors w-fit mb-4">
                    <BookOpen className="w-8 h-8 text-[#D4A017]" />
                  </div>
                  <h3 className="text-lg font-bold text-[#003366] group-hover:text-[#D4A017] transition-colors">
                    {area.label}
                  </h3>
                </div>
                <div className="mt-6 pt-4 border-t border-gray-100 flex items-center justify-end text-xs font-black tracking-wider uppercase text-[#003366] group-hover:text-[#D4A017] transition-colors">
                  Revisar &rarr;
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default TeoricoAreaListView;
