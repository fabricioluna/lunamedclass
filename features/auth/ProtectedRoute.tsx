import React, { ReactNode, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useData } from '../../contexts/DataContext';
import LoginView from './LoginView';
import PeriodOnboardingView from './PeriodOnboardingView';

// RECEPÇÃO VIRTUAL / GATEWAY ACOLHEDOR: decide entre tela de carregamento, onboarding de
// período, formulário de login/cadastro ou liberar a rota protegida de fato.
const ProtectedRoute: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { currentUser, userProfile, isLoadingAuth, loginWithGoogle, loginWithEmail, registerWithEmail, resetPassword, updateUserPeriod } = useAuth();
  const { periods } = useData();

  const [isLoginMode, setIsLoginMode] = useState(true);
  const [isResetMode, setIsResetMode] = useState(false);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [selectedPeriod, setSelectedPeriod] = useState('');

  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setIsProcessing(true);

    try {
      if (isResetMode) {
        if (!email.trim()) throw new Error('Informe seu e-mail para recuperar a senha.');
        await resetPassword(email);
        setSuccessMsg('E-mail de recuperação enviado! Verifique sua caixa de entrada.');
        setIsResetMode(false);
      } else if (isLoginMode) {
        await loginWithEmail(email, password);
      } else {
        if (!name.trim()) throw new Error('O nome é obrigatório para o seu prontuário acadêmico.');
        if (!selectedPeriod) throw new Error('A seleção de período é obrigatória para a liberação de disciplinas.');
        if (password !== confirmPassword) throw new Error('As senhas digitadas não coincidem.');
        await registerWithEmail(name, email, password, selectedPeriod);
      }
    } catch (err) {
      console.error(err);
      const authErr = err as { code?: string; message?: string };
      if (authErr.code === 'auth/invalid-credential') setErrorMsg('Credenciais incorretas. Verifique usuário e senha.');
      else if (authErr.code === 'auth/email-already-in-use') setErrorMsg('Este e-mail já está cadastrado. Tente fazer login.');
      else if (authErr.code === 'auth/weak-password') setErrorMsg('A senha deve ter pelo menos 6 caracteres.');
      else setErrorMsg(authErr.message || 'Ocorreu um erro. Tente novamente.');
    } finally {
      setIsProcessing(false);
    }
  };

  const switchMode = (mode: 'login' | 'register') => {
    setIsLoginMode(mode === 'login');
    setIsResetMode(false);
    setErrorMsg('');
    setSuccessMsg('');
    setPassword('');
    setConfirmPassword('');
  };

  if (isLoadingAuth) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#f4f7f6] p-4">
        <div className="w-10 h-10 border-4 border-[#003366]/10 border-t-[#D4A017] rounded-full animate-spin mb-4"></div>
        <h1 className="text-[#003366] font-black uppercase tracking-[0.2em] text-[10px]">Preparando seu ambiente...</h1>
      </div>
    );
  }

  if (currentUser && userProfile && !userProfile.periodId && userProfile.role === 'student') {
    return (
      <PeriodOnboardingView
        periods={periods}
        selectedPeriod={selectedPeriod}
        onSelectPeriod={setSelectedPeriod}
        isProcessing={isProcessing}
        onConfirm={async () => {
          if (selectedPeriod) {
            setIsProcessing(true);
            await updateUserPeriod(selectedPeriod);
            setIsProcessing(false);
          }
        }}
      />
    );
  }

  if (!currentUser) {
    return (
      <LoginView
        periods={periods}
        isLoginMode={isLoginMode}
        isResetMode={isResetMode}
        email={email}
        password={password}
        confirmPassword={confirmPassword}
        name={name}
        selectedPeriod={selectedPeriod}
        errorMsg={errorMsg}
        successMsg={successMsg}
        isProcessing={isProcessing}
        onEmailChange={setEmail}
        onPasswordChange={setPassword}
        onConfirmPasswordChange={setConfirmPassword}
        onNameChange={setName}
        onSelectedPeriodChange={setSelectedPeriod}
        onSubmit={handleSubmit}
        onSwitchMode={switchMode}
        onStartReset={() => setIsResetMode(true)}
        onCancelReset={() => setIsResetMode(false)}
        onGoogleLogin={loginWithGoogle}
      />
    );
  }

  return <>{children}</>;
};

export default ProtectedRoute;
