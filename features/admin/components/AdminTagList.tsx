import React from 'react';
import { Tags, Pencil, XCircle } from 'lucide-react';

interface Tag {
  id: string;
  label: string;
}

interface AdminTagListProps {
  title: string;
  description: string;
  createLabel: string;
  promptLabel: string;
  emptyMessage: string;
  deleteConfirmMessage: (label: string) => string;
  items: Tag[];
  onCreate: (label: string) => void;
  onRename: (id: string, label: string) => void;
  onDelete: (id: string) => void;
}

// CRUD genérico pra listas simples de rótulo (id + label) geridas pelo admin — hoje usado por
// Área e Subárea de Conhecimento (eixos transversais e independentes entre si, ver types.ts).
// Ver PLANO-REESTRUTURACAO.md, Etapa 6.
const AdminTagList: React.FC<AdminTagListProps> = ({
  title,
  description,
  createLabel,
  promptLabel,
  emptyMessage,
  deleteConfirmMessage,
  items,
  onCreate,
  onRename,
  onDelete,
}) => {
  const handleCreate = () => {
    const label = prompt(promptLabel);
    if (!label?.trim()) return;
    onCreate(label.trim());
  };

  const handleRename = (tag: Tag) => {
    const label = prompt('Novo nome:', tag.label);
    if (!label?.trim() || label.trim() === tag.label) return;
    onRename(tag.id, label.trim());
  };

  const handleDelete = (tag: Tag) => {
    if (confirm(deleteConfirmMessage(tag.label))) {
      onDelete(tag.id);
    }
  };

  return (
    <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 animate-in fade-in">
      <div className="flex flex-col md:flex-row items-center justify-between mb-8 gap-4 border-b border-gray-100 pb-6">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-[#003366]/10 text-[#003366] rounded-xl">
            <Tags size={24} />
          </div>
          <div>
            <h2 className="text-xl font-black text-[#003366] uppercase tracking-tighter">{title}</h2>
            <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">{description}</p>
          </div>
        </div>

        <button
          onClick={handleCreate}
          className="bg-[#003366] text-white px-5 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-[#D4A017] transition-all shadow-md"
        >
          {createLabel}
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {items.length === 0 ? (
          <div className="text-center py-12 text-gray-400 font-bold uppercase tracking-widest text-xs border-2 border-dashed border-gray-100 rounded-2xl">
            {emptyMessage}
          </div>
        ) : (
          items.map((tag) => (
            <div key={tag.id} className="flex items-center justify-between p-5 rounded-2xl border border-gray-100 bg-gray-50 hover:bg-white hover:shadow-md transition-all gap-4">
              <h3 className="font-black text-[#003366] text-sm">{tag.label}</h3>
              <div className="flex items-center gap-4">
                <button onClick={() => handleRename(tag)} className="text-gray-400 hover:text-[#003366] transition-colors" title="Renomear">
                  <Pencil size={18} />
                </button>
                <button onClick={() => handleDelete(tag)} className="text-red-400 hover:text-red-600 transition-colors" title="Apagar">
                  <XCircle size={20} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default AdminTagList;
