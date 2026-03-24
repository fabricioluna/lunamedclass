import React, { useMemo } from 'react';
import { QuizResult, Question, LabSimulation, SimulationInfo } from '../../types';
import { BarChart3, TrendingUp, Layers, AlertTriangle } from 'lucide-react';
import { ROOMS } from '../../constants';

interface AdminStatsProps {
  quizResults: QuizResult[];
  questions: Question[];
  labSimulations: LabSimulation[];
  disciplines: SimulationInfo[];
  statsRoomFilter: string;
  statsDiscFilter: string;
  statsTypeFilter: string;
  statsQuizTitleFilter: string;
  setStatsRoomFilter: (val: string) => void;
  setStatsDiscFilter: (val: string) => void;
  setStatsTypeFilter: (val: string) => void;
  setStatsQuizTitleFilter: (val: string) => void;
}

const AdminStats: React.FC<AdminStatsProps> = ({
  quizResults,
  questions,
  labSimulations,
  disciplines,
  statsRoomFilter,
  statsDiscFilter,
  statsTypeFilter,
  statsQuizTitleFilter,
  setStatsRoomFilter,
  setStatsDiscFilter,
  setStatsTypeFilter,
  setStatsQuizTitleFilter,
}) => {

  const availableStatTitles = useMemo(() => {
    const titles = new Set<string>();
    quizResults.forEach(qr => {
      const discDaSala = statsRoomFilter ? disciplines.find(d => d.id === qr.discipline)?.roomId === statsRoomFilter : true;
      const matchDisc = !statsDiscFilter || qr.discipline === statsDiscFilter;
      const matchType = !statsTypeFilter || qr.type === statsTypeFilter;
      
      if (qr.quizTitle && matchDisc && matchType && discDaSala) {
        titles.add(qr.quizTitle);
      }
    });
    return Array.from(titles);
  }, [quizResults, statsRoomFilter, statsDiscFilter, statsTypeFilter, disciplines]);

  const analytics = useMemo(() => {
    const filteredResults = quizResults.filter(qr => {
      if (statsRoomFilter) {
        const disc = disciplines.find(d => d.id === qr.discipline);
        if (!disc || disc.roomId !== statsRoomFilter) return false;
      }
      if (statsDiscFilter && qr.discipline !== statsDiscFilter) return false;
      if (statsTypeFilter && qr.type !== statsTypeFilter) return false;
      if (statsQuizTitleFilter && qr.quizTitle !== statsQuizTitleFilter) return false;
      return true;
    });

    let totalQuestionsAnswered = 0;
    let totalCorrectAnswers = 0;
    let totalTimeSpentSecs = 0;
    let timeEntriesCount = 0;

    const themeStats: Record<string, { correct: number, total: number }> = {};
    const questionStats: Record<string, { misses: number, total: number }> = {};
    const monthlyStats: Record<string, { correct: number, total: number, label: string }> = {};
    
    const sessionTracker = new Set<string>();
    let historicalFullSims = 0;

    filteredResults.forEach(qr => {
      const qTotal = qr.total || 1;
      totalQuestionsAnswered += qTotal;
      totalCorrectAnswers += (qr.score || 0);

      const sessId = (qr.details?.[0] as any)?.sessionId;
      if (sessId) {
        sessionTracker.add(sessId);
      } else if (qTotal > 1) {
        historicalFullSims++;
      } else {
        let timeStr = 'legacy_unknown';
        let timeInMillis = qr.createdAt;
        if (timeInMillis && typeof timeInMillis === 'object' && (timeInMillis as any).seconds) {
          timeInMillis = (timeInMillis as any).seconds * 1000;
        }
        if (timeInMillis) {
          const d = new Date(timeInMillis as number);
          timeStr = `${d.getDate()}_${d.getMonth()}_${d.getFullYear()}`;
        } else if ((qr as any).date) {
          timeStr = String((qr as any).date).split(/[\s,T]+/)[0];
        }
        sessionTracker.add(`legacy_${qr.quizTitle || 'Misto'}_${timeStr}`);
      }

      let timeInMillisForMonth = qr.createdAt;
      if (timeInMillisForMonth && typeof timeInMillisForMonth === 'object' && (timeInMillisForMonth as any).seconds) {
        timeInMillisForMonth = (timeInMillisForMonth as any).seconds * 1000;
      }
      const dateObj = new Date((timeInMillisForMonth as number) || Date.now());
      const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
      const monthLabel = `${monthNames[dateObj.getMonth()]} ${dateObj.getFullYear()}`;
      const sortKey = `${dateObj.getFullYear()}${String(dateObj.getMonth()).padStart(2, '0')}`;

      if (!monthlyStats[sortKey]) monthlyStats[sortKey] = { correct: 0, total: 0, label: monthLabel };
      monthlyStats[sortKey].total += qTotal;
      monthlyStats[sortKey].correct += (qr.score || 0);

      if (qr.timeSpent && qr.timeSpent > 0) {
        totalTimeSpentSecs += qr.timeSpent;
        timeEntriesCount += qTotal; 
      }

      if (qr.details) {
        qr.details.forEach(d => {
          const themeName = d.theme || 'Desconhecido';
          if (!themeStats[themeName]) themeStats[themeName] = { correct: 0, total: 0 };
          themeStats[themeName].total++;
          if (d.isCorrect) themeStats[themeName].correct++;

          if (!questionStats[d.questionId]) questionStats[d.questionId] = { misses: 0, total: 0 };
          questionStats[d.questionId].total++;
          if (!d.isCorrect) questionStats[d.questionId].misses++;
        });
      }
    });

    const totalSimulations = sessionTracker.size + historicalFullSims;
    const globalAccuracy = totalQuestionsAnswered > 0 ? Math.round((totalCorrectAnswers / totalQuestionsAnswered) * 100) : 0;
    
    const avgTimePerQuestion = timeEntriesCount > 0 ? Math.round(totalTimeSpentSecs / timeEntriesCount) : 0;
    const avgTimeFormatted = avgTimePerQuestion > 60 
        ? `${Math.floor(avgTimePerQuestion / 60)}m ${avgTimePerQuestion % 60}s`
        : `${avgTimePerQuestion}s`;

    const allThemes = Object.keys(themeStats).map(t => ({
      theme: t,
      accuracy: Math.round((themeStats[t].correct / themeStats[t].total) * 100),
      total: themeStats[t].total
    })).sort((a, b) => b.accuracy - a.accuracy);

    const masteredThemes = allThemes.filter(t => t.accuracy >= 75);
    const attentionThemes = allThemes.filter(t => t.accuracy >= 50 && t.accuracy < 75);
    const criticalThemes = allThemes.filter(t => t.accuracy < 50);

    const temporalTrend = Object.keys(monthlyStats).sort().map(k => ({
      label: monthlyStats[k].label,
      accuracy: Math.round((monthlyStats[k].correct / monthlyStats[k].total) * 100),
      total: monthlyStats[k].total
    })).slice(-6); 

    const hardestQuestions = Object.keys(questionStats).map(qid => {
      let qText = questions.find(q => q.id === qid)?.q;
      if (!qText) {
         for (const sim of labSimulations || []) {
            const labQ = sim.questions.find(lq => lq.id === qid);
            if (labQ) {
              qText = `[Lab] ${labQ.question} - Imagem: ${labQ.imageName || 'N/A'}`;
              break;
            }
         }
      }
      return {
        id: qid,
        text: qText || 'Questão arquivada ou excluída',
        misses: questionStats[qid].misses,
        total: questionStats[qid].total,
        errorRate: Math.round((questionStats[qid].misses / questionStats[qid].total) * 100)
      };
    })
    .filter(x => x.misses > 0) 
    .sort((a, b) => b.errorRate - a.errorRate) 
    .slice(0, 10); 

    return { 
      totalSimulations, totalQuestionsAnswered, globalAccuracy, avgTimeFormatted, 
      masteredThemes, attentionThemes, criticalThemes, hardestQuestions, temporalTrend 
    };
  }, [quizResults, questions, labSimulations, statsRoomFilter, statsDiscFilter, statsTypeFilter, statsQuizTitleFilter, disciplines]);

  return (
    <div className="animate-in fade-in duration-500 space-y-8">
      
      {/* FILTROS */}
      <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm flex flex-wrap gap-4 items-end">
        <div className="flex-1 min-w-[200px]">
          <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2 block">Filtrar por Sala/Turma</label>
          <select 
            value={statsRoomFilter} 
            onChange={e => { setStatsRoomFilter(e.target.value); setStatsDiscFilter(''); setStatsQuizTitleFilter(''); }} 
            className="w-full p-4 bg-gray-50 rounded-xl text-xs font-bold text-[#003366] outline-none border-2 border-transparent focus:border-[#D4A017] transition-colors"
          >
            <option value="">Todas as Salas (Global)</option>
            {ROOMS.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
        </div>

        <div className="flex-1 min-w-[200px]">
          <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2 block">Filtrar por Disciplina</label>
          <select 
            value={statsDiscFilter} 
            onChange={e => { setStatsDiscFilter(e.target.value); setStatsQuizTitleFilter(''); }} 
            className="w-full p-4 bg-gray-50 rounded-xl text-xs font-bold text-[#003366] outline-none border-2 border-transparent focus:border-[#D4A017] transition-colors"
          >
            <option value="">Todas as Disciplinas</option>
            {disciplines
              .filter(d => !statsRoomFilter || d.roomId === statsRoomFilter)
              .map(d => <option key={d.id} value={d.id}>{d.title}</option>)
            }
          </select>
        </div>

        <div className="flex-1 min-w-[200px]">
          <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2 block">Tipo de Simulado</label>
          <select value={statsTypeFilter} onChange={e => { setStatsTypeFilter(e.target.value); setStatsQuizTitleFilter(''); }} className="w-full p-4 bg-gray-50 rounded-xl text-xs font-bold text-[#003366] outline-none border-2 border-transparent focus:border-[#D4A017] transition-colors">
            <option value="">Todas as Modalidades</option>
            <option value="teorico">Simulado Teórico</option>
            <option value="laboratorio">Laboratório Virtual</option>
            <option value="osce">OSCE Clínico</option>
          </select>
        </div>

        <div className="flex-1 min-w-[200px]">
          <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2 block">Simulado Específico</label>
          <select value={statsQuizTitleFilter} onChange={e => setStatsQuizTitleFilter(e.target.value)} disabled={availableStatTitles.length === 0} className="w-full p-4 bg-gray-50 rounded-xl text-xs font-bold text-[#003366] outline-none border-2 border-transparent focus:border-[#D4A017] transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
            <option value="">Todos os Simulados</option>
            {availableStatTitles.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
      </div>

      {/* MÉTRICAS PRINCIPAIS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-[#003366] p-8 rounded-[2.5rem] text-white shadow-xl relative overflow-hidden">
           <div className="absolute -right-4 -bottom-4 text-6xl opacity-10">📝</div>
           <p className="text-[9px] font-black uppercase tracking-widest opacity-60 mb-2">Simulados Feitos</p>
           <h4 className="text-5xl font-black">{analytics.totalSimulations}</h4>
        </div>
        <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm relative overflow-hidden">
           <div className="absolute -right-4 -bottom-4 text-6xl opacity-5">✅</div>
           <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-2">Questões Analisadas</p>
           <h4 className="text-5xl font-black text-[#003366]">{analytics.totalQuestionsAnswered}</h4>
        </div>
        <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm relative overflow-hidden">
           <div className="absolute -right-4 -bottom-4 text-6xl opacity-5">🎯</div>
           <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-2">Taxa de Acerto Média</p>
           <h4 className="text-5xl font-black text-emerald-600">{analytics.globalAccuracy}%</h4>
        </div>
        <div className="bg-[#D4A017] p-8 rounded-[2.5rem] shadow-sm relative overflow-hidden text-[#003366]">
           <div className="absolute -right-4 -bottom-4 text-6xl opacity-10">⏱️</div>
           <p className="text-[9px] font-black uppercase tracking-widest mb-2 opacity-80">Tempo P/ Questão (Pacing)</p>
           <h4 className="text-4xl font-black pt-2">{analytics.avgTimeFormatted}</h4>
        </div>
      </div>

      {/* EVOLUÇÃO TEMPORAL E RADAR DE RISCO */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm">
          <h3 className="text-xl font-black text-[#003366] uppercase tracking-tighter mb-6 flex items-center gap-2">
            <TrendingUp size={24} className="text-[#D4A017]" /> Curva de Aprendizado
          </h3>
          {analytics.temporalTrend.length > 0 ? (
            <div className="h-48 flex items-end justify-between gap-2 mt-8 px-2">
              {analytics.temporalTrend.map((monthData, idx) => (
                <div key={idx} className="flex flex-col items-center flex-1 group">
                  <span className="text-[10px] font-black text-[#003366] mb-2 opacity-0 group-hover:opacity-100 transition-opacity">{monthData.accuracy}%</span>
                  <div 
                    className={`w-full rounded-t-xl transition-all duration-500 ${monthData.accuracy >= 70 ? 'bg-emerald-400 hover:bg-emerald-500' : monthData.accuracy >= 50 ? 'bg-amber-400 hover:bg-amber-500' : 'bg-red-400 hover:bg-red-500'}`}
                    style={{ height: `${Math.max(monthData.accuracy, 10)}%` }} // min height for visibility
                  ></div>
                  <span className="text-[8px] font-black uppercase tracking-widest text-gray-400 mt-3 text-center">{monthData.label.split(' ')[0]}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-gray-400 font-medium italic text-xs py-10">Sem histórico mensal suficiente.</p>
          )}
        </div>

        <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm">
          <h3 className="text-xl font-black text-[#003366] uppercase tracking-tighter mb-6 flex items-center gap-2">
            <Layers size={24} className="text-[#003366]" /> Radar de Domínio (Temas)
          </h3>
          <div className="space-y-4 max-h-[220px] overflow-y-auto pr-2">
            {analytics.criticalThemes.length > 0 && (
              <div>
                <h4 className="text-[10px] font-black uppercase tracking-widest text-red-600 mb-2 flex items-center gap-1"><AlertTriangle size={12}/> Alerta Crítico (&lt; 50%)</h4>
                <div className="flex flex-wrap gap-2">
                  {analytics.criticalThemes.map(t => <span key={t.theme} className="bg-red-50 border border-red-100 text-red-700 text-[10px] font-bold px-3 py-1 rounded-lg">{t.theme} ({t.accuracy}%)</span>)}
                </div>
              </div>
            )}
            {analytics.attentionThemes.length > 0 && (
              <div>
                <h4 className="text-[10px] font-black uppercase tracking-widest text-amber-600 mb-2 mt-4">🟡 Zona de Atenção (50 - 75%)</h4>
                <div className="flex flex-wrap gap-2">
                  {analytics.attentionThemes.map(t => <span key={t.theme} className="bg-amber-50 border border-amber-100 text-amber-700 text-[10px] font-bold px-3 py-1 rounded-lg">{t.theme} ({t.accuracy}%)</span>)}
                </div>
              </div>
            )}
            {analytics.masteredThemes.length > 0 && (
              <div>
                <h4 className="text-[10px] font-black uppercase tracking-widest text-emerald-600 mb-2 mt-4">🟢 Temas Dominados (&gt; 75%)</h4>
                <div className="flex flex-wrap gap-2">
                  {analytics.masteredThemes.map(t => <span key={t.theme} className="bg-emerald-50 border border-emerald-100 text-emerald-700 text-[10px] font-bold px-3 py-1 rounded-lg">{t.theme} ({t.accuracy}%)</span>)}
                </div>
              </div>
            )}
            {(analytics.criticalThemes.length + analytics.attentionThemes.length + analytics.masteredThemes.length) === 0 && (
              <p className="text-center text-gray-400 font-medium italic text-xs py-10">Nenhum tema analisado ainda.</p>
            )}
          </div>
        </div>
      </div>

      <div className="bg-red-50 p-8 rounded-[2.5rem] border border-red-100 shadow-sm mt-8">
        <h3 className="text-xl font-black text-red-800 uppercase tracking-tighter mb-6 border-b border-red-200 pb-4">
          Top 10: Maior Taxa de Erro (Déficit de Turma)
        </h3>
        {analytics.hardestQuestions.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 max-h-[400px] overflow-y-auto pr-2">
            {analytics.hardestQuestions.map((q, idx) => (
              <div key={idx} className="bg-white p-5 rounded-2xl shadow-sm border border-red-100 flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-red-100 text-red-600 font-black flex items-center justify-center shrink-0 text-lg">
                  {idx + 1}
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-700 leading-relaxed line-clamp-3" title={q.text}>{q.text}</p>
                  <div className="flex gap-3 mt-3">
                    <span className="text-[9px] font-black uppercase bg-red-50 text-red-600 px-2 py-1 rounded tracking-widest">Taxa Erro: {q.errorRate}%</span>
                    <span className="text-[9px] font-black uppercase text-gray-400 tracking-widest pt-1">• Errada {q.misses}x no total</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-32 opacity-50">
            <span className="text-5xl mb-2">🎉</span>
            <p className="text-center text-red-800 font-black text-xs uppercase">Nenhum erro registrado neste filtro!</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminStats;