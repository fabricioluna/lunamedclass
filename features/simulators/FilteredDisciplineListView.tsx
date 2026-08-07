import React from 'react';

export interface DisciplineWithCount {
  id: string;
  title: string;
  count: number;
}

interface FilteredDisciplineListViewProps {
  title: string;
  description: string;
  disciplines: DisciplineWithCount[];
  isFetching: boolean;
  onBack: () => void;
  onSelectDiscipline: (disciplineId: string) => void;
}

// Nível 2 de um tipo de simulador em /simulators: dentro do tipo escolhido (ex. "Laboratório de
// Anatomia"), lista só as disciplinas que de fato têm conteúdo desse tipo — clicar leva direto
// pra rota de disciplina que já existe e já funciona (ex. /disciplina/:id/lab?cat=anatomia).
// Presentacional puro; quem busca e filtra é routes/AppRoutes.tsx (TypeDisciplineListFlow).
const FilteredDisciplineListView: React.FC<FilteredDisciplineListViewProps> = ({
  title,
  description,
  disciplines,
  isFetching,
  onBack,
  onSelectDiscipline,
}) => {
  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <button
          onClick={onBack}
          className="group flex items-center text-[#003366] font-bold mb-8 hover:text-[#D4A017] transition-all"
        >
          <span className="mr-2 transition-transform group-hover:-translate-x-1">←</span>
          Voltar aos Simuladores
        </button>

        <div className="text-center mb-12">
          <h2 className="text-3xl font-black tracking-tight text-[#003366] sm:text-4xl uppercase">
            {title}
          </h2>
          <p className="mt-3 max-w-2xl mx-auto text-base text-gray-500 sm:mt-4">
            {description}
          </p>
        </div>

        {isFetching ? (
          <div className="flex flex-col items-center justify-center py-24 bg-white rounded-[2.5rem] shadow-xl border border-gray-100 max-w-xl mx-auto">
            <div className="w-12 h-12 border-4 border-[#003366]/10 border-t-[#D4A017] rounded-full animate-spin mb-4"></div>
            <h3 className="text-[#003366] font-black uppercase tracking-widest text-xs">Buscando disciplinas...</h3>
          </div>
        ) : disciplines.length === 0 ? (
          <div className="text-center py-16 text-gray-400 font-bold uppercase tracking-widest text-xs border-2 border-dashed border-gray-200 rounded-3xl max-w-xl mx-auto">
            Nenhuma disciplina com esse conteúdo cadastrado ainda.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {disciplines.map((d) => (
              <div
                key={d.id}
                onClick={() => onSelectDiscipline(d.id)}
                className="relative bg-white border border-gray-200 rounded-2xl p-6 shadow-sm hover:shadow-xl hover:border-[#D4A017] transition-all cursor-pointer flex flex-col justify-between group transform hover:-translate-y-1"
              >
                <h3 className="text-lg font-bold text-[#003366] group-hover:text-[#D4A017] transition-colors">
                  {d.title}
                </h3>
                <div className="mt-6 pt-4 border-t border-gray-100 flex items-center justify-between text-xs font-black tracking-wider uppercase">
                  <span className="text-gray-400">{d.count} disponíve{d.count === 1 ? 'l' : 'is'}</span>
                  <span className="text-[#003366] group-hover:text-[#D4A017] transition-colors">Entrar &rarr;</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default FilteredDisciplineListView;
