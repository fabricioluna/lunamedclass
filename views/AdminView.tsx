import React, { useState, useEffect } from 'react';
import { Question, OsceStation, LabSimulation, ReferenceMaterial, QuizResult, FeatureFlag, AnalyticsResult } from '../types';
import { Layers, BarChart3, FileText, ClipboardList, Stethoscope, Microscope, BookOpen, Lock, BrainCircuit, ShieldAlert, UserCheck, CheckCircle, XCircle, ToggleRight, Zap } from 'lucide-react';

import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { PERIODS, SIMULATIONS } from '../constants';
import { PeriodRequest } from '../services/authService';
import * as adminService from '../services/adminService';
import * as questionsService from '../services/questionsService';
import * as osceService from '../services/osceService';
import * as labService from '../services/labService';
import * as resultsService from '../services/resultsService';
import * as configService from '../services/configService';

import AdminStats from '../components/admin/AdminStats';
import AdminMaterials from '../components/admin/AdminMaterials';
import AdminQuestions from '../components/admin/AdminQuestions';
import AdminLab from '../components/admin/AdminLab';
import AdminOsce from '../components/admin/AdminOsce';
import AdminThemes from '../components/admin/AdminThemes';
import AdminReferences from '../components/admin/AdminReferences';
import AdminDisciplines from '../components/admin/AdminDisciplines';
import AdminAnalytics from '../components/admin/AdminAnalytics';

type AdminTab = 'requests' | 'questions' | 'osce' | 'stats' | 'analytics' | 'references' | 'materials' | 'themes' | 'lab' | 'access' | 'flags';

interface AdminViewProps {
  onBack: () => void;
}

