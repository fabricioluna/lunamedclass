import React, { useState, useMemo } from 'react';
import { SimulationInfo } from '../../types';
import { 
  Download, TrendingUp, Award, Target, AlertTriangle, 
  Activity, Brain, Clock, BarChart4, ChevronUp, ChevronDown, Printer 
} from 'lucide-react';

interface AdminAnalyticsProps {
  analyticsData: any[];
  disciplines: SimulationInfo[];
  rooms: any[];
}

const AdminAnalytics: React.FC<AdminAnalyticsProps> = ({ analyticsData, disciplines, rooms }) => {
  const [filterRoom, setFilterRoom] = useState('');
  const [filterDisc, setFilterDisc] = useState('');

  const handleRoomChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFilterRoom(e.target.value);
    setFilterDisc('');
  };

  const availableDisciplines = filterRoom 
    ? disciplines.filter(d => d.roomId === filterRoom) 
    : disciplines;

  const stats = useMemo(() => {
    let filtered = analyticsData || [];
    
    if (filterRoom) {
      const roomDiscIds = disciplines
        .filter(d => d.roomId === filterRoom)
        .map(d => d.id.toLowerCase());
        
      filtered = filtered.filter(d => {
         const dId = (d.disciplineId || '').toLowerCase();
         return roomDiscIds.includes(dId);
      });
    }

    if (filterDisc) {
      filtered = filtered.filter(d => (d.disciplineId || '').toLowerCase() === filterDisc.toLowerCase());
    }

    if (filtered.length === 0) return null;

    const total = filtered.length;
    const avgGrade = filtered.reduce((acc, curr) => acc + (curr.grade || 0), 0) / total;
    const avgTime = filtered.reduce((acc, curr) => acc + (curr.timeSpent || 0), 0) / total;
    const successCount = filtered.filter(d => (d.grade || 0) >= 7).length;
    const successRate = (successCount / total) * 100;
    const fatalErrorRate = (filtered.filter(d => d.isFatalError).length / total) * 100;

    const calcMetrics = (arr: any[]) => {
      const count = arr.length;
      if (count === 0) return { count: 0, avg: 0, time: 0, success: 0, fatal: 0 };
      const avg = arr.reduce((a, c) => a + (c.grade || 0), 0) / count;
      const time = arr.reduce((a, c) => a + (c.timeSpent || 0), 0) / count;
      const success = (arr.filter(d => (d.grade || 0) >= 7).length / count) * 100;
      const fatal = (arr.filter(d => d.isFatalError).length / count) * 100;
      return { count, avg, time, success, fatal };
    };

    const modes = {
      static: calcMetrics(filtered.filter(d => d.mode === 'clinical' || d.mode === 'static-cloud')),
      rpg: calcMetrics(filtered.filter(d => d.mode === 'rpg')),
      ai: calcMetrics(filtered.filter(d => d.mode === 'ai'))
    };

    const themeStats: Record<string, { total: number, sumGrade: number, successCount: number }> = {};
    filtered.forEach(d => {
      const theme = d.theme || 'Sem Tema';
      if (!themeStats[theme]) themeStats[theme] = { total: 0, sumGrade: 0, successCount: 0 };
      themeStats[theme].total++;
      themeStats[theme].sumGrade += (d.grade || 0);
      if ((d.grade || 0) >= 7) themeStats[theme].successCount++;
    });

    const themeDetails = Object.keys(themeStats).map(name => ({
      name,
      count: themeStats[name].total,
      avg: themeStats[name].sumGrade / themeStats[name].total,
      successRate: (themeStats[name].successCount / themeStats[name].total) * 100
    })).sort((a, b) => b.avg - a.avg);

    let bestTheme = themeDetails.length > 0 ? themeDetails[0] : { name: '-', avg: 0, count: 0, successRate: 0 };
    let worstTheme = themeDetails.length > 0 ? themeDetails[themeDetails.length - 1] : { name: '-', avg: 0, count: 0, successRate: 0 };

    return { 
      total, 
      avgGrade, 
      avgTime, 
      successRate,
      modes,
      fatalErrorRate,
      themeDetails,
      bestTheme,
      worstTheme
    };
  }, [analyticsData, filterRoom, filterDisc, disciplines]);

  const exportToCSV = () => {
    if (analyticsData.length === 0) return;
    
    const headers = [
      "Data_Hora", "Motor_Usado", "Disciplina", "Eixo_Tematico", "Caso_Clinico", 
      "Tempo_Segundos", "Nota_Final", "Teve_Erro_Fatal", "Transcricao_ou_Caminho"
    ];

    const rows = analyticsData.map(d => {
      let logData = '';
      if (d.mode === 'ai') logData = "Transcrição Completa (Ver Banco)";
      else if (d.fullDecisionPath) logData = d.fullDecisionPath.map((p: any) => p.choice).join(" > ");
      else if (d.userSequence) logData = d.userSequence.join(" | ");

      return [
        d.date || d.completedAt || new Date().toLocaleString(),
        d.mode || 'clinical',
        d.disciplineId || '',
        d.theme || '',
        d.stationTitle || d.quizTitle || '',
        d.timeSpent || 0,
        (d.grade !== undefined && d.grade !== null) ? d.grade.toFixed(2) : 0,
        d.isFatalError ? "SIM" : "NAO",
        `"${logData}"` 
      ];
    });

    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.setAttribute("download", `luna_scientific_data_${new Date().toLocaleDateString().replace(/\//g, '-')}.csv`);
    link.click();
  };

  return (
    <div className="animate-in fade-in duration-500">
      <style>{`
        @media print {
          @page { size: A4 portrait; margin: 1.5cm; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          table { page-break-inside: auto; }
          tr    { page-break-inside: avoid; page-break-after: auto; }
          thead { display: table-header-group; }
          tfoot { display: table-footer-group; }
        }
      `}</style>

      {/* ========================================================= */}
      {/* 1. VISUAL DA TELA DO SISTEMA (OCULTO NA HORA DE IMPRIMIR) */}
      {/* ========================================================= */}
      <div className="print:hidden space-y-8">
        
        <div className="flex flex-col xl:flex-row justify-between items-center gap-6 bg-[#003366] p-8 md:p-10 rounded-[3rem] text-white shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-20 -mt-20 pointer-events-none"></div>
          <div className="flex items-center gap-5 relative z-10 w-full xl:w-auto justify-center xl:justify-start">
            <div className="p-4 bg-[#D4A017] rounded-2xl text-[#003366] shadow-lg shrink-0">
              <BarChart4 size={32} />
            </div>
            <div>
              <h3 className="text-2xl md:text-3xl font-black uppercase tracking-tighter">Observatório Científico</h3>
              <p className="text-[10px] md:text-xs text-[#D4A017] font-black uppercase tracking-[0.2em] mt-1">Estatísticas de Eficácia Pedagógica</p>
            </div>
          </div>
          
          <div className="flex flex-wrap justify-center xl:justify-end gap-3 relative z-10 w-full xl:w-auto">
            <select 
              value={filterRoom} 
              onChange={handleRoomChange} 
              className="bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-xs font-black uppercase outline-none focus:bg-white focus:text-[#003366] transition-all cursor-pointer"
            >
              <option value="">Todas as Turmas (Salas)</option>
              {rooms.map(r => <option key={r.id} value={r.id} className="text-black">{r.name}</option>)}
            </select>

            <select 
              value={filterDisc} 
              onChange={e => setFilterDisc(e.target.value)} 
              className="bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-xs font-black uppercase outline-none focus:bg-white focus:text-[#003366] transition-all cursor-pointer"
            >
              <option value="">Todas as Disciplinas</option>
              {availableDisciplines.map(d => <option key={d.id} value={d.id} className="text-black">{d.title}</option>)}
            </select>

            <button 
              onClick={exportToCSV} 
              className="bg-[#D4A017] text-[#003366] px-4 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-white transition-all shadow-lg"
            >
              <Download size={16}/> CSV
            </button>
            <button 
              onClick={() => window.print()} 
              className="bg-white text-[#003366] px-4 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-gray-100 transition-all shadow-lg"
            >
              <Printer size={16}/> Emitir PDF Profissional
            </button>
          </div>
        </div>

        {stats ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white p-8 rounded-[2rem] border-b-4 border-[#003366] shadow-sm flex flex-col justify-between">
                <div className="flex justify-between items-start mb-2">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Amostragem (N)</p>
                  <Activity size={18} className="text-[#003366]"/>
                </div>
                <div>
                  <p className="text-4xl font-black text-[#003366]">{stats.total}</p>
                  <p className="text-[9px] font-bold text-gray-400 mt-1 uppercase">Simulações Realizadas</p>
                </div>
              </div>

              <div className="bg-white p-8 rounded-[2rem] border-b-4 border-blue-500 shadow-sm flex flex-col justify-between">
                <div className="flex justify-between items-start mb-2">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Média Global</p>
                  <Award size={18} className="text-blue-500"/>
                </div>
                <div>
                  <p className="text-4xl font-black text-[#003366]">{stats.avgGrade.toFixed(1)} <span className="text-lg text-gray-300">/ 10</span></p>
                  <p className="text-[9px] font-bold text-gray-400 mt-1 uppercase">Desempenho Acadêmico</p>
                </div>
              </div>

              <div className="bg-white p-8 rounded-[2rem] border-b-4 border-green-500 shadow-sm flex flex-col justify-between">
                <div className="flex justify-between items-start mb-2">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Taxa de Sucesso</p>
                  <Target size={18} className="text-green-500"/>
                </div>
                <div>
                  <p className="text-4xl font-black text-green-600">{stats.successRate.toFixed(1)}%</p>
                  <div className="mt-2 h-1 w-full bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-green-500" style={{ width: `${stats.successRate}%` }}></div>
                  </div>
                  <p className="text-[9px] font-bold text-gray-400 mt-1 uppercase">Notas &ge; 7.0</p>
                </div>
              </div>

              <div className="bg-white p-8 rounded-[2rem] border-b-4 border-purple-500 shadow-sm flex flex-col justify-between">
                <div className="flex justify-between items-start mb-2">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Tempo Médio</p>
                  <Clock size={18} className="text-purple-500"/>
                </div>
                <div>
                  <p className="text-4xl font-black text-[#003366]">{Math.floor(stats.avgTime / 60)}m {Math.floor(stats.avgTime % 60)}s</p>
                  <p className="text-[9px] font-bold text-gray-400 mt-1 uppercase">Por Atendimento</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
              <div className="xl:col-span-2 bg-white p-8 md:p-10 rounded-[2.5rem] border shadow-sm">
                <h3 className="text-lg font-black text-[#003366] uppercase tracking-tighter mb-1 flex items-center gap-2">
                  <Brain size={20} className="text-[#D4A017]"/> Análise Comparativa
                </h3>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-8">Evolução por Metodologia</p>
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100 relative overflow-hidden">
                    <p className="text-xs font-black text-blue-600 uppercase mb-1">Simulado Estático</p>
                    <p className="text-[10px] text-gray-500 mb-4 h-8">Checklists Clínicos</p>
                    <p className="text-3xl font-black text-[#003366] mb-1">{stats.modes.static.avg.toFixed(1)}</p>
                    <p className="text-[9px] font-bold text-gray-400 uppercase">Base: {stats.modes.static.count}</p>
                  </div>

                  <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100 relative overflow-hidden">
                    <p className="text-xs font-black text-green-600 uppercase mb-1">Paciente Virtual</p>
                    <p className="text-[10px] text-gray-500 mb-4 h-8">Anamnese via IA</p>
                    <p className="text-3xl font-black text-[#003366] mb-1">{stats.modes.ai.avg.toFixed(1)}</p>
                    <p className="text-[9px] font-bold text-gray-400 uppercase">Base: {stats.modes.ai.count}</p>
                  </div>

                  <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100 relative overflow-hidden">
                    <p className="text-xs font-black text-purple-600 uppercase mb-1">Simulação RPG</p>
                    <p className="text-[10px] text-gray-500 mb-4 h-8">Raciocínio Dinâmico</p>
                    <p className="text-3xl font-black text-[#003366] mb-1">{stats.modes.rpg.avg.toFixed(1)}</p>
                    <p className="text-[9px] font-bold text-gray-400 uppercase">Base: {stats.modes.rpg.count}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white p-8 md:p-10 rounded-[2.5rem] border shadow-sm flex flex-col justify-between">
                <div>
                  <h3 className="text-lg font-black text-[#003366] uppercase tracking-tighter mb-1 flex items-center gap-2">
                    <TrendingUp size={20} className="text-[#D4A017]"/> Raio-X Curricular
                  </h3>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-8">Mapeamento de Lacunas</p>

                  <div className="mb-6 bg-green-50 p-4 rounded-2xl border border-green-100">
                    <div className="flex items-center gap-2 mb-1">
                      <ChevronUp className="text-green-600" size={16}/>
                      <p className="text-[10px] font-black text-green-600 uppercase">Domínio Mais Forte</p>
                    </div>
                    <p className="font-bold text-[#003366] text-sm leading-tight mb-2">{stats.bestTheme.name}</p>
                    <p className="text-xl font-black text-green-600">{stats.bestTheme.avg.toFixed(1)} <span className="text-[10px] text-gray-500 font-bold uppercase ml-1">(N={stats.bestTheme.count})</span></p>
                  </div>

                  <div className="mb-6 bg-red-50 p-4 rounded-2xl border border-red-100">
                    <div className="flex items-center gap-2 mb-1">
                      <ChevronDown className="text-red-600" size={16}/>
                      <p className="text-[10px] font-black text-red-600 uppercase">Lacuna Crítica</p>
                    </div>
                    <p className="font-bold text-[#003366] text-sm leading-tight mb-2">{stats.worstTheme.name}</p>
                    <p className="text-xl font-black text-red-600">{stats.worstTheme.avg.toFixed(1)} <span className="text-[10px] text-gray-500 font-bold uppercase ml-1">(N={stats.worstTheme.count})</span></p>
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-32 bg-white rounded-[3rem] border-2 border-dashed border-gray-200 shadow-sm">
            <div className="text-6xl mb-4 opacity-50">🔬</div>
            <h4 className="text-base font-black text-[#003366] uppercase tracking-tighter text-center">Amostragem Vazia</h4>
          </div>
        )}
      </div>

      {/* ========================================================= */}
      {/* 2. DOCUMENTO OFICIAL DE IMPRESSÃO (A4 FORMAL E ACADÊMICO) */}
      {/* ========================================================= */}
      {stats && (
        <div className="hidden print:block w-full bg-white text-black text-sm" style={{ fontFamily: 'Arial, sans-serif' }}>
          
          {/* CABEÇALHO LIMPO, EM BLOCO (SEM FLEX HORIZONTAL PARA NÃO QUEBRAR LINHA) */}
          <div className="border-b-2 border-black pb-4 mb-6">
            <div className="flex items-center gap-4 mb-5">
              <img src="/logo.png" alt="Luna MedClass Logo" className="h-12 object-contain" />
              <div>
                <h1 className="text-xl font-black uppercase tracking-tight text-black m-0 leading-none">RELATÓRIO DE PESQUISA ANALÍTICA</h1>
                <h2 className="text-xs font-bold text-gray-700 uppercase tracking-widest m-0 leading-none mt-1">PLATAFORMA LUNA MEDCLASS • OSCE ANALYTICS</h2>
              </div>
            </div>
            
            <div className="text-xs text-black space-y-1">
              <p className="m-0"><strong>Data da Emissão:</strong> {new Date().toLocaleDateString('pt-BR')} às {new Date().toLocaleTimeString('pt-BR')}</p>
              <p className="m-0"><strong>Filtro de Turma:</strong> {filterRoom ? rooms.find(r => r.id === filterRoom)?.name : 'Todas as Turmas (Geral)'}</p>
              <p className="m-0"><strong>Disciplina:</strong> {filterDisc ? disciplines.find(d => d.id === filterDisc)?.title : 'Todas as Disciplinas'}</p>
            </div>
          </div>

          {/* PARÁGRAFO INTRODUTÓRIO */}
          <p className="mb-6 text-justify text-xs leading-relaxed text-black">
            Este relatório consolida os dados de desempenho clínico simulado obtidos através do Luna MedClass. Os indicadores refletem a proficiência técnica e o raciocínio diagnóstico nas estações de Exame Clínico Objetivado Estruturado (OSCE), englobando checklists estáticos, simulações baseadas em roteiro dinâmico (RPG) e anamnese via Inteligência Artificial.
          </p>

          {/* BLOCO 1: INDICADORES GLOBAIS POR METODOLOGIA */}
          <div className="mb-8">
              <h3 className="text-xs font-bold uppercase border-b border-black pb-1 mb-3 text-black">1. Indicadores Globais de Engajamento e Desempenho</h3>
              <table className="w-full text-xs border-collapse border border-black text-center table-fixed">
                  <thead className="bg-gray-100">
                      <tr>
                          <th className="border border-black py-2 px-1 w-1/5">Modalidade Tecnológica</th>
                          <th className="border border-black py-2 px-1 w-1/5">Amostragem (N)</th>
                          <th className="border border-black py-2 px-1 w-1/5">Média (0 a 10)</th>
                          <th className="border border-black py-2 px-1 w-1/5">Taxa de Sucesso (&ge; 7.0)</th>
                          <th className="border border-black py-2 px-1 w-1/5">Tempo Médio</th>
                      </tr>
                  </thead>
                  <tbody>
                      <tr className="bg-gray-50">
                          <td className="border border-black py-2 px-1 font-bold text-left pl-3">TOTAL GERAL (Média)</td>
                          <td className="border border-black py-2 px-1 font-bold">{stats.total}</td>
                          <td className="border border-black py-2 px-1 font-bold">{stats.avgGrade.toFixed(1)}</td>
                          <td className="border border-black py-2 px-1 font-bold">{stats.successRate.toFixed(1)}%</td>
                          <td className="border border-black py-2 px-1 font-bold">{Math.floor(stats.avgTime / 60)}m {Math.floor(stats.avgTime % 60)}s</td>
                      </tr>
                      <tr>
                          <td className="border border-black py-2 px-1 text-left pl-3">Simulado Estático (Checklists)</td>
                          <td className="border border-black py-2 px-1">{stats.modes.static.count}</td>
                          <td className="border border-black py-2 px-1">{stats.modes.static.avg.toFixed(1)}</td>
                          <td className="border border-black py-2 px-1">{stats.modes.static.success.toFixed(1)}%</td>
                          <td className="border border-black py-2 px-1">{Math.floor(stats.modes.static.time / 60)}m {Math.floor(stats.modes.static.time % 60)}s</td>
                      </tr>
                      <tr>
                          <td className="border border-black py-2 px-1 text-left pl-3">Paciente Virtual (Anamnese IA)</td>
                          <td className="border border-black py-2 px-1">{stats.modes.ai.count}</td>
                          <td className="border border-black py-2 px-1">{stats.modes.ai.avg.toFixed(1)}</td>
                          <td className="border border-black py-2 px-1">{stats.modes.ai.success.toFixed(1)}%</td>
                          <td className="border border-black py-2 px-1">{Math.floor(stats.modes.ai.time / 60)}m {Math.floor(stats.modes.ai.time % 60)}s</td>
                      </tr>
                      <tr>
                          <td className="border border-black py-2 px-1 text-left pl-3">Luna RPG (Raciocínio Dinâmico)</td>
                          <td className="border border-black py-2 px-1">{stats.modes.rpg.count}</td>
                          <td className="border border-black py-2 px-1">{stats.modes.rpg.avg.toFixed(1)}</td>
                          <td className="border border-black py-2 px-1">{stats.modes.rpg.success.toFixed(1)}%</td>
                          <td className="border border-black py-2 px-1">{Math.floor(stats.modes.rpg.time / 60)}m {Math.floor(stats.modes.rpg.time % 60)}s</td>
                      </tr>
                  </tbody>
              </table>
          </div>

          {/* BLOCO 2: ESTATÍSTICAS POR TEMA */}
          <div className="mb-8">
              <h3 className="text-xs font-bold uppercase border-b border-black pb-1 mb-3 text-black">2. Diagnóstico Curricular por Eixo Temático (Domínios de Conhecimento)</h3>
              <table className="w-full text-xs border-collapse border border-black text-center table-fixed">
                  <thead className="bg-gray-100">
                      <tr>
                          <th className="border border-black py-2 px-2 w-2/5 text-left pl-3">Eixo Temático / Domínio</th>
                          <th className="border border-black py-2 px-2 w-1/5">Amostragem (N)</th>
                          <th className="border border-black py-2 px-2 w-1/5">Média (0 a 10)</th>
                          <th className="border border-black py-2 px-2 w-1/5">Taxa de Sucesso</th>
                      </tr>
                  </thead>
                  <tbody>
                      {stats.themeDetails.length === 0 ? (
                        <tr><td colSpan={4} className="border border-black py-2 text-center italic text-gray-500">Sem dados temáticos suficientes.</td></tr>
                      ) : (
                        stats.themeDetails.map((theme, index) => (
                          <tr key={index} className={index === 0 ? 'bg-green-50' : index === stats.themeDetails.length - 1 && stats.themeDetails.length > 1 ? 'bg-red-50' : ''}>
                              <td className="border border-black py-2 px-2 text-left pl-3 font-medium">
                                {theme.name}
                                {index === 0 && <span className="ml-2 text-[8px] font-bold text-green-700 uppercase">(Maior Domínio)</span>}
                                {index === stats.themeDetails.length - 1 && stats.themeDetails.length > 1 && <span className="ml-2 text-[8px] font-bold text-red-700 uppercase">(Lacuna Crítica)</span>}
                              </td>
                              <td className="border border-black py-2 px-2">{theme.count}</td>
                              <td className="border border-black py-2 px-2 font-bold">{theme.avg.toFixed(1)}</td>
                              <td className="border border-black py-2 px-2">{theme.successRate.toFixed(1)}%</td>
                          </tr>
                        ))
                      )}
                  </tbody>
              </table>
          </div>

          {/* BLOCO 3: SEGURANÇA DO PACIENTE */}
          <div className="mb-8">
              <h3 className="text-xs font-bold uppercase border-b border-black pb-1 mb-3 text-black">3. Segurança do Paciente e Erros Críticos</h3>
              <div className="border border-black p-4 flex items-center justify-between bg-gray-50">
                  <div className="w-3/4">
                      <p className="font-bold uppercase text-black text-sm mb-1">Taxa de Risco Agudo (Mortalidade Fictícia)</p>
                      <p className="text-xs font-normal text-gray-700 leading-relaxed">Representa o percentual absoluto de simulações clínicas dinâmicas (RPG) onde o aluno selecionou condutas iatrogênicas diretas ou omitiu intervenções de suporte vital primário, resultando no óbito do paciente virtual.</p>
                  </div>
                  <div className="text-3xl font-black text-black px-6">{stats.fatalErrorRate.toFixed(1)}%</div>
              </div>
          </div>
          
        </div>
      )}
    </div>
  );
};

export default AdminAnalytics;