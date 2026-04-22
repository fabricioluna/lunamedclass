import React, { useState } from 'react';
import { ViewState } from '../types.ts';
import { ArrowLeft } from 'lucide-react';

interface HeaderProps {
  onNavigate: (view: ViewState) => void;
  onBack: () => void;
  canGoBack: boolean;
  hasRoomSelected?: boolean;
}

const Header: React.FC<HeaderProps> = ({ onNavigate, onBack, canGoBack, hasRoomSelected }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const navigateTo = (view: ViewState) => {
    onNavigate(view);
    setIsMenuOpen(false);
  };

  return (
    <header className="bg-[#003366] text-white shadow-md sticky top-0 z-50 border-b-2 border-[#D4A017]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between py-4 md:h-28 gap-2">
          
          {/* Lado Esquerdo: Botão Voltar + Logo e Identidade */}
          <div className="flex items-center gap-3 md:gap-4 flex-shrink min-w-0">
            
            {/* O Botão de Voltar Global */}
            {canGoBack && (
              <button 
                onClick={onBack}
                className="bg-white/10 hover:bg-[#D4A017] text-white hover:text-[#003366] p-2.5 md:p-3 rounded-xl transition-all shadow-sm flex-shrink-0 border border-white/5"
                title="Página Anterior"
              >
                <ArrowLeft size={20} className="md:w-6 md:h-6" />
              </button>
            )}

            <div 
              className="flex items-center cursor-pointer group min-w-0 flex-shrink" 
              onClick={() => navigateTo('room-selection')} // AQUI: Alterado de 'home' para 'room-selection'
            >
              <div className="bg-white p-1 md:p-2 rounded-lg md:rounded-xl w-14 h-8 sm:w-24 sm:h-10 md:w-48 md:h-16 flex items-center justify-center overflow-hidden border-2 border-[#D4A017] shadow-lg transition-transform group-hover:scale-105 flex-shrink-0">
                <img 
                  src="/logo.png" 
                  alt="Logo Luna MedClass" 
                  className="w-full h-full object-contain"
                />
              </div>
              <div className="ml-2 md:ml-4 flex flex-col justify-center min-w-0">
                <h1 className="text-[10px] sm:text-xs md:text-base font-black tracking-widest leading-tight text-white uppercase truncate">
                  LUNA MEDCLASS
                </h1>
                <h2 className="text-[7px] sm:text-[9px] md:text-[10px] font-bold text-[#D4A017] uppercase tracking-widest opacity-90 truncate">
                  Seu Monitor Virtual de Medicina
                </h2>
              </div>
            </div>
          </div>

          {/* Menu Desktop */}
          <nav className="hidden md:flex items-center gap-4">
            {hasRoomSelected && (
              <button 
                onClick={() => navigateTo('room-selection')}
                className="flex items-center gap-1 text-[10px] uppercase tracking-widest font-black bg-white/10 text-white px-5 py-2 rounded-lg hover:bg-white hover:text-[#003366] transition-all whitespace-nowrap"
              >
                🚪 TROCAR SALA
              </button>
            )}
            <button 
              onClick={() => navigateTo('career-quiz')}
              className="flex items-center gap-1 text-[10px] uppercase tracking-widest font-black bg-transparent border-2 border-[#D4A017] text-[#D4A017] px-5 py-2 rounded-lg hover:bg-[#D4A017] hover:text-[#003366] transition-all whitespace-nowrap shadow-sm"
            >
              ⭐ ESPECIALIDADE
            </button>
            {/* INJEÇÃO: Botão Congressos */}
            <button 
              onClick={() => navigateTo('medical-events')}
              className="flex items-center gap-1 text-[10px] uppercase tracking-widest font-black bg-transparent border-2 border-[#D4A017] text-[#D4A017] px-5 py-2 rounded-lg hover:bg-[#D4A017] hover:text-[#003366] transition-all whitespace-nowrap shadow-sm"
            >
              📅 CONGRESSOS
            </button>
            <button 
              onClick={() => navigateTo('calculators')}
              className="flex items-center gap-1 text-[10px] uppercase tracking-widest font-black bg-transparent border-2 border-[#D4A017] text-[#D4A017] px-5 py-2 rounded-lg hover:bg-[#D4A017] hover:text-[#003366] transition-all whitespace-nowrap shadow-sm"
            >
              📊 CALCULADORAS
            </button>
            <button 
              onClick={() => navigateTo('admin')}
              className="flex items-center gap-1 text-[10px] uppercase tracking-widest font-black text-white/70 border-2 border-white/10 px-5 py-2 rounded-lg hover:border-white hover:text-white transition-all bg-white/5 whitespace-nowrap"
            >
              ⚙️ ADMIN
            </button>
          </nav>

          {/* Botão Hambúrguer (Mobile) */}
          <button 
            className="md:hidden p-2 text-[#D4A017]"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {isMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Menu Mobile Dropdown */}
      {isMenuOpen && (
        <div className="md:hidden bg-[#002244] border-t border-[#D4A017]/20 p-4 animate-in slide-in-from-top duration-300">
          <div className="flex flex-col gap-3">
            {hasRoomSelected && (
              <button 
                onClick={() => navigateTo('room-selection')}
                className="w-full text-left py-3 px-4 text-sm font-black bg-white/10 text-white rounded-lg hover:bg-white/20 transition-all"
              >
                🚪 TROCAR DE SALA
              </button>
            )}
            <button 
              onClick={() => navigateTo('career-quiz')}
              className="w-full text-left py-3 px-4 text-sm font-black bg-transparent border-2 border-[#D4A017] text-[#D4A017] rounded-lg hover:bg-[#D4A017]/10 transition-all"
            >
              ⭐ QUAL MINHA ESPECIALIDADE?
            </button>
            {/* INJEÇÃO: Botão Congressos Mobile */}
            <button 
              onClick={() => navigateTo('medical-events')}
              className="w-full text-left py-3 px-4 text-sm font-black bg-transparent border-2 border-[#D4A017] text-[#D4A017] rounded-lg hover:bg-[#D4A017]/10 transition-all"
            >
              📅 CONGRESSOS MÉDICOS
            </button>
            <button 
              onClick={() => navigateTo('calculators')}
              className="w-full text-left py-3 px-4 text-sm font-black bg-transparent border-2 border-[#D4A017] text-[#D4A017] rounded-lg hover:bg-[#D4A017]/10 transition-all"
            >
              📊 CALCULADORAS
            </button>
            <button 
              onClick={() => navigateTo('admin')}
              className="w-full text-left py-3 px-4 text-sm font-black text-white/70 border-2 border-white/10 rounded-lg hover:bg-white/5 transition-all"
            >
              ⚙️ ADMINISTRAÇÃO
            </button>
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;