const AdminView: React.FC<AdminViewProps> = ({ onBack }) => {
  const { periods, disciplines } = useData();
  const { isAdmin, isLoadingAuth } = useAuth();

  const [activeTab, setActiveTab] = useState<AdminTab>('requests');

  const [adminQuestions, setAdminQuestions] = useState<Question[]>([]);
  const [adminOsceStations, setAdminOsceStations] = useState<OsceStation[]>([]);
  const [adminLabSimulations, setAdminLabSimulations] = useState<LabSimulation[]>([]);
  const [adminQuizResults, setAdminQuizResults] = useState<QuizResult[]>([]);
  const [adminOsceAnalytics, setAdminOsceAnalytics] = useState<AnalyticsResult[]>([]);
  const [adminRequests, setAdminRequests] = useState<PeriodRequest[]>([]);
  const [adminFeatureFlags, setAdminFeatureFlags] = useState<FeatureFlag[]>([]);

  useEffect(() => {
    if (!isAdmin) return;

    const unsubscribes = [
      questionsService.subscribeToQuestions(setAdminQuestions),
      osceService.subscribeToOsceStations(setAdminOsceStations),
      labService.subscribeToLabSimulations(setAdminLabSimulations),
      resultsService.subscribeToAllResults(setAdminQuizResults),
      resultsService.subscribeToOsceAnalytics(setAdminOsceAnalytics),
      adminService.subscribeToPeriodRequests(setAdminRequests),
      configService.subscribeToFeatureFlags(setAdminFeatureFlags),
    ];

    return () => unsubscribes.forEach(unsub => unsub());
  }, [isAdmin]);

  // =========================================================================
  // FUNÇÕES DE APROVAÇÃO DE PERÍODO
  // =========================================================================
  const handleApproveRequest = async (req: PeriodRequest) => {
    try {
      await adminService.approvePeriodRequest(req);
    } catch (error) {
      console.error("Erro ao aprovar requisição:", error);
    }
  };

  const handleRejectRequest = async (req: PeriodRequest) => {
    try {
      await adminService.rejectPeriodRequest(req);
    } catch (error) {
      console.error("Erro ao rejeitar requisição:", error);
    }
  };

  // =========================================================================
  // DEMAIS FUNÇÕES DE BANCO DE DADOS
  // =========================================================================
  // Autoridade real é a Security Rule (Custom Claim `admin`, ver firestore.rules) — esta
  // tela só é alcançável por quem já é admin. A senha "fmst8" de antes era decorativa
  // (RTDB não tinha authorization real por baixo) e foi removida (item 3.6 do plano);
  // o que resta aqui é só confirmação de UX para ações destrutivas.

  const handleSeedFlags = async () => {
    if (!confirm("Deseja injetar as Flags Padrão da plataforma?")) return;
    try {
      await configService.seedDefaultFlags();
      alert("✅ Auto-Setup concluído! Flags estratégicas injetadas na nuvem.");
    } catch (error) {
      console.error("Erro ao injetar flags:", error);
    }
  };

  const handleGlobalReset = async () => {
    if (!confirm("⚠️ AÇÃO DESTRUTIVA: Apagar absolutamente TODO o banco de dados (questões, OSCE, lab, analytics, estrutura base e solicitações)?")) return;
    if (prompt('Digite DELETAR para confirmar:') !== 'DELETAR') {
      alert("❌ Confirmação incorreta. Ação cancelada.");
      return;
    }
    try {
      await adminService.globalDatabaseReset();
      alert("✅ Banco de dados completamente resetado.");
    } catch (error) {
      console.error("[AdminView] Erro ao resetar banco:", error);
    }
  };

  const handleSeedDatabase = async () => {
    if (!confirm("⚠️ MIGRAR ESTRUTURA BASE: Deseja injetar a árvore de Períodos e Disciplinas para o Firestore?")) return;
    try {
      await configService.seedBaseStructure(PERIODS, SIMULATIONS);
      alert("✅ Estrutura Base (Períodos e Disciplinas) migrada com sucesso para a Nuvem!");
    } catch (error) {
      console.error("[AdminView] Erro ao injetar estrutura:", error);
    }
  };

  const handleClearResults = async () => {
    await resultsService.clearAllResults().catch(console.error);
  };

  const handleClearAnalytics = async () => {
    if (!confirm("Deseja apagar os dados brutos de pesquisa (Analytics)?")) return;
    await resultsService.clearOsceAnalytics();
  };

  const handleClearQuestions = async (discId?: string) => {
    await questionsService.clearQuestions(discId);
  };

  const handleClearOsce = async (discId?: string) => {
    await osceService.clearOsceStations(discId);
  };

  const handleClearLab = async (discId?: string) => {
    await labService.clearLabSimulations(discId);
  };

  const handleAddTheme = async (disciplineId: string, themeName: string) => {
    const disc = disciplines.find(d => d.id === disciplineId);
    if (disc) await configService.updateDisciplineThemes(disciplineId, Array.from(new Set([...disc.themes, themeName])));
  };

  const handleRemoveTheme = async (disciplineId: string, themeName: string) => {
    const disc = disciplines.find(d => d.id === disciplineId);
    if (disc) await configService.updateDisciplineThemes(disciplineId, disc.themes.filter(t => t !== themeName));
  };

  const handleUpdateReferences = async (disciplineId: string, refsList: ReferenceMaterial[]) => {
    await configService.updateDisciplineReferences(disciplineId, refsList);
  };

  const handleToggleStatus = async (disciplineId: string, currentStatus: string) => {
    await configService.toggleDisciplineStatus(disciplineId, currentStatus);
  };

  const handleToggleFeature = async (disciplineId: string, featureId: string, isCurrentlyLocked: boolean) => {
    await configService.toggleDisciplineFeature(disciplineId, featureId, isCurrentlyLocked);
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
            Seu perfil atual não possui privilégios de Administrador.
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
        {([
          { id: 'requests', label: `Solicitações ${pendingRequests.length > 0 ? `(${pendingRequests.length})` : ''}`, icon: <UserCheck size={16}/> },
          { id: 'flags', label: 'Feature Flags', icon: <ToggleRight size={16}/> },
          { id: 'stats', label: 'Estatísticas', icon: <BarChart3 size={16}/> },
          { id: 'analytics', label: 'Research Analytics', icon: <BrainCircuit size={16}/> },
          { id: 'access', label: 'Acessos', icon: <Lock size={16}/> },
          { id: 'themes', label: 'Temas/Eixos', icon: <Layers size={16}/> },
          { id: 'questions', label: 'Questões', icon: <FileText size={16}/> },
          { id: 'osce', label: 'OSCE', icon: <Stethoscope size={16}/> },
          { id: 'lab', label: 'Lab Virtual', icon: <Microscope size={16}/> },
          { id: 'references', label: 'Referências', icon: <BookOpen size={16}/> },
          { id: 'materials', label: 'Materiais', icon: <ClipboardList size={16}/> },
        ] as { id: AdminTab; label: string; icon: React.ReactElement }[]).map(tab => (
          <button
            key={tab.id}
            onClick={() => { setActiveTab(tab.id); }}
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

      {activeTab === 'flags' && (
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 animate-in fade-in">
          <div className="flex flex-col md:flex-row items-center justify-between mb-8 gap-4 border-b border-gray-100 pb-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-[#003366]/10 text-[#003366] rounded-xl">
                <ToggleRight size={24} />
              </div>
              <div>
                <h2 className="text-xl font-black text-[#003366] uppercase tracking-tighter">Feature Flags Globais</h2>
                <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">Gestão de Lançamentos e Módulos em Tempo Real</p>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleSeedFlags}
                className="flex items-center gap-2 bg-blue-50 text-blue-700 px-5 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-100 transition-all border border-blue-200"
              >
                <Zap size={14} /> Auto-Setup
              </button>
              <button
                onClick={() => {
                  const name = prompt("Identificador Único da Feature (ex: release_survey_n2):");
                  if (!name) return;
                  const desc = prompt("Descrição amigável (ex: Libera o módulo de pesquisa para a turma):");
                  configService.createFeatureFlag(name, desc || '');
                }}
                className="bg-[#003366] text-white px-5 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-[#D4A017] transition-all shadow-md"
              >
                + Criar Manual
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {adminFeatureFlags.length === 0 ? (
              <div className="text-center py-12 text-gray-400 font-bold uppercase tracking-widest text-xs border-2 border-dashed border-gray-100 rounded-2xl">
                Nenhuma Feature Flag configurada. Clique em "Auto-Setup" para injetar as flags padrão.
              </div>
            ) : (
              adminFeatureFlags.map(flag => (
                <div key={flag.firebaseId} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-5 rounded-2xl border border-gray-100 bg-gray-50 hover:bg-white hover:shadow-md transition-all gap-4">
                  <div>
                    <h3 className="font-black text-[#003366] font-mono text-sm">{flag.name}</h3>
                    <p className="text-xs text-gray-500 font-medium mt-1">{flag.description}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className={`text-[10px] font-black uppercase tracking-widest ${flag.isEnabled ? 'text-green-500' : 'text-gray-400'}`}>
                      {flag.isEnabled ? 'Módulo Online' : 'Módulo Oculto'}
                    </span>
                    <button
                      onClick={() => flag.firebaseId && configService.toggleFeatureFlag(flag.firebaseId, !flag.isEnabled)}
                      className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors focus:outline-none shadow-inner ${flag.isEnabled ? 'bg-green-500' : 'bg-gray-300'}`}
                    >
                      <span className={`inline-block h-6 w-6 transform rounded-full bg-white shadow-sm transition-transform ${flag.isEnabled ? 'translate-x-7' : 'translate-x-1'}`} />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`Tem certeza que deseja DELETAR permanentemente a flag ${flag.name}?`) && flag.firebaseId) {
                          configService.deleteFeatureFlag(flag.firebaseId);
                        }
                      }}
                      className="text-red-400 hover:text-red-600 transition-colors ml-2"
                      title="Deletar Flag"
                    >
                      <XCircle size={20} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

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
                  <div key={req.id} className={`flex flex-col md:flex-row items-center justify-between p-4 rounded-2xl border ${isPending ? 'border-[#D4A017]/30 bg-[#D4A017]/5' : 'border-gray-100 bg-gray-50'}`}>
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
            await questionsService.addQuestions(qs).catch(console.error);
          }}
          onUpdateQuestion={async (q) => {
            await questionsService.updateQuestion(q).catch(console.error);
          }}
          onRemoveQuestion={async (id) => {
            const q = adminQuestions.find(item => item.id === id);
            if (q?.firebaseId) {
              await questionsService.removeQuestion(q.firebaseId).catch(console.error);
            }
          }}
          onClearQuestions={handleClearQuestions}
          onRemoveQuiz={async (title, discId) => {
            await questionsService.removeQuizByTitle(title, discId).catch(console.error);
          }}
        />
      )}

      {activeTab === 'lab' && (
        <AdminLab
          disciplines={disciplines}
          labSimulations={adminLabSimulations}
          onAddLabSimulation={async (sim) => {
            await labService.addLabSimulation(sim).catch(console.error);
          }}
          onRemoveLabSimulation={async (id) => {
            const sim = adminLabSimulations.find(item => item.id === id);
            if (sim) {
              await labService.removeLabSimulation(sim).catch(console.error);
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
            await osceService.addOsceStations(os).catch(console.error);
          }}
          onRemoveOsceStation={async (id) => {
            const o = adminOsceStations.find(item => item.id === id);
            if (o?.firebaseId) {
              await osceService.removeOsceStation(o.firebaseId).catch(console.error);
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
