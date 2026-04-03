import React, { useState, useMemo } from 'react';
import { SimulationInfo } from '../../types';
import { 
  Download, TrendingUp, Award, Target, AlertTriangle, 
  Activity, Brain, Clock, BarChart4, ChevronUp, ChevronDown, Printer 
} from 'lucide-react';

interface AdminAnalyticsProps {
  analyticsData: any[];
  disciplines: SimulationInfo[];
  rooms: any[]; // Nova prop para receber as salas/turmas
}

const AdminAnalytics: React.FC<AdminAnalyticsProps> = ({ analyticsData, disciplines, rooms }) => {
  const [filterRoom, setFilterRoom] = useState('');
  const [filterDisc, setFilterDisc] = useState('');

  // Limpa a disciplina se a turma for alterada (Filtro em Cascata)
  const handleRoomChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFilterRoom(e.target.value);
    setFilterDisc('');
  };

  // Filtra o menu de disciplinas baseado na turma selecionada
  const availableDisciplines = filterRoom 
    ? disciplines.filter(d => d.roomId === filterRoom) 
    : disciplines;

  const stats = useMemo(() => {
    let filtered = analyticsData || [];
    
    // 1. Filtro por Turma/Sala
    if (filterRoom) {
      const roomDiscIds = disciplines
        .filter(d => d.roomId === filterRoom)
        .map(d => d.id.toLowerCase());
        
      filtered = filtered.filter(d => {
         const dId = (d.disciplineId || '').toLowerCase();
         return roomDiscIds.includes(dId);
      });
    }

    // 2. Filtro por Disciplina (Resolvido o bug do HM1 maiúsculo vs minúsculo)
    if (filterDisc) {
      filtered = filtered.filter(d => (d.disciplineId || '').toLowerCase() === filterDisc.toLowerCase());
    }

    if (filtered.length === 0) return null;

    const total = filtered.length;

    // MÉTRICAS GLOBAIS
    const avgGrade = filtered.reduce((acc, curr) => acc + (curr.grade || 0), 0) / total;
    const avgTime = filtered.reduce((acc, curr) => acc + (curr.timeSpent || 0), 0) / total;
    
    // Sucesso = Nota >= 7.0
    const successCount = filtered.filter(d => (d.grade || 0) >= 7).length;
    const successRate = (successCount / total) * 100;

    // COMPARATIVO DE METODOLOGIAS (MOTORES)
    const staticSims = filtered.filter(d => d.mode === 'clinical' || d.mode === 'static-cloud');
    const rpgSims = filtered.filter(d => d.mode === 'rpg');
    const aiSims = filtered.filter(d => d.mode === 'ai');

    const avgStatic = staticSims.length > 0 ? staticSims.reduce((a, c) => a + (c.grade || 0), 0) / staticSims.length : 0;
    const avgRpg = rpgSims.length > 0 ? rpgSims.reduce((a, c) => a + (c.grade || 0), 0) / rpgSims.length : 0;
    const avgAi = aiSims.length > 0 ? aiSims.reduce((a, c) => a + (c.grade || 0), 0) / aiSims.length : 0;

    // SEGURANÇA DO PACIENTE (ERROS FATAIS)
    const fatalErrors = rpgSims.filter(d => d.isFatalError).length;
    const fatalErrorRate = rpgSims.length > 0 ? (fatalErrors / rpgSims.length) * 100 : 0;

    // MAPEAMENTO CURRICULAR (LACUNAS DE CONHECIMENTO)
    const themeStats: Record<string, { total: number, sumGrade: number }> = {};
    filtered.forEach(d => {
      const theme = d.theme || 'Sem Tema';
      if (!themeStats[theme]) themeStats[theme] = { total: 0, sumGrade: 0 };
      themeStats[theme].total++;
      themeStats[theme].sumGrade += (d.grade || 0);
    });

    let bestTheme = { name: '-', avg: 0, count: 0 };
    let worstTheme = { name: '-', avg: 10, count: 0 };

    Object.keys(themeStats).forEach(theme => {
      const stats = themeStats[theme];
      if (stats.total > 0) { 
        const avg = stats.sumGrade / stats.total;
        if (avg > bestTheme.avg || bestTheme.name === '-') {
          bestTheme = { name: theme, avg, count: stats.total };
        }
        if (avg < worstTheme.avg || worstTheme.name === '-') {
          worstTheme = { name: theme, avg, count: stats.total };
        }
      }
    });

    if (bestTheme.name === worstTheme.name) {
       worstTheme = { name: 'Dados Insuficientes', avg: 0, count: 0 };
    }

    return { 
      total, 
      avgGrade, 
      avgTime, 
      successRate,
      modes: {
        static: { count: staticSims.length, avg: avgStatic },
        rpg: { count: rpgSims.length, avg: avgRpg },
        ai: { count: aiSims.length, avg: avgAi }
      },
      fatalErrorRate,
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
    <div className="space-y-8 animate-in fade-in duration-500">
      
      {/* ========================================================= */}
      {/* VISUAL DA TELA DO SISTEMA (OCULTO NA HORA DE IMPRIMIR) */}
      {/* ========================================================= */}
      <div className="print:hidden space-y-8">
        
        {/* CABEÇALHO DO DASHBOARD COM NOVOS FILTROS */}
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
            {/* NOVO: Filtro de Turma/Sala */}
            <select 
              value={filterRoom} 
              onChange={handleRoomChange} 
              className="bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-xs font-black uppercase outline-none focus:bg-white focus:text-[#003366] transition-all cursor-pointer"
            >
              <option value="">Todas as Turmas (Salas)</option>
              {rooms.map(r => <option key={r.id} value={r.id} className="text-black">{r.name}</option>)}
            </select>

            {/* Filtro de Disciplina em Cascata */}
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
              <Printer size={16}/> Emitir PDF Formal
            </button>
          </div>
        </div>

        {stats ? (
          <>
            {/* CARDS GLOBAIS */}
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
                  <p className="text-[9px] font-bold text-gray-400 mt-1 uppercase">Desempenho Geral Acadêmico</p>
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
                  <p className="text-[9px] font-bold text-gray-400 mt-1 uppercase">Média ponderada &ge; 7.0</p>
                </div>
              </div>

              <div className="bg-white p-8 rounded-[2rem] border-b-4 border-purple-500 shadow-sm flex flex-col justify-between">
                <div className="flex justify-between items-start mb-2">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Tempo de Exposição</p>
                  <Clock size={18} className="text-purple-500"/>
                </div>
                <div>
                  <p className="text-4xl font-black text-[#003366]">{Math.floor(stats.avgTime / 60)}m {Math.floor(stats.avgTime % 60)}s</p>
                  <p className="text-[9px] font-bold text-gray-400 mt-1 uppercase">Duração Média por Atendimento</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
              {/* COMPARATIVO DE MOTORES */}
              <div className="xl:col-span-2 bg-white p-8 md:p-10 rounded-[2.5rem] border shadow-sm">
                <h3 className="text-lg font-black text-[#003366] uppercase tracking-tighter mb-1 flex items-center gap-2">
                  <Brain size={20} className="text-[#D4A017]"/> Análise Comparativa por Metodologia
                </h3>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-8">Como as diferentes tecnologias impactam a nota do aluno</p>
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100 relative overflow-hidden">
                    <p className="text-xs font-black text-blue-600 uppercase mb-1">Simulado Estático</p>
                    <p className="text-[10px] text-gray-500 mb-4 h-8">Checklists e Procedimentos</p>
                    <p className="text-3xl font-black text-[#003366] mb-1">{stats.modes.static.avg.toFixed(1)}</p>
                    <p className="text-[9px] font-bold text-gray-400 uppercase">Base: {stats.modes.static.count} execuções</p>
                  </div>

                  <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100 relative overflow-hidden">
                    <p className="text-xs font-black text-green-600 uppercase mb-1">Paciente Virtual</p>
                    <p className="text-[10px] text-gray-500 mb-4 h-8">Comunicação e Anamnese</p>
                    <p className="text-3xl font-black text-[#003366] mb-1">{stats.modes.ai.avg.toFixed(1)}</p>
                    <p className="text-[9px] font-bold text-gray-400 uppercase">Base: {stats.modes.ai.count} execuções</p>
                  </div>

                  <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100 relative overflow-hidden">
                    <p className="text-xs font-black text-purple-600 uppercase mb-1">Simulação RPG</p>
                    <p className="text-[10px] text-gray-500 mb-4 h-8">Raciocínio Clínico sob Pressão</p>
                    <p className="text-3xl font-black text-[#003366] mb-1">{stats.modes.rpg.avg.toFixed(1)}</p>
                    <p className="text-[9px] font-bold text-gray-400 uppercase">Base: {stats.modes.rpg.count} execuções</p>
                  </div>
                </div>
              </div>

              {/* MAPEAMENTO DIAGNÓSTICO */}
              <div className="bg-white p-8 md:p-10 rounded-[2.5rem] border shadow-sm flex flex-col justify-between">
                <div>
                  <h3 className="text-lg font-black text-[#003366] uppercase tracking-tighter mb-1 flex items-center gap-2">
                    <TrendingUp size={20} className="text-[#D4A017]"/> Raio-X Curricular
                  </h3>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-8">Mapeamento de Lacunas Cognitivas</p>

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
                      <p className="text-[10px] font-black text-red-600 uppercase">Lacuna Crítica (Pior Média)</p>
                    </div>
                    <p className="font-bold text-[#003366] text-sm leading-tight mb-2">{stats.worstTheme.name}</p>
                    <p className="text-xl font-black text-red-600">{stats.worstTheme.avg.toFixed(1)} <span className="text-[10px] text-gray-500 font-bold uppercase ml-1">(N={stats.worstTheme.count})</span></p>
                  </div>
                </div>

                <div className="pt-6 border-t border-gray-100">
                   <div className="flex justify-between items-center">
                      <div>
                        <p className="text-[10px] font-black text-gray-400 uppercase mb-1 flex items-center gap-1"><AlertTriangle size={12} className="text-red-500"/> Risco ao Paciente</p>
                        <p className="text-2xl font-black text-[#003366]">{stats.fatalErrorRate.toFixed(1)}%</p>
                      </div>
                      <div className="text-right max-w-[120px]">
                        <p className="text-[8px] font-bold text-gray-400 uppercase leading-tight">Taxa de simulações clínicas com Erro Fatal.</p>
                      </div>
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
      {/* VISUAL DE IMPRESSÃO (TABELAR, FORMAL, OCULTO NA TELA)     */}
      {/* ========================================================= */}
      {stats && (
        <div className="hidden print:block w-full bg-white text-black font-sans p-4">
          
          <div className="border-b-2 border-black pb-4 mb-8 text-center">
              <h1 className="text-2xl font-black uppercase tracking-tight mb-1 text-black">Relatório Científico de Eficácia Pedagógica</h1>
              <h2 className="text-sm font-bold uppercase text-gray-600 tracking-widest">Plataforma de Simulação Luna MedClass</h2>
              
              <div className="flex justify-between text-xs mt-8 text-left">
                  <span><strong>Data da Emissão:</strong> {new Date().toLocaleDateString('pt-BR')} às {new Date().toLocaleTimeString('pt-BR')}</span>
                  <span>
                    <strong>Sala/Turma:</strong> {filterRoom ? rooms.find(r => r.id === filterRoom)?.name : 'Todas as Turmas (Geral)'} <br/>
                    <strong>Disciplina:</strong> {filterDisc ? disciplines.find(d => d.id === filterDisc)?.title : 'Todas as Disciplinas (Geral)'}
                  </span>
              </div>
          </div>

          <div className="mb-10">
              <h3 className="text-sm font-black border-b border-gray-400 pb-1 mb-4 uppercase tracking-widest">1. Indicadores Globais de Engajamento</h3>
              <table className="w-full text-sm border-collapse border border-gray-800 text-center">
                  <thead>
                      <tr className="bg-gray-100">
                          <th className="border border-gray-800 p-3">Amostragem Total (N)</th>
                          <th className="border border-gray-800 p-3">Média Global de Desempenho</th>
                          <th className="border border-gray-800 p-3">Taxa de Sucesso (Notas &ge; 7.0)</th>
                          <th className="border border-gray-800 p-3">Tempo Médio de Retenção</th>
                      </tr>
                  </thead>
                  <tbody>
                      <tr>
                          <td className="border border-gray-800 p-4 text-xl font-bold">{stats.total}</td>
                          <td className="border border-gray-800 p-4 text-xl font-bold">{stats.avgGrade.toFixed(1)} / 10</td>
                          <td className="border border-gray-800 p-4 text-xl font-bold">{stats.successRate.toFixed(1)}%</td>
                          <td className="border border-gray-800 p-4 text-xl font-bold">{Math.floor(stats.avgTime / 60)}m {Math.floor(stats.avgTime % 60)}s</td>
                      </tr>
                  </tbody>
              </table>
          </div>

          <div className="mb-10">
              <h3 className="text-sm font-black border-b border-gray-400 pb-1 mb-4 uppercase tracking-widest">2. Comparativo Analítico por Tecnologia de Simulação</h3>
              <table className="w-full text-sm border-collapse border border-gray-800 text-left">
                  <thead>
                      <tr className="bg-gray-100">
                          <th className="border border-gray-800 p-3 w-1/2">Motor de Simulação Utilizado</th>
                          <th className="border border-gray-800 p-3 text-center">Amostragem Especifica (N)</th>
                          <th className="border border-gray-800 p-3 text-center">Média de Notas Alcançada (0-10)</th>
                      </tr>
                  </thead>
                  <tbody>
                      <tr>
                          <td className="border border-gray-800 p-3 font-semibold">Simulado Estático (Múltipla Escolha de Condutas / Checklists)</td>
                          <td className="border border-gray-800 p-3 text-center">{stats.modes.static.count}</td>
                          <td className="border border-gray-800 p-3 text-center font-black text-lg">{stats.modes.static.avg.toFixed(1)}</td>
                      </tr>
                      <tr>
                          <td className="border border-gray-800 p-3 font-semibold">Paciente Virtual (Entrevista Clínica não-estruturada via IA)</td>
                          <td className="border border-gray-800 p-3 text-center">{stats.modes.ai.count}</td>
                          <td className="border border-gray-800 p-3 text-center font-black text-lg">{stats.modes.ai.avg.toFixed(1)}</td>
                      </tr>
                      <tr>
                          <td className="border border-gray-800 p-3 font-semibold">Luna Engine RPG (Raciocínio Clínico dinâmico e Fisiologia Variável)</td>
                          <td className="border border-gray-800 p-3 text-center">{stats.modes.rpg.count}</td>
                          <td className="border border-gray-800 p-3 text-center font-black text-lg">{stats.modes.rpg.avg.toFixed(1)}</td>
                      </tr>
                  </tbody>
              </table>
          </div>

          <div className="mb-10">
              <h3 className="text-sm font-black border-b border-gray-400 pb-1 mb-4 uppercase tracking-widest">3. Diagnóstico Curricular e Segurança do Paciente</h3>
              <table className="w-full text-sm border-collapse border border-gray-800 text-left mb-6">
                  <thead>
                      <tr className="bg-gray-100">
                          <th className="border border-gray-800 p-3 w-1/3">Indicador Diagnóstico</th>
                          <th className="border border-gray-800 p-3">Eixo Temático Identificado</th>
                          <th className="border border-gray-800 p-3 text-center">Média</th>
                          <th className="border border-gray-800 p-3 text-center">N</th>
                      </tr>
                  </thead>
                  <tbody>
                      <tr>
                          <td className="border border-gray-800 p-3 font-black text-gray-800">Maior Domínio Teórico-Prático</td>
                          <td className="border border-gray-800 p-3 font-semibold">{stats.bestTheme.name}</td>
                          <td className="border border-gray-800 p-3 text-center font-black text-lg">{stats.bestTheme.avg.toFixed(1)}</td>
                          <td className="border border-gray-800 p-3 text-center">{stats.bestTheme.count}</td>
                      </tr>
                      <tr>
                          <td className="border border-gray-800 p-3 font-black text-gray-800">Lacuna Crítica de Conhecimento</td>
                          <td className="border border-gray-800 p-3 font-semibold">{stats.worstTheme.name}</td>
                          <td className="border border-gray-800 p-3 text-center font-black text-lg">{stats.worstTheme.avg.toFixed(1)}</td>
                          <td className="border border-gray-800 p-3 text-center">{stats.worstTheme.count}</td>
                      </tr>
                  </tbody>
              </table>

              <div className="border-2 border-gray-800 p-4 bg-gray-100 flex items-center justify-between mt-6">
                  <div className="w-2/3">
                      <p className="font-black uppercase text-black mb-1">Risco Agudo Fictício (Taxa de Erros Fatais)</p>
                      <p className="text-xs text-gray-800 font-medium">Corresponde ao percentual de simulações clínicas onde o discente selecionou condutas iatrogênicas ou omitiu socorro primário, resultando no óbito do paciente virtual.</p>
                  </div>
                  <div className="text-4xl font-black text-black">{stats.fatalErrorRate.toFixed(1)}%</div>
              </div>
          </div>

          <div className="mt-16 text-center text-xs font-bold text-gray-500 border-t-2 border-black pt-4 uppercase tracking-widest">
              Documento Oficial gerado por Luna MedClass Engine
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminAnalytics;