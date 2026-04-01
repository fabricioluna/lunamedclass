import React, { useState, useMemo } from 'react';
import { SimulationInfo } from '../../types';
import { Download, TrendingUp, AlertOctagon, Clock, Award, BrainCircuit } from 'lucide-react';

interface AdminAnalyticsProps {
  analyticsData: any[];
  disciplines: SimulationInfo[];
}

const AdminAnalytics: React.FC<AdminAnalyticsProps> = ({ analyticsData, disciplines }) => {
  const [filterDisc, setFilterDisc] = useState('');

  const stats = useMemo(() => {
    const filtered = filterDisc 
      ? analyticsData.filter(d => d.disciplineId === filterDisc)
      : analyticsData;

    if (filtered.length === 0) return null;

    const total = filtered.length;
    const fatals = filtered.filter(d => d.isFatalError).length;
    
    const avgTecnica = filtered.reduce((acc, curr) => acc + (curr.performanceMap?.tecnica || 0), 0) / total;
    const avgComunicacao = filtered.reduce((acc, curr) => acc + (curr.performanceMap?.comunicacao || 0), 0) / total;
    const avgSeguranca = filtered.reduce((acc, curr) => acc + (curr.performanceMap?.biosseguranca || 0), 0) / total;
    const avgTime = filtered.reduce((acc, curr) => acc + (curr.timeSpent || 0), 0) / total;

    const phaseErrors: Record<string, number> = {};
    filtered.filter(d => d.isFatalError).forEach(d => {
        const lastPhase = d.lastPhaseBeforeExit || 'Início';
        phaseErrors[lastPhase] = (phaseErrors[lastPhase] || 0) + 1;
    });

    return { total, fatals, avgTecnica, avgComunicacao, avgSeguranca, avgTime, phaseErrors };
  }, [analyticsData, filterDisc]);

  const exportToCSV = () => {
    if (analyticsData.length === 0) return;
    const headers = ["Data", "Estação", "Disciplina", "Tempo(s)", "ErroFatal", "Tecnica", "Comunicacao", "Seguranca", "Caminho"];
    const rows = analyticsData.map(d => [
      d.completedAt || d.date,
      d.stationTitle,
      d.disciplineId,
      d.timeSpent,
      d.isFatalError ? "SIM" : "NAO",
      d.performanceMap?.tecnica || 0,
      d.performanceMap?.comunicacao || 0,
      d.performanceMap?.biosseguranca || 0,
      d.fullDecisionPath?.map((p: any) => p.choice).join(" > ")
    ]);
    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.setAttribute("download", `luna_analytics_${new Date().toLocaleDateString()}.csv`);
    link.click();
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-[#003366] p-8 rounded-[2.5rem] text-white">
        <div>
            <h3 className="text-2xl font-black uppercase tracking-tighter">Research Analytics Engine</h3>
            <p className="text-xs text-[#D4A017] font-bold uppercase tracking-widest">Dados para Produção Científica</p>
        </div>
        <div className="flex gap-3">
            <select value={filterDisc} onChange={e => setFilterDisc(e.target.value)} className="bg-white/10 border border-white/20 rounded-xl px-4 py-2 text-xs font-bold outline-none">
                <option value="" className="text-black">Todas as Disciplinas</option>
                {disciplines.map(d => <option key={d.id} value={d.id} className="text-black">{d.title}</option>)}
            </select>
            <button onClick={exportToCSV} className="bg-[#D4A017] text-[#003366] px-6 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 hover:scale-105 transition-all">
                <Download size={14}/> Exportar CSV
            </button>
        </div>
      </div>

      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-6 rounded-3xl border shadow-sm">
                <p className="text-[10px] font-black text-gray-400 uppercase mb-1">Taxa de Sucesso</p>
                <p className="text-2xl font-black text-green-600">{(((stats.total - stats.fatals) / stats.total) * 100).toFixed(1)}%</p>
            </div>
            <div className="bg-white p-6 rounded-3xl border shadow-sm">
                <p className="text-[10px] font-black text-gray-400 uppercase mb-1">Média Técnica</p>
                <p className="text-2xl font-black text-blue-600">{stats.avgTecnica.toFixed(2)}</p>
            </div>
            <div className="bg-white p-6 rounded-3xl border shadow-sm">
                <p className="text-[10px] font-black text-gray-400 uppercase mb-1">Tempo Médio</p>
                <p className="text-2xl font-black text-purple-600">{Math.floor(stats.avgTime / 60)}m {Math.floor(stats.avgTime % 60)}s</p>
            </div>
            <div className="bg-white p-6 rounded-3xl border shadow-sm">
                <p className="text-[10px] font-black text-gray-400 uppercase mb-1">Erros Fatais</p>
                <p className="text-2xl font-black text-red-600">{stats.fatals}</p>
            </div>
        </div>
      )}
      
      {!stats && <div className="text-center py-20 bg-gray-50 rounded-[3rem] text-gray-400 font-bold uppercase text-xs">Aguardando dados de simulação...</div>}
    </div>
  );
};

export default AdminAnalytics;