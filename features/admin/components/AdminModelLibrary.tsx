import React, { lazy, Suspense, useState } from 'react';
import { Box, Eye, EyeOff, Pencil, Trash2, Check, X, Library } from 'lucide-react';
import type { AnatomyModelAsset, LabSimulation, SimulationInfo } from '../../../types';
import { deleteAnatomyModel, renameAnatomyModel, ModelInUseError } from '../../../services/anatomyModelsService';
import { formatMegabytes, modelUsage } from '../../../utils/anatomyModels';
import ModelUploadForm from './ModelUploadForm';

const AnatomyViewer = lazy(() => import('../../../components/anatomy3d/AnatomyViewer'));

interface Props {
  models: AnatomyModelAsset[] | null;
  labSimulations: LabSimulation[];
  disciplines: SimulationInfo[];
}

// Aba "Banco de Peças 3D" (item 6.24): cada peça sobe uma vez e é usada por quantos Labs
// precisarem. Renomear propaga para os Labs; apagar só é possível com a peça fora de uso.
const AdminModelLibrary: React.FC<Props> = ({ models, labSimulations, disciplines }) => {
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [editing, setEditing] = useState<{ id: string; name: string } | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const disciplineTitle = (id: string) => disciplines.find((d) => d.id === id)?.title ?? id;

  const handleRename = async (model: AnatomyModelAsset) => {
    if (!editing || !editing.name.trim() || editing.name.trim() === model.name) {
      setEditing(null);
      return;
    }
    setBusyId(model.id);
    try {
      await renameAnatomyModel(model, editing.name.trim(), labSimulations);
      setEditing(null);
    } catch (err) {
      console.error('Erro ao renomear peça:', err);
      alert(`Não foi possível renomear: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (model: AnatomyModelAsset) => {
    if (!confirm(`Apagar "${model.name}" do banco? O arquivo será removido do servidor.`)) return;
    setBusyId(model.id);
    try {
      await deleteAnatomyModel(model, labSimulations);
    } catch (err) {
      console.error('Erro ao apagar peça:', err);
      alert(err instanceof ModelInUseError ? err.message : `Não foi possível apagar: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="bg-white p-6 md:p-8 rounded-[2.5rem] border shadow-sm space-y-6">
      <div className="flex items-start gap-3">
        <div className="p-3 bg-emerald-50 text-emerald-700 rounded-xl"><Library size={22} /></div>
        <div>
          <h3 className="text-xl font-black text-[#003366] uppercase tracking-tighter">Banco de Peças 3D</h3>
          <p className="text-xs text-gray-500 font-medium mt-1 leading-relaxed">
            Suba cada peça uma vez e use em quantos Labs precisar. As marcações e questões continuam sendo de cada Lab.
            Peça escaneada de novo entra como peça nova: um escaneamento novo muda a posição de tudo e as marcas antigas ficariam fora do lugar.
          </p>
        </div>
      </div>

      <ModelUploadForm />

      {models === null ? (
        <div className="py-10 flex justify-center"><div className="w-8 h-8 border-4 border-[#003366]/10 border-t-[#D4A017] rounded-full animate-spin" /></div>
      ) : models.length === 0 ? (
        <p className="text-center py-10 text-gray-300 italic font-bold">Nenhuma peça no banco ainda.</p>
      ) : (
        <div className="space-y-3">
          {models.map((model) => {
            const usage = modelUsage(model.url, labSimulations);
            const isEditing = editing?.id === model.id;
            const busy = busyId === model.id;
            return (
              <div key={model.id} className="border border-gray-100 rounded-2xl p-4 bg-gray-50/50">
                <div className="flex flex-col md:flex-row md:items-center gap-3">
                  <div className="flex-1 min-w-0">
                    {isEditing ? (
                      <div className="flex items-center gap-2">
                        <input
                          value={editing.name}
                          onChange={(e) => setEditing({ id: model.id, name: e.target.value })}
                          onKeyDown={(e) => { if (e.key === 'Enter') handleRename(model); if (e.key === 'Escape') setEditing(null); }}
                          maxLength={40}
                          autoFocus
                          className="flex-1 p-2 bg-white rounded-lg font-bold text-sm outline-none border"
                        />
                        <button onClick={() => handleRename(model)} disabled={busy} title="Salvar nome" className="p-2 text-green-600 hover:bg-green-50 rounded-lg"><Check size={16} /></button>
                        <button onClick={() => setEditing(null)} title="Cancelar" className="p-2 text-gray-400 hover:bg-gray-100 rounded-lg"><X size={16} /></button>
                      </div>
                    ) : (
                      <p className="font-black text-[#003366] text-sm flex items-center gap-1.5 truncate"><Box size={14} className="text-emerald-600 shrink-0" /> {model.name}</p>
                    )}
                    <p className="text-[10px] font-bold text-gray-400 mt-1">
                      {model.sizeBytes > 0 ? `${formatMegabytes(model.sizeBytes)} · ` : ''}
                      {usage.length === 0 ? 'Não usada em nenhum Lab' : `Usada em ${usage.length} Lab${usage.length > 1 ? 's' : ''}`}
                    </p>
                    {usage.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {usage.map((u) => (
                          <span key={u.simulationId} className="text-[9px] font-black uppercase tracking-wide bg-white border border-gray-200 text-[#003366] px-2 py-1 rounded-md">
                            {u.title} · {disciplineTitle(u.disciplineId)}{u.unit ? ` ${u.unit}` : ''} · {u.questionCount} quest{u.questionCount > 1 ? 'ões' : 'ão'}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button onClick={() => setPreviewId(previewId === model.id ? null : model.id)} className="flex items-center gap-1 px-3 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest text-[#003366] hover:bg-blue-50">
                      {previewId === model.id ? <EyeOff size={14} /> : <Eye size={14} />} {previewId === model.id ? 'Fechar' : 'Ver'}
                    </button>
                    {!isEditing && (
                      <button onClick={() => setEditing({ id: model.id, name: model.name })} disabled={busy} className="flex items-center gap-1 px-3 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest text-[#003366] hover:bg-blue-50">
                        <Pencil size={14} /> Renomear
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(model)}
                      disabled={busy || usage.length > 0}
                      title={usage.length > 0 ? 'Remova a peça dos Labs que a usam antes de apagar' : 'Apagar a peça do banco'}
                      className="flex items-center gap-1 px-3 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest text-red-500 hover:bg-red-50 disabled:opacity-30 disabled:hover:bg-transparent"
                    >
                      <Trash2 size={14} /> Apagar
                    </button>
                  </div>
                </div>
                {previewId === model.id && (
                  <div className="mt-3 h-[60vh] min-h-[360px] max-h-[680px] rounded-xl overflow-hidden bg-[#1b1d22]">
                    <Suspense fallback={<div className="w-full h-full" />}>
                      <AnatomyViewer modelUrl={model.url} className="w-full h-full" />
                    </Suspense>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AdminModelLibrary;
