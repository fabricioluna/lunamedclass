import React, { useState } from 'react';
import { SimulationInfo, ReferenceMaterial } from '../../types';
import { Trash2 } from 'lucide-react';

interface AdminReferencesProps {
  disciplines: SimulationInfo[];
  onUpdateReferences: (disciplineId: string, refs: ReferenceMaterial[]) => void;
}

const AdminReferences: React.FC<AdminReferencesProps> = ({ disciplines, onUpdateReferences }) => {
  const [selectedDiscId, setSelectedDiscId] = useState('');
  const [refTitle, setRefTitle] = useState('');
  const [refAuthor, setRefAuthor] = useState('');
  const [refType, setRefType] = useState<'book' | 'article' | 'link' | 'video'>('book');
  const [refUrl, setRefUrl] = useState('');

  const handleAddReference = () => {
    if (!selectedDiscId || !refTitle) return;
    const currentDisc = disciplines.find(d => d.id === selectedDiscId);
    const newRef: ReferenceMaterial = {
      id: `ref_${Date.now()}`,
      title: refTitle,
      author: refAuthor,
      type: refType,
      url: refUrl
    };
    const updatedRefs = [...(currentDisc?.references || []), newRef];
    onUpdateReferences(selectedDiscId, updatedRefs);
    setRefTitle(''); setRefAuthor(''); setRefUrl('');
  };

  const handleRemoveReference = (refId: string) => {
    const currentDisc = disciplines.find(d => d.id === selectedDiscId);
    if (!currentDisc) return;
    const updatedRefs = (currentDisc.references || []).filter(r => r.id !== refId);
    onUpdateReferences(selectedDiscId, updatedRefs);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in slide-in-from-right-10 duration-500">
      <div className="lg:col-span-4 bg-white p-8 rounded-[2.5rem] border shadow-sm h-fit">
        <h3 className="text-xl font-black text-[#003366] mb-6 uppercase tracking-tighter">Nova Referência</h3>
        <div className="space-y-4">
          <select value={selectedDiscId} onChange={e => setSelectedDiscId(e.target.value)} className="w-full p-4 bg-gray-50 rounded-xl font-bold text-sm outline-none border-2 border-transparent focus:border-[#D4A017]">
            <option value="">Disciplina...</option>
            {disciplines.map(d => <option key={d.id} value={d.id}>{d.title}</option>)}
          </select>
          <input type="text" placeholder="Título do Material" value={refTitle} onChange={e => setRefTitle(e.target.value)} className="w-full p-4 bg-gray-50 rounded-xl font-bold text-sm" />
          <input type="text" placeholder="Autor (opcional)" value={refAuthor} onChange={e => setRefAuthor(e.target.value)} className="w-full p-4 bg-gray-50 rounded-xl font-bold text-sm" />
          <select value={refType} onChange={e => setRefType(e.target.value as any)} className="w-full p-4 bg-gray-50 rounded-xl font-bold text-sm">
            <option value="book">Livro</option>
            <option value="article">Artigo/PDF</option>
            <option value="link">Link Externo</option>
            <option value="video">Vídeo</option>
          </select>
          <input type="url" placeholder="URL (opcional)" value={refUrl} onChange={e => setRefUrl(e.target.value)} className="w-full p-4 bg-gray-50 rounded-xl font-bold text-sm" />
          <button onClick={handleAddReference} className="w-full bg-[#003366] text-white py-4 rounded-xl font-black uppercase text-[10px] tracking-widest shadow-lg hover:bg-[#D4A017] transition-all">
            Salvar Referência
          </button>
        </div>
      </div>
      <div className="lg:col-span-8 bg-white p-8 rounded-[2.5rem] border shadow-sm">
        {selectedDiscId ? (
          <>
            <h3 className="text-xl font-black text-[#003366] mb-6 uppercase tracking-tighter">Bibliografia de {disciplines.find(d => d.id === selectedDiscId)?.title}</h3>
            <div className="space-y-3">
              {(disciplines.find(d => d.id === selectedDiscId)?.references || []).map(ref => (
                <div key={ref.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border group hover:border-red-100 transition-all">
                  <div className="flex items-center gap-4">
                    <div className="text-xl">{ref.type === 'book' ? '📖' : '🔗'}</div>
                    <div>
                      <p className="text-sm font-black text-[#003366]">{ref.title}</p>
                      <p className="text-[9px] text-gray-400 font-bold uppercase">{ref.author || 'Sem Autor'}</p>
                    </div>
                  </div>
                  <button onClick={() => handleRemoveReference(ref.id)} className="text-red-300 hover:text-red-500 transition-colors">
                    <Trash2 size={18}/>
                  </button>
                </div>
              ))}
              {(disciplines.find(d => d.id === selectedDiscId)?.references || []).length === 0 && <p className="text-center py-10 text-gray-300 italic font-bold">Nenhuma referência cadastrada.</p>}
            </div>
          </>
        ) : <p className="text-center py-20 text-gray-300 font-bold italic">Selecione uma disciplina ao lado.</p>}
      </div>
    </div>
  );
};

export default AdminReferences;