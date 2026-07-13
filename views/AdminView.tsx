import React, { useState, useEffect } from 'react';
import { Summary, Question, OsceStation, LabSimulation, ReferenceMaterial, QuizResult } from '../types.ts';
import { Layers, BarChart3, FileText, ClipboardList, Stethoscope, Microscope, BookOpen, Lock, BrainCircuit, ShieldAlert, UserCheck, CheckCircle, XCircle } from 'lucide-react'; 

import { useData } from '../contexts/DataContext.tsx';
import { useAuth } from '../contexts/AuthContext.tsx';
import { db, ref, push, remove, set, update, onValue } from '../firebase.ts';
import { PERIODS, SIMULATIONS } from '../constants.tsx';

import AdminStats from '../components/admin/AdminStats.tsx';
import AdminMaterials from '../components/admin/AdminMaterials.tsx';
import AdminQuestions from '../components/admin/AdminQuestions.tsx';
import AdminLab from '../components/admin/AdminLab.tsx';
import AdminOsce from '../components/admin/AdminOsce.tsx';
import AdminThemes from '../components/admin/AdminThemes.tsx';
import AdminReferences from '../components/admin/AdminReferences.tsx';
import AdminDisciplines from '../components/admin/AdminDisciplines.tsx'; 
import AdminAnalytics from '../components/admin/AdminAnalytics.tsx';

interface PeriodRequest {
  firebaseId?: string;
  userId: string;
  userName: string;
  userEmail: string;
  currentPeriodId: string;
  requestedPeriodId: string;
  status: 'pending' | 'approved' | 'rejected';
  timestamp: string;
}

interface AdminViewProps {
  onBack: () => void; 
}

const AdminView: React.FC<AdminViewProps> = ({ onBack }) => {
  const { periods, disciplines } = useData();
  const { userProfile, isLoadingAuth } = useAuth();
  const isAdmin = userProfile?.role === 'admin';
  
  const [activeTab, setActiveTab] = useState<'requests' | 'questions' | 'osce' | 'stats' | 'analytics' | 'references' | 'materials' | 'themes' | 'lab' | 'access'>('requests');
  
  const [statsPeriodFilter, setStatsPeriodFilter] = useState(''); 
  const [statsDiscFilter, setStatsDiscFilter] = useState('');
  const [statsTypeFilter, setStatsTypeFilter] = useState('');
  const [statsQuizTitleFilter, setStatsQuizTitleFilter] = useState('');

  const [adminQuestions, setAdminQuestions] = useState<Question[]>([]);
  const [adminOsceStations, setAdminOsceStations] = useState<OsceStation[]>([]);
  const [adminLabSimulations, setAdminLabSimulations] = useState<LabSimulation[]>([]);
  const [adminQuizResults, setAdminQuizResults] = useState<QuizResult[]>([]);
  const [adminOsceAnalytics, setAdminOsceAnalytics] = useState<any[]>([]);
  const [adminRequests, setAdminRequests] = useState<PeriodRequest[]>([]);

  useEffect(() => {
    if (!isAdmin || !db) return;

    const refs = [
      { path: 'questions', setter: (data: any) => setAdminQuestions(Object.keys(data).map(k => ({ ...data[k], firebaseId: k }))) },
      { path: 'osce', setter: (data: any) => setAdminOsceStations(Object.keys(data).map(k => ({ ...data[k], firebaseId: k }))) },
      { path: 'labSimulations', setter: (data: any) => setAdminLabSimulations(Object.keys(data).map(k => ({ ...data[k], firebaseId: k }))) },
      { path: 'quizResults', setter: (data: any) => setAdminQuizResults(Object.keys(data).map(k => ({ ...data[k], id: k }))) },
      { path: 'osceAnalytics', setter: (data: any) => setAdminOsceAnalytics(Object.keys(data).map(k => ({ ...data[k], firebaseId: k }))) },
      { path: 'periodRequests', setter: (data: any) => setAdminRequests(Object.keys(data).map(k => ({ ...data[k], firebaseId: k })).sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())) }
    ];

    const unsubscribes = refs.map(r => {
      return onValue(ref(db, r.path), snap => {
        const val = snap.val();
        if (val) r.setter(val);
        else r.setter([]); 
      });
    });

    return () => unsubscribes.forEach(unsub => unsub());
  }, [isAdmin]);

  // =========================================================================
  // FUNÇÕES DE APROVAÇÃO DE PERÍODO
  // =========================================================================
  const handleApproveRequest = async (req: PeriodRequest) => {
    if (!db || !req.firebaseId) return;
    try {
      await update(ref(db, `users/${req.userId}`), { periodId: req.requestedPeriodId });
      await update(ref(db, `periodRequests/${req.firebaseId}`), { status: 'approved' });
    } catch (error) {
      console.error("Erro ao aprovar requisição:", error);
    }
  };

  const handleRejectRequest = async (req: PeriodRequest) => {
    if (!db || !req.firebaseId) return;
    try {
      await update(ref(db, `periodRequests/${req.firebaseId}`), { status: 'rejected' });
    } catch (error) {
      console.error("Erro ao rejeitar requisição:", error);
    }
  };

  // =========================================================================
  // DEMAIS FUNÇÕES DE BANCO DE DADOS 
  // =========================================================================
  const handleGlobalReset = async () => {
    const pass = prompt("⚠️ AÇÃO DESTRUTIVA: Apagar absolutamente TODO o banco de dados?\n\nPara confirmar, digite a senha master de sistema (fmst8):");
    if (pass === 'fmst8' && db) {
      try {
        await Promise.all([
          remove(ref(db, 'questions')), remove(ref(db, 'summaries')), remove(ref(db, 'osce')),
          remove(ref(db, 'discipline_config')), remove(ref(db, 'labSimulations')),
          remove(ref(db, 'osceAnalytics')), remove(ref(db, 'periods')), remove(ref(db, 'disciplines')),
          remove(ref(db, 'periodRequests'))
        ]);
        alert("✅ Banco de dados completamente resetado.");
      } catch (error) {
        console.error("[AdminView] Erro ao resetar banco:", error);
      }
    } else if (pass !== null) {
      alert("❌ Senha master incorreta. Ação cancelada.");
    }
  };

  const handleSeedDatabase = async () => {
    const pass = prompt("⚠️ MIGRAR ESTRUTURA BASE: Deseja injetar a árvore de Períodos e Disciplinas para o Firebase?\n\nPara confirmar, digite a senha master (fmst8):");
    if (pass === 'fmst8' && db) {
      try {
        await Promise.all([
          set(ref(db, 'periods'), PERIODS),
          set(ref(db, 'disciplines'), SIMULATIONS)
        ]);
        alert("✅ Estrutura Base (Períodos e Disciplinas) migrada com sucesso para a Nuvem!");
      } catch (error) {
        console.error("[AdminView] Erro ao injetar estrutura:", error);
      }
    }
  };

  const handleClearResults = async () => {
    if (db) await remove(ref(db, 'quizResults')).catch(console.error);
  };
  
  const handleClearAnalytics = async () => {
    const pass = prompt("Deseja apagar os dados brutos de pesquisa (Analytics)? Digite fmst8:");
    if (pass === 'fmst8' && db) await remove(ref(db, 'osceAnalytics'));
  };

  const handleClearQuestions = async (discId?: string) => {
    if (db) {
      if (discId) {
        const promises = adminQuestions.filter(q => q.disciplineId === discId && q.firebaseId).map(q => remove(ref(db, `questions/${q.firebaseId}`)));
        await Promise.all(promises);
      } else {
        await remove(ref(db, 'questions'));
      }
    }
  };

  const handleClearOsce = async (discId?: string) => {
    if (db) {
      if (discId) {
        const promises = adminOsceStations.filter(o => o.disciplineId === discId && o.firebaseId).map(o => remove(ref(db, `osce/${o.firebaseId}`)));
        await Promise.all(promises);
      } else {
        await remove(ref(db, 'osce'));
      }
    }
  };

  const handleClearLab = async (discId?: string) => {
    if (db) {
      if (discId) {
        const promises = adminLabSimulations.filter(s => s.disciplineId === discId && s.firebaseId).map(s => remove(ref(db, `labSimulations/${s.firebaseId}`)));
        await Promise.all(promises);
      } else {
        await remove(ref(db, 'labSimulations'));
      }
    }
  };

  const handleAddTheme = async (disciplineId: string, themeName: string) => {
    const disc = disciplines.find(d => d.id === disciplineId);
    if (disc && db) await set(ref(db, `discipline_config/${disciplineId}/themes`), Array.from(new Set([...disc.themes, themeName])));
  };

  const handleRemoveTheme = async (disciplineId: string, themeName: string) => {
    const disc = disciplines.find(d => d.id === disciplineId);
    if (disc && db) await set(ref(db, `discipline_config/${disciplineId}/themes`), disc.themes.filter(t => t !== themeName));
  };

  const handleUpdateReferences = async (disciplineId: string, refsList: ReferenceMaterial[]) => {
    if (db) await set(ref(db, `discipline_config/${disciplineId}/references`), refsList);
  };

  const handleToggleStatus = async (disciplineId: string, currentStatus: string) => {
    if (db) await set(ref(db, `discipline_config/${disciplineId}/status`), currentStatus === 'active' ? 'locked' : 'active');
  };

  const handleToggleFeature = async (disciplineId: string, featureId: string, isCurrentlyLocked: boolean) => {
    const disc = disciplines.find(d => d.id === disciplineId);
    if (!disc || !db) return;
    
    let newLockedFeatures = disc.lockedFeatures ? [...disc.lockedFeatures] : [];
    if (isCurrentlyLocked) newLockedFeatures = newLockedFeatures.filter(id => id !== featureId);
    else if (!newLockedFeatures.includes(featureId)) newLockedFeatures.push(featureId);
    
    await set(ref(db, `discipline_config/${disciplineId}/lockedFeatures`), newLockedFeatures);
  };

  // =========================================================================

  if (isLoadingAuth) {
    return <div className="min-h-[80vh] flex items-center justify-center">Verificando autoridade...</div>;
  }

  if (!isAdmin) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-4 animate-in fade-in duration-500">
        <div className="bg-white p-10 rounded-[2.5rem] shadow-2xl border border-red-100 w-full max-w-md text-center">
          <div className="w-20 h-20 bg-red-50 text-red-600 rounded-3xl flex items-center justify-center text-3xl mx-auto mb-6 shadow-sm border border-red-100">
            <ShieldAlert size={36} />
          </div>
          <h2 className="text-2xl font-black text-[#003366] mb-4 uppercase tracking-tighter">Área Classificada</h2>
          <p className="text-xs text-gray-500 font-bold tracking-widest uppercase mb-8 leading-relaxed">
            Seu perfil atual ({userProfile?.role || 'Visitante'}) não possui privilégios de Administrador.
          </p>
          <button 
            onClick={onBack}
            className="w-full bg-[#003366] text-white py-4 rounded-xl font-black uppercase tracking-widest shadow-lg hover:bg-[#D4A017] transition-all"
          >
            Voltar ao Campus
          </button>
        </div>
      </div>
    );
  }

  const pendingRequests = adminRequests.filter(r => r.status === 'pending');

  return (
    <div className="max-w-7xl mx-auto px-4 py-12 print:p-0 print:m-0">
      
      <div className="flex flex-col md:flex-row justify-between items-center mb-10 border-b pb-8 gap-4 print:hidden">
        <div className="flex items-center gap-4">
           <button onClick={onBack} className="bg-gray-100 p-3 rounded-xl hover:bg-gray-200 transition-all text-[#003366]">←</button>
           <div>
             <h2 className="text-3xl font-black text-[#003366] tracking-tighter uppercase">Painel de Controle</h2>
             <p className="text-[10px] font-black text-[#D4A017] uppercase tracking-widest">Gestão de Dados em Nuvem • Master Admin</p>
           </div>
        </div>
        <div className="flex gap-2 flex-wrap justify-end">
           <button onClick={handleSeedDatabase} className="bg-blue-100 text-blue-800 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-200 transition-all border border-blue-200 shadow-sm">Injetar Estrutura (Seed)</button>
           <button onClick={handleClearAnalytics} className="bg-purple-100 text-purple-600 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-purple-200 transition-all">Limpar Analytics</button>
           <button onClick={handleClearResults} className="bg-orange-100 text-orange-600 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-orange-200 transition-all">Limpar Resultados</button>
           <button onClick={handleGlobalReset} className="bg-red-500 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-600 shadow-lg transition-all">Resetar Banco Total</button>
        </div>
      </div>

      <nav className="flex flex-wrap gap-2 mb-12 print:hidden">
        {[
          { id: 'requests', label: `Solicitações ${pendingRequests.length > 0 ? `(${pendingRequests.length})` : ''}`, icon: <UserCheck size={16}/> },
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
              ${tab.id === 'requests' && pendingRequests.length > 0 && activeTab !== 'requests' ? 'border-[#D4A017] text-[#D4A017]' : ''}
            `}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </nav>

      {/* RENDERIZAÇÃO DOS COMPONENTES */}
      
      {activeTab === 'requests' && (
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 animate-in fade-in">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-[#D4A017]/10 text-[#D4A017] rounded-xl">
              <UserCheck size={24} />
            </div>
            <div>
              <h2 className="text-xl font-black text-[#003366] uppercase tracking-tighter">Solicitações de Mudança de Período</h2>
              <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">Gestão de Progressão Curricular dos Alunos</p>
            </div>
          </div>

          {adminRequests.length === 0 ? (
            <div className="text-center py-12 text-gray-400 font-bold uppercase tracking-widest text-xs">
              Nenhuma solicitação registrada no sistema.
            </div>
          ) : (
            <div className="space-y-4">
              {adminRequests.map(req => {
                const isPending = req.status === 'pending';
                const currentName = periods.find(p => p.id === req.currentPeriodId)?.name || req.currentPeriodId;
                const requestedName = periods.find(p => p.id === req.requestedPeriodId)?.name || req.requestedPeriodId;
                
                return (
                  <div key={req.firebaseId} className={`flex flex-col md:flex-row items-center justify-between p-4 rounded-2xl border ${isPending ? 'border-[#D4A017]/30 bg-[#D4A017]/5' : 'border-gray-100 bg-gray-50'}`}>
                    <div className="flex flex-col mb-4 md:mb-0 w-full md:w-auto">
                      <span className="font-black text-[#003366]">{req.userName}</span>
                      <span className="text-xs text-gray-500 mb-2">{req.userEmail}</span>
                      <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest">
                        <span className="bg-gray-200 text-gray-600 px-2 py-1 rounded-md">{currentName}</span>
                        <span className="text-gray-400">➔</span>
                        <span className="bg-[#003366] text-white px-2 py-1 rounded-md">{requestedName}</span>
                      </div>
                      <span className="text-[9px] text-gray-400 mt-2">{new Date(req.timestamp).toLocaleString()}</span>
                    </div>

                    <div className="flex gap-2 w-full md:w-auto">
                      {isPending ? (
                        <>
                          <button onClick={() => handleRejectRequest(req)} className="flex-1 md:flex-none flex items-center justify-center gap-1 bg-white border border-red-200 text-red-500 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-50 transition-all">
                            <XCircle size={14} /> Rejeitar
                          </button>
                          <button onClick={() => handleApproveRequest(req)} className="flex-1 md:flex-none flex items-center justify-center gap-1 bg-green-500 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-green-600 shadow-md transition-all">
                            <CheckCircle size={14} /> Aprovar
                          </button>
                        </>
                      ) : (
                        <div className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-1 ${req.status === 'approved' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {req.status === 'approved' ? <><CheckCircle size={14}/> Aprovado</> : <><XCircle size={14}/> Rejeitado</>}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {activeTab === 'stats' && (
        <AdminStats 
          quizResults={adminQuizResults}
          questions={adminQuestions}
          labSimulations={adminLabSimulations}
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
          analyticsData={adminOsceAnalytics || []} 
          disciplines={disciplines} 
          periods={periods}
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
          questions={adminQuestions}
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
            const q = adminQuestions.find(item => item.id === id); 
            if (db && q?.firebaseId) {
              await remove(ref(db, `questions/${q.firebaseId}`)).catch(console.error);
            }
          }}
          onClearQuestions={handleClearQuestions}
          onRemoveQuiz={async (title, discId) => {
            if (db) {
              const promises: Promise<void>[] = [];
              adminQuestions.forEach(q => {
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
          labSimulations={adminLabSimulations}
          onAddLabSimulation={async (sim) => {
            if (db) await push(ref(db, 'labSimulations'), sim).catch(console.error);
          }}
          onRemoveLabSimulation={async (id) => { 
            const sim = adminLabSimulations.find(item => item.id === id); 
            if (db && sim?.firebaseId) {
              await remove(ref(db, `labSimulations/${sim.firebaseId}`)).catch(console.error);
            }
          }}
          onClearLab={handleClearLab}
        />
      )}

      {activeTab === 'osce' && (
        <AdminOsce 
          periods={periods}
          disciplines={disciplines}
          osceStations={adminOsceStations}
          onAddOsceStations={async (os) => {
            if (db) {
              const promises = os.map(o => push(ref(db, 'osce'), o));
              await Promise.all(promises).catch(console.error);
            }
          }}
          onRemoveOsceStation={async (id) => { 
            const o = adminOsceStations.find(item => item.id === id); 
            if (db && o?.firebaseId) {
              await remove(ref(db, `osce/${o.firebaseId}`)).catch(console.error);
            }
          }}
          onClearOsce={handleClearOsce}
        />
      )}
      
      {activeTab === 'themes' && (
        <AdminThemes 
          periods={periods}
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