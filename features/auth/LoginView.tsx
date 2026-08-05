import React from 'react';
import { LogIn, UserPlus, KeyRound } from 'lucide-react';
import { Period } from '../../types';

interface LoginViewProps {
  periods: Period[];
  isLoginMode: boolean;
  isResetMode: boolean;
  email: string;
  password: string;
  confirmPassword: string;
  name: string;
  selectedPeriod: string;
  errorMsg: string;
  successMsg: string;
  isProcessing: boolean;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onConfirmPasswordChange: (value: string) => void;
  onNameChange: (value: string) => void;
  onSelectedPeriodChange: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onSwitchMode: (mode: 'login' | 'register') => void;
  onStartReset: () => void;
  onCancelReset: () => void;
  onGoogleLogin: () => void;
}

const LoginView: React.FC<LoginViewProps> = ({
  periods, isLoginMode, isResetMode, email, password, confirmPassword, name, selectedPeriod,
  errorMsg, successMsg, isProcessing,
  onEmailChange, onPasswordChange, onConfirmPasswordChange, onNameChange, onSelectedPeriodChange,
  onSubmit, onSwitchMode, onStartReset, onCancelReset, onGoogleLogin
}) => {
  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 py-8 animate-in fade-in duration-700 bg-cover bg-center relative"
         style={{ backgroundImage: 'url("https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&q=80")' }}>
      <div className="absolute inset-0 bg-[#003366]/80 backdrop-blur-sm z-0"></div>
      <div className="bg-white p-8 md:p-10 rounded-[2.5rem] shadow-2xl w-full max-w-md text-center z-10 relative overflow-hidden border-4 border-[#D4A017]/20">

        <div className="w-48 md:w-56 mx-auto mb-6 flex justify-center mt-2">
          <img src="/logo.png" alt="Logo Luna MedClass" className="w-full h-auto object-contain" />
        </div>

        <p className="text-[12px] md:text-sm text-[#003366] font-black tracking-widest uppercase mb-8 leading-relaxed px-2">
          Seu monitor virtual no estudo da medicina!
        </p>

        {!isResetMode && (
          <div className="flex bg-gray-100 p-1 rounded-xl mb-6 relative">
            <button
              onClick={() => onSwitchMode('login')}
              className={`flex-1 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all z-10 ${isLoginMode ? 'text-white bg-[#003366] shadow-md' : 'text-gray-400 hover:text-[#003366]'}`}
            >
              Já tenho conta
            </button>
            <button
              onClick={() => onSwitchMode('register')}
              className={`flex-1 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all z-10 ${!isLoginMode ? 'text-white bg-[#003366] shadow-md' : 'text-gray-400 hover:text-[#003366]'}`}
            >
              Criar Perfil
            </button>
          </div>
        )}

        {errorMsg && (
          <div className="bg-red-50 text-red-600 border border-red-200 text-xs font-bold p-3 rounded-lg mb-4 animate-in slide-in-from-top-2">
            {errorMsg}
          </div>
        )}
        {successMsg && (
          <div className="bg-green-50 text-green-700 border border-green-200 text-xs font-bold p-3 rounded-lg mb-4 animate-in slide-in-from-top-2">
            {successMsg}
          </div>
        )}

        <form onSubmit={onSubmit} className="space-y-4 mb-6 text-left">
          {isResetMode ? (
            <>
              <div className="relative">
                <input
                  type="email"
                  placeholder="Digite seu e-mail cadastrado"
                  required
                  value={email}
                  onChange={e => onEmailChange(e.target.value)}
                  className="w-full pl-4 pr-4 py-3.5 bg-gray-50 rounded-xl outline-none border-2 border-transparent focus:border-[#D4A017] focus:bg-white transition-all font-bold text-gray-700"
                />
              </div>
              <button
                type="submit"
                disabled={isProcessing}
                className="w-full flex items-center justify-center gap-2 bg-[#D4A017] text-[#003366] py-4 rounded-xl font-black uppercase tracking-widest shadow-lg hover:bg-[#003366] hover:text-white transition-all disabled:opacity-50 mt-2"
              >
                <KeyRound size={18} /> {isProcessing ? 'Enviando...' : 'Recuperar Senha'}
              </button>
              <button
                type="button"
                onClick={onCancelReset}
                className="w-full text-center text-xs font-bold text-gray-400 hover:text-[#003366] transition-all uppercase tracking-widest mt-4"
              >
                Cancelar e voltar ao Login
              </button>
            </>
          ) : (
            <>
              {!isLoginMode && (
                <>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Seu Nome Completo"
                      required
                      value={name}
                      onChange={e => onNameChange(e.target.value)}
                      className="w-full pl-4 pr-4 py-3.5 bg-gray-50 rounded-xl outline-none border-2 border-transparent focus:border-[#D4A017] focus:bg-white transition-all font-bold text-gray-700"
                    />
                  </div>
                  <div className="relative">
                    <select
                      required
                      value={selectedPeriod}
                      onChange={(e) => onSelectedPeriodChange(e.target.value)}
                      className="w-full pl-4 pr-4 py-3.5 bg-gray-50 rounded-xl outline-none border-2 border-transparent focus:border-[#D4A017] focus:bg-white transition-all font-bold text-gray-400 appearance-none"
                    >
                      <option value="" disabled>Selecione seu Período Atual</option>
                      {periods.map(p => (
                        <option key={p.id} value={p.id} className="text-gray-700">{p.name}</option>
                      ))}
                    </select>
                  </div>
                </>
              )}
              <div className="relative">
                <input
                  type="text"
                  placeholder="Usuário (E-mail)"
                  required
                  value={email}
                  onChange={e => onEmailChange(e.target.value)}
                  className="w-full pl-4 pr-4 py-3.5 bg-gray-50 rounded-xl outline-none border-2 border-transparent focus:border-[#D4A017] focus:bg-white transition-all font-bold text-gray-700"
                />
              </div>
              <div className="relative">
                <input
                  type="password"
                  placeholder="Senha"
                  required
                  value={password}
                  onChange={e => onPasswordChange(e.target.value)}
                  className="w-full pl-4 pr-4 py-3.5 bg-gray-50 rounded-xl outline-none border-2 border-transparent focus:border-[#D4A017] focus:bg-white transition-all font-bold text-gray-700"
                />
              </div>

              {!isLoginMode && (
                <div className="relative animate-in fade-in slide-in-from-top-2">
                  <input
                    type="password"
                    placeholder="Confirme sua Senha"
                    required
                    value={confirmPassword}
                    onChange={e => onConfirmPasswordChange(e.target.value)}
                    className={`w-full pl-4 pr-4 py-3.5 bg-gray-50 rounded-xl outline-none border-2 transition-all font-bold text-gray-700 ${confirmPassword && password !== confirmPassword ? 'border-red-400 focus:border-red-500 focus:bg-red-50' : 'border-transparent focus:border-[#D4A017] focus:bg-white'}`}
                  />
                  {confirmPassword && password !== confirmPassword && (
                    <p className="text-[9px] text-red-500 font-bold mt-1 uppercase tracking-widest text-right">As senhas não coincidem</p>
                  )}
                </div>
              )}

              <button
                type="submit"
                disabled={isProcessing}
                className="w-full flex items-center justify-center gap-2 bg-[#003366] text-white py-4 rounded-xl font-black uppercase tracking-widest shadow-lg hover:bg-[#D4A017] hover:text-[#003366] transition-all disabled:opacity-50 mt-2"
              >
                {isProcessing ? 'Processando...' : (isLoginMode ? <><LogIn size={18}/> Acessar Sistema</> : <><UserPlus size={18}/> Iniciar Jornada</>)}
              </button>

              {isLoginMode && (
                <div className="text-right mt-2">
                  <button
                    type="button"
                    onClick={onStartReset}
                    className="text-[10px] text-gray-400 hover:text-[#D4A017] font-bold uppercase tracking-widest transition-colors"
                  >
                    Esqueci minha senha
                  </button>
                </div>
              )}
            </>
          )}
        </form>

        {!isResetMode && (
          <>
            <div className="flex items-center gap-4 mb-6">
              <div className="h-px bg-gray-200 flex-1"></div>
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">ou</span>
              <div className="h-px bg-gray-200 flex-1"></div>
            </div>

            <button
              type="button"
              onClick={onGoogleLogin}
              className="w-full flex items-center justify-center gap-3 bg-white border-2 border-gray-100 text-gray-600 py-3.5 px-6 rounded-xl font-black uppercase tracking-widest hover:border-[#D4A017] hover:text-[#003366] transition-all"
            >
              <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" className="w-5 h-5" />
              Continuar com Google
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default LoginView;
