import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { db, ref, onValue } from '../firebase';
import { QuizResult } from '../types';
import { Target, BrainCircuit, Activity, ChevronLeft, Zap, Star, ShieldCheck } from 'lucide-react';

interface StudentDashboardProps {
  onBack: () => void;
}

const StudentDashboardView: React.FC<StudentDashboardProps> = ({ onBack }) => {
  const { userProfile, currentUser } = useAuth();
  const [results, setResults] = useState<QuizResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    
    if (!db || !currentUser) {
      setIsLoading(false);
      return;
    }

    const resultsRef = ref(db, 'quizResults');
    const unsubscribe = onValue(resultsRef, (snapshot) => {
      if (!isMounted) return;
      
      if (snapshot.exists()) {
        const allData = snapshot.val();
        const allResults: QuizResult[] = Object.keys(allData).map(k => ({ ...allData[k], id: k }));
        
        // Filtro de Segurança
        // Nota: Garante que apenas resultados válidos sejam processados. Em versões futuras do App.tsx, a propriedade userId deverá ser salva diretamente no quizResults.
        const validResults = allResults.filter(r => r && typeof r.score === 'number' && typeof r.total === 'number'); 
        setResults(validResults.reverse()); 
      }
      setIsLoading(false);
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [currentUser]);

  if (isLoading) {
    return (
      <div className="flex-grow flex flex-col items-center justify-center p-6 bg-[#f4f7f6]">
        <div className="w-12 h-12 border-4 border-[#003366]/20 border-t-[#D4A017] rounded-full animate-spin mb-4"></div>
        <h2 className="text-[#003366] font-black uppercase tracking-widest text-xs">Apurando Desempenho...</h2>
      </div>
    );
  }

  // Cálculos de gamificação protegidos contra falhas de tipagem
  const totalSimulations = results.length;
  const osceResults = results.filter(r => r.type && String(r.type).includes('osce'));
  const theoryResults = results.filter(r => r.type === 'teorico');
  
  const avgScore = totalSimulations > 0 
    ? (results.reduce((acc, curr) => acc + (curr.score / curr.total) * 10, 0) / totalSimulations).toFixed(1) 
    : '0.0';

  const totalXP = results.reduce((acc, curr) => acc + ((curr.score || 0) * 50), 0);
  const userLevel = Math.floor(totalXP / 1000) + 1;

  // Extração segura do nome de exibição (Type Casting necessário pois .name não existe estritamente em Firebase UserProfile)
  const profileSafe = userProfile as any;
  const displayName = profileSafe?.name || profileSafe?.displayName || currentUser?.email || 'Aluno';
  const initial = typeof displayName === 'string' && displayName.length > 0 ? displayName.charAt(0).toUpperCase() : 'A';

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 animate-in fade-in duration-500 pb-32">
      
      <div className="flex items-center mb-8">
        <button onClick={onBack} className="p-3 mr-4 bg-white rounded-xl text-[#003366] shadow-sm hover:bg-gray-100 transition-colors border border-gray-100">
          <ChevronLeft size={20} />
        </button>
        <div>
          <h1 className="text-3xl font-black text-[#003366] tracking-tighter uppercase">Meu Prontuário</h1>
          <p className="text-[10px] text-[#D4A017] uppercase tracking-widest font-bold">Analytics Pessoal & Experiência</p>
        </div>
      </div>

      <div className="bg-gradient-to-br from-[#003366] to-[#001f3f] p-8 md:p-10 rounded-[2.5rem] shadow-2xl text-white mb-8 relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="absolute -right-10 -top-10 opacity-10"><BrainCircuit size={200} /></div>
        
        <div className="flex items-center gap-6 relative z-10 w-full">
          <div className="w-20 h-20 bg-white/10 border-2 border-[#D4A017] rounded-full flex items-center justify-center shrink-0">
            <span className="text-3xl font-black text-[#D4A017]">{initial}</span>
          </div>
          <div>
            <h2 className="text-2xl font-black">{displayName}</h2>
            <p className="text-blue-200 text-xs uppercase tracking-widest mt-1">Nível {userLevel} • {profileSafe?.periodId ? `Período ${profileSafe.periodId}` : 'Luna MedClass'}</p>
          </div>
        </div>

        <div className="flex gap-4 relative z-10 w-full md:w-auto shrink-0 bg-black/20 p-4 rounded-3xl border border-white/10">
          <div className="text-center px-4 border-r border-white/20">
            <p className="text-[10px] uppercase text-blue-300 font-bold tracking-wider">XP Total</p>
            <p className="text-2xl font-black text-[#D4A017] flex items-center justify-center gap-1"><Zap size={16}/> {totalXP}</p>
          </div>
          <div className="text-center px-4">
            <p className="text-[10px] uppercase text-blue-300 font-bold tracking-wider">Média Geral</p>
            <p className="text-2xl font-black text-white">{avgScore}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col items-center justify-center text-center hover:shadow-md transition-shadow">
          <div className="w-12 h-12 bg-blue-50 text-[#003366] rounded-2xl flex items-center justify-center mb-4"><Target size={24}/></div>
          <span className="text-3xl font-black text-[#003366]">{totalSimulations}</span>
          <span className="text-[10px] uppercase font-bold text-gray-400 tracking-widest mt-1">Simulados Feitos</span>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col items-center justify-center text-center hover:shadow-md transition-shadow">
          <div className="w-12 h-12 bg-green-50 text-green-600 rounded-2xl flex items-center justify-center mb-4"><Activity size={24}/></div>
          <span className="text-3xl font-black text-green-600">{osceResults.length}</span>
          <span className="text-[10px] uppercase font-bold text-gray-400 tracking-widest mt-1">OSCEs Práticos</span>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col items-center justify-center text-center hover:shadow-md transition-shadow">
          <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center mb-4"><ShieldCheck size={24}/></div>
          <span className="text-3xl font-black text-purple-600">{theoryResults.length}</span>
          <span className="text-[10px] uppercase font-bold text-gray-400 tracking-widest mt-1">Provas Teóricas</span>
        </div>
      </div>

      <h3 className="text-sm font-black text-[#003366] uppercase tracking-widest mb-6 border-b border-gray-200 pb-2">Histórico Recente</h3>
      
      {results.length === 0 ? (
        <div className="bg-white border-2 border-dashed border-gray-200 rounded-3xl p-12 text-center text-gray-400">
          <Star size={40} className="mx-auto mb-4 opacity-50"/>
          <p className="font-bold uppercase tracking-widest text-xs">Você ainda não completou nenhuma simulação.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {results.slice(0, 10).map((r, i) => {
            const pct = r.total > 0 ? (r.score / r.total) * 100 : 0;
            const isApproved = pct >= 70;
            return (
              <div key={r.id || i} className="bg-white p-5 rounded-2xl border border-gray-100 flex items-center justify-between shadow-sm hover:shadow-md transition-shadow">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md ${r.type && String(r.type).includes('osce') ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                      {r.type || 'Simulado'}
                    </span>
                    <span className="text-xs font-bold text-gray-400">{r.date}</span>
                  </div>
                  <h4 className="font-black text-[#003366]">{r.quizTitle || r.discipline || 'Prática Clínica'}</h4>
                </div>
                <div className={`text-right ${isApproved ? 'text-green-500' : 'text-red-500'}`}>
                  <span className="text-2xl font-black">{r.score}/{r.total}</span>
                  <p className="text-[9px] font-black uppercase tracking-widest">{isApproved ? 'Aprovado' : 'Abaixo da Média'}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default StudentDashboardView;