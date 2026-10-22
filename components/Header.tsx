import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, LogOut, ArrowUpCircle, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { changeOwnPeriod } from '../services/authService';

const Header: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showPeriodModal, setShowPeriodModal] = useState(false);
  const [selectedNewPeriod, setSelectedNewPeriod] = useState('');
  const [isChangingPeriod, setIsChangingPeriod] = useState(false);
  const [periodChangeError, setPeriodChangeError] = useState('');
  
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser, userProfile, logout } = useAuth();
  const { periods } = useData();

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

  const currentPeriodName = periods.find(p => p.id === userProfile?.periodId)?.name || 'Sem Período';

  const closePeriodModal = () => {
    setShowPeriodModal(false);
    setSelectedNewPeriod('');
    setPeriodChangeError('');
  };

  const handleChangePeriod = async () => {
    if (!selectedNewPeriod || !currentUser || !userProfile) return;

    setIsChangingPeriod(true);
    setPeriodChangeError('');
    try {
      await changeOwnPeriod({
        userId: currentUser.uid,
        userName: currentUser.displayName || 'Aluno',
        userEmail: currentUser.email || '',
        currentPeriodId: userProfile.periodId || '',
        requestedPeriodId: selectedNewPeriod,
        timestamp: new Date().toISOString()
      });
      closePeriodModal();
      navigate(`/periodo/${selectedNewPeriod}`);
    } catch (error) {
      console.error("Erro ao mudar de período", error);
      setPeriodChangeError('Não foi possível mudar de período agora. Verifique sua conexão e tente de novo.');
    } finally {
      setIsChangingPeriod(false);
    }
  };

  return (
    <>
      <header className="bg-[#003366] text-white shadow-md border-b-2 border-[#D4A017] w-full relative z-40">
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

            {/* Menu Desktop */}
            <nav className="hidden lg:flex items-center flex-wrap justify-end gap-2 xl:gap-3 flex-grow">
              
              {/* BOTÃO GAMIFICADO DO ESTUDANTE INJETADO AQUI */}
              {currentUser && (
                <button 
                  onClick={() => navigateTo('/dashboard')}
                  className="flex items-center text-[9px] xl:text-[10px] uppercase tracking-widest font-black bg-[#D4A017] border-2 border-[#D4A017] text-[#003366] px-3 xl:px-5 py-2 rounded-lg hover:bg-transparent hover:text-[#D4A017] transition-all whitespace-nowrap shadow-md"
                >
                  📈 MEU DESEMPENHO
                </button>
              )}

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
              
              {userProfile?.role === 'admin' && (
                <button 
                  onClick={() => navigateTo('/admin')}
                  className="flex items-center text-[9px] xl:text-[10px] uppercase tracking-widest font-black text-white/70 border-2 border-white/10 px-3 xl:px-5 py-2 rounded-lg hover:border-white hover:text-white transition-all bg-white/5 whitespace-nowrap"
                >
                  ⚙️ ADMIN
                </button>
              )}

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
                    
                    {userProfile?.role === 'student' && (
                      <button 
                        onClick={() => setShowPeriodModal(true)} 
                        className="p-1.5 ml-1 hover:bg-[#D4A017]/20 text-[#D4A017] rounded-lg transition-all border border-[#D4A017]/30" 
                        title="Mudar de período"
                      >
                        <ArrowUpCircle size={16} />
                      </button>
                    )}

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

            {/* Botão Hambúrguer (Mobile) */}
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
          <div className="lg:hidden bg-[#002244] border-t border-[#D4A017]/20 p-4 animate-in slide-in-from-top duration-300 shadow-xl absolute w-full left-0">
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
                    <div className="flex gap-2">
                      {userProfile?.role === 'student' && (
                        <button onClick={() => { setIsMenuOpen(false); setShowPeriodModal(true); }} className="p-2 bg-[#D4A017]/20 text-[#D4A017] rounded-lg border border-[#D4A017]/30">
                          <ArrowUpCircle size={20} />
                        </button>
                      )}
                      <button onClick={() => { logout(); setIsMenuOpen(false); }} className="p-2 bg-red-500/20 text-red-400 rounded-lg">
                        <LogOut size={20} />
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* BOTÃO MOBILE INJETADO */}
              {currentUser && (
                <button 
                  onClick={() => navigateTo('/dashboard')}
                  className="w-full text-left py-3 px-4 text-sm font-black bg-[#D4A017] border-2 border-[#D4A017] text-[#003366] rounded-lg hover:bg-transparent hover:text-[#D4A017] transition-all shadow-md"
                >
                  📈 MEU DESEMPENHO
                </button>
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
              {userProfile?.role === 'admin' && (
                <button 
                  onClick={() => navigateTo('/admin')}
                  className="w-full text-left py-3 px-4 text-sm font-black text-white/70 border-2 border-white/10 rounded-lg hover:bg-white/5 transition-all"
                >
                  ⚙️ ADMINISTRAÇÃO
                </button>
              )}
            </div>
          </div>
        )}
      </header>

      {/* MODAL DE MUDANÇA DE PERÍODO */}
      {showPeriodModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#003366]/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl relative">
            <button 
              onClick={closePeriodModal}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 bg-gray-100 p-2 rounded-full"
            >
              <X size={20} />
            </button>
            
            <div className="flex flex-col items-center text-center mb-6 mt-4">
              <div className="w-16 h-16 bg-[#D4A017]/10 text-[#D4A017] rounded-2xl flex items-center justify-center mb-4">
                <ArrowUpCircle size={32} />
              </div>
              <h3 className="text-2xl font-black text-[#003366] uppercase tracking-tighter">Mudar de Período</h3>
              <p className="text-xs text-gray-500 font-bold mt-2 px-4 uppercase tracking-widest">
                Você está no <span className="text-[#003366]">{currentPeriodName}</span>. Para qual período quer ir?
              </p>
            </div>

            <select
              value={selectedNewPeriod}
              onChange={(e) => { setSelectedNewPeriod(e.target.value); setPeriodChangeError(''); }}
              disabled={isChangingPeriod}
              className="w-full pl-4 pr-4 py-4 bg-gray-50 rounded-xl outline-none border-2 border-gray-200 focus:border-[#D4A017] transition-all font-bold text-[#003366] appearance-none mb-3"
            >
              <option value="" disabled>Selecione o novo período...</option>
              {periods.filter(p => p.id !== userProfile?.periodId).map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>

            <p className="text-[11px] text-gray-500 font-medium text-center mb-4 leading-relaxed">
              A troca vale na hora e você pode mudar de novo quando precisar. Seu progresso nos simulados e no Lab não se perde.
            </p>

            {periodChangeError && (
              <p className="bg-red-50 text-red-700 text-xs font-bold p-3 rounded-xl mb-4 text-center">{periodChangeError}</p>
            )}

            <button 
              onClick={handleChangePeriod}
              disabled={!selectedNewPeriod || isChangingPeriod}
              className="w-full bg-[#003366] text-white py-4 rounded-xl font-black uppercase tracking-widest shadow-lg hover:bg-[#D4A017] hover:text-[#003366] transition-all disabled:opacity-50"
            >
              {isChangingPeriod
                ? 'Mudando...'
                : selectedNewPeriod
                  ? `Ir para o ${periods.find(p => p.id === selectedNewPeriod)?.name ?? 'período'}`
                  : 'Mudar período'}
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default Header;