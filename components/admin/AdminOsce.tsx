import React, { useState, useMemo } from 'react';
import { OsceStation, SimulationInfo, Room } from '../../types';
import { Trash2 } from 'lucide-react';

interface AdminOsceProps {
  rooms?: Room[]; // Opcional para evitar crash
  disciplines: SimulationInfo[];
  osceStations: OsceStation[];
  onAddOsceStations: (os: OsceStation[]) => void;
  onRemoveOsceStation: (id: string) => void;
  onClearOsce: (disciplineId?: string) => void;
}

const AdminOsce: React.FC<AdminOsceProps> = ({
  rooms = [], // Fallback garantido de array vazio
  disciplines = [],
  osceStations = [],
  onAddOsceStations,
  onRemoveOsceStation,
  onClearOsce
}) => {
  // ESTADOS DE FILTRO DE VISUALIZAÇÃO
  const [roomFilterOsce, setRoomFilterOsce] = useState('');
  const [discFilterOsce, setDiscFilterOsce] = useState(''); 
  const [themeFilterOsce, setThemeFilterOsce] = useState(''); 

  // ESTADOS DE IMPORTAÇÃO
  const [osceRoom, setOsceRoom] = useState('');
  const [osceDiscipline, setOsceDiscipline] = useState('');
  const [osceTheme, setOsceTheme] = useState('');
  const [osceFile, setOsceFile] = useState<File | null>(null);
  const [oscePreview, setOscePreview] = useState<OsceStation[] | null>(null);

  // Memorizadores de Filtro
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
          alert('Erro de Estrutura: O arquivo JSON deve ser uma lista (Array) começando com [ e terminando com ].');
          return;
        }
        
        const newStations: OsceStation[] = parsedData.map((item: any, idx: number) => ({
          ...item,
          id: `osce_${Date.now()}_${idx}`,
          disciplineId: osceDiscipline,
          theme: osceTheme,
          title: item.title || 'Estação sem título',
          scenario: item.scenario || '',
          setting: item.setting || 'Consultório médico padrão. Disponível: maca, pia, estetoscópio, esfigmomanômetro, termômetro, oftalmoscópio, otoscópio, martelo de reflexos, lanterna e espátulas.',
          task: item.task || '',
          tip: item.tip || '',
          checklist: Array.isArray(item.checklist) ? item.checklist : [],
          actionCloud: Array.isArray(item.actionCloud) ? item.actionCloud : [],
          correctOrderIndices: Array.isArray(item.correctOrderIndices) ? item.correctOrderIndices : []
        }));
        
        setOscePreview(newStations);
      } catch (err: any) { 
        alert('Erro fatal ao ler JSON. O arquivo possui erro de formatação.\nDetalhes: ' + err.message); 
      }
    };
    reader.readAsText(osceFile);
  };

  const confirmOsceImport = () => {
    try {
      if (!oscePreview) return;

      const sanitizedStations = oscePreview.map(station => ({
        id: station.id,
        disciplineId: station.disciplineId,
        theme: station.theme,
        title: station.title || 'Estação sem Título',
        scenario: station.scenario || 'Sem cenário.',
        setting: station.setting || 'Consultório médico padrão. Disponível: maca, pia, estetoscópio, esfigmomanômetro, termômetro, oftalmoscópio, otoscópio, martelo de reflexos, lanterna e espátulas.',
        task: station.task || 'Sem comando.',
        tip: station.tip || '',
        checklist: station.checklist.filter(Boolean),
        actionCloud: station.actionCloud.filter(Boolean),
        correctOrderIndices: station.correctOrderIndices.filter((n: any) => n !== null && n !== undefined),
        mode: station.mode,
        type: station.type,
        inventory: station.inventory,
        initialVitals: station.initialVitals,
        initialPhaseId: station.initialPhaseId,
        phases: station.phases
      }));

      const firebaseSafePayload = JSON.parse(JSON.stringify(sanitizedStations));

      onAddOsceStations(firebaseSafePayload);
      
      alert(`✅ Sucesso absoluto! ${firebaseSafePayload.length} estações OSCE foram enviadas para o banco em nuvem!`);
      setOscePreview(null);
      setOsceFile(null);

    } catch (error: any) {
      alert("⚠️ Erro bloqueado: O Firebase recusou o salvamento. Detalhes: " + error.message);
      console.error("Firebase Guard Error:", error);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in slide-in-from-right-10 duration-500">
       <div className="lg:col-span-4 space-y-6 h-fit">
          {!oscePreview ? (
            <div className="bg-white p-8 rounded-[2.5rem] border shadow-sm">
              <h3 className="text-xl font-black text-[#003366] mb-6 uppercase tracking-tighter">Importar OSCE (JSON)</h3>
              <form onSubmit={handleOsceReadPreview} className="space-y-4">
                
                <select value={osceRoom} onChange={e => { setOsceRoom(e.target.value); setOsceDiscipline(''); setOsceTheme(''); }} className="w-full p-4 bg-gray-50 rounded-xl font-bold text-sm outline-none border-2 border-transparent focus:border-[#003366]" required>
                  <option value="">Sala/Turma...</option>
                  {(rooms || []).map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
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
            <div className="bg-[#003366] p-8 rounded-[2.5rem] border shadow-xl text-white animate-in zoom-in duration-300">
              <h3 className="text-xl font-black text-[#D4A017] mb-2 uppercase tracking-tighter">Pré-visualização</h3>
              <p className="text-xs mb-6 opacity-80 font-medium">Lemos <b>{oscePreview.length}</b> estações no arquivo. Confira a lista ao lado antes de enviar para o sistema.</p>
              <div className="space-y-3">
                <button onClick={confirmOsceImport} className="w-full bg-[#D4A017] text-[#003366] py-4 rounded-xl font-black uppercase text-[10px] tracking-widest shadow-lg hover:scale-105 transition-transform">
                  Confirmar e Salvar 🚀
                </button>
                <button onClick={() => setOscePreview(null)} className="w-full bg-white/10 text-white py-4 rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-white/20 transition-colors">
                  Cancelar e Voltar
                </button>
              </div>
            </div>
          )}
       </div>
       
       <div className="lg:col-span-8 bg-white p-8 rounded-[2.5rem] border shadow-sm">
          {oscePreview ? (
            <>
              <h3 className="text-xl font-black text-[#003366] mb-6 uppercase tracking-tighter border-b pb-4">Raio-X do Arquivo Lido</h3>
              <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
                 {oscePreview.map((station, idx) => (
                   <div key={idx} className="p-5 bg-blue-50/40 rounded-[1.5rem] border border-blue-100">
                      <h4 className="font-bold text-[#003366] text-sm mb-2">{station.title}</h4>
                      <p className="text-xs text-gray-600 mb-2 italic leading-relaxed">"{station.scenario}"</p>
                      <div className="text-[10px] text-blue-600 bg-white p-2 rounded border border-blue-200 mb-2 font-medium">📍 {station.setting}</div>
                      {station.tip && <p className="text-xs text-yellow-700 mb-4 bg-yellow-50 p-2 rounded">💡 {station.tip}</p>}
                      <div className="flex gap-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                        <span className="bg-white px-3 py-1 rounded-md shadow-sm border">☁️ Nuvem: {station.actionCloud.length} itens</span>
                        <span className="bg-white px-3 py-1 rounded-md shadow-sm border">✅ Checklist: {station.correctOrderIndices.length} acertos</span>
                        {station.type === 'rpg' && <span className="bg-red-100 text-red-700 px-3 py-1 rounded-md shadow-sm border border-red-200">🚀 LUNA ENGINE</span>}
                      </div>
                   </div>
                 ))}
              </div>
            </>
          ) : (
            <>
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4 border-b pb-4">
                 <div className="flex flex-col gap-2">
                   <h3 className="text-xl font-black text-[#003366] uppercase tracking-tighter">Estações Cadastradas</h3>
                   <button
                     onClick={() => {
                       const pass = prompt(`⚠️ AÇÃO DESTRUTIVA: Apagar OSCEs ${discFilterOsce ? 'da disciplina selecionada' : 'de TODAS as disciplinas'}?\nDigite a senha (fmst8) para confirmar:`);
                       if (pass === 'fmst8') {
                         onClearOsce(discFilterOsce || undefined);
                         alert("✅ Estações apagadas com sucesso.");
                       } else if (pass !== null) alert("❌ Senha incorreta.");
                     }}
                     className="bg-red-100 text-red-600 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-red-200 transition-all w-fit"
                   >
                     Apagar {discFilterOsce ? 'da Disciplina' : 'Tudo'} 🗑️
                   </button>
                 </div>
                 <div className="flex flex-wrap gap-2">
                     <select 
                       value={roomFilterOsce} 
                       onChange={e => { setRoomFilterOsce(e.target.value); setDiscFilterOsce(''); setThemeFilterOsce(''); }} 
                       className="p-3 bg-gray-50 rounded-xl text-[10px] font-black uppercase outline-none border-2 border-transparent focus:border-[#003366]"
                     >
                       <option value="">Todas as Salas</option>
                       {(rooms || []).map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                     </select>

                     <select 
                       value={discFilterOsce} 
                       onChange={e => { setDiscFilterOsce(e.target.value); setThemeFilterOsce(''); }} 
                       disabled={!roomFilterOsce}
                       className="p-3 bg-gray-50 rounded-xl text-[10px] font-black uppercase outline-none border-2 border-transparent focus:border-[#003366] disabled:opacity-50"
                     >
                       <option value="">Disciplinas...</option>
                       {filteredViewDisciplines.map(d => <option key={d.id} value={d.id}>{d.title}</option>)}
                     </select>
                     
                     <select 
                       value={themeFilterOsce} 
                       onChange={e => setThemeFilterOsce(e.target.value)} 
                       disabled={!discFilterOsce} 
                       className="p-3 bg-gray-50 rounded-xl text-[10px] font-black uppercase outline-none border-2 border-transparent focus:border-[#003366] disabled:opacity-50 disabled:cursor-not-allowed"
                     >
                       <option value="">Temas...</option>
                       {discFilterOsce && disciplines.find(d => d.id === discFilterOsce)?.themes?.map(t => (
                         <option key={t} value={t}>{t}</option>
                       ))}
                     </select>
                 </div>
              </div>

              <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
                 {osceStations
                   .filter(s => {
                     if (roomFilterOsce) {
                       const discDaEstacao = disciplines.find(d => d.id === s.disciplineId);
                       if (discDaEstacao?.roomId !== roomFilterOsce) return false;
                     }
                     return true;
                   })
                   .filter(s => (!discFilterOsce || s.disciplineId === discFilterOsce) && (!themeFilterOsce || s.theme === themeFilterOsce))
                   .map(station => (
                   <div key={station.id} className="p-5 bg-gray-50 rounded-[1.5rem] border flex justify-between items-center hover:border-red-100 group transition-all">
                      <div>
                        <h4 className="font-bold text-[#003366] text-sm">{station.title}</h4>
                        <div className="flex gap-2 mt-1">
                          <p className="text-[9px] font-black uppercase text-gray-400 tracking-widest">{station.disciplineId}</p>
                          <p className="text-[9px] font-black uppercase text-[#D4A017] tracking-widest">• {station.theme}</p>
                          {station.type === 'rpg' && <p className="text-[9px] font-black uppercase text-red-500 tracking-widest bg-red-50 px-2 rounded">• LUNA ENGINE</p>}
                        </div>
                      </div>
                      <button onClick={() => confirm("Excluir esta estação?") && onRemoveOsceStation(station.id)} className="text-red-300 hover:text-red-500">
                        <Trash2 size={18}/>
                      </button>
                   </div>
                 ))}
                 {osceStations.filter(s => (!discFilterOsce || s.disciplineId === discFilterOsce) && (!themeFilterOsce || s.theme === themeFilterOsce)).length === 0 && (
                   <p className="text-center py-10 text-gray-300 italic font-bold">Nenhuma estação encontrada para este filtro.</p>
                 )}
              </div>
            </>
          )}
       </div>
    </div>
  );
};

export default AdminOsce;