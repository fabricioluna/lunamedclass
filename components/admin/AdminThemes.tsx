import React, { useState, useMemo } from 'react';
import { SimulationInfo, Period, AcademicUnit } from '../../types'; 
import { Trash2, Plus, Layers, Info } from 'lucide-react';

interface AdminThemesProps {
  periods?: Period[]; 
  disciplines: SimulationInfo[];
  onAddTheme: (disciplineId: string, themeName: string) => void;
  onRemoveTheme: (disciplineId: string, themeName: string) => void;
}

const AdminThemes: React.FC<AdminThemesProps> = ({ periods = [], disciplines = [], onAddTheme, onRemoveTheme }) => {
  const [selectedPeriodId, setSelectedPeriodId] = useState(''); 
  const [selectedDiscId, setSelectedDiscId] = useState('');
  
  // === NOVO: ESTADO DA UNIDADE (Visual) ===
  const [selectedUnit, setSelectedUnit] = useState<AcademicUnit>('N1');

  const [newTheme, setNewTheme] = useState('');

  const filteredDisciplines = useMemo(() => {
    if (!selectedPeriodId) return [];
    return disciplines.filter(d => d.periodId === selectedPeriodId); 
  }, [disciplines, selectedPeriodId]);

  const handleAddTheme = () => {
    if (!selectedDiscId || !newTheme) return;
    
    // NOTA ARQUITETURAL: No modelo atual (SimulationInfo), os temas são atrelados à Disciplina e não à Unidade.
    // Portanto, enviamos apenas o selectedDiscId e o themeName para o Firebase.
    onAddTheme(selectedDiscId, newTheme);
    setNewTheme('');
  };

  const selectedDisciplineObj = disciplines.find(d => d.id === selectedDiscId);
  const isUC = selectedDisciplineObj?.category === 'UC';

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in slide-in-from-right-10 duration-500">
      <div className="lg:col-span-1 bg-white p-8 rounded-[2.5rem] border shadow-sm h-fit">
        <h3 className="text-xl font-black text-[#003366] mb-6 uppercase tracking-tighter">Novo Eixo Temático</h3>
        
        {!isUC && selectedDiscId && (
          <div className="mb-4 flex items-start gap-2 bg-blue-50/50 p-3 rounded-xl border border-blue-100">
             <Info size={14} className="text-blue-500 shrink-0 mt-0.5" />
             <p className="text-[9px] font-bold text-blue-800 uppercase tracking-widest leading-relaxed">
               Na arquitetura atual, os Eixos Temáticos são compartilhados entre N1 e N2 para a mesma disciplina.
             </p>
          </div>
        )}

        <div className="space-y-4">
          <select value={selectedPeriodId} onChange={e => { setSelectedPeriodId(e.target.value); setSelectedDiscId(''); }} className="w-full p-4 bg-gray-50 rounded-xl font-bold text-sm outline-none border-2 border-transparent focus:border-[#D4A017]">
            <option value="">Selecione o Período...</option>
            {(periods || []).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>

          <select value={selectedDiscId} onChange={e => setSelectedDiscId(e.target.value)} disabled={!selectedPeriodId} className="w-full p-4 bg-gray-50 rounded-xl font-bold text-sm outline-none border-2 border-transparent focus:border-[#D4A017] disabled:opacity-50 disabled:cursor-not-allowed">
            <option value="">Selecione a Disciplina...</option>
            {filteredDisciplines.map(d => <option key={d.id} value={d.id}>{d.title}</option>)}
          </select>

          {/* SELETOR DE UNIDADE (Visual/Pedagógico) */}
          {!isUC && selectedDiscId && (
            <select value={selectedUnit} onChange={e => setSelectedUnit(e.target.value as AcademicUnit)} className="w-full p-4 bg-blue-50 text-blue-900 rounded-xl font-black text-sm outline-none border-2 border-blue-200 focus:border-[#003366]">
              <option value="N1">Unidade N1 (1º Ciclo)</option>
              <option value="N2">Unidade N2 (2º Ciclo)</option>
            </select>
          )}

          <input type="text" placeholder="Nome do Tema (ex: Fisiologia Renal)" value={newTheme} onChange={e => setNewTheme(e.target.value)} disabled={!selectedDiscId} className="w-full p-4 bg-gray-50 rounded-xl font-bold text-sm outline-none border-2 border-transparent focus:border-[#D4A017] disabled:opacity-50" />
          
          <button onClick={handleAddTheme} disabled={!selectedDiscId || !newTheme} className="w-full bg-[#003366] text-white py-4 rounded-xl font-black uppercase text-[10px] tracking-widest shadow-lg flex items-center justify-center gap-2 hover:bg-[#D4A017] transition-all disabled:opacity-50">
            <Plus size={16}/> Adicionar Tema
          </button>
        </div>
      </div>

      <div className="lg:col-span-2 space-y-4">
        {selectedDiscId ? (
          <div className="bg-white p-8 rounded-[2.5rem] border shadow-sm">
            <h3 className="text-xl font-black text-[#003366] mb-6 uppercase tracking-tighter">Temas de {selectedDisciplineObj?.title}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {selectedDisciplineObj?.themes?.map(theme => (
                <div key={theme} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border group hover:border-[#D4A017] transition-all">
                  <span className="text-xs font-bold text-gray-700">{theme}</span>
                  <button onClick={() => confirm(`Excluir tema "${theme}"?`) && onRemoveTheme(selectedDiscId, theme)} className="text-red-300 hover:text-red-500 transition-colors">
                    <Trash2 size={16}/>
                  </button>
                </div>
              ))}
              {(!selectedDisciplineObj?.themes || selectedDisciplineObj.themes.length === 0) && (
                 <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest col-span-2 text-center py-6">Nenhum tema cadastrado.</p>
              )}
            </div>
          </div>
        ) : (
          <div className="bg-gray-50 h-64 rounded-[2.5rem] border-2 border-dashed flex flex-col items-center justify-center text-gray-400">
             <Layers size={48} className="mb-4 opacity-20"/>
             <p className="font-bold italic">Selecione uma disciplina para gerenciar temas</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminThemes;