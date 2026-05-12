import React, { useState, useEffect } from 'react';
import { SimulationInfo, Summary, AcademicUnit } from '../types';
import { Lock, Stethoscope, BookOpen, FolderOpen, PenTool, Activity, Microscope, Pill, ClipboardList, ChevronDown, ChevronUp, Milestone, Layers } from 'lucide-react';

interface DisciplineViewProps {
  disciplineId: string;
  disciplines: SimulationInfo[];
  summaries: Summary[];
  onBack: () => void;
  // Assinatura atualizada: Agora o componente pai pode receber a Unidade selecionada para injetar no Context/Filtro
  onSelectOption: (type: string, unit?: AcademicUnit) => void; 
}

const DisciplineView: React.FC<DisciplineViewProps> = ({ disciplineId, disciplines, summaries, onBack, onSelectOption }) => {
  const [showLabCategories, setShowLabCategories] = useState(false);
  const [selectedUnit, setSelectedUnit] = useState<AcademicUnit | null>(null);

  const discipline = disciplines.find(d => d.id === disciplineId);

  // Reseta a unidade selecionada caso o aluno mude de disciplina
  useEffect(() => {
    setSelectedUnit(null);
  }, [disciplineId]);

  if (!discipline) return null;

  // IDENTIFICADORES AUTOMÁTICOS
  const isUC = discipline.category === 'UC';
  const isModular = discipline.category === 'HABMED' || discipline.category === 'IESC' || discipline.category === 'UCCG';
  
  // Verifica se é a UC V para expandir categorias exclusivas
  const isUCV = disciplineId.toLowerCase() === 'uc5' || disciplineId.toLowerCase() === 'uc-v' || discipline.title.toLowerCase().includes('uc v');

  // VERIFICA QUAIS BOTÕES ESTÃO BLOQUEADOS NO FIREBASE
  const locked = discipline.lockedFeatures || [];
  const isMaterialsLocked = locked.includes('materials');
  const isReferencesLocked = locked.includes('references');
  const isQuizLocked = locked.includes('quiz');
  const isPracticalLocked = locked.includes('lab_osce');

  // HANDLERS
  const handleBack = () => {
    // Se for modular e já tiver unidade selecionada, voltar para a escolha da unidade
    if (isModular && selectedUnit) {
      setSelectedUnit(null);
    } else {
      // Caso contrário, volta para a tela inicial/períodos
      onBack();
    }
  };

  const handleAction = (featureId: string, action: string) => {
    if (locked.includes(featureId)) {
      alert("Esta funcionalidade está temporariamente bloqueada pela administração.");
      return;
    }
    // Passa a ação e a unidade selecionada (se houver) para o controlador de rotas
    onSelectOption(action, selectedUnit || undefined);
  };

  const handleLabClick = () => {
    if (locked.includes('lab_osce')) {
      alert("Esta funcionalidade está temporariamente bloqueada pela administração.");
      return;
    }

    if (isUCV) {
      setShowLabCategories(!showLabCategories);
    } else {
      onSelectOption(isUC ? 'lab-list' : 'osce-mode-selection', selectedUnit || undefined);
    }
  };

  // === INTERCEPTAÇÃO: TELA DE SELEÇÃO DE UNIDADE (N1 / N2) ===
  if (isModular && !selectedUnit) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8 animate-in fade-in slide-in-from-bottom-8 duration-700 pb-32">
        <button 
          onClick={handleBack} 
          className="group flex items-center text-[#003366] font-bold mb-12 hover:text-[#D4A017] transition-all"
        >
          <span className="mr-2 transition-transform group-hover:-translate-x-1">←</span> 
          Voltar aos Períodos
        </button>

        <div className="text-center mb-12 animate-in zoom-in-95 duration-500">
          <div className="w-24 h-24 mx-auto bg-white rounded-full flex items-center justify-center text-5xl shadow-xl border-4 border-[#003366] mb-6">
            {discipline.icon}
          </div>
          <h2 className="text-3xl md:text-4xl font-black text-[#003366] tracking-tighter mb-4">
            Selecione a Unidade
          </h2>
          <p className="text-gray-500 font-medium max-w-lg mx-auto">
            A disciplina <strong className="text-[#003366]">{discipline.title}</strong> é modular. Escolha qual unidade acadêmica você deseja acessar para carregar os conteúdos específicos.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
          {/* BOTÃO N1 (LEGADO E ATUAL) */}
          <button 
            onClick={() => setSelectedUnit('N1')}
            className="bg-white p-8 rounded-[2rem] border-2 border-transparent hover:border-[#D4A017] hover:shadow-2xl transition-all group relative overflow-hidden text-left flex flex-col items-center text-center animate-in slide-in-from-bottom-4 duration-500"
          >
            <div className="w-16 h-16 bg-blue-50 text-[#003366] rounded-2xl flex items-center justify-center mb-6 group-hover:bg-[#003366] group-hover:text-white transition-colors">
               <Milestone size={32} />
            </div>
            <h3 className="text-2xl font-black text-[#003366] mb-2 uppercase tracking-tight">Unidade N1</h3>
            <p className="text-sm text-gray-500 font-medium">Avaliações teóricas, checklists e materiais referentes ao 1º Bimestre.</p>
          </button>

          {/* BOTÃO N2 */}
          <button 
            onClick={() => setSelectedUnit('N2')}
            className="bg-white p-8 rounded-[2rem] border-2 border-transparent hover:border-[#D4A017] hover:shadow-2xl transition-all group relative overflow-hidden text-left flex flex-col items-center text-center animate-in slide-in-from-bottom-4 duration-700"
          >
            <div className="w-16 h-16 bg-blue-50 text-[#003366] rounded-2xl flex items-center justify-center mb-6 group-hover:bg-[#003366] group-hover:text-white transition-colors">
               <Layers size={32} />
            </div>
            <h3 className="text-2xl font-black text-[#003366] mb-2 uppercase tracking-tight">Unidade N2</h3>
            <p className="text-sm text-gray-500 font-medium">Avaliações teóricas, checklists e materiais referentes ao 2º Bimestre.</p>
          </button>
        </div>
      </div>
    );
  }

  // === DASHBOARD NORMAL DA DISCIPLINA ===
  return (
    <div className="max-w-5xl mx-auto px-4 py-8 animate-in fade-in slide-in-from-bottom-8 duration-700 pb-32">
      <button 
        onClick={handleBack} 
        className="group flex items-center text-[#003366] font-bold mb-8 hover:text-[#D4A017] transition-all"
      >
        <span className="mr-2 transition-transform group-hover:-translate-x-1">←</span> 
        {isModular ? 'Trocar Unidade' : 'Voltar ao Início'}
      </button>

      <div className="bg-white rounded-[3rem] p-8 md:p-14 shadow-2xl border border-gray-100 mb-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#f4f7f6] rounded-full -mr-20 -mt-20 opacity-50"></div>
        <div className="flex flex-col md:flex-row gap-8 items-center md:items-start relative z-10">
          
          <div className="w-32 h-32 bg-white rounded-full flex items-center justify-center text-6xl shadow-xl border-4 border-[#003366] shrink-0">
            {discipline.icon}
          </div>

          <div className="text-center md:text-left">
            <span className="bg-green-100 text-green-700 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest mb-4 inline-block shadow-sm mr-2">
              Módulo Ativo
            </span>
            {selectedUnit && (
              <span className="bg-blue-100 text-[#003366] px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest mb-4 inline-block shadow-sm">
                Unidade {selectedUnit}
              </span>
            )}
            <h1 className="text-4xl md:text-5xl font-black text-[#003366] mb-4 tracking-tighter leading-tight">
              {discipline.title}
            </h1>
            <p className="text-gray-600 text-lg leading-relaxed max-w-2xl font-medium">
              {discipline.description}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
        
        {/* SIMULADO TEÓRICO */}
        <button 
          onClick={() => handleAction('quiz', 'quiz-setup')} 
          className={`p-6 md:p-8 rounded-[2rem] text-left transition-all group border-2 relative overflow-hidden ${
            isQuizLocked 
              ? 'bg-gray-50 border-gray-200 opacity-70 grayscale cursor-not-allowed' 
              : 'bg-white border-transparent hover:border-[#D4A017] hover:shadow-xl'
          }`}
        >
          <div className="flex items-center justify-between mb-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl transition-colors ${
              isQuizLocked ? 'bg-gray-200 text-gray-400' : 'bg-blue-50 text-[#003366] group-hover:bg-[#003366] group-hover:text-white'
            }`}>
              <div className="flex items-center justify-center">
                <PenTool size={24} />
              </div>
            </div>
            <div className={`transition-colors ${isQuizLocked ? 'text-gray-300' : 'text-gray-300 group-hover:text-[#D4A017]'}`}>→</div>
          </div>
          <h3 className={`text-xl font-black mb-2 uppercase tracking-tight ${isQuizLocked ? 'text-gray-400' : 'text-[#003366]'}`}>Simulado Teórico</h3>
          <p className={`text-xs font-medium ${isQuizLocked ? 'text-gray-400' : 'text-gray-500'}`}>Avalie seus conhecimentos com questões de múltipla escolha.</p>
          {isQuizLocked && (
            <div className="absolute top-6 right-6 bg-red-500/90 text-white px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg flex items-center gap-1 z-10">
              <Lock size={12}/> Bloqueado
            </div>
          )}
        </button>

        {/* HUB UNIFICADO: SIMULADOS DE PRÁTICA E LABORATÓRIO VIRTUAL */}
        <div className={`flex flex-col rounded-[2rem] transition-all border-2 ${
            isPracticalLocked 
              ? 'bg-gray-50 border-gray-200 opacity-70 grayscale cursor-not-allowed' 
              : isUCV && showLabCategories ? 'bg-[#001f3f] border-[#D4A017] shadow-xl' : 'bg-gradient-to-br from-[#003366] to-[#001f3f] border-transparent hover:scale-[1.02] shadow-xl'
          }`}>
          
          <button 
            onClick={handleLabClick} 
            className="p-6 md:p-8 text-left transition-all group relative overflow-hidden w-full rounded-[2rem]"
          >
            <div className="flex items-center justify-between mb-4">
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-3xl transition-all ${
                isPracticalLocked ? 'bg-gray-200 text-gray-400' : 'bg-white/10 group-hover:bg-[#D4A017] text-white group-hover:text-[#003366]'
              }`}>
                 <Stethoscope size={28} />
              </div>
              <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center font-black ${
                isPracticalLocked ? 'border-gray-300 text-gray-300' : 'border-white/20 text-white group-hover:border-[#D4A017] group-hover:text-[#D4A017]'
              }`}>
                {isUCV ? (showLabCategories ? <ChevronUp size={16} /> : <ChevronDown size={16} />) : '→'}
              </div>
            </div>
            <h3 className={`text-xl font-black uppercase tracking-tight mb-2 relative z-10 ${isPracticalLocked ? 'text-gray-400' : 'text-[#D4A017]'}`}>
              {isUC ? 'Laboratório Virtual' : 'Simulados de Prática'}
            </h3>
            <p className={`text-xs font-medium leading-relaxed relative z-10 ${isPracticalLocked ? 'text-gray-400' : 'text-blue-100 opacity-90'}`}>
              {isUC 
                ? 'Treine a identificação visual de lâminas e peças anatômicas.' 
                : 'Pratique com Simulados Estáticos, RPG Clínico ou Paciente Virtual por IA.'}
            </p>
            {isPracticalLocked && (
              <div className="absolute top-6 right-6 bg-red-500/90 text-white px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg flex items-center gap-1 z-10">
                <Lock size={12}/> Bloqueado
              </div>
            )}
          </button>

          {/* SUBMENU DE CATEGORIAS EXCLUSIVO PARA UC V */}
          {isUCV && showLabCategories && !isPracticalLocked && (
            <div className="p-4 pt-0 grid grid-cols-2 gap-3 animate-in fade-in slide-in-from-top-4">
              <button 
                onClick={() => onSelectOption('lab-list-anatomia', selectedUnit || undefined)}
                className="flex flex-col items-center justify-center p-4 bg-white/10 hover:bg-[#D4A017] hover:text-[#003366] text-white rounded-xl transition-colors group"
              >
                <Activity size={24} className="mb-2 opacity-80 group-hover:opacity-100" />
                <span className="text-xs font-bold uppercase tracking-wider">Anatomia</span>
              </button>
              
              <button 
                onClick={() => onSelectOption('lab-list-histologia', selectedUnit || undefined)}
                className="flex flex-col items-center justify-center p-4 bg-white/10 hover:bg-[#D4A017] hover:text-[#003366] text-white rounded-xl transition-colors group"
              >
                <Microscope size={24} className="mb-2 opacity-80 group-hover:opacity-100" />
                <span className="text-xs font-bold uppercase tracking-wider">Histologia</span>
              </button>

              <button 
                onClick={() => onSelectOption('lab-list-farmacologia', selectedUnit || undefined)}
                className="flex flex-col items-center justify-center p-4 bg-white/10 hover:bg-[#D4A017] hover:text-[#003366] text-white rounded-xl transition-colors group"
              >
                <Pill size={24} className="mb-2 opacity-80 group-hover:opacity-100" />
                <span className="text-xs font-bold uppercase tracking-wider">Farmacologia</span>
              </button>

              <button 
                onClick={() => onSelectOption('lab-list-exames', selectedUnit || undefined)}
                className="flex flex-col items-center justify-center p-4 bg-white/10 hover:bg-[#D4A017] hover:text-[#003366] text-white rounded-xl transition-colors group"
              >
                <ClipboardList size={24} className="mb-2 opacity-80 group-hover:opacity-100" />
                <span className="text-xs font-bold uppercase tracking-wider">Exames</span>
              </button>
            </div>
          )}
        </div>

        {/* CENTRAL DE MATERIAIS */}
        <button 
          onClick={() => handleAction('materials', 'summaries-list')} 
          className={`p-6 md:p-8 rounded-[2rem] text-left transition-all group border-2 relative overflow-hidden ${
            isMaterialsLocked 
              ? 'bg-gray-50 border-gray-200 opacity-70 grayscale cursor-not-allowed' 
              : 'bg-white border-transparent hover:border-[#D4A017] hover:shadow-xl'
          }`}
        >
          <div className="flex items-center justify-between mb-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl transition-colors ${
              isMaterialsLocked ? 'bg-gray-200 text-gray-400' : 'bg-blue-50 text-[#003366] group-hover:bg-[#003366] group-hover:text-white'
            }`}>
              <FolderOpen size={24} />
            </div>
            <div className={`transition-colors ${isMaterialsLocked ? 'text-gray-300' : 'text-gray-300 group-hover:text-[#D4A017]'}`}>→</div>
          </div>
          <h3 className={`text-xl font-black text-[#003366] mb-2 uppercase tracking-tight ${isMaterialsLocked ? 'text-gray-400' : ''}`}>Central de Materiais</h3>
          <p className={`text-xs text-gray-500 font-medium ${isMaterialsLocked ? 'text-gray-400' : ''}`}>Acesse resumos, roteiros de aulas e materiais extras.</p>
          {isMaterialsLocked && (
            <div className="absolute top-6 right-6 bg-red-500/90 text-white px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg flex items-center gap-1 z-10">
              <Lock size={12}/> Bloqueado
            </div>
          )}
        </button>

        {/* REFERÊNCIAS */}
        <button 
          onClick={() => handleAction('references', 'references-view')} 
          className={`p-6 md:p-8 rounded-[2rem] text-left transition-all group border-2 relative overflow-hidden ${
            isReferencesLocked 
              ? 'bg-gray-50 border-gray-200 opacity-70 grayscale cursor-not-allowed' 
              : 'bg-white border-transparent hover:border-[#D4A017] hover:shadow-xl'
          }`}
        >
          <div className="flex items-center justify-between mb-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl transition-colors ${
              isReferencesLocked ? 'bg-gray-200 text-gray-400' : 'bg-blue-50 text-[#003366] group-hover:bg-[#003366] group-hover:text-white'
            }`}>
              <BookOpen size={24} />
            </div>
            <div className={`transition-colors ${isReferencesLocked ? 'text-gray-300' : 'text-gray-300 group-hover:text-[#D4A017]'}`}>→</div>
          </div>
          <h3 className={`text-xl font-black text-[#003366] mb-2 uppercase tracking-tight ${isReferencesLocked ? 'text-gray-400' : ''}`}>Referências</h3>
          <p className={`text-xs text-gray-500 font-medium ${isReferencesLocked ? 'text-gray-400' : ''}`}>Links diretos para livros oficiais na biblioteca.</p>
          {isReferencesLocked && (
            <div className="absolute top-6 right-6 bg-red-500/90 text-white px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg flex items-center gap-1 z-10">
              <Lock size={12}/> Bloqueado
            </div>
          )}
        </button>
      </div>
    </div>
  );
};

export default DisciplineView;