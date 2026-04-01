import React, { useState, useMemo } from 'react';
import { SimulationInfo } from '../../types';
import { 
  Download, TrendingUp, AlertOctagon, Clock, Award, 
  BrainCircuit, ClipboardList, Bot, Gamepad2 
} from 'lucide-react';

interface AdminAnalyticsProps {
  analyticsData: any[];
  disciplines: SimulationInfo[];
}

const AdminAnalytics: React.FC<AdminAnalyticsProps> = ({ analyticsData, disciplines }) => {
  const [filterDisc, setFilterDisc] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'clinical' | 'rpg' | 'ai'>('all');

  const stats = useMemo(() => {
    let filtered = analyticsData;
    
    if (filterDisc) {
      filtered = filtered.filter(d => d.disciplineId === filterDisc);
    }
    
    if (filterMode !== 'all') {
      filtered = filtered.filter(d => d.mode === (filterMode === 'clinical' ? 'static-cloud' : filterMode));
    }

    if (filtered.length === 0) return null;

    const total = filtered.length;
    
    // Métrica Global de Sucesso (Notas >= 7 ou sem Erro Fatal)
    const successCount = filtered.filter(d => {
      if (d.mode === 'rpg') return !d.isFatalError;
      return (d.grade || 0) >= 7;
    }).length;

    // Médias por Motor
    const avgGrade = filtered.reduce((acc, curr) => acc + (curr.grade || 0), 0) / total;
    const avgTime = filtered.reduce((acc, curr) => acc + (curr.timeSpent || 0), 0) / total;
    
    // Específicos RPG
    const fatals = filtered.filter(d => d.mode === 'rpg' && d.isFatalError).length;
    const avgTecnica = filtered.filter(d => d.mode === 'rpg').reduce((acc, curr) => acc + (curr.performanceMap?.tecnica || 0), 0) / (filtered.filter(d => d.mode === 'rpg').length || 1);

    // Específicos Estático
    const totalClinicalErrors = filtered.filter(d => d.mode === 'static-cloud').reduce((acc, curr) => acc + (curr.totalErrors || 0), 0);

    return { 
      total, 
      successRate: (successCount / total) * 100, 
      fatals, 
      avgGrade, 
      avgTecnica, 
      avgTime, 
      totalClinicalErrors 
    };
  }, [analyticsData, filterDisc, filterMode]);

  const exportToCSV = () => {
    if (analyticsData.length === 0) return;
    
    const headers = [
      "Data", "Motor", "Estacao", "Disciplina", "Tema", "Tempo(s)", 
      "Nota", "ErroFatal", "Tecnica", "Comunicacao", "Seguranca", 
      "ErrosTecnicos", "Caminho_ou_Escolhas"
    ];

    const rows = analyticsData.map(d => [
      d.completedAt || d.date || '',
      d.mode || 'N/A',
      d.stationTitle || 'N/A',
      d.disciplineId || '',
      d.theme || '',
      d.timeSpent || 0,
      d.grade || (d.performanceMap ? 'Calculada' : 0),
      d.isFatalError ? "SIM" : "NAO",
      d.performanceMap?.tecnica || 0,
      d.performanceMap?.comunicacao || 0,
      d.performanceMap?.biosseguranca || 0,
      d.totalErrors || 0,
      d.fullDecisionPath ? d.fullDecisionPath.map((p: any) => p.choice).join(" > ") : 
      d.userSequence ? d.userSequence.join(" | ") : ''
    ]);

    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.setAttribute("download", `luna_research_analytics_${new Date().toLocaleDateString()}.csv`);
    link.click();
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* HEADER DE PESQUISA */}
      <div className="flex flex-col lg:flex-row justify-between items-center gap-6 bg-[#003366] p-8 rounded-[3rem] text-white shadow-2xl">
        <div className="flex items-center gap-4">
          <div className="p-4 bg-[#D4A017] rounded-2xl text-[#003366] shadow-lg">
            <TrendingUp size={28} />
          </div>
          <div>
            <h3 className="text-2xl font-black uppercase tracking-tighter">Research Analytics Engine</h3>
            <p className="text-[10px] text-[#D4A017] font-black uppercase tracking-[0.2em]">Monitoramento de Performance Científica</p>
          </div>
        </div>
        
        <div className="flex flex-wrap justify-center gap-3">
          <select 
            value={filterMode} 
            onChange={e => setFilterMode(e.target.value as any)}
            className="bg-white/10 border border-white/20 rounded-xl px-4 py-2 text-[10px] font-black uppercase outline-none focus:bg-white focus:text-[#003366] transition-all"
          >
            <option value="all">Todos os Motores</option>
            <option value="clinical">Estático (Nuvem)</option>
            <option value="rpg">Dinâmico (RPG)</option>
            <option value="ai">Virtual (IA)</option>
          </select>

          <select 
            value={filterDisc} 
            onChange={e => setFilterDisc(e.target.value)} 
            className="bg-white/10 border border-white/20 rounded-xl px-4 py-2 text-[10px] font-black uppercase outline-none focus:bg-white focus:text-[#003366] transition-all"
          >
            <option value="">Todas as Disciplinas</option>
            {disciplines.map(d => <option key={d.id} value={d.id}>{d.title}</option>)}
          </select>

          <button 
            onClick={exportToCSV} 
            className="bg-[#D4A017] text-[#003366] px-6 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 hover:bg-white transition-all shadow-lg"
          >
            <Download size={14}/> Exportar Dados (.CSV)
          </button>
        </div>
      </div>

      {stats ? (
        <>
          {/* CARDS DE PERFORMANCE */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white p-8 rounded-[2rem] border-b-4 border-green-500 shadow-sm hover:shadow-md transition-all">
              <div className="flex justify-between items-start mb-4">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Taxa de Sucesso</p>
                <Award size={16} className="text-green-500"/>
              </div>
              <p className="text-4xl font-black text-[#003366]">{stats.successRate.toFixed(1)}%</p>
              <div className="mt-2 h-1 w-full bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-green-500" style={{ width: `${stats.successRate}%` }}></div>
              </div>
            </div>

            <div className="bg-white p-8 rounded-[2rem] border-b-4 border-blue-500 shadow-sm hover:shadow-md transition-all">
              <div className="flex justify-between items-start mb-4">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Nota Média Global</p>
                <BrainCircuit size={16} className="text-blue-500"/>
              </div>
              <p className="text-4xl font-black text-[#003366]">{stats.avgGrade.toFixed(1)}</p>
              <p className="text-[9px] font-bold text-gray-400 mt-2 italic">Média ponderada entre motores</p>
            </div>

            <div className="bg-white p-8 rounded-[2rem] border-b-4 border-purple-500 shadow-sm hover:shadow-md transition-all">
              <div className="flex justify-between items-start mb-4">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Tempo Médio</p>
                <Clock size={16} className="text-purple-500"/>
              </div>
              <p className="text-4xl font-black text-[#003366]">{Math.floor(stats.avgTime / 60)}m {Math.floor(stats.avgTime % 60)}s</p>
              <p className="text-[9px] font-bold text-gray-400 mt-2 italic">Eficiência de atendimento</p>
            </div>

            <div className="bg-white p-8 rounded-[2rem] border-b-4 border-red-500 shadow-sm hover:shadow-md transition-all">
              <div className="flex justify-between items-start mb-4">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Alertas Críticos</p>
                <AlertOctagon size={16} className="text-red-500"/>
              </div>
              <p className="text-4xl font-black text-red-600">{stats.fatals}</p>
              <p className="text-[9px] font-bold text-red-400 mt-2 uppercase">Erros fatais detectados</p>
            </div>
          </div>

          {/* INDICADORES ESPECÍFICOS POR MODO */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="bg-white p-8 rounded-[2.5rem] border shadow-sm flex flex-col justify-center items-center text-center">
              <ClipboardList className="text-blue-500 mb-4" size={32}/>
              <h4 className="text-[10px] font-black text-gray-400 uppercase mb-2">Erros em Estáticos</h4>
              <p className="text-3xl font-black text-[#003366]">{stats.totalClinicalErrors}</p>
              <p className="text-[9px] font-medium text-gray-400 mt-1">Ações incorretas clicadas na nuvem</p>
            </div>
            
            <div className="bg-white p-8 rounded-[2.5rem] border shadow-sm flex flex-col justify-center items-center text-center">
              <Gamepad2 className="text-purple-500 mb-4" size={32}/>
              <h4 className="text-[10px] font-black text-gray-400 uppercase mb-2">Performance RPG</h4>
              <p className="text-3xl font-black text-[#003366]">{stats.avgTecnica.toFixed(1)}%</p>
              <p className="text-[9px] font-medium text-gray-400 mt-1">Média de assertividade técnica</p>
            </div>

            <div className="bg-white p-8 rounded-[2.5rem] border shadow-sm flex flex-col justify-center items-center text-center">
              <Bot className="text-green-500 mb-4" size={32}/>
              <h4 className="text-[10px] font-black text-gray-400 uppercase mb-2">Engajamento Virtual</h4>
              <p className="text-3xl font-black text-[#003366]">{stats.total}</p>
              <p className="text-[9px] font-medium text-gray-400 mt-1">Simulações de anamnese realizadas</p>
            </div>
          </div>
        </>
      ) : (
        <div className="flex flex-col items-center justify-center py-32 bg-gray-50 rounded-[3rem] border-2 border-dashed border-gray-200">
          <div className="text-5xl mb-4">📊</div>
          <h4 className="text-sm font-black text-gray-400 uppercase tracking-widest text-center">
            Nenhum dado encontrado para os filtros selecionados.<br/>
            <span className="text-[10px] font-medium italic lowercase">Aguardando novas simulações de alunos...</span>
          </h4>
        </div>
      )}
    </div>
  );
};

export default AdminAnalytics;