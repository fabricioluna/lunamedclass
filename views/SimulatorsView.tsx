import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Microscope, ClipboardList, Sword, UserSquare2, Clock, Pill, FileSearch, Stethoscope, Activity } from 'lucide-react';

interface SimulatorType {
  title: string;
  description: string;
  icon: React.ReactNode;
  path?: string; // ausente = ainda não disponível ("Em breve")
}

// Nível 1 da navegação de Simuladores: escolher o TIPO primeiro (Lab, OSCE...), só depois o
// tema dentro do tipo escolhido. Simulado Teórico fica de fora desta lista por decisão do
// usuário — continua acessível só pelo caminho Período → Disciplina → Simulado, como sempre
// foi; o fluxo por Área de Conhecimento já construído (`/simulators/teorico`) segue existindo
// no código, só não está linkado daqui por enquanto.
//
// Os 4 tipos abaixo (Laboratório, OSCE Estático, OSCE RPG, Paciente Virtual) já são features
// reais e usadas hoje dentro do fluxo por disciplina — por isso aparecem "disponíveis" mesmo
// sem navegação cross-disciplina própria ainda: o clique leva pro início do fluxo normal
// (seleção de período/disciplina), de onde o aluno já chega em cada um deles normalmente.
//
// Os 4 últimos (Prescrição Farmacológica, Interpretação de Exames, Propedêutica, Evolução
// Clínico-Hospitalar) são planos reais do usuário, ainda não implementados — ficam "Em breve"
// em vez de linkar pra rota inexistente (era exatamente o erro do mockup original).
const SIMULATOR_TYPES: SimulatorType[] = [
  {
    title: 'Laboratório Virtual',
    description: 'Identificação de lâminas, peças anatômicas e exames — acesse pela sua disciplina.',
    icon: <Microscope className="w-8 h-8 text-[#D4A017]" />,
    path: '/',
  },
  {
    title: 'OSCE Estático',
    description: 'Checklists sequenciais e protocolos técnicos — acesse pela sua disciplina.',
    icon: <ClipboardList className="w-8 h-8 text-[#D4A017]" />,
    path: '/',
  },
  {
    title: 'OSCE RPG (Luna Engine)',
    description: 'Decisões dinâmicas com sinais vitais em tempo real — acesse pela sua disciplina.',
    icon: <Sword className="w-8 h-8 text-[#D4A017]" />,
    path: '/',
  },
  {
    title: 'Paciente Virtual (IA)',
    description: 'Anamnese livre conversando com a IA — acesse pela sua disciplina.',
    icon: <UserSquare2 className="w-8 h-8 text-[#D4A017]" />,
    path: '/',
  },
  {
    title: 'Prescrição Farmacológica',
    description: 'Prática de escolha posológica, interações medicamentosas e preenchimento de receitas.',
    icon: <Pill className="w-8 h-8 text-[#D4A017]" />,
  },
  {
    title: 'Interpretação de Exames',
    description: 'Análise crítica de exames laboratoriais, gasometrias, ECG e exames de imagem.',
    icon: <FileSearch className="w-8 h-8 text-[#D4A017]" />,
  },
  {
    title: 'Propedêutica',
    description: 'Refinamento de manobras de exame físico, palpação, percussão e ausculta semiológica.',
    icon: <Stethoscope className="w-8 h-8 text-[#D4A017]" />,
  },
  {
    title: 'Evolução Clínico-Hospitalar',
    description: 'Construção e registro técnico da evolução diária de pacientes internados.',
    icon: <Activity className="w-8 h-8 text-[#D4A017]" />,
  },
];

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
          {SIMULATOR_TYPES.map((type) => {
            const isAvailable = !!type.path;
            return (
              <div
                key={type.title}
                onClick={() => isAvailable && navigate(type.path!)}
                className={`relative bg-white border rounded-2xl p-6 shadow-sm flex flex-col justify-between group transform transition-all
                  ${isAvailable
                    ? 'border-gray-200 hover:shadow-xl hover:border-[#D4A017] cursor-pointer hover:-translate-y-1'
                    : 'border-gray-100 opacity-70 grayscale cursor-not-allowed'}
                `}
              >
                {!isAvailable && (
                  <div className="absolute top-4 right-4 bg-gray-400/90 text-white px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest shadow-lg flex items-center gap-1 z-10">
                    <Clock size={11} /> Em breve
                  </div>
                )}
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
                {isAvailable && (
                  <div className="mt-6 pt-4 border-t border-gray-100 flex items-center justify-end text-xs font-black tracking-wider uppercase text-[#003366] group-hover:text-[#D4A017] transition-colors">
                    Acessar &rarr;
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default SimulatorsView;
