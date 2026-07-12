import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, LogIn, LogOut } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext'; 

const Header: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser, userProfile, logout } = useAuth();

  const canGoBack = location.pathname !== '/' && location.pathname !== '/period-selection';

  const navigateTo = (path: string) => {
    navigate(path);
    setIsMenuOpen(false);
  };

  const handleBack = () => {
    navigate(-1);
  };

  const getRoleLabel = (role?: string) => {
    if (role === 'admin') return 'Administrador';
    if (role === 'professor') return 'Professor';
    return 'Estudante';
  };

  return (
    <header className="bg-[#003366] text-white shadow-md border-b-2 border-[#D4A017] w-full">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between py-4 min-h-[5rem] lg:min-h-[7rem] gap-4">
          
          {/* Lado Esquerdo: Botão Voltar + Logo Isolada */}
          <div className="flex items-center gap-3 flex-shrink-0">
            {canGoBack && (
              <button 
                onClick={handleBack}
                className="bg-white/10 hover:bg-[#D4A017] text-white hover:text-[#003366] p-2.5 rounded-xl transition-all shadow-sm border border-white/5"
                title="Página Anterior"
              >
                <ArrowLeft size={20} />
              </button>
            )}

            <div 
              className="flex items-center cursor-pointer group" 
              onClick={() => navigateTo('/')} 
              title="Voltar para a Página Inicial"
            >
              <div className="bg-white p-1.5 rounded-xl w-20 h-10 lg:w-32 lg:h-14 flex items-center justify-center overflow-hidden border-2 border-[#D4A017] shadow-lg transition-transform group-hover:scale-105">
                <img 
                  src="/logo.png" 
                  alt="Logo Luna MedClass" 
                  className="w-full h-full object-contain"
                />
              </div>
            </div>
          </div>

          {/* Menu Desktop - Visível apenas a partir de 1024px (lg). Flex-wrap garante fluidez. */}
          <nav className="hidden lg:flex items-center flex-wrap justify-end gap-2 xl:gap-3 flex-grow">
            <button 
              onClick={() => navigateTo('/simulators')}
              className="flex items-center text-[9px] xl:text-[10px] uppercase tracking-widest font-black bg-transparent border-2 border-[#D4A017] text-[#D4A017] px-3 xl:px-5 py-2 rounded-lg hover:bg-[#D4A017] hover:text-[#003366] transition-all whitespace-nowrap"
            >
              🎮 SIMULADORES
            </button>
            <button 
              onClick={() => navigateTo('/career-quiz')}
              className="flex items-center text-[9px] xl:text-[10px] uppercase tracking-widest font-black bg-transparent border-2 border-[#D4A017] text-[#D4A017] px-3 xl:px-5 py-2 rounded-lg hover:bg-[#D4A017] hover:text-[#003366] transition-all whitespace-nowrap"
            >
              ⭐ ESPECIALIDADE
            </button>
            <button 
              onClick={() => navigateTo('/medical-events')}
              className="flex items-center text-[9px] xl:text-[10px] uppercase tracking-widest font-black bg-transparent border-2 border-[#D4A017] text-[#D4A017] px-3 xl:px-5 py-2 rounded-lg hover:bg-[#D4A017] hover:text-[#003366] transition-all whitespace-nowrap"
            >
              📅 CONGRESSOS
            </button>
            <button 
              onClick={() => navigateTo('/calculators')}
              className="flex items-center text-[9px] xl:text-[10px] uppercase tracking-widest font-black bg-transparent border-2 border-[#D4A017] text-[#D4A017] px-3 xl:px-5 py-2 rounded-lg hover:bg-[#D4A017] hover:text-[#003366] transition-all whitespace-nowrap"
            >
              📊 CALCULADORAS
            </button>
            
            <button 
              onClick={() => navigateTo('/admin')}
              className="flex items-center text-[9px] xl:text-[10px] uppercase tracking-widest font-black text-white/70 border-2 border-white/10 px-3 xl:px-5 py-2 rounded-lg hover:border-white hover:text-white transition-all bg-white/5 whitespace-nowrap"
            >
              ⚙️ ADMIN
            </button>

            {currentUser && (
              <>
                <div className="w-px h-6 bg-white/20 mx-1"></div>
                <div className="flex items-center gap-3 bg-white/5 px-3 py-1.5 rounded-xl border border-white/10">
                  {currentUser.photoURL ? (
                    <img src={currentUser.photoURL} alt="Avatar" className="w-8 h-8 rounded-full border border-[#D4A017]" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-[#D4A017] flex items-center justify-center text-[#003366] font-bold">
                      {currentUser.displayName?.charAt(0).toUpperCase() || 'U'}
                    </div>
                  )}
                  <div className="flex flex-col text-left mr-1">
                    <span className="text-xs font-bold leading-tight">{currentUser.displayName?.split(' ')[0] || 'Aluno'}</span>
                    <span className="text-[8px] text-[#D4A017] font-black tracking-widest uppercase">
                      {getRoleLabel(userProfile?.role)}
                    </span>
                  </div>
                  <button 
                    onClick={logout} 
                    className="p-1.5 hover:bg-red-500/20 text-red-300 hover:text-red-400 rounded-lg transition-all" 
                    title="Sair"
                  >
                    <LogOut size={16} />
                  </button>
                </div>
              </>
            )}
          </nav>

          {/* Botão Hambúrguer (Aparece em telas menores que lg - iPad/Mobile) */}
          <button 
            className="lg:hidden p-2 text-[#D4A017] hover:bg-white/5 rounded-lg transition-colors ml-auto"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {isMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Menu Mobile Dropdown */}
      {isMenuOpen && (
        <div className="lg:hidden bg-[#002244] border-t border-[#D4A017]/20 p-4 animate-in slide-in-from-top duration-300 shadow-xl">
          <div className="flex flex-col gap-3">
            
            {/* SESSÃO DE AUTENTICAÇÃO (MOBILE) */}
            {currentUser && (
              <div className="border-b border-white/10 pb-4 mb-2">
                <div className="flex items-center justify-between bg-white/5 p-3 rounded-xl border border-white/10">
                  <div className="flex items-center gap-3">
                    {currentUser.photoURL ? (
                      <img src={currentUser.photoURL} alt="Avatar" className="w-10 h-10 rounded-full border border-[#D4A017]" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-[#D4A017] flex items-center justify-center text-[#003366] font-bold text-lg">
                        {currentUser.displayName?.charAt(0).toUpperCase() || 'U'}
                      </div>
                    )}
                    <div className="flex flex-col">
                      <span className="font-bold text-white text-sm">{currentUser.displayName || 'Aluno Luna'}</span>
                      <span className="text-[10px] text-[#D4A017] uppercase tracking-widest font-black">
                        {getRoleLabel(userProfile?.role)}
                      </span>
                    </div>
                  </div>
                  <button onClick={() => { logout(); setIsMenuOpen(false); }} className="p-2 bg-red-500/20 text-red-400 rounded-lg">
                    <LogOut size={20} />
                  </button>
                </div>
              </div>
            )}

            <button 
              onClick={() => navigateTo('/simulators')}
              className="w-full text-left py-3 px-4 text-sm font-black bg-transparent border-2 border-[#D4A017] text-[#D4A017] rounded-lg hover:bg-[#D4A017]/10 transition-all"
            >
              🎮 SIMULADORES PRÁTICOS
            </button>
            <button 
              onClick={() => navigateTo('/career-quiz')}
              className="w-full text-left py-3 px-4 text-sm font-black bg-transparent border-2 border-[#D4A017] text-[#D4A017] rounded-lg hover:bg-[#D4A017]/10 transition-all"
            >
              ⭐ QUAL MINHA ESPECIALIDADE?
            </button>
            <button 
              onClick={() => navigateTo('/medical-events')}
              className="w-full text-left py-3 px-4 text-sm font-black bg-transparent border-2 border-[#D4A017] text-[#D4A017] rounded-lg hover:bg-[#D4A017]/10 transition-all"
            >
              📅 CONGRESSOS MÉDICOS
            </button>
            <button 
              onClick={() => navigateTo('/calculators')}
              className="w-full text-left py-3 px-4 text-sm font-black bg-transparent border-2 border-[#D4A017] text-[#D4A017] rounded-lg hover:bg-[#D4A017]/10 transition-all"
            >
              📊 CALCULADORAS
            </button>
            <button 
              onClick={() => navigateTo('/admin')}
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