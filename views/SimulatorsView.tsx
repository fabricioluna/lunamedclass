import React from 'react';
import { useNavigate } from 'react-router-dom';
import { PenTool, Microscope, ClipboardList, Sword, UserSquare2, Clock } from 'lucide-react';

interface SimulatorType {
  title: string;
  description: string;
  icon: React.ReactNode;
  path?: string; // ausente = ainda não disponível
}

// Nível 1 da navegação de Simuladores: escolher o TIPO primeiro (Teórico, Lab, OSCE...), só
// depois o tema/área dentro do tipo escolhido — corrigido nesta sessão depois de um erro:
// a versão anterior pulava direto pro seletor de Área do Simulado Teórico, sem esse primeiro
// nível. Só Simulado Teórico tem Área/Subárea cadastrável hoje; os demais ficam "Em breve"
// até ganharem a mesma classificação (decisão do usuário, não fica escondido — mantém a
// expectativa certa do que vai existir, ao contrário do mockup original que apontava pra
// rotas que nunca existiram).
const SIMULATOR_TYPES: SimulatorType[] = [
  {
    title: 'Simulado Teórico',
    description: 'Questões de múltipla escolha, revisando por Área de Conhecimento e cruzando disciplinas.',
    icon: <PenTool className="w-8 h-8 text-[#D4A017]" />,
    path: '/simulators/teorico',
  },
  {
    title: 'Laboratório Virtual',
    description: 'Identificação de lâminas, peças anatômicas e exames por assunto.',
    icon: <Microscope className="w-8 h-8 text-[#D4A017]" />,
  },
  {
    title: 'OSCE Estático',
    description: 'Checklists sequenciais e protocolos técnicos por assunto.',
    icon: <ClipboardList className="w-8 h-8 text-[#D4A017]" />,
  },
  {
    title: 'OSCE RPG (Luna Engine)',
    description: 'Decisões dinâmicas com sinais vitais em tempo real.',
    icon: <Sword className="w-8 h-8 text-[#D4A017]" />,
  },
  {
    title: 'Paciente Virtual (IA)',
    description: 'Anamnese livre conversando com a IA.',
    icon: <UserSquare2 className="w-8 h-8 text-[#D4A017]" />,
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
            Escolha o tipo de simulado — depois você escolhe o tema dentro dele.
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
