import React, { useState } from 'react';
import { Question, OsceStation, SimulationInfo, Summary, QuizResult, ReferenceMaterial, LabSimulation } from '../types.ts';
import { Layers, BarChart3, FileText, ClipboardList, Stethoscope, Microscope, BookOpen } from 'lucide-react';

// IMPORTAÇÕES DOS COMPONENTES MODULARIZADOS
import AdminStats from '../components/admin/AdminStats.tsx';
import AdminMaterials from '../components/admin/AdminMaterials.tsx';
import AdminQuestions from '../components/admin/AdminQuestions.tsx';
import AdminLab from '../components/admin/AdminLab.tsx';
import AdminOsce from '../components/admin/AdminOsce.tsx';
import AdminThemes from '../components/admin/AdminThemes.tsx';
import AdminReferences from '../components/admin/AdminReferences.tsx';

interface AdminViewProps {
  questions: Question[];
  osceStations: OsceStation[];
  disciplines: SimulationInfo[];
  summaries: Summary[];
  quizResults: QuizResult[];
  labSimulations?: LabSimulation[];
  onAddSummary: (s: Summary) => void;
  onRemoveSummary: (id: string) => void;
  onAddQuestions: (qs: Question[]) => void;
  onUpdateQuestion: (q: Question) => void;
  onAddOsceStations: (os: OsceStation[]) => void;
  onAddLabSimulation?: (sim: LabSimulation) => void;
  onRemoveLabSimulation?: (id: string) => void;
  onRemoveQuestion: (id: string) => void;
  onRemoveOsceStation: (id: string) => void;
  onRemoveQuiz: (quizTitle: string, disciplineId?: string) => void; 
  onClearDatabase: () => void;
  onClearResults: () => void;
  onClearQuestions: (disciplineId?: string) => void;
  onClearOsce: (disciplineId?: string) => void;
  onClearMaterials: (disciplineId?: string) => void;
  onClearLab?: (disciplineId?: string) => void;
  onAddTheme: (disciplineId: string, themeName: string) => void;
  onRemoveTheme: (disciplineId: string, themeName: string) => void;
  onUpdateReferences: (disciplineId: string, refs: ReferenceMaterial[]) => void;
  onBack: () => void;
}

const AdminView: React.FC<AdminViewProps> = ({
  questions,
  osceStations,
  disciplines,
  quizResults,
  labSimulations = [],
  onAddQuestions,
  onUpdateQuestion,
  onAddOsceStations,
  onAddLabSimulation, 
  onRemoveQuestion,
  onRemoveOsceStation,
  onRemoveLabSimulation,
  onRemoveQuiz, 
  onClearDatabase,
  onClearResults,
  onClearQuestions,
  onClearOsce,
  onClearLab,
  onAddTheme,
  onRemoveTheme,
  onUpdateReferences,
  onBack
}) => {
  const [isAuthorized, setIsAuthorized] = useState(() => sessionStorage.getItem('fms_admin_auth') === 'true');
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [activeTab, setActiveTab] = useState<'questions' | 'osce' | 'stats' | 'references' | 'materials' | 'themes' | 'lab'>('stats');
  
  // ESTADOS GLOBAIS DE FILTRO DE ESTATÍSTICAS (Repassados para o AdminStats para manter o estado ao trocar de abas)
  const [statsRoomFilter, setStatsRoomFilter] = useState(''); 
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

  const handleGlobalReset = () => {
    const pass = prompt("⚠️ AÇÃO DESTRUTIVA: Apagar absolutamente TODO o banco de dados?\n\nPara confirmar, digite a senha de administrador (fmst8):");
    if (pass === 'fmst8') {
      onClearDatabase();
      alert("✅ Banco de dados completamente resetado.");
    } else if (pass !== null) {
      alert("❌ Senha incorreta. Ação cancelada.");
    }
  };

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
    <div className="max-w-7xl mx-auto px-4 py-12">
      <div className="flex flex-col md:flex-row justify-between items-center mb-10 border-b pb-8 gap-4">
        <div className="flex items-center gap-4">
           <button onClick={onBack} className="bg-gray-100 p-3 rounded-xl hover:bg-gray-200 transition-all text-[#003366]">←</button>
           <div>
             <h2 className="text-3xl font-black text-[#003366] tracking-tighter uppercase">Painel de Controle</h2>
             <p className="text-[10px] font-black text-[#D4A017] uppercase tracking-widest">Gestão de Dados em Nuvem</p>
           </div>
        </div>
        <div className="flex gap-2">
           <button onClick={onClearResults} className="bg-orange-100 text-orange-600 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-orange-200 transition-all">Limpar Resultados</button>
           <button onClick={handleGlobalReset} className="bg-red-500 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-600 shadow-lg transition-all">Resetar Banco Total</button>
        </div>
      </div>

      <nav className="flex flex-wrap gap-2 mb-12">
        {[
          { id: 'stats', label: 'Estatísticas', icon: <BarChart3 size={16}/> },
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

      {/* RENDERIZAÇÃO DOS COMPONENTES MODULARIZADOS */}
      {activeTab === 'stats' && (
        <AdminStats 
          quizResults={quizResults}
          questions={questions}
          labSimulations={labSimulations}
          disciplines={disciplines}
          statsRoomFilter={statsRoomFilter}
          statsDiscFilter={statsDiscFilter}
          statsTypeFilter={statsTypeFilter}
          statsQuizTitleFilter={statsQuizTitleFilter}
          setStatsRoomFilter={setStatsRoomFilter}
          setStatsDiscFilter={setStatsDiscFilter}
          setStatsTypeFilter={setStatsTypeFilter}
          setStatsQuizTitleFilter={setStatsQuizTitleFilter}
        />
      )}

      {activeTab === 'materials' && (
        <AdminMaterials disciplines={disciplines} />
      )}

      {activeTab === 'questions' && (
        <AdminQuestions 
          questions={questions}
          disciplines={disciplines}
          onAddQuestions={onAddQuestions}
          onUpdateQuestion={onUpdateQuestion}
          onRemoveQuestion={onRemoveQuestion}
          onClearQuestions={onClearQuestions}
          onRemoveQuiz={onRemoveQuiz}
        />
      )}

      {activeTab === 'lab' && (
        <AdminLab 
          disciplines={disciplines}
          labSimulations={labSimulations}
          onAddLabSimulation={onAddLabSimulation}
          onRemoveLabSimulation={onRemoveLabSimulation}
          onClearLab={onClearLab}
        />
      )}

      {activeTab === 'osce' && (
        <AdminOsce 
          disciplines={disciplines}
          osceStations={osceStations}
          onAddOsceStations={onAddOsceStations}
          onRemoveOsceStation={onRemoveOsceStation}
          onClearOsce={onClearOsce}
        />
      )}
      
      {activeTab === 'themes' && (
        <AdminThemes 
          disciplines={disciplines}
          onAddTheme={onAddTheme}
          onRemoveTheme={onRemoveTheme}
        />
      )}

      {activeTab === 'references' && (
        <AdminReferences 
          disciplines={disciplines}
          onUpdateReferences={onUpdateReferences}
        />
      )}
    </div>
  );
};

export default AdminView;