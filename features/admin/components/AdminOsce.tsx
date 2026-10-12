import React, { useState, useMemo } from 'react';
import { OsceStation, SimulationInfo, Period, AcademicUnit } from '../../../types';
import { Trash2, ClipboardList, Gamepad2, Bot, UploadCloud, Download, AlertTriangle, XCircle, Route } from 'lucide-react';
import { parseOsceImport, ParsedOsceItem, OsceImportMode } from '../../../utils/osceImport';
import { normalizeStaticStation } from '../../../utils/osceStation';

interface AdminOsceProps {
  periods?: Period[];
  disciplines: SimulationInfo[];
  osceStations: OsceStation[];
  onSaveOsceStations: (os: OsceStation[]) => Promise<void>;
  onRemoveOsceStation: (id: string) => void;
  onClearOsce: (disciplineId?: string) => void;
}

// Modelo baixável do formato de autoria (item 6.17) — quem cadastra parte daqui em vez de
// montar actionCloud/correctOrderIndices à mão.
const STATIC_TEMPLATE = [
  {
    slug: 'hm1-exemplo-paramentacao',
    title: 'Título da estação',
    theme: '(opcional) tema da disciplina — se omitido, usa o tema escolhido na tela',
    unit: 'N1',
    setting: 'Onde a cena acontece (ex.: corredor da enfermaria, placa na porta do quarto)',
    scenario: 'Caso apresentado ao aluno',
    task: 'Ação que o aluno deve realizar',
    tip: '(opcional) dica exibida no resultado',
    steps: [
      { action: 'Primeiro passo, na ordem certa', why: 'Por que este passo vem aqui', critical: true },
      { action: 'Segundo passo', why: 'Por que' },
    ],
    distractors: [{ action: 'Ação errada plausível', why: 'Por que está errada' }],
    checklist: ['(opcional) critério de avaliação exibido no resultado'],
  },
];

// Modelo do RPG guiado: cenas lineares; em cada uma, 4 a 6 condutas com o desfecho/consequência
// de cada uma. `reveals` (valores aferidos) só aparece depois da conduta correta.
const GUIDED_TEMPLATE = [
  {
    slug: 'hm1-exemplo-rpg-pa',
    title: 'Título do caso',
    theme: '(opcional) tema da disciplina — se omitido, usa o tema escolhido na tela',
    unit: 'N1',
    setting: 'Onde a cena acontece e o material disponível',
    scenario: 'Caso apresentado ao aluno',
    task: 'O que o aluno deve realizar (e o que NÃO precisa fazer)',
    tip: '(opcional) dica exibida no resultado',
    scenes: [
      {
        narrative: 'O que o aluno vê, ouve e sente nesta cena.',
        patient: '(opcional) fala do paciente ou da equipe',
        prompt: '(opcional) pergunta ao aluno — padrão: "O que você faz agora?"',
        choices: [
          { action: 'Conduta correta', correct: true, feedback: 'Desfecho da conduta certa.' },
          { action: 'Conduta errada 1', feedback: 'Consequência narrada + por que está errada.' },
          { action: 'Conduta errada 2', feedback: 'Consequência narrada + por que está errada.' },
          { action: 'Conduta errada 3', feedback: 'Consequência narrada + por que está errada.' },
        ],
        reveals: [{ label: 'Pressão arterial', value: '120/80 mmHg' }],
      },
    ],
    checklist: ['(opcional) critério de avaliação exibido no resultado'],
  },
];

const downloadTemplate = (mode: OsceImportMode) => {
  const isGuided = mode === 'guided';
  const blob = new Blob([JSON.stringify(isGuided ? GUIDED_TEMPLATE : STATIC_TEMPLATE, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = isGuided ? 'modelo-rpg-guiado.json' : 'modelo-estacao-estatica.json';
  link.click();
  URL.revokeObjectURL(url);
};

const ImportPreviewItem = ({ item }: { item: ParsedOsceItem }) => {
  const { station, errors, warnings, isUpdate } = item;
  const steps = station?.mode === 'clinical' ? normalizeStaticStation(station) : null;

  return (
    <div className={`rounded-2xl p-4 text-left ${errors.length > 0 ? 'bg-red-500/20 border border-red-300/40' : 'bg-white/10 border border-white/10'}`}>
      <div className="flex justify-between items-start gap-2">
        <p className="font-black text-sm leading-tight">{station?.title || 'Item inválido'}</p>
        {station && (
          <span className={`shrink-0 text-[8px] font-black uppercase px-2 py-1 rounded ${isUpdate ? 'bg-[#D4A017] text-[#003366]' : 'bg-green-400 text-[#003366]'}`}>
            {isUpdate ? 'Atualiza' : 'Nova'}
          </span>
        )}
      </div>
      {station && (
        <p className="text-[9px] font-bold uppercase tracking-widest opacity-70 mt-1">
          {station.unit} • {station.theme}
          {steps && ` • ${steps.steps.length} passos • ${steps.distractors.length} distratores`}
          {station.mode === 'guided' && ` • ${station.scenes.length} cenas • ${station.scenes.filter(s => s.reveals?.length).length} com valores aferidos`}
          {(station.mode === 'rpg' || station.mode === 'ai') && ` • ${Object.keys(station.phases).length} fases`}
        </p>
      )}
      {errors.map((e, i) => (
        <p key={`e${i}`} className="text-[10px] font-bold text-red-100 mt-2 flex gap-1"><XCircle size={12} className="shrink-0 mt-0.5" /> {e}</p>
      ))}
      {warnings.map((w, i) => (
        <p key={`w${i}`} className="text-[10px] font-bold text-amber-200 mt-2 flex gap-1"><AlertTriangle size={12} className="shrink-0 mt-0.5" /> {w}</p>
      ))}
      {station?.mode === 'guided' && station.scenes.length > 0 && (
        <details className="mt-2">
          <summary className="text-[9px] font-black uppercase tracking-widest cursor-pointer opacity-80">Ver cenas</summary>
          <ol className="mt-2 space-y-2 list-decimal list-inside text-[11px]">
            {station.scenes.map((scene, i) => (
              <li key={i}>
                {scene.narrative.length > 90 ? `${scene.narrative.slice(0, 90)}…` : scene.narrative}
                <span className="opacity-70"> — certa: {scene.choices.filter(c => c.correct).map(c => c.action).join(' / ')}</span>
                {scene.reveals?.length ? <span className="text-green-200"> (revela {scene.reveals.map(r => r.label).join(', ')})</span> : null}
              </li>
            ))}
          </ol>
        </details>
      )}
      {steps && steps.steps.length > 0 && (
        <details className="mt-2">
          <summary className="text-[9px] font-black uppercase tracking-widest cursor-pointer opacity-80">Ver gabarito</summary>
          <ol className="mt-2 space-y-1 list-decimal list-inside text-[11px]">
            {steps.steps.map((s, i) => (
              <li key={i}>{s.action}{s.critical && <span className="text-red-200 font-black"> (crítico)</span>}</li>
            ))}
          </ol>
          {steps.distractors.length > 0 && (
            <p className="mt-2 text-[11px] opacity-80">Distratores: {steps.distractors.map(d => d.action).join(' • ')}</p>
          )}
        </details>
      )}
    </div>
  );
};

const AdminOsce: React.FC<AdminOsceProps> = ({
  periods = [],
  disciplines = [],
  osceStations = [],
  onSaveOsceStations,
  onRemoveOsceStation,
  onClearOsce
}) => {
  // --- FILTROS DE VISUALIZAÇÃO (LADO DIREITO) ---
  const [periodFilterOsce, setPeriodFilterOsce] = useState(''); 
  const [discFilterOsce, setDiscFilterOsce] = useState(''); 
  const [unitFilterOsce, setUnitFilterOsce] = useState<AcademicUnit | ''>(''); // NOVO: Filtro de Unidade
  const [themeFilterOsce, setThemeFilterOsce] = useState(''); 
  const [typeFilter, setTypeFilter] = useState<'all' | OsceImportMode>('all');

  // --- ESTADOS DE IMPORTAÇÃO (LADO ESQUERDO) ---
  const [importMode, setImportMode] = useState<OsceImportMode>('clinical');
  const [oscePeriod, setOscePeriod] = useState(''); 
  const [osceDiscipline, setOsceDiscipline] = useState('');
  
  // === NOVO: ESTADO DA UNIDADE PARA OSCE ===
  const [osceUnit, setOsceUnit] = useState<AcademicUnit>('N1'); 
  
  const [osceTheme, setOsceTheme] = useState('');
  const [osceFile, setOsceFile] = useState<File | null>(null);
  const [oscePreview, setOscePreview] = useState<ParsedOsceItem[] | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const filteredImportDisciplines = useMemo(() => {
    if (!oscePeriod) return [];
    return disciplines.filter(d => d.periodId === oscePeriod); 
  }, [disciplines, oscePeriod]);

  const filteredViewDisciplines = useMemo(() => {
    if (!periodFilterOsce) return disciplines;
    return disciplines.filter(d => d.periodId === periodFilterOsce); 
  }, [disciplines, periodFilterOsce]);

  const handleOsceReadPreview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!osceFile || !osceDiscipline) return;

    const selectedDiscObj = disciplines.find(d => d.id === osceDiscipline);

    const reader = new FileReader();
    reader.onload = (event) => {
      const parsed = parseOsceImport(String(event.target?.result ?? ''), {
        mode: importMode,
        disciplineId: osceDiscipline,
        defaultUnit: osceUnit,
        forceUnitN1: selectedDiscObj?.category === 'UC',
        defaultTheme: osceTheme,
        allowedThemes: selectedDiscObj?.themes ?? [],
        existingIds: osceStations.map(s => s.firebaseId ?? s.id),
        now: Date.now(),
      });

      if (parsed.fileError) {
        alert(`Erro: ${parsed.fileError}`);
        return;
      }
      if (parsed.items.length === 0) {
        alert('O arquivo não tem nenhuma estação.');
        return;
      }
      setOscePreview(parsed.items);
    };
    reader.readAsText(osceFile);
  };

  const previewErrorCount = oscePreview?.filter(item => item.errors.length > 0).length ?? 0;

  const confirmOsceImport = async () => {
    if (!oscePreview || previewErrorCount > 0) return;
    const stations = oscePreview.flatMap(item => (item.station ? [item.station] : []));
    const updates = oscePreview.filter(item => item.isUpdate).length;

    setIsSaving(true);
    try {
      // Firestore rejeita campos `undefined` — o round-trip por JSON os remove.
      await onSaveOsceStations(JSON.parse(JSON.stringify(stations)));
      alert(`✅ ${stations.length} estações salvas (${stations.length - updates} novas, ${updates} atualizadas).`);
      setOscePreview(null);
      setOsceFile(null);
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
    } catch (error) {
      console.error('Erro ao salvar estações OSCE:', error);
      alert('Erro ao salvar. Verifique a conexão e se sua conta tem o Custom Claim de admin.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in slide-in-from-right-10 duration-500">
      
      {/* PAINEL DE IMPORTAÇÃO (LADO ESQUERDO) */}
      <div className="lg:col-span-4 space-y-6">
        {!oscePreview ? (
          <div className="bg-white p-8 rounded-[2.5rem] border shadow-sm">
            <h3 className="text-xl font-black text-[#003366] mb-6 uppercase tracking-tighter flex items-center gap-2">
              <UploadCloud size={20}/> Importar Simulado
            </h3>

            {/* SELETOR DE MODO - O ADMIN ESCOLHE O MOTOR AQUI */}
            <div className="bg-gray-50 p-2 rounded-2xl mb-6 grid grid-cols-2 gap-1 border border-gray-100">
                <button
                    onClick={() => setImportMode('clinical')}
                    className={`flex flex-col items-center py-3 rounded-xl transition-all ${importMode === 'clinical' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
                >
                    <ClipboardList size={20} />
                    <span className="text-[7px] font-black uppercase mt-1">Estático</span>
                </button>
                <button
                    onClick={() => setImportMode('guided')}
                    className={`flex flex-col items-center py-3 rounded-xl transition-all ${importMode === 'guided' ? 'bg-white shadow-sm text-purple-600' : 'text-gray-400 hover:text-gray-600'}`}
                >
                    <Route size={20} />
                    <span className="text-[7px] font-black uppercase mt-1">RPG Guiado</span>
                </button>
            </div>

            <p className="text-[10px] text-gray-500 font-medium leading-relaxed mb-4 px-1">
              {importMode === 'guided'
                ? 'Casos de técnica cena a cena, com alternativas. Aparece para o aluno em "RPG Guiado".'
                : 'Checklist sequencial com passos e distratores. Aparece em "Simulado Estático".'}
            </p>

            <form onSubmit={handleOsceReadPreview} className="space-y-4">
              <select value={oscePeriod} onChange={e => { setOscePeriod(e.target.value); setOsceDiscipline(''); setOsceTheme(''); }} className="w-full p-4 bg-gray-50 rounded-xl font-bold text-sm outline-none border-2 border-transparent focus:border-[#003366]" required>
                <option value="">Período...</option>
                {periods.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              
              <select value={osceDiscipline} onChange={e => { setDiscFilterOsce(e.target.value); setUnitFilterOsce(''); setOsceDiscipline(e.target.value); setOsceTheme(''); }} disabled={!oscePeriod} className="w-full p-4 bg-gray-50 rounded-xl font-bold text-sm outline-none border-2 border-transparent focus:border-[#003366] disabled:opacity-50" required>
                <option value="">Disciplina...</option>
                {filteredImportDisciplines.map(d => <option key={d.id} value={d.id}>{d.title}</option>)}
              </select>

              {/* SELETOR DE UNIDADE NO IMPORT (Oculto se for UC) */}
              {osceDiscipline && disciplines.find(d => d.id === osceDiscipline)?.category !== 'UC' && (
                <select value={osceUnit} onChange={e => setOsceUnit(e.target.value as AcademicUnit)} className="w-full p-4 bg-blue-50 text-blue-900 rounded-xl font-black text-sm outline-none border-2 border-blue-200 focus:border-[#003366]" required>
                  <option value="N1">Unidade N1 (1º Ciclo)</option>
                  <option value="N2">Unidade N2 (2º Ciclo)</option>
                </select>
              )}

              <select value={osceTheme} onChange={e => setOsceTheme(e.target.value)} disabled={!osceDiscipline} className="w-full p-4 bg-gray-50 rounded-xl font-bold text-sm outline-none border-2 border-transparent focus:border-[#003366] disabled:opacity-50">
                <option value="">Tema padrão (opcional se o JSON informar "theme")</option>
                {disciplines.find(d => d.id === osceDiscipline)?.themes?.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              <input type="file" accept=".json" onChange={e => setOsceFile(e.target.files ? e.target.files[0] : null)} className="w-full text-[10px] text-gray-400 font-black uppercase p-4 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200" required />
              <button type="submit" disabled={!osceFile} className="w-full bg-[#003366] text-white py-4 rounded-xl font-black uppercase text-[10px] tracking-widest shadow-lg hover:bg-[#D4A017] transition-all disabled:opacity-50">
                Visualizar como {importMode.toUpperCase()} 👁️
              </button>
            </form>

            {(importMode === 'clinical' || importMode === 'guided') && (
              <button onClick={() => downloadTemplate(importMode)} className="w-full mt-3 flex items-center justify-center gap-2 text-[#003366] bg-blue-50 border border-blue-100 py-3 rounded-xl font-black uppercase text-[9px] tracking-widest hover:bg-blue-100 transition-all">
                <Download size={14} /> {importMode === 'guided' ? 'Baixar modelo de RPG guiado' : 'Baixar modelo de estação estática'}
              </button>
            )}
          </div>
        ) : (
          <div className="bg-[#003366] p-8 rounded-[2.5rem] border shadow-xl text-white animate-in zoom-in">
            <h3 className="text-xl font-black text-[#D4A017] mb-2 uppercase tracking-tighter">Pré-visualização</h3>
            <p className="text-xs mb-4 opacity-80 font-medium">
              <b>{oscePreview.length}</b> estações no formato <b>{importMode.toUpperCase()}</b>.
              {previewErrorCount > 0 && <> <b className="text-red-200">{previewErrorCount} com erro</b> — corrija o arquivo e leia de novo.</>}
            </p>
            <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1 mb-6 custom-scrollbar-white">
              {oscePreview.map((item, i) => <ImportPreviewItem key={i} item={item} />)}
            </div>
            <div className="space-y-3">
              <button onClick={confirmOsceImport} disabled={previewErrorCount > 0 || isSaving} className="w-full bg-[#D4A017] text-[#003366] py-4 rounded-xl font-black uppercase text-[10px] tracking-widest shadow-lg hover:scale-105 transition-transform disabled:opacity-40 disabled:hover:scale-100">
                {isSaving ? 'Salvando...' : 'Confirmar e Salvar 🚀'}
              </button>
              <button onClick={() => setOscePreview(null)} disabled={isSaving} className="w-full bg-white/10 text-white py-4 rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-white/20 transition-colors">
                Cancelar
              </button>
            </div>
          </div>
        )}
      </div>
      
      {/* GERENCIADOR DE ESTAÇÕES (LADO DIREITO) */}
      <div className="lg:col-span-8 bg-white p-8 rounded-[2.5rem] border shadow-sm">
        <div className="flex flex-col gap-6 mb-6 border-b pb-6">
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-black text-[#003366] uppercase tracking-tighter">Base de Dados</h3>
            {!oscePreview && (
              <button onClick={() => {
                if (confirm(`⚠️ Apagar as estações ${discFilterOsce ? 'da disciplina selecionada' : 'de TODAS as disciplinas'}?`)) {
                  onClearOsce(discFilterOsce || undefined);
                }
              }} className="bg-red-100 text-red-600 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-red-200 transition-all w-fit">
                Zerar Filtro 🗑️
              </button>
            )}
          </div>

          {/* FILTROS DE VISUALIZAÇÃO */}
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setTypeFilter('all')} className={`px-4 py-2 rounded-full text-[9px] font-black uppercase tracking-widest border transition-all ${typeFilter === 'all' ? 'bg-[#003366] text-white border-[#003366]' : 'bg-white text-gray-400 border-gray-100'}`}>Todos</button>
            <button onClick={() => setTypeFilter('clinical')} className={`px-4 py-2 rounded-full text-[9px] font-black uppercase tracking-widest border transition-all flex items-center gap-2 ${typeFilter === 'clinical' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-blue-400 border-blue-100'}`}><ClipboardList size={12}/> Estático</button>
            <button onClick={() => setTypeFilter('guided')} className={`px-4 py-2 rounded-full text-[9px] font-black uppercase tracking-widest border transition-all flex items-center gap-2 ${typeFilter === 'guided' ? 'bg-purple-600 text-white border-purple-600' : 'bg-white text-purple-400 border-purple-100'}`}><Route size={12}/> RPG Guiado</button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
            <select value={periodFilterOsce} onChange={e => { setPeriodFilterOsce(e.target.value); setDiscFilterOsce(''); setUnitFilterOsce(''); setThemeFilterOsce(''); }} className="p-3 bg-gray-50 rounded-xl text-[10px] font-black uppercase outline-none border-2 border-transparent focus:border-[#003366]">
              <option value="">Todos os Períodos</option>
              {periods.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            
            <select value={discFilterOsce} onChange={e => { setDiscFilterOsce(e.target.value); setUnitFilterOsce(''); setThemeFilterOsce(''); }} disabled={!periodFilterOsce} className="p-3 bg-gray-50 rounded-xl text-[10px] font-black uppercase outline-none border-2 border-transparent focus:border-[#003366] disabled:opacity-50">
              <option value="">Disciplinas...</option>
              {filteredViewDisciplines.map(d => <option key={d.id} value={d.id}>{d.title}</option>)}
            </select>

            {/* NOVO: SELETOR DE UNIDADE NO FILTRO */}
            <select value={unitFilterOsce} onChange={e => setUnitFilterOsce(e.target.value as AcademicUnit | '')} disabled={!discFilterOsce || disciplines.find(d => d.id === discFilterOsce)?.category === 'UC'} className="p-3 bg-blue-50 text-blue-900 rounded-xl text-[10px] font-black uppercase outline-none border-2 border-transparent focus:border-[#003366] disabled:bg-gray-50 disabled:text-gray-400 disabled:opacity-50">
              <option value="">Ambas Unidades</option>
              <option value="N1">Unidade N1</option>
              <option value="N2">Unidade N2</option>
            </select>

            <select value={themeFilterOsce} onChange={e => setThemeFilterOsce(e.target.value)} disabled={!discFilterOsce} className="p-3 bg-gray-50 rounded-xl text-[10px] font-black uppercase outline-none border-2 border-transparent focus:border-[#003366] disabled:opacity-50">
              <option value="">Temas...</option>
              {discFilterOsce && disciplines.find(d => d.id === discFilterOsce)?.themes?.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>

        {/* LISTA DE ESTAÇÕES */}
        <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
          {osceStations.filter(s => {
            if (periodFilterOsce) {
              const disc = disciplines.find(d => d.id === s.disciplineId);
              if (disc?.periodId !== periodFilterOsce) return false;
            }
            const matchType = typeFilter === 'all' || s.mode === typeFilter;
            const matchDisc = !discFilterOsce || s.disciplineId === discFilterOsce;
            const matchUnit = !unitFilterOsce || (s.unit || 'N1') === unitFilterOsce;
            const matchTheme = !themeFilterOsce || s.theme === themeFilterOsce;
            
            return matchDisc && matchUnit && matchTheme && matchType;
          }).map((station) => (
            <div key={station.firebaseId ?? station.id} className={`p-4 rounded-[1.5rem] border flex justify-between items-center transition-all hover:shadow-md ${
              station.mode === 'rpg' || station.mode === 'guided' ? 'bg-purple-50/40 border-purple-100' :
              station.mode === 'ai' ? 'bg-green-50/40 border-green-100' :
              'bg-gray-50 border-gray-100'
            }`}>
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                   station.mode === 'rpg' || station.mode === 'guided' ? 'bg-purple-100 text-purple-600' :
                   station.mode === 'ai' ? 'bg-green-100 text-green-600' :
                   'bg-blue-100 text-blue-600'
                }`}>
                  {station.mode === 'rpg' ? <Gamepad2 size={18}/> :
                   station.mode === 'guided' ? <Route size={18}/> :
                   station.mode === 'ai' ? <Bot size={18}/> :
                   <ClipboardList size={18}/>}
                </div>
                <div>
                  <h4 className="font-bold text-[#003366] text-sm leading-tight">{station.title}</h4>
                  <div className="flex gap-2 mt-1 items-center">
                    <p className="text-[8px] font-black uppercase text-gray-400">{station.disciplineId}</p>
                    {/* MOSTRA A UNIDADE NA LISTAGEM */}
                    <p className="text-[8px] font-black uppercase text-[#003366] bg-blue-50 px-1 rounded border border-blue-100">{station.unit || 'N1'}</p>
                    <p className="text-[8px] font-black uppercase text-[#D4A017] tracking-widest">• {station.theme}</p>
                  </div>
                </div>
              </div>
              <button onClick={() => confirm("Excluir?") && onRemoveOsceStation(station.id)} className="text-gray-300 hover:text-red-500 transition-colors">
                <Trash2 size={18}/>
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AdminOsce;