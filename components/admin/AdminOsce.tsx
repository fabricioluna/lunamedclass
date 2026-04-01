import React, { useState, useMemo } from 'react';
import { OsceStation, SimulationInfo, Room, StaticOsceStation, DynamicOsceStation } from '../../types';
import { Trash2 } from 'lucide-react';

interface AdminOsceProps {
  rooms?: Room[]; 
  disciplines: SimulationInfo[];
  osceStations: OsceStation[];
  onAddOsceStations: (os: OsceStation[]) => void;
  onRemoveOsceStation: (id: string) => void;
  onClearOsce: (disciplineId?: string) => void;
}

const AdminOsce: React.FC<AdminOsceProps> = ({
  rooms = [],
  disciplines = [],
  osceStations = [],
  onAddOsceStations,
  onRemoveOsceStation,
  onClearOsce
}) => {
  const [roomFilterOsce, setRoomFilterOsce] = useState('');
  const [discFilterOsce, setDiscFilterOsce] = useState(''); 
  const [themeFilterOsce, setThemeFilterOsce] = useState(''); 

  const [osceRoom, setOsceRoom] = useState('');
  const [osceDiscipline, setOsceDiscipline] = useState('');
  const [osceTheme, setOsceTheme] = useState('');
  const [osceFile, setOsceFile] = useState<File | null>(null);
  const [oscePreview, setOscePreview] = useState<OsceStation[] | null>(null);

  const filteredImportDisciplines = useMemo(() => {
    if (!osceRoom) return [];
    return disciplines.filter(d => d.roomId === osceRoom);
  }, [disciplines, osceRoom]);

  const filteredViewDisciplines = useMemo(() => {
    if (!roomFilterOsce) return disciplines;
    return disciplines.filter(d => d.roomId === roomFilterOsce);
  }, [disciplines, roomFilterOsce]);

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
          const isRPG = item.mode === 'rpg' || !!item.arvore_decisao;
          
          const base = {
            id: `osce_${Date.now()}_${idx}`,
            disciplineId: osceDiscipline,
            theme: osceTheme,
            title: item.title || item.tema || 'Estação sem título',
            scenario: item.scenario || item.cenario_inicial || '',
            task: item.task || '',
            tip: item.tip || '',
          };

          if (isRPG) {
            // CORREÇÃO: Usando casting para calar o TypeScript durante a importação
            const s = item as any;
            return {
              ...base,
              mode: 'rpg',
              foco_avaliacao: s.foco_avaliacao || '',
              no_inicial: s.no_inicial || 'start_01',
              arvore_decisao: s.arvore_decisao || [],
              initialPhaseId: s.initialPhaseId,
              phases: s.phases,
              initialVitals: s.initialVitals,
              inventory: s.inventory
            } as DynamicOsceStation;
          } else {
            return {
              ...base,
              mode: 'clinical',
              setting: item.setting || 'Consultório médico padrão.',
              checklist: Array.isArray(item.checklist) ? item.checklist : [],
              actionCloud: Array.isArray(item.actionCloud) ? item.actionCloud : [],
              correctOrderIndices: Array.isArray(item.correctOrderIndices) ? item.correctOrderIndices : []
            } as StaticOsceStation;
          }
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
      <div className="lg:col-span-4 space-y-6">
        {!oscePreview ? (
          <div className="bg-white p-8 rounded-[2.5rem] border shadow-sm">
            <h3 className="text-xl font-black text-[#003366] mb-6 uppercase tracking-tighter">Importar OSCE</h3>
            <form onSubmit={handleOsceReadPreview} className="space-y-4">
              <select value={osceRoom} onChange={e => { setOsceRoom(e.target.value); setOsceDiscipline(''); setOsceTheme(''); }} className="w-full p-4 bg-gray-50 rounded-xl font-bold text-sm outline-none border-2 border-transparent focus:border-[#003366]" required>
                <option value="">Sala/Turma...</option>
                {rooms.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
              <select value={osceDiscipline} onChange={e => { setOsceDiscipline(e.target.value); setOsceTheme(''); }} disabled={!osceRoom} className="w-full p-4 bg-gray-50 rounded-xl font-bold text-sm outline-none border-2 border-transparent focus:border-[#003366] disabled:opacity-50" required>
                <option value="">Disciplina...</option>
                {filteredImportDisciplines.map(d => <option key={d.id} value={d.id}>{d.title}</option>)}
              </select>
              <select value={osceTheme} onChange={e => setOsceTheme(e.target.value)} disabled={!osceDiscipline} className="w-full p-4 bg-gray-50 rounded-xl font-bold text-sm outline-none border-2 border-transparent focus:border-[#003366] disabled:opacity-50" required>
                <option value="">Eixo Temático...</option>
                {disciplines.find(d => d.id === osceDiscipline)?.themes?.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              <input type="file" accept=".json" onChange={e => setOsceFile(e.target.files ? e.target.files[0] : null)} className="w-full text-[10px] text-gray-400 font-black uppercase p-4 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200" required />
              <button type="submit" disabled={!osceFile} className="w-full bg-[#003366] text-white py-4 rounded-xl font-black uppercase text-[10px] tracking-widest shadow-lg hover:bg-[#D4A017] transition-all disabled:opacity-50">
                Visualizar Arquivo 👁️
              </button>
            </form>
          </div>
        ) : (
          <div className="bg-[#003366] p-8 rounded-[2.5rem] border shadow-xl text-white animate-in zoom-in">
            <h3 className="text-xl font-black text-[#D4A017] mb-2 uppercase tracking-tighter">Pré-visualização</h3>
            <p className="text-xs mb-6 opacity-80 font-medium">Lemos <b>{oscePreview.length}</b> estações.</p>
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
      
      <div className="lg:col-span-8 bg-white p-8 rounded-[2.5rem] border shadow-sm">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4 border-b pb-4">
          <div className="flex flex-col gap-2">
            <h3 className="text-xl font-black text-[#003366] uppercase tracking-tighter">
              {oscePreview ? "Raio-X do Arquivo" : "Estações Cadastradas"}
            </h3>
            {!oscePreview && (
              <button onClick={() => {
                const pass = prompt(`Apagar Filtro? Senha (fmst8):`);
                if (pass === 'fmst8') onClearOsce(discFilterOsce || undefined);
              }} className="bg-red-100 text-red-600 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-red-200 transition-all w-fit">
                Apagar {discFilterOsce ? 'Disciplina' : 'Tudo'} 🗑️
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <select value={roomFilterOsce} onChange={e => { setRoomFilterOsce(e.target.value); setDiscFilterOsce(''); setThemeFilterOsce(''); }} className="p-3 bg-gray-50 rounded-xl text-[10px] font-black uppercase outline-none border-2 border-transparent focus:border-[#003366]">
              <option value="">Todas as Salas</option>
              {rooms.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
            <select value={discFilterOsce} onChange={e => { setDiscFilterOsce(e.target.value); setThemeFilterOsce(''); }} disabled={!roomFilterOsce} className="p-3 bg-gray-50 rounded-xl text-[10px] font-black uppercase outline-none border-2 border-transparent focus:border-[#003366] disabled:opacity-50">
              <option value="">Disciplinas...</option>
              {filteredViewDisciplines.map(d => <option key={d.id} value={d.id}>{d.title}</option>)}
            </select>
            <select value={themeFilterOsce} onChange={e => setThemeFilterOsce(e.target.value)} disabled={!discFilterOsce} className="p-3 bg-gray-50 rounded-xl text-[10px] font-black uppercase outline-none border-2 border-transparent focus:border-[#003366] disabled:opacity-50">
              <option value="">Temas...</option>
              {discFilterOsce && disciplines.find(d => d.id === discFilterOsce)?.themes?.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>

        <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
          {(oscePreview || osceStations.filter(s => {
            if (roomFilterOsce) {
              const disc = disciplines.find(d => d.id === s.disciplineId);
              if (disc?.roomId !== roomFilterOsce) return false;
            }
            return (!discFilterOsce || s.disciplineId === discFilterOsce) && (!themeFilterOsce || s.theme === themeFilterOsce);
          })).map((station, idx) => (
            <div key={idx} className={`p-5 rounded-[1.5rem] border flex justify-between items-center transition-all ${station.mode === 'rpg' ? 'bg-purple-50/40 border-purple-100' : 'bg-gray-50 border-gray-100'}`}>
              <div>
                <h4 className="font-bold text-[#003366] text-sm">{station.title}</h4>
                <div className="flex gap-2 mt-1">
                  <p className="text-[9px] font-black uppercase text-gray-400">{station.disciplineId}</p>
                  <p className="text-[9px] font-black uppercase text-[#D4A017] tracking-widest">• {station.theme}</p>
                  {station.mode === 'rpg' && <p className="text-[9px] font-black uppercase text-purple-600 bg-purple-50 px-2 rounded">• LUNA ENGINE</p>}
                </div>
              </div>
              {!oscePreview && (
                <button onClick={() => confirm("Excluir?") && onRemoveOsceStation(station.id)} className="text-red-300 hover:text-red-500 transition-colors">
                  <Trash2 size={18}/>
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AdminOsce;