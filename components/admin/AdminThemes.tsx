import React, { useState, useMemo } from 'react';
import { SimulationInfo, Room } from '../../types';
import { Trash2, Plus, Layers } from 'lucide-react';

interface AdminThemesProps {
  rooms?: Room[];
  disciplines: SimulationInfo[];
  onAddTheme: (disciplineId: string, themeName: string) => void;
  onRemoveTheme: (disciplineId: string, themeName: string) => void;
}

const AdminThemes: React.FC<AdminThemesProps> = ({ rooms = [], disciplines = [], onAddTheme, onRemoveTheme }) => {
  const [selectedRoomId, setSelectedRoomId] = useState('');
  const [selectedDiscId, setSelectedDiscId] = useState('');
  const [newTheme, setNewTheme] = useState('');

  const filteredDisciplines = useMemo(() => {
    if (!selectedRoomId) return [];
    return disciplines.filter(d => d.roomId === selectedRoomId);
  }, [disciplines, selectedRoomId]);

  const handleAddTheme = () => {
    if (!selectedDiscId || !newTheme) return;
    onAddTheme(selectedDiscId, newTheme);
    setNewTheme('');
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in slide-in-from-right-10 duration-500">
      <div className="lg:col-span-1 bg-white p-8 rounded-[2.5rem] border shadow-sm h-fit">
        <h3 className="text-xl font-black text-[#003366] mb-6 uppercase tracking-tighter">Novo Eixo Temático</h3>
        <div className="space-y-4">
          
          <select value={selectedRoomId} onChange={e => { setSelectedRoomId(e.target.value); setSelectedDiscId(''); }} className="w-full p-4 bg-gray-50 rounded-xl font-bold text-sm outline-none border-2 border-transparent focus:border-[#D4A017]">
            <option value="">Selecione a Sala/Turma...</option>
            {(rooms || []).map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>

          <select value={selectedDiscId} onChange={e => setSelectedDiscId(e.target.value)} disabled={!selectedRoomId} className="w-full p-4 bg-gray-50 rounded-xl font-bold text-sm outline-none border-2 border-transparent focus:border-[#D4A017] disabled:opacity-50 disabled:cursor-not-allowed">
            <option value="">Selecione a Disciplina...</option>
            {filteredDisciplines.map(d => <option key={d.id} value={d.id}>{d.title}</option>)}
          </select>

          <input type="text" placeholder="Nome do Tema (ex: Fisiologia Renal)" value={newTheme} onChange={e => setNewTheme(e.target.value)} disabled={!selectedDiscId} className="w-full p-4 bg-gray-50 rounded-xl font-bold text-sm outline-none border-2 border-transparent focus:border-[#D4A017] disabled:opacity-50" />
          
          <button onClick={handleAddTheme} disabled={!selectedDiscId || !newTheme} className="w-full bg-[#003366] text-white py-4 rounded-xl font-black uppercase text-[10px] tracking-widest shadow-lg flex items-center justify-center gap-2 hover:bg-[#D4A017] transition-all disabled:opacity-50">
            <Plus size={16}/> Adicionar Tema
          </button>
        </div>
      </div>
      <div className="lg:col-span-2 space-y-4">
        {selectedDiscId ? (
          <div className="bg-white p-8 rounded-[2.5rem] border shadow-sm">
            <h3 className="text-xl font-black text-[#003366] mb-6 uppercase tracking-tighter">Temas de {disciplines.find(d => d.id === selectedDiscId)?.title}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {disciplines.find(d => d.id === selectedDiscId)?.themes?.map(theme => (
                <div key={theme} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border group hover:border-[#D4A017] transition-all">
                  <span className="text-xs font-bold text-gray-700">{theme}</span>
                  <button onClick={() => confirm(`Excluir tema "${theme}"?`) && onRemoveTheme(selectedDiscId, theme)} className="text-red-300 hover:text-red-500 transition-colors">
                    <Trash2 size={16}/>
                  </button>
                </div>
              ))}
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