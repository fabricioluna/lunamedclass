import React, { useState } from 'react';
import { Summary, Question, OsceStation, LabSimulation, ReferenceMaterial } from '../types.ts';
import { Layers, BarChart3, FileText, ClipboardList, Stethoscope, Microscope, BookOpen, Lock, BrainCircuit } from 'lucide-react'; 

// IMPORTAÇÃO DA NOSSA "NUVEM" DE DADOS E FIREBASE
import { useData } from '../contexts/DataContext.tsx';
import { db, ref, push, remove, set } from '../firebase.ts';

// IMPORTAÇÕES DOS COMPONENTES MODULARIZADOS
import AdminStats from '../components/admin/AdminStats.tsx';
import AdminMaterials from '../components/admin/AdminMaterials.tsx';
import AdminQuestions from '../components/admin/AdminQuestions.tsx';
import AdminLab from '../components/admin/AdminLab.tsx';
import AdminOsce from '../components/admin/AdminOsce.tsx';
import AdminThemes from '../components/admin/AdminThemes.tsx';
import AdminReferences from '../components/admin/AdminReferences.tsx';
import AdminDisciplines from '../components/admin/AdminDisciplines.tsx'; 
import AdminAnalytics from '../components/admin/AdminAnalytics.tsx';

interface AdminViewProps {
  onBack: () => void; 
}

const AdminView: React.FC<AdminViewProps> = ({ onBack }) => {
  // 1. PUXANDO DADOS (Alterado de 'rooms' para 'periods')
  const { periods, questions, osceStations, disciplines, summaries, quizResults, labSimulations, osceAnalytics } = useData();

  const [isAuthorized, setIsAuthorized] = useState(() => sessionStorage.getItem('fms_admin_auth') === 'true');
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  
  const [activeTab, setActiveTab] = useState<'questions' | 'osce' | 'stats' | 'analytics' | 'references' | 'materials' | 'themes' | 'lab' | 'access'>('stats');
  
  // Refatorado para Period
  const [statsPeriodFilter, setStatsPeriodFilter] = useState(''); 
  const [statsDiscFilter, setStatsDiscFilter] = useState('');
  const [statsTypeFilter, setStatsTypeFilter] = useState('');
  const [statsQuizTitleFilter, setStatsQuizTitleFilter] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (login === 'luna' && password === 'fmst8') {
      setIsAuthorized(true);
      sessionStorage.setItem('fms_admin_auth', 'true');
    } else {
      alert('Credenciais incorretas!');
    }
  };

  // =========================================================================
  // 2. FUNÇÕES DE BANCO DE DADOS (ASSÍNCRONAS COM TRATAMENTO DE ERRO)
  // =========================================================================
  
  const handleGlobalReset = async () => {
    const pass = prompt("⚠️ AÇÃO DESTRUTIVA: Apagar absolutamente TODO o banco de dados?\n\nPara confirmar, digite a senha de administrador (fmst8):");
    if (pass === 'fmst8') {
      if (db) {
        try {
          await Promise.all([
            remove(ref(db, 'questions')),
            remove(ref(db, 'summaries')),
            remove(ref(db, 'osce')),
            remove(ref(db, 'discipline_config')),
            remove(ref(db, 'labSimulations')),
            remove(ref(db, 'osceAnalytics'))
          ]);
          alert("✅ Banco de dados completamente resetado.");
        } catch (error) {
          console.error("[AdminView] Erro ao resetar banco:", error);
          alert("❌ Erro ao resetar banco de dados.");
        }
      }
    } else if (pass !== null) {
      alert("❌ Senha incorreta. Ação cancelada.");
    }
  };

  const handleClearResults = async () => {
    if (db) {
      try {
        await remove(ref(db, 'quizResults'));
      } catch (error) {
        console.error("[AdminView] Erro ao limpar quizResults:", error);
      }
    }
  };
  
  const handleClearAnalytics = async () => {
    const pass = prompt("Deseja apagar os dados brutos de pesquisa (Analytics)? Digite fmst8:");
    if (pass === 'fmst8' && db) {
      try {
        await remove(ref(db, 'osceAnalytics'));
        alert("Dados de analytics removidos.");
      } catch (error) {
        console.error("[AdminView] Erro ao limpar analytics:", error);
      }
    }
  };

  const handleClearQuestions = async (discId?: string) => {
    if (db) {
      try {
        if (discId) {
          const promises = questions
            .filter(q => q.disciplineId === discId && q.firebaseId)
            .map(q => remove(ref(db, `questions/${q.firebaseId}`)));
          await Promise.all(promises);
        } else {
          await remove(ref(db, 'questions'));
        }
      } catch (error) {
        console.error("[AdminView] Erro ao limpar questões:", error);
      }
    }
  };

  const handleClearOsce = async (discId?: string) => {
    if (db) {
      try {
        if (discId) {
          const promises = osceStations
            .filter(o => o.disciplineId === discId && o.firebaseId)
            .map(o => remove(ref(db, `osce/${o.firebaseId}`)));
          await Promise.all(promises);
        } else {
          await remove(ref(db, 'osce'));
        }
      } catch (error) {
        console.error("[AdminView] Erro ao limpar OSCE:", error);
      }
    }
  };

  const handleClearLab = async (discId?: string) => {
    if (db) {
      try {
        if (discId) {
          const promises = labSimulations
            .filter(s => s.disciplineId === discId && s.firebaseId)
            .map(s => remove(ref(db, `labSimulations/${s.firebaseId}`)));
          await Promise.all(promises);
        } else {
          await remove(ref(db, 'labSimulations'));
        }
      } catch (error) {
        console.error("[AdminView] Erro ao limpar Lab Virtual:", error);
      }
    }
  };

  const handleAddTheme = async (disciplineId: string, themeName: string) => {
    const disc = disciplines.find(d => d.id === disciplineId);
    if (!disc) return;
    const newThemes = Array.from(new Set([...disc.themes, themeName]));
    if (db) {
      try {
        await set(ref(db, `discipline_config/${disciplineId}/themes`), newThemes);
      } catch (error) {
        console.error("[AdminView] Erro ao adicionar tema:", error);
      }
    }
  };

  const handleRemoveTheme = async (disciplineId: string, themeName: string) => {
    const disc = disciplines.find(d => d.id === disciplineId);
    if (!disc) return;
    const newThemes = disc.themes.filter(t => t !== themeName);
    if (db) {
      try {
        await set(ref(db, `discipline_config/${disciplineId}/themes`), newThemes);
      } catch (error) {
        console.error("[AdminView] Erro ao remover tema:", error);
      }
    }
  };

  const handleUpdateReferences = async (disciplineId: string, refsList: ReferenceMaterial[]) => {
    if (db) {
      try {
        await set(ref(db, `discipline_config/${disciplineId}/references`), refsList);
      } catch (error) {
        console.error("[AdminView] Erro ao atualizar referências:", error);
      }
    }
  };

  const handleToggleStatus = async (disciplineId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'locked' : 'active';
    if (db) {
      try {
        await set(ref(db, `discipline_config/${disciplineId}/status`), newStatus);
      } catch (error) {
        console.error("[AdminView] Erro ao alterar o status da disciplina:", error);
      }
    }
  };

  const handleToggleFeature = async (disciplineId: string, featureId: string, isCurrentlyLocked: boolean) => {
    const disc = disciplines.find(d => d.id === disciplineId);
    if (!disc) return;
    
    let newLockedFeatures = disc.lockedFeatures ? [...disc.lockedFeatures] : [];
    if (isCurrentlyLocked) {
      newLockedFeatures = newLockedFeatures.filter(id => id !== featureId);
    } else {
      if (!newLockedFeatures.includes(featureId)) newLockedFeatures.push(featureId);
    }
    
    if (db) {
      try {
        await set(ref(db, `discipline_config/${disciplineId}/lockedFeatures`), newLockedFeatures);
      } catch (error) {
        console.error("[AdminView] Erro ao alterar controle de feature:", error);
      }
    }
  };

  // =========================================================================

  if (!isAuthorized) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-4">
        <div className="bg-white p-10 rounded-[2.5rem] shadow-2xl border border-gray-100 w-full max-w-md text-center">
          <div className="w-20 h-20 bg-[#003366] text-white rounded-3xl flex items-center justify-center text-3xl mx-auto mb-6 shadow-xl">🔐</div>
          <h2 className="text-2xl font-black text-[#003366] mb-8 uppercase tracking-tighter">Acesso Restrito</h2>
          <form onSubmit={handleLogin} className="space-y-4">
            <input type="text" placeholder="Usuário" value={login} onChange={e => setLogin(e.target.value)} className="w-full p-4 bg-gray-50 rounded-xl outline-none border-2 border-transparent focus:border-[#D4A017] font-bold" />
            <input type="password" placeholder="Senha" value={password} onChange={e => setPassword(e.target.value)} className="w-full p-4 bg-gray-50 rounded-xl outline-none border-2 border-transparent focus:border-[#D4A017] font-bold" />
            <button type="submit" className="w-full bg-[#003366] text-white py-4 rounded-xl font-bold uppercase tracking-widest shadow-lg hover:bg-[#D4A017] hover:text-[#003366] transition-all">Entrar</button>
            <button type="button" onClick={onBack} className="w-full text-[10px] font-black text-gray-400 mt-4 uppercase tracking-widest">Voltar ao Portal</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-12 print:p-0 print:m-0">
      
      <div className="flex flex-col md:flex-row justify-between items-center mb-10 border-b pb-8 gap-4 print:hidden">
        <div className="flex items-center gap-4">
           <button onClick={onBack} className="bg-gray-100 p-3 rounded-xl hover:bg-gray-200 transition-all text-[#003366]">←</button>
           <div>
             <h2 className="text-3xl font-black text-[#003366] tracking-tighter uppercase">Painel de Controle</h2>
             <p className="text-[10px] font-black text-[#D4A017] uppercase tracking-widest">Gestão de Dados em Nuvem</p>
           </div>
        </div>
        <div className="flex gap-2">
           <button onClick={handleClearAnalytics} className="bg-purple-100 text-purple-600 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-purple-200 transition-all">Limpar Analytics</button>
           <button onClick={handleClearResults} className="bg-orange-100 text-orange-600 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-orange-200 transition-all">Limpar Resultados</button>
           <button onClick={handleGlobalReset} className="bg-red-500 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-600 shadow-lg transition-all">Resetar Banco Total</button>
        </div>
      </div>

      <nav className="flex flex-wrap gap-2 mb-12 print:hidden">
        {[
          { id: 'stats', label: 'Estatísticas', icon: <BarChart3 size={16}/> },
          { id: 'analytics', label: 'Research Analytics', icon: <BrainCircuit size={16}/> },
          { id: 'access', label: 'Acessos', icon: <Lock size={16}/> }, 
          { id: 'themes', label: 'Temas/Eixos', icon: <Layers size={16}/> },
          { id: 'questions', label: 'Questões', icon: <FileText size={16}/> },
          { id: 'osce', label: 'OSCE', icon: <Stethoscope size={16}/> },
          { id: 'lab', label: 'Lab Virtual', icon: <Microscope size={16}/> },
          { id: 'references', label: 'Referências', icon: <BookOpen size={16}/> },
          { id: 'materials', label: 'Materiais', icon: <ClipboardList size={16}/> },
        ].map(tab => (
          <button 
            key={tab.id}
            onClick={() => { setActiveTab(tab.id as any); }} 
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all
              ${activeTab === tab.id ? 'bg-[#003366] text-white shadow-xl scale-105' : 'bg-white text-gray-400 border border-gray-100 hover:border-gray-300'}
            `}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </nav>

      {/* RENDERIZAÇÃO DOS COMPONENTES */}
      {activeTab === 'stats' && (
        <AdminStats 
          quizResults={quizResults}
          questions={questions}
          labSimulations={labSimulations}
          disciplines={disciplines}
          statsPeriodFilter={statsPeriodFilter}
          statsDiscFilter={statsDiscFilter}
          statsTypeFilter={statsTypeFilter}
          statsQuizTitleFilter={statsQuizTitleFilter}
          setStatsPeriodFilter={setStatsPeriodFilter}
          setStatsDiscFilter={setStatsDiscFilter}
          setStatsTypeFilter={setStatsTypeFilter}
          setStatsQuizTitleFilter={setStatsQuizTitleFilter}
        />
      )}

      {activeTab === 'analytics' && (
        <AdminAnalytics 
          analyticsData={osceAnalytics || []} 
          disciplines={disciplines} 
          periods={periods} // <-- Prop renomeada
        />
      )}

      {activeTab === 'access' && (
        <AdminDisciplines 
          disciplines={disciplines}
          onToggleStatus={handleToggleStatus}
          onToggleFeature={handleToggleFeature}
        />
      )}

      {activeTab === 'materials' && (
        <AdminMaterials disciplines={disciplines} />
      )}

      {activeTab === 'questions' && (
        <AdminQuestions 
          questions={questions}
          disciplines={disciplines}
          onAddQuestions={async (qs) => {
            if (db) {
              const promises = qs.map(q => push(ref(db, 'questions'), q));
              await Promise.all(promises).catch(console.error);
            }
          }}
          onUpdateQuestion={async (q) => { 
            if (db && q.firebaseId) {
              await set(ref(db, `questions/${q.firebaseId}`), q).catch(console.error);
            }
          }}
          onRemoveQuestion={async (id) => { 
            const q = questions.find(item => item.id === id); 
            if (db && q?.firebaseId) {
              await remove(ref(db, `questions/${q.firebaseId}`)).catch(console.error);
            }
          }}
          onClearQuestions={handleClearQuestions}
          onRemoveQuiz={async (title, discId) => {
            if (db) {
              const promises: Promise<void>[] = [];
              questions.forEach(q => {
                if (q.quizTitle === title && (!discId || q.disciplineId === discId)) {
                  if (q.firebaseId) promises.push(remove(ref(db, `questions/${q.firebaseId}`)));
                }
              });
              await Promise.all(promises).catch(console.error);
            }
          }}
        />
      )}

      {activeTab === 'lab' && (
        <AdminLab 
          disciplines={disciplines}
          labSimulations={labSimulations}
          onAddLabSimulation={async (sim) => {
            if (db) await push(ref(db, 'labSimulations'), sim).catch(console.error);
          }}
          onRemoveLabSimulation={async (id) => { 
            const sim = labSimulations.find(item => item.id === id); 
            if (db && sim?.firebaseId) {
              await remove(ref(db, `labSimulations/${sim.firebaseId}`)).catch(console.error);
            }
          }}
          onClearLab={handleClearLab}
        />
      )}

      {activeTab === 'osce' && (
        <AdminOsce 
          periods={periods} // <-- Prop renomeada
          disciplines={disciplines}
          osceStations={osceStations}
          onAddOsceStations={async (os) => {
            if (db) {
              const promises = os.map(o => push(ref(db, 'osce'), o));
              await Promise.all(promises).catch(console.error);
            }
          }}
          onRemoveOsceStation={async (id) => { 
            const o = osceStations.find(item => item.id === id); 
            if (db && o?.firebaseId) {
              await remove(ref(db, `osce/${o.firebaseId}`)).catch(console.error);
            }
          }}
          onClearOsce={handleClearOsce}
        />
      )}
      
      {activeTab === 'themes' && (
        <AdminThemes 
          periods={periods} // <-- Prop renomeada
          disciplines={disciplines}
          onAddTheme={handleAddTheme}
          onRemoveTheme={handleRemoveTheme}
        />
      )}

      {activeTab === 'references' && (
        <AdminReferences 
          disciplines={disciplines}
          onUpdateReferences={handleUpdateReferences}
        />
      )}
    </div>
  );
};

export default AdminView;