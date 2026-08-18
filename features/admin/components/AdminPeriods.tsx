import React, { useState } from 'react';
import { Period } from '../../../types';
import { Loader2, Save, ImageOff } from 'lucide-react';

interface AdminPeriodsProps {
  periods: Period[];
  onUpdateIcon: (periodId: string, icon: string) => Promise<void>;
  onUpdateCrest: (periodId: string, crest: string | null) => Promise<void>;
}

// Editar brasão/ícone pelo painel em vez de pelo botão "Injetar Estrutura (Seed)": o seed
// regrava config/periods E config/disciplines a partir dos arquivos locais, levando junto
// temas, referências, status e travas de feature editados aqui. Ver item 6.2 do PLANO.
const AdminPeriods: React.FC<AdminPeriodsProps> = ({ periods, onUpdateIcon, onUpdateCrest }) => {
  const [drafts, setDrafts] = useState<Record<string, { icon: string; crest: string }>>({});
  const [savingId, setSavingId] = useState<string | null>(null);

  const draftFor = (period: Period) =>
    drafts[period.id] ?? { icon: period.icon || '', crest: period.crest || '' };

  const setDraft = (periodId: string, patch: Partial<{ icon: string; crest: string }>) => {
    setDrafts(prev => ({
      ...prev,
      [periodId]: { ...(prev[periodId] ?? { icon: '', crest: '' }), ...patch },
    }));
  };

  const handleSave = async (period: Period) => {
    const draft = draftFor(period);
    const trimmedCrest = draft.crest.trim();

    if (!draft.icon.trim() && !trimmedCrest) {
      alert('Defina ao menos um emoji — sem brasão, é ele que aparece na seleção de período.');
      return;
    }

    try {
      setSavingId(period.id);
      if (draft.icon !== (period.icon || '')) {
        await onUpdateIcon(period.id, draft.icon.trim());
      }
      if (trimmedCrest !== (period.crest || '')) {
        await onUpdateCrest(period.id, trimmedCrest || null);
      }
      setDrafts(prev => {
        const next = { ...prev };
        delete next[period.id];
        return next;
      });
      alert(`${period.name} atualizado.`);
    } catch (error) {
      console.error(error);
      alert('Erro ao salvar. Verifique a conexão e se sua conta tem o Custom Claim de admin.');
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="bg-white p-8 rounded-[2.5rem] border shadow-sm animate-in fade-in duration-500">
      <div className="border-b pb-4 mb-6">
        <h3 className="text-xl font-black text-[#003366] uppercase tracking-tighter">Identidade dos Períodos</h3>
        <p className="text-gray-500 text-xs font-medium mt-2 max-w-2xl">
          O emoji aparece na seleção de período. Se houver brasão (imagem em <code>/public</code> ou URL),
          ele substitui o emoji. O brasão acompanha a <strong>turma</strong>, não o período — a cada
          promoção, mova o caminho da imagem para o período seguinte.
        </p>
      </div>

      <div className="space-y-3">
        {periods.map(period => {
          const draft = draftFor(period);
          const isDirty = draft.icon !== (period.icon || '') || draft.crest.trim() !== (period.crest || '');
          const isSaving = savingId === period.id;

          return (
            <div
              key={period.id}
              className={`p-4 rounded-2xl border flex flex-col md:flex-row md:items-center gap-4 transition-all ${
                isDirty ? 'border-[#D4A017] bg-amber-50/30' : 'border-gray-100 bg-gray-50'
              }`}
            >
              <div className="w-16 h-16 shrink-0 bg-white rounded-2xl border border-gray-100 flex items-center justify-center overflow-hidden">
                {draft.crest.trim() ? (
                  <img
                    src={draft.crest}
                    alt={`Brasão ${period.name}`}
                    className="w-full h-full object-contain"
                    onError={e => { e.currentTarget.style.display = 'none'; }}
                  />
                ) : (
                  <span className="text-3xl">{draft.icon || '❔'}</span>
                )}
              </div>

              <div className="md:w-40 shrink-0">
                <p className="text-sm font-black text-[#003366]">{period.name}</p>
                <p className="text-[9px] font-black uppercase text-gray-400 tracking-widest mt-1">
                  {period.semester} • {period.workload}
                </p>
              </div>

              <input
                type="text"
                value={draft.icon}
                onChange={e => setDraft(period.id, { icon: e.target.value })}
                placeholder="Emoji"
                className="w-full md:w-24 p-3 bg-white rounded-xl text-center text-xl outline-none border-2 border-transparent focus:border-[#D4A017]"
                disabled={isSaving}
              />

              <input
                type="text"
                value={draft.crest}
                onChange={e => setDraft(period.id, { crest: e.target.value })}
                placeholder="Brasão: /turma8.jpg ou https://... (vazio = usa o emoji)"
                className="flex-1 p-3 bg-white rounded-xl font-bold text-xs outline-none border-2 border-transparent focus:border-[#D4A017]"
                disabled={isSaving}
              />

              {period.crest && (
                <button
                  onClick={() => setDraft(period.id, { crest: '' })}
                  title="Tirar o brasão (volta a usar o emoji)"
                  className="text-gray-300 hover:text-red-500 transition-colors p-2 shrink-0"
                  disabled={isSaving}
                >
                  <ImageOff size={18} />
                </button>
              )}

              <button
                onClick={() => handleSave(period)}
                disabled={!isDirty || isSaving}
                className={`px-5 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 shrink-0 transition-all ${
                  !isDirty || isSaving
                    ? 'bg-gray-100 text-gray-300 cursor-not-allowed'
                    : 'bg-[#003366] text-white hover:bg-[#D4A017] shadow-lg'
                }`}
              >
                {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                {isSaving ? 'Salvando' : 'Salvar'}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default AdminPeriods;
