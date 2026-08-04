
import React from 'react';
import { SimulationInfo } from '../types';

interface DisciplineCardProps {
  info: SimulationInfo;
  onSelect: (id: string) => void;
}

const DisciplineCard: React.FC<DisciplineCardProps> = ({ info, onSelect }) => {
  const isAvailable = info.status === 'active';
  const isComingSoon = info.status === 'coming-soon';

  return (
    <div 
      onClick={() => isAvailable && onSelect(info.id)}
      className={`
        bg-white rounded-2xl p-8 border border-gray-100 shadow-sm transition-all duration-300
        ${isAvailable ? 'hover:-translate-y-2 hover:shadow-xl cursor-pointer hover:border-[#D4A017]' : 'opacity-60 grayscale cursor-not-allowed'}
        flex flex-col items-center text-center group
      `}
    >
      <div className="text-5xl mb-6 transform transition-transform group-hover:scale-110">{info.icon}</div>
      <h3 className="text-[#003366] font-extrabold text-xl mb-3 uppercase tracking-tight">{info.title}</h3>
      <p className="text-gray-500 text-sm mb-6 leading-relaxed">
        {info.description}
      </p>
      <div className="mt-auto w-full pt-4 border-t border-gray-50 flex items-center justify-center text-[#D4A017] font-bold text-xs uppercase tracking-[0.2em]">
        {isAvailable ? 'Acessar Conteúdo →' : isComingSoon ? 'Em breve' : 'Indisponível'}
      </div>
    </div>
  );
};

export default DisciplineCard;
