import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, LogIn, LogOut } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext'; // <-- NUVEM DE IDENTIDADE

const Header: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  
  // HOOKS NATIVOS DO REACT ROUTER E AUTH
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser, userProfile, loginWithGoogle, logout } = useAuth();

  // O botão de voltar só aparece se não estivermos na tela principal
  const canGoBack = location.pathname !== '/' && location.pathname !== '/period-selection';

  const navigateTo = (path: string) => {
    navigate(path);
    setIsMenuOpen(false);
  };

  const handleBack = () => {
    // Se o usuário clicar em voltar, navegamos para trás no histórico do navegador
    navigate(-1);
  };

  // Helper para formatar a Badge de Role
  const getRoleLabel = (role?: string) => {
    if (role === 'admin') return 'Administrador';
    if (role === 'professor') return 'Professor';
    return 'Estudante';
  };

  return (
    <header className="bg-[#003366] text-white shadow-md sticky top-0 z-50 border-b-2 border-[#D4A017]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between py-4 md:h-28 gap-2">
          
          {/* Lado Esquerdo: Botão Voltar + Logo Isolada */}
          <div className="flex items-center gap-3 md:gap-4 flex-shrink min-w-0">
            
            {/* O Botão de Voltar Global */}
            {canGoBack && (
              <button 
                onClick={handleBack}
                className="bg-white/10 hover:bg-[#D4A017] text-white hover:text-[#003366] p-2.5 md:p-3 rounded-xl transition-all shadow-sm flex-shrink-0 border border-white/5"
                title="Página Anterior"
              >
                <ArrowLeft size={20} className="md:w-6 md:h-6" />
              </button>
            )}

            <div 
              className="flex items-center cursor-pointer group min-w-0 flex-shrink" 
              onClick={() => navigateTo('/')} 
              title="Voltar para a Página Inicial"
            >
              <div className="bg-white p-1 md:p-2 rounded-lg md:rounded-xl w-14 h-8 sm:w-24 sm:h-10 md:w-48 md:h-16 flex items-center justify-center overflow-hidden border-2 border-[#D4A017] shadow-lg transition-transform group-hover:scale-105 flex-shrink-0">
                <img 
                  src="/logo.png" 
                  alt="Logo Luna MedClass" 
                  className="w-full h-full object-contain"
                />
              </div>
            </div>
          </div>

          {/* Menu Desktop */}
          <nav className="hidden md:flex items-center gap-4">
            <button 
              onClick={() => navigateTo('/simulators')}
              className="flex items-center gap-1 text-[10px] uppercase tracking-widest font-black bg-transparent border-2 border-[#D4A017] text-[#D4A017] px-5 py-2 rounded-lg hover:bg-[#D4A017] hover:text-[#003366] transition-all whitespace-nowrap shadow-sm"
            >
              🎮 SIMULADORES
            </button>
            <button 
              onClick={() => navigateTo('/career-quiz')}
              className="flex items-center gap-1 text-[10px] uppercase tracking-widest font-black bg-transparent border-2 border-[#D4A017] text-[#D4A017] px-5 py-2 rounded-lg hover:bg-[#D4A017] hover:text-[#003366] transition-all whitespace-nowrap shadow-sm"
            >
              ⭐ ESPECIALIDADE
            </button>
            <button 
              onClick={() => navigateTo('/medical-events')}
              className="flex items-center gap-1 text-[10px] uppercase tracking-widest font-black bg-transparent border-2 border-[#D4A017] text-[#D4A017] px-5 py-2 rounded-lg hover:bg-[#D4A017] hover:text-[#003366] transition-all whitespace-nowrap shadow-sm"
            >
              📅 CONGRESSOS
            </button>
            <button 
              onClick={() => navigateTo('/calculators')}
              className="flex items-center gap-1 text-[10px] uppercase tracking-widest font-black bg-transparent border-2 border-[#D4A017] text-[#D4A017] px-5 py-2 rounded-lg hover:bg-[#D4A017] hover:text-[#003366] transition-all whitespace-nowrap shadow-sm"
            >
              📊 CALCULADORAS
            </button>
            
            {/* O Botão Admin só precisa aparecer se o user for admin ou em ambiente dev, mas mantive a lógica original visual */}
            <button 
              onClick={() => navigateTo('/admin')}
              className="flex items-center gap-1 text-[10px] uppercase tracking-widest font-black text-white/70 border-2 border-white/10 px-5 py-2 rounded-lg hover:border-white hover:text-white transition-all bg-white/5 whitespace-nowrap"
            >
              ⚙️ ADMIN
            </button>

            {/* SEPARADOR VISUAL */}
            <div className="w-px h-8 bg-white/20 mx-1"></div>

            {/* SESSÃO DE AUTENTICAÇÃO (DESKTOP) */}
            {currentUser ? (
              <div className="flex items-center gap-3 bg-white/5 px-3 py-1.5 rounded-xl border border-white/10">
                {currentUser.photoURL ? (
                  <img src={currentUser.photoURL} alt="Avatar" className="w-8 h-8 rounded-full border border-[#D4A017]" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-[#D4A017] flex items-center justify-center text-[#003366] font-bold">
                    {currentUser.displayName?.charAt(0).toUpperCase() || 'U'}
                  </div>
                )}
                <div className="hidden lg:flex flex-col text-left mr-2">
                  <span className="text-xs font-bold leading-tight">{currentUser.displayName?.split(' ')[0] || 'Aluno'}</span>
                  <span className="text-[9px] text-[#D4A017] font-black tracking-widest uppercase">
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
            ) : (
              <button 
                onClick={loginWithGoogle}
                className="flex items-center gap-2 text-[10px] uppercase tracking-widest font-black bg-[#D4A017] text-[#003366] px-5 py-2 rounded-lg hover:bg-white hover:text-[#003366] transition-all shadow-sm"
              >
                <LogIn size={16} /> Entrar
              </button>
            )}

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
        <div className="md:hidden bg-[#002244] border-t border-[#D4A017]/20 p-4 animate-in slide-in-from-top duration-300 shadow-xl">
          <div className="flex flex-col gap-3">
            
            {/* SESSÃO DE AUTENTICAÇÃO (MOBILE) */}
            <div className="border-b border-white/10 pb-4 mb-2">
              {currentUser ? (
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
              ) : (
                <button 
                  onClick={() => { loginWithGoogle(); setIsMenuOpen(false); }}
                  className="w-full flex justify-center items-center gap-2 py-3 px-4 text-sm font-black bg-[#D4A017] text-[#003366] rounded-lg hover:bg-white transition-all uppercase tracking-widest shadow-lg"
                >
                  <LogIn size={18} /> Entrar com Google
                </button>
              )}
            </div>

            {/* LINKS ORIGINAIS */}
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