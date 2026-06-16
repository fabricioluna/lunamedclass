import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Dna, 
  Activity, 
  Pill, 
  FileSearch, 
  Stethoscope, 
  ClipboardList, 
  UserSquare2, 
  Sword 
} from 'lucide-react';

interface SimulatorOption {
  title: string;
  description: string;
  path: string;
  icon: React.ReactNode;
  tag?: string;
}

const SimulatorsView: React.FC = () => {
  const navigate = useNavigate();

  const simulators: SimulatorOption[] = [
    {
      title: 'Laboratório de Anatomia',
      description: 'Treino prático de identificação de peças anatômicas e sistemas com feedback estruturado.',
      path: '/lab-anatomy', // Configure a rota real se necessário
      icon: <Activity className="w-8 h-8 text-[#D4A017]" />,
    },
    {
      title: 'Laboratório de Histologia/Morfofuncional',
      description: 'Estudo microscópico e identificação de lâminas teciduais gota a gota.',
      path: '/lab-quiz',
      icon: <Dna className="w-8 h-8 text-[#D4A017]" />,
    },
    {
      title: 'Prescrição Farmacológica',
      description: 'Prática deliberada na escolha posológica, interações medicamentosas e preenchimento de receitas.',
      path: '/prescription-simulation',
      icon: <Pill className="w-8 h-8 text-[#D4A017]" />,
      tag: 'Novo',
    },
    {
      title: 'Interpretação de Exames',
      description: 'Análise crítica de exames laboratoriais, gasometrias, ECG e exames de imagem.',
      path: '/exam-interpretation',
      icon: <FileSearch className="w-8 h-8 text-[#D4A017]" />,
    },
    {
      title: 'Propedêutica',
      description: 'Refinamento de manobras de exame físico, palpação, percussão e ausculta semiológica.',
      path: '/propedeutics',
      icon: <Stethoscope className="w-8 h-8 text-[#D4A017]" />,
    },
    {
      title: 'Evolução Clínico-Hospitalar',
      description: 'Pratique a construção e registro técnico da evolução diária de pacientes internados.',
      path: '/clinical-evolution',
      icon: <ClipboardList className="w-8 h-8 text-[#D4A017]" />,
    },
    {
      title: 'Anamnese Completa',
      description: 'Treinamento em habilidades de comunicação médico-paciente utilizando o Protocolo SPIKES via IA.',
      path: '/osce-ai',
      icon: <UserSquare2 className="w-8 h-8 text-[#D4A017]" />,
    },
    {
      title: 'Simulado RPG (Luna Engine)',
      description: 'Raciocínio dinâmico de plantão médico de urgência com monitor de sinais vitais dinâmico.',
      path: '/dynamic-osce',
      icon: <Sword className="w-8 h-8 text-[#D4A017]" />,
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        
        {/* Cabeçalho da Página */}
        <div className="text-center mb-12">
          <h2 className="text-3xl font-black tracking-tight text-[#003366] sm:text-4xl uppercase">
            Simuladores Práticos
          </h2>
          <p className="mt-3 max-w-2xl mx-auto text-base text-gray-500 sm:mt-4">
            Preencha a lacuna entre a teoria acadêmica e a realidade hospitalar através de cenários médicos de alta fidelidade baseados em diretrizes oficiais.
          </p>
        </div>

        {/* Grid de Seleção dos Simuladores */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {simulators.map((simulator, idx) => (
            <div
              key={idx}
              onClick={() => navigate(simulator.path)}
              className="relative bg-white border border-gray-200 rounded-2xl p-6 shadow-sm hover:shadow-xl hover:border-[#D4A017] transition-all cursor-pointer flex flex-col justify-between group transform hover:-translate-y-1"
            >
              <div>
                {/* Ícone e Tag */}
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-[#003366]/5 rounded-xl group-hover:bg-[#003366]/10 transition-colors">
                    {simulator.icon}
                  </div>
                  {simulator.tag && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-black bg-[#D4A017] text-[#003366] uppercase tracking-wide animate-pulse">
                      {simulator.tag}
                    </span>
                  )}
                </div>

                {/* Conteúdo Técnico */}
                <h3 className="text-lg font-bold text-[#003366] group-hover:text-[#D4A017] transition-colors line-clamp-2">
                  {simulator.title}
                </h3>
                <p className="mt-2 text-sm text-gray-500 leading-relaxed line-clamp-3">
                  {simulator.description}
                </p>
              </div>

              {/* Indicador de Ação */}
              <div className="mt-6 pt-4 border-t border-gray-100 flex items-center justify-end text-xs font-black tracking-wider uppercase text-[#003366] group-hover:text-[#D4A017] transition-colors">
                Acessar Simulador &rarr;
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SimulatorsView;