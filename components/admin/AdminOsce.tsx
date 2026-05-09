import React, { useState, useMemo } from 'react';
import { OsceStation, SimulationInfo, Period, StaticOsceStation, DynamicOsceStation } from '../../types'; // <-- IMPORT ATUALIZADO
import { Trash2, ClipboardList, Gamepad2, Bot, UploadCloud } from 'lucide-react';

interface AdminOsceProps {
  periods?: Period[]; // <-- ALTERADO PARA periods
  disciplines: SimulationInfo[];
  osceStations: OsceStation[];
  onAddOsceStations: (os: OsceStation[]) => void;
  onRemoveOsceStation: (id: string) => void;
  onClearOsce: (disciplineId?: string) => void;
}

const AdminOsce: React.FC<AdminOsceProps> = ({
  periods = [],
  disciplines = [],
  osceStations = [],
  onAddOsceStations,
  onRemoveOsceStation,
  onClearOsce
}) => {
  // --- FILTROS DE VISUALIZAÇÃO (LADO DIREITO) ---
  const [periodFilterOsce, setPeriodFilterOsce] = useState(''); // <-- ALTERADO DE roomFilterOsce
  const [discFilterOsce, setDiscFilterOsce] = useState(''); 
  const [themeFilterOsce, setThemeFilterOsce] = useState(''); 
  const [typeFilter, setTypeFilter] = useState<'all' | 'clinical' | 'rpg' | 'ai'>('all');

  // --- ESTADOS DE IMPORTAÇÃO (LADO ESQUERDO) ---
  const [importMode, setImportMode] = useState<'clinical' | 'rpg' | 'ai'>('clinical'); 
  const [oscePeriod, setOscePeriod] = useState(''); // <-- ALTERADO DE osceRoom
  const [osceDiscipline, setOsceDiscipline] = useState('');
  const [osceTheme, setOsceTheme] = useState('');
  const [osceFile, setOsceFile] = useState<File | null>(null);
  const [oscePreview, setOscePreview] = useState<OsceStation[] | null>(null);

  const filteredImportDisciplines = useMemo(() => {
    if (!oscePeriod) return [];
    return disciplines.filter(d => d.periodId === oscePeriod); // <-- ALTERADO PARA periodId
  }, [disciplines, oscePeriod]);

  const filteredViewDisciplines = useMemo(() => {
    if (!periodFilterOsce) return disciplines;
    return disciplines.filter(d => d.periodId === periodFilterOsce); // <-- ALTERADO PARA periodId
  }, [disciplines, periodFilterOsce]);

  const handleOsceReadPreview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!osceFile || !osceDiscipline || !osceTheme) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsedData = JSON.parse(text);

        if (!Array.isArray(parsedData)) {
          alert('Erro: O JSON deve ser um Array [ ].');
          return;
        }
        
        const newStations: OsceStation[] = parsedData.map((item: any, idx: number) => {
          // BASE COMUM A TODOS
          const base = {
            id: `osce_${Date.now()}_${idx}`,
            disciplineId: osceDiscipline,
            theme: osceTheme,
            title: item.title || item.tema || 'Estação sem título',
            scenario: item.scenario || item.cenario_inicial || '',
            task: item.task || '',
            tip: item.tip || '',
          };

          // APLICAÇÃO RÍGIDA DO MODO SELECIONADO PELO ADMIN
          
          // MODO 1: PACIENTE VIRTUAL (IA)
          if (importMode === 'ai') {
            const s = item as any;
            return { 
              ...base, 
              mode: 'ai',
              initialPhaseId: s.initialPhaseId || s.no_inicial || 'fase_1',
              phases: s.phases || {},
              checklist: Array.isArray(s.checklist) ? s.checklist : [],
              initialVitals: s.initialVitals,
              inventory: s.inventory,
              setting: s.setting || 'Consultório para anamnese.'
            } as DynamicOsceStation; 
          } 
          
          // MODO 2: RPG DINÂMICO (LUNA ENGINE)
          if (importMode === 'rpg') {
            const s = item as any;
            return {
              ...base,
              mode: 'rpg',
              initialPhaseId: s.initialPhaseId || s.no_inicial || 'fase_1',
              phases: s.phases || {},
              initialVitals: s.initialVitals,
              inventory: s.inventory,
              setting: s.setting || 'Cenário de emergência.'
            } as DynamicOsceStation;
          } 

          // MODO 3: CLINICAL (ESTÁTICO / NUVEM DE AÇÕES)
          return {
            ...base,
            mode: 'clinical',
            setting: item.setting || 'Consultório médico padrão.',
            checklist: Array.isArray(item.checklist) ? item.checklist : [],
            actionCloud: Array.isArray(item.actionCloud) ? item.actionCloud : [],
            correctOrderIndices: Array.isArray(item.correctOrderIndices) ? item.correctOrderIndices : []
          } as StaticOsceStation;
        });
        
        setOscePreview(newStations);
      } catch (err: any) { 
        alert('Erro ao ler JSON: ' + err.message); 
      }
    };
    reader.readAsText(osceFile);
  };

  const confirmOsceImport = () => {
    if (!oscePreview) return;
    const firebaseSafePayload = JSON.parse(JSON.stringify(oscePreview));
    onAddOsceStations(firebaseSafePayload);
    alert(`✅ Sucesso! ${firebaseSafePayload.length} estações enviadas.`);
    setOscePreview(null);
    setOsceFile(null);
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
            <div className="bg-gray-50 p-2 rounded-2xl mb-6 grid grid-cols-3 gap-1 border border-gray-100">
                <button 
                    onClick={() => setImportMode('clinical')}
                    className={`flex flex-col items-center py-3 rounded-xl transition-all ${importMode === 'clinical' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
                >
                    <ClipboardList size={20} />
                    <span className="text-[7px] font-black uppercase mt-1">Estático</span>
                </button>
                <button 
                    onClick={() => setImportMode('rpg')}
                    className={`flex flex-col items-center py-3 rounded-xl transition-all ${importMode === 'rpg' ? 'bg-white shadow-sm text-purple-600' : 'text-gray-400 hover:text-gray-600'}`}
                >
                    <Gamepad2 size={20} />
                    <span className="text-[7px] font-black uppercase mt-1">RPG</span>
                </button>
                <button 
                    onClick={() => setImportMode('ai')}
                    className={`flex flex-col items-center py-3 rounded-xl transition-all ${importMode === 'ai' ? 'bg-white shadow-sm text-green-600' : 'text-gray-400 hover:text-gray-600'}`}
                >
                    <Bot size={20} />
                    <span className="text-[7px] font-black uppercase mt-1">Virtual</span>
                </button>
            </div>

            <form onSubmit={handleOsceReadPreview} className="space-y-4">
              <select value={oscePeriod} onChange={e => { setOscePeriod(e.target.value); setOsceDiscipline(''); setOsceTheme(''); }} className="w-full p-4 bg-gray-50 rounded-xl font-bold text-sm outline-none border-2 border-transparent focus:border-[#003366]" required>
                <option value="">Período...</option>
                {periods.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <select value={osceDiscipline} onChange={e => { setDiscFilterOsce(e.target.value); setOsceDiscipline(e.target.value); setOsceTheme(''); }} disabled={!oscePeriod} className="w-full p-4 bg-gray-50 rounded-xl font-bold text-sm outline-none border-2 border-transparent focus:border-[#003366] disabled:opacity-50" required>
                <option value="">Disciplina...</option>
                {filteredImportDisciplines.map(d => <option key={d.id} value={d.id}>{d.title}</option>)}
              </select>
              <select value={osceTheme} onChange={e => setOsceTheme(e.target.value)} disabled={!osceDiscipline} className="w-full p-4 bg-gray-50 rounded-xl font-bold text-sm outline-none border-2 border-transparent focus:border-[#003366] disabled:opacity-50" required>
                <option value="">Eixo Temático...</option>
                {disciplines.find(d => d.id === osceDiscipline)?.themes?.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              <input type="file" accept=".json" onChange={e => setOsceFile(e.target.files ? e.target.files[0] : null)} className="w-full text-[10px] text-gray-400 font-black uppercase p-4 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200" required />
              <button type="submit" disabled={!osceFile} className="w-full bg-[#003366] text-white py-4 rounded-xl font-black uppercase text-[10px] tracking-widest shadow-lg hover:bg-[#D4A017] transition-all disabled:opacity-50">
                Visualizar como {importMode.toUpperCase()} 👁️
              </button>
            </form>
          </div>
        ) : (
          <div className="bg-[#003366] p-8 rounded-[2.5rem] border shadow-xl text-white animate-in zoom-in">
            <h3 className="text-xl font-black text-[#D4A017] mb-2 uppercase tracking-tighter">Pré-visualização</h3>
            <p className="text-xs mb-6 opacity-80 font-medium">Detectamos <b>{oscePreview.length}</b> estações no formato <b>{importMode.toUpperCase()}</b>.</p>
            <div className="space-y-3">
              <button onClick={confirmOsceImport} className="w-full bg-[#D4A017] text-[#003366] py-4 rounded-xl font-black uppercase text-[10px] tracking-widest shadow-lg hover:scale-105 transition-transform">
                Confirmar e Salvar 🚀
              </button>
              <button onClick={() => setOscePreview(null)} className="w-full bg-white/10 text-white py-4 rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-white/20 transition-colors">
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
                const pass = prompt(`Apagar Filtro? Senha (fmst8):`);
                if (pass === 'fmst8') onClearOsce(discFilterOsce || undefined);
              }} className="bg-red-100 text-red-600 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-red-200 transition-all w-fit">
                Zerar Filtro 🗑️
              </button>
            )}
          </div>

          {/* FILTROS DE VISUALIZAÇÃO */}
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setTypeFilter('all')} className={`px-4 py-2 rounded-full text-[9px] font-black uppercase tracking-widest border transition-all ${typeFilter === 'all' ? 'bg-[#003366] text-white border-[#003366]' : 'bg-white text-gray-400 border-gray-100'}`}>Todos</button>
            <button onClick={() => setTypeFilter('clinical')} className={`px-4 py-2 rounded-full text-[9px] font-black uppercase tracking-widest border transition-all flex items-center gap-2 ${typeFilter === 'clinical' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-blue-400 border-blue-100'}`}><ClipboardList size={12}/> Estático</button>
            <button onClick={() => setTypeFilter('rpg')} className={`px-4 py-2 rounded-full text-[9px] font-black uppercase tracking-widest border transition-all flex items-center gap-2 ${typeFilter === 'rpg' ? 'bg-purple-600 text-white border-purple-600' : 'bg-white text-purple-400 border-purple-100'}`}><Gamepad2 size={12}/> RPG</button>
            <button onClick={() => setTypeFilter('ai')} className={`px-4 py-2 rounded-full text-[9px] font-black uppercase tracking-widest border transition-all flex items-center gap-2 ${typeFilter === 'ai' ? 'bg-green-600 text-white border-green-600' : 'bg-white text-green-400 border-green-100'}`}><Bot size={12}/> Virtual</button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <select value={periodFilterOsce} onChange={e => { setPeriodFilterOsce(e.target.value); setDiscFilterOsce(''); setThemeFilterOsce(''); }} className="p-3 bg-gray-50 rounded-xl text-[10px] font-black uppercase outline-none border-2 border-transparent focus:border-[#003366]">
              <option value="">Todos os Períodos</option>
              {periods.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <select value={discFilterOsce} onChange={e => { setDiscFilterOsce(e.target.value); setThemeFilterOsce(''); }} disabled={!periodFilterOsce} className="p-3 bg-gray-50 rounded-xl text-[10px] font-black uppercase outline-none border-2 border-transparent focus:border-[#003366] disabled:opacity-50">
              <option value="">Disciplinas...</option>
              {filteredViewDisciplines.map(d => <option key={d.id} value={d.id}>{d.title}</option>)}
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
            return (!discFilterOsce || s.disciplineId === discFilterOsce) && (!themeFilterOsce || s.theme === themeFilterOsce) && matchType;
          }).map((station, idx) => (
            <div key={idx} className={`p-4 rounded-[1.5rem] border flex justify-between items-center transition-all hover:shadow-md ${
              station.mode === 'rpg' ? 'bg-purple-50/40 border-purple-100' : 
              station.mode === 'ai' ? 'bg-green-50/40 border-green-100' : 
              'bg-gray-50 border-gray-100'
            }`}>
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                   station.mode === 'rpg' ? 'bg-purple-100 text-purple-600' : 
                   station.mode === 'ai' ? 'bg-green-100 text-green-600' : 
                   'bg-blue-100 text-blue-600'
                }`}>
                  {station.mode === 'rpg' ? <Gamepad2 size={18}/> : 
                   station.mode === 'ai' ? <Bot size={18}/> : 
                   <ClipboardList size={18}/>}
                </div>
                <div>
                  <h4 className="font-bold text-[#003366] text-sm leading-tight">{station.title}</h4>
                  <div className="flex gap-2 mt-1">
                    <p className="text-[8px] font-black uppercase text-gray-400">{station.disciplineId}</p>
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