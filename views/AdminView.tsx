import React, { useState } from 'react';
import { Summary, Question, OsceStation, LabSimulation, ReferenceMaterial } from '../types.ts';
import { Layers, BarChart3, FileText, ClipboardList, Stethoscope, Microscope, BookOpen, Lock } from 'lucide-react'; 

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

interface AdminViewProps {
  onBack: () => void; 
}

const AdminView: React.FC<AdminViewProps> = ({ onBack }) => {
  // 1. PUXANDO DADOS DIRETO DA NUVEM (Fim do Prop Drilling)
  const { questions, osceStations, disciplines, summaries, quizResults, labSimulations } = useData();

  const [isAuthorized, setIsAuthorized] = useState(() => sessionStorage.getItem('fms_admin_auth') === 'true');
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  
  const [activeTab, setActiveTab] = useState<'questions' | 'osce' | 'stats' | 'references' | 'materials' | 'themes' | 'lab' | 'access'>('stats');
  
  // ESTADOS GLOBAIS DE FILTRO DE ESTATÍSTICAS
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

  // =========================================================================
  // 2. FUNÇÕES DE BANCO DE DADOS
  // =========================================================================
  
  const handleGlobalReset = () => {
    const pass = prompt("⚠️ AÇÃO DESTRUTIVA: Apagar absolutamente TODO o banco de dados?\n\nPara confirmar, digite a senha de administrador (fmst8):");
    if (pass === 'fmst8') {
      if (db) {
        remove(ref(db, 'questions'));
        remove(ref(db, 'summaries'));
        remove(ref(db, 'osce'));
        remove(ref(db, 'discipline_config'));
        remove(ref(db, 'labSimulations')); 
      }
      alert("✅ Banco de dados completamente resetado.");
    } else if (pass !== null) {
      alert("❌ Senha incorreta. Ação cancelada.");
    }
  };

  const handleClearResults = () => db && remove(ref(db, 'quizResults'));

  const handleClearQuestions = (discId?: string) => {
    if (db) {
      if (discId) {
        questions.filter(q => q.disciplineId === discId).forEach(q => q.firebaseId && remove(ref(db, `questions/${q.firebaseId}`)));
      } else {
        remove(ref(db, 'questions'));
      }
    }
  };

  const handleClearOsce = (discId?: string) => {
    if (db) {
      if (discId) {
        osceStations.filter(o => o.disciplineId === discId).forEach(o => o.firebaseId && remove(ref(db, `osce/${o.firebaseId}`)));
      } else {
        remove(ref(db, 'osce'));
      }
    }
  };

  const handleClearLab = (discId?: string) => {
    if (db) {
      if (discId) {
        labSimulations.filter(s => s.disciplineId === discId).forEach(s => s.firebaseId && remove(ref(db, `labSimulations/${s.firebaseId}`)));
      } else {
        remove(ref(db, 'labSimulations'));
      }
    }
  };

  const handleAddTheme = (disciplineId: string, themeName: string) => {
    const disc = disciplines.find(d => d.id === disciplineId);
    if (!disc) return;
    const newThemes = Array.from(new Set([...disc.themes, themeName]));
    if (db) set(ref(db, `discipline_config/${disciplineId}/themes`), newThemes);
  };

  const handleRemoveTheme = (disciplineId: string, themeName: string) => {
    const disc = disciplines.find(d => d.id === disciplineId);
    if (!disc) return;
    const newThemes = disc.themes.filter(t => t !== themeName);
    if (db) set(ref(db, `discipline_config/${disciplineId}/themes`), newThemes);
  };

  const handleUpdateReferences = (disciplineId: string, refsList: ReferenceMaterial[]) => {
    if (db) set(ref(db, `discipline_config/${disciplineId}/references`), refsList);
  };

  const handleRemoveQuiz = (quizTitle: string, discId?: string) => {
    if (db) {
      questions.forEach(q => {
        if (q.quizTitle === quizTitle && (!discId || q.disciplineId === discId)) {
          if (q.firebaseId) remove(ref(db, `questions/${q.firebaseId}`));
        }
      });
    }
  };

  // NOVO: Função que alterna o status oficial da disciplina
  const handleToggleStatus = (disciplineId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'locked' : 'active';
    if (db) set(ref(db, `discipline_config/${disciplineId}/status`), newStatus);
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
           <button onClick={handleClearResults} className="bg-orange-100 text-orange-600 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-orange-200 transition-all">Limpar Resultados</button>
           <button onClick={handleGlobalReset} className="bg-red-500 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-600 shadow-lg transition-all">Resetar Banco Total</button>
        </div>
      </div>

      <nav className="flex flex-wrap gap-2 mb-12">
        {[
          { id: 'stats', label: 'Estatísticas', icon: <BarChart3 size={16}/> },
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

      {/* Renderiza aba de controle de acessos */}
      {activeTab === 'access' && (
        <AdminDisciplines 
          disciplines={disciplines}
          onToggleStatus={handleToggleStatus}
        />
      )}

      {activeTab === 'materials' && (
        <AdminMaterials disciplines={disciplines} />
      )}

      {activeTab === 'questions' && (
        <AdminQuestions 
          questions={questions}
          disciplines={disciplines}
          onAddQuestions={(qs) => db && qs.forEach(q => push(ref(db, 'questions'), q))}
          onUpdateQuestion={(q) => { if (db && q.firebaseId) set(ref(db, `questions/${q.firebaseId}`), q); }}
          onRemoveQuestion={(id) => { const q = questions.find(item => item.id === id); if (db && q?.firebaseId) remove(ref(db, `questions/${q.firebaseId}`)); }}
          onClearQuestions={handleClearQuestions}
          onRemoveQuiz={handleRemoveQuiz}
        />
      )}

      {activeTab === 'lab' && (
        <AdminLab 
          disciplines={disciplines}
          labSimulations={labSimulations}
          onAddLabSimulation={(sim) => db && push(ref(db, 'labSimulations'), sim)}
          onRemoveLabSimulation={(id) => { const sim = labSimulations.find(item => item.id === id); if (db && sim?.firebaseId) remove(ref(db, `labSimulations/${sim.firebaseId}`)); }}
          onClearLab={handleClearLab}
        />
      )}

      {activeTab === 'osce' && (
        <AdminOsce 
          disciplines={disciplines}
          osceStations={osceStations}
          onAddOsceStations={(os) => db && os.forEach(o => push(ref(db, 'osce'), o))}
          onRemoveOsceStation={(id) => { const o = osceStations.find(item => item.id === id); if (db && o?.firebaseId) remove(ref(db, `osce/${o.firebaseId}`)); }}
          onClearOsce={handleClearOsce}
        />
      )}
      
      {activeTab === 'themes' && (
        <AdminThemes 
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