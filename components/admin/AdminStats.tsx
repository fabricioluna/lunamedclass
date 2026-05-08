import React, { useMemo, useState, useEffect } from 'react';
import { QuizResult, Question, LabSimulation, SimulationInfo, FirebaseTimestamp } from '../../types';
import { BarChart3, TrendingUp, Layers, AlertTriangle, FileDown, Trash2, CalendarDays, ChevronDown, CheckSquare } from 'lucide-react';
import { ROOMS } from '../../constants';

// IMPORTAÇÕES DO FIREBASE PARA DELETAR RESULTADOS ESPECÍFICOS
import { db, ref, remove } from '../../firebase';

// IMPORTAÇÕES DO GERADOR DE PDF
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

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

interface PdfImage {
  dataUrl: string;
  ratio: number; 
}

// === HELPER DE TIPAGEM ESTrita ===
// Converte o FirebaseTimestamp misto em um número de milissegundos puro para cálculos matemáticos
const normalizeTimestamp = (ts?: FirebaseTimestamp, fallbackDateStr?: string): number | null => {
  if (ts) {
    if (typeof ts === 'number') return ts;
    if (typeof ts === 'string') return new Date(ts).getTime();
    if (typeof ts === 'object' && 'seconds' in ts) return ts.seconds * 1000;
  }
  // Tratamento legado
  if (fallbackDateStr) {
    const dStr = String(fallbackDateStr);
    return new Date(dStr.split(/[\s,T]+/)[0].split('/').reverse().join('-')).getTime();
  }
  return null;
};

const AdminStats: React.FC<AdminStatsProps> = ({
  quizResults,
  questions,
  labSimulations,
  disciplines,
  statsRoomFilter,
  statsDiscFilter,
  statsTypeFilter,
  setStatsRoomFilter,
  setStatsDiscFilter,
  setStatsTypeFilter,
}) => {

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
  const [selectedQuizzes, setSelectedQuizzes] = useState<string[]>([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false); 

  const [pdfLogo, setPdfLogo] = useState<PdfImage | null>(null);

  useEffect(() => {
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.src = '/logo.png'; 
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0);
        setPdfLogo({
          dataUrl: canvas.toDataURL('image/png'),
          ratio: img.width / img.height 
        });
      }
    };
    img.onerror = () => {
      console.warn("Não foi possível carregar a logo em /logo.png para o PDF.");
    };
  }, []);

  const handleDeleteResult = (id?: string) => {
    if (!id) return;
    if (confirm("⚠️ Tem certeza que deseja excluir esta execução? Os gráficos e relatórios serão recalculados instantaneamente.")) {
      if (db) remove(ref(db, `quizResults/${id}`));
    }
  };

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

  useEffect(() => {
    setSelectedQuizzes(availableStatTitles);
  }, [availableStatTitles]);

  const analytics = useMemo(() => {
    const filteredResults = quizResults.filter(qr => {
      if (statsRoomFilter) {
        const disc = disciplines.find(d => d.id === qr.discipline);
        if (!disc || disc.roomId !== statsRoomFilter) return false;
      }
      if (statsDiscFilter && qr.discipline !== statsDiscFilter) return false;
      if (statsTypeFilter && qr.type !== statsTypeFilter) return false;
      
      if (qr.quizTitle) {
        if (!selectedQuizzes.includes(qr.quizTitle)) return false;
      } else {
        if (selectedQuizzes.length !== availableStatTitles.length) return false;
      }

      const timeInMillis = normalizeTimestamp(qr.createdAt, (qr as any).date);

      if (timeInMillis) {
        if (startDate) {
          const start = new Date(startDate + 'T00:00:00').getTime();
          if (timeInMillis < start) return false;
        }
        if (endDate) {
          const end = new Date(endDate + 'T23:59:59').getTime();
          if (timeInMillis > end) return false;
        }
      }

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
        const timeInMillis = normalizeTimestamp(qr.createdAt);
        if (timeInMillis) {
          const d = new Date(timeInMillis);
          timeStr = `${d.getDate()}_${d.getMonth()}_${d.getFullYear()}`;
        } else if ((qr as any).date) {
          timeStr = String((qr as any).date).split(/[\s,T]+/)[0];
        }
        sessionTracker.add(`legacy_${qr.quizTitle || 'Misto'}_${timeStr}`);
      }

      const timeForMonth = normalizeTimestamp(qr.createdAt) || Date.now();
      const dateObj = new Date(timeForMonth);
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
      rawResults: filteredResults, 
      totalSimulations, totalQuestionsAnswered, globalAccuracy, avgTimeFormatted, 
      masteredThemes, attentionThemes, criticalThemes, hardestQuestions, temporalTrend 
    };
  }, [quizResults, questions, labSimulations, statsRoomFilter, statsDiscFilter, statsTypeFilter, selectedQuizzes, startDate, endDate, disciplines, availableStatTitles.length]);

  const handleGeneratePDF = () => {
    if (analytics.totalSimulations === 0) {
      alert("Não há dados suficientes para gerar um relatório com os filtros atuais.");
      return;
    }

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width; 

    const roomName = ROOMS.find(r => r.id === statsRoomFilter)?.name || 'Todas as Turmas (Visão Geral)';
    const discName = disciplines.find(d => d.id === statsDiscFilter)?.title || 'Todas as Disciplinas';
    const typeName = statsTypeFilter === 'teorico' ? 'Simulados Teóricos' : statsTypeFilter === 'laboratorio' ? 'Laboratórios Virtuais' : statsTypeFilter === 'osce' ? 'OSCE Clínico' : 'Todas as Modalidades';

    const quizFilterLabel = selectedQuizzes.length === availableStatTitles.length 
      ? 'Todos os simulados disponíveis' 
      : selectedQuizzes.length === 0
        ? 'Nenhum'
        : selectedQuizzes.length <= 2 
          ? selectedQuizzes.join(', ') 
          : `${selectedQuizzes.length} simulados combinados`;

    let textStartX = pageWidth / 2;
    let titleAlign = 'center';
    let headerHeight = 30; 

    if (pdfLogo) {
      const targetWidth = 28; 
      const targetHeight = targetWidth / pdfLogo.ratio;
      doc.addImage(pdfLogo.dataUrl, 'PNG', 14, 10, targetWidth, targetHeight);
      
      textStartX = 48; 
      titleAlign = 'left';
      headerHeight = Math.max(30, 10 + targetHeight + 4); 
    }
    
    doc.setFontSize(16); 
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 51, 102); 
    
    let textY = 20;
    if (pdfLogo) {
       textY = 10 + ((28 / pdfLogo.ratio) / 2) + 3; 
    }
    
    doc.text("Relatório Executivo de Learning Analytics", textStartX, textY, { align: titleAlign as any });

    doc.setDrawColor(200, 200, 200);
    doc.line(14, headerHeight, 196, headerHeight); 

    const filterStartY = headerHeight + 6; 
    
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10); 
    doc.setFont("helvetica", "bold");
    doc.text("Parâmetros do Relatório", 14, filterStartY);
    
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text(`Turma/Sala: ${roomName}`, 14, filterStartY + 5);
    doc.text(`Módulo/Disciplina: ${discName}`, 14, filterStartY + 10);
    
    const periodoLabel = (startDate || endDate) 
        ? `${startDate ? new Date(startDate+'T00:00:00').toLocaleDateString('pt-BR') : 'Início'} até ${endDate ? new Date(endDate+'T00:00:00').toLocaleDateString('pt-BR') : 'Hoje'}`
        : 'Histórico Completo';

    doc.text(`Modalidade: ${typeName}`, 110, filterStartY + 5);
    doc.text(`Escopo: ${quizFilterLabel}`, 110, filterStartY + 10);
    doc.text(`Período de Análise: ${periodoLabel}`, 110, filterStartY + 15);

    const endFilterLineY = filterStartY + 18; 
    doc.setDrawColor(200, 200, 200);
    doc.line(14, endFilterLineY, 196, endFilterLineY); 

    const metricsY = endFilterLineY + 6; 
    
    doc.setFontSize(12); 
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 51, 102);
    doc.text("Métricas Globais de Engajamento", 14, metricsY);
    
    doc.setFontSize(9); 
    doc.setTextColor(0, 0, 0);
    doc.setFont("helvetica", "normal");
    doc.text(`• Total de Simulados Realizados: ${analytics.totalSimulations}`, 14, metricsY + 6);
    doc.text(`• Volume de Questões Analisadas: ${analytics.totalQuestionsAnswered}`, 14, metricsY + 11);
    doc.text(`• Aproveitamento (Nota Média): ${analytics.globalAccuracy}%`, 110, metricsY + 6);
    doc.text(`• Pacing (Tempo Médio/Questão): ${analytics.avgTimeFormatted}`, 110, metricsY + 11);

    let currentY = metricsY + 18;

    const themeBody = [
      ...analytics.criticalThemes.map(t => [t.theme, t.total, `${t.accuracy}%`, 'Crítico']),
      ...analytics.attentionThemes.map(t => [t.theme, t.total, `${t.accuracy}%`, 'Atenção']),
      ...analytics.masteredThemes.map(t => [t.theme, t.total, `${t.accuracy}%`, 'Dominado'])
    ];

    if (themeBody.length > 0) {
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(0, 51, 102);
      doc.text("Mapeamento de Lacunas (Por Tema)", 14, currentY);
      
      autoTable(doc, {
        startY: currentY + 3, 
        head: [['Tema / Eixo Analisado', 'Questões Resolvidas', 'Aproveitamento', 'Status Atual']],
        body: themeBody,
        theme: 'grid',
        headStyles: { fillColor: [0, 51, 102], textColor: 255, fontStyle: 'bold', fontSize: 9, halign: 'center' },
        styles: { fontSize: 8, cellPadding: 2 }, 
        columnStyles: {
            0: { halign: 'left' },
            1: { halign: 'center' },
            2: { halign: 'center' },
            3: { halign: 'center' }
        },
        didParseCell: (data) => {
          if (data.section === 'body' && data.column.index === 3) {
            if (data.cell.raw === 'Crítico') data.cell.styles.textColor = [220, 38, 38]; 
            if (data.cell.raw === 'Atenção') data.cell.styles.textColor = [217, 119, 6]; 
            if (data.cell.raw === 'Dominado') data.cell.styles.textColor = [5, 150, 105]; 
          }
        }
      });
      
      currentY = (doc as any).lastAutoTable?.finalY || (currentY + 20);
      currentY += 10;
    }

    if (analytics.hardestQuestions.length > 0) {
      if (currentY > 250) { 
         doc.addPage();
         currentY = 15;
      }

      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(220, 38, 38); 
      doc.text("Top 10: Questões Críticas (Maior Incidência de Erros)", 14, currentY);

      const questionsBody = analytics.hardestQuestions.map((q, i) => [
        i + 1,
        q.text.length > 85 ? q.text.substring(0, 85) + '...' : q.text,
        q.misses,
        `${q.errorRate}%`
      ]);

      autoTable(doc, {
        startY: currentY + 3,
        head: [['#', 'Tópico / Questão (Resumo)', 'Erros Absolutos', 'Taxa de Erro']],
        body: questionsBody,
        theme: 'grid',
        headStyles: { fillColor: [220, 38, 38], textColor: 255, fontStyle: 'bold', fontSize: 9, halign: 'center' },
        styles: { fontSize: 8, cellPadding: 2 },
        columnStyles: {
          0: { cellWidth: 10, halign: 'center' },
          1: { cellWidth: 130 },
          2: { halign: 'center' },
          3: { halign: 'center' }
        }
      });
    }

    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      
      doc.setDrawColor(200, 200, 200);
      doc.line(14, 285, 196, 285);

      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.setFont("helvetica", "normal");
      doc.text(`Emitido em: ${new Date().toLocaleString('pt-BR')}`, 14, 290);
      doc.text(`Página ${i} de ${pageCount}`, 196, 290, { align: 'right' });
    }

    doc.save(`LunaMedClass_Relatorio_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  return (
    <div className="animate-in fade-in duration-500 space-y-8">
      
      <div className="flex flex-col md:flex-row justify-between items-center bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm gap-4">
        <div>
          <h3 className="text-xl font-black text-[#003366] uppercase tracking-tighter">Filtros de Análise</h3>
          <p className="text-xs text-gray-500 font-medium">Refine os dados, turmas e combine resultados para montar seu relatório.</p>
        </div>
        <button 
          onClick={handleGeneratePDF}
          className="flex items-center gap-2 bg-[#D4A017] hover:bg-[#b58812] text-white px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg transition-all hover:scale-105"
        >
          <FileDown size={18} /> Emitir Relatório PDF
        </button>
      </div>

      <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm flex flex-wrap gap-4 items-end">
        
        <div className="flex-1 min-w-[130px]">
          <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2 flex items-center gap-1"><CalendarDays size={12}/> Data Inicial</label>
          <input 
            type="date" 
            value={startDate} 
            onChange={e => setStartDate(e.target.value)} 
            className="w-full p-4 bg-gray-50 rounded-xl text-xs font-bold text-[#003366] outline-none border-2 border-transparent focus:border-[#D4A017] transition-colors"
          />
        </div>
        <div className="flex-1 min-w-[130px]">
          <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2 flex items-center gap-1"><CalendarDays size={12}/> Data Final</label>
          <input 
            type="date" 
            value={endDate} 
            onChange={e => setEndDate(e.target.value)} 
            className="w-full p-4 bg-gray-50 rounded-xl text-xs font-bold text-[#003366] outline-none border-2 border-transparent focus:border-[#D4A017] transition-colors"
          />
        </div>

        <div className="flex-1 min-w-[200px]">
          <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2 block">Turma</label>
          <select 
            value={statsRoomFilter} 
            onChange={e => { setStatsRoomFilter(e.target.value); setStatsDiscFilter(''); }} 
            className="w-full p-4 bg-gray-50 rounded-xl text-xs font-bold text-[#003366] outline-none border-2 border-transparent focus:border-[#D4A017] transition-colors"
          >
            <option value="">Global</option>
            {ROOMS.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
        </div>

        <div className="flex-1 min-w-[200px]">
          <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2 block">Disciplina</label>
          <select 
            value={statsDiscFilter} 
            onChange={e => { setStatsDiscFilter(e.target.value); }} 
            className="w-full p-4 bg-gray-50 rounded-xl text-xs font-bold text-[#003366] outline-none border-2 border-transparent focus:border-[#D4A017] transition-colors"
          >
            <option value="">Todas</option>
            {disciplines
              .filter(d => !statsRoomFilter || d.roomId === statsRoomFilter)
              .map(d => <option key={d.id} value={d.id}>{d.title}</option>)
            }
          </select>
        </div>

        <div className="flex-1 min-w-[150px]">
          <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2 block">Modalidade</label>
          <select value={statsTypeFilter} onChange={e => { setStatsTypeFilter(e.target.value); }} className="w-full p-4 bg-gray-50 rounded-xl text-xs font-bold text-[#003366] outline-none border-2 border-transparent focus:border-[#D4A017] transition-colors">
            <option value="">Todas</option>
            <option value="teorico">Teórico</option>
            <option value="laboratorio">Lab Virtual</option>
            <option value="osce">OSCE</option>
          </select>
        </div>

        <div className="flex-1 min-w-[250px] relative">
          <label className="text-[10px] font-black uppercase tracking-widest text-[#003366] mb-2 flex items-center gap-1">
            <CheckSquare size={12}/> Selecionar Simulados
          </label>
          
          <div 
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="w-full p-4 bg-gray-50 rounded-xl text-xs font-bold text-[#003366] outline-none border-2 border-transparent hover:border-[#D4A017] transition-colors cursor-pointer flex justify-between items-center"
          >
            <span className="truncate mr-2">
              {availableStatTitles.length === 0 
                ? 'Nenhum disponível'
                : selectedQuizzes.length === availableStatTitles.length 
                  ? 'Todos os Simulados' 
                  : selectedQuizzes.length === 0 
                    ? 'Nenhum Selecionado' 
                    : `${selectedQuizzes.length} Simulado(s) Marcado(s)`}
            </span>
            <ChevronDown size={16} className={`text-gray-400 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
          </div>

          {isDropdownOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setIsDropdownOpen(false)}></div>
              
              <div className="absolute top-full left-0 mt-2 w-full bg-white border border-gray-200 shadow-2xl rounded-2xl z-50 overflow-hidden">
                <div className="flex justify-between items-center p-3 border-b border-gray-100 bg-gray-50">
                  <button 
                    onClick={() => setSelectedQuizzes([...availableStatTitles])}
                    className="text-[10px] font-black text-[#003366] hover:text-[#D4A017] uppercase tracking-widest transition-colors px-2 py-1"
                  >
                    Marcar Todos
                  </button>
                  <button 
                    onClick={() => setSelectedQuizzes([])}
                    className="text-[10px] font-black text-red-500 hover:text-red-700 uppercase tracking-widest transition-colors px-2 py-1"
                  >
                    Limpar
                  </button>
                </div>

                <div className="max-h-60 overflow-y-auto p-2">
                  {availableStatTitles.length === 0 ? (
                    <p className="text-xs text-center text-gray-400 p-4 font-medium">Não há simulados com os filtros atuais.</p>
                  ) : (
                    availableStatTitles.map(title => {
                      const isChecked = selectedQuizzes.includes(title);
                      return (
                        <label 
                          key={title} 
                          className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-xl cursor-pointer transition-colors"
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              if (e.target.checked) setSelectedQuizzes(prev => [...prev, title]);
                              else setSelectedQuizzes(prev => prev.filter(t => t !== title));
                            }}
                            className="accent-[#003366] w-4 h-4 cursor-pointer"
                          />
                          <span className={`text-xs font-bold ${isChecked ? 'text-[#003366]' : 'text-gray-500'}`}>
                            {title}
                          </span>
                        </label>
                      );
                    })
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

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
                    style={{ height: `${Math.max(monthData.accuracy, 10)}%` }} 
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

      <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm mt-8">
        <h3 className="text-xl font-black text-[#003366] uppercase tracking-tighter mb-2">
          Gerenciamento de Resultados (Histórico Bruto)
        </h3>
        <p className="text-xs text-gray-500 font-medium mb-6">Listagem dos resultados que compõem as estatísticas atuais. Exclua execuções de teste para limpar os gráficos.</p>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="p-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Data / Hora</th>
                <th className="p-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Simulado</th>
                <th className="p-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Modalidade</th>
                <th className="p-4 text-[10px] font-black uppercase tracking-widest text-gray-400 text-center">Acertos</th>
                <th className="p-4 text-[10px] font-black uppercase tracking-widest text-gray-400 text-center">Ação</th>
              </tr>
            </thead>
            <tbody>
              {analytics.rawResults.slice(0, 50).map((qr, idx) => {
                const dateRaw = normalizeTimestamp(qr.createdAt) || Date.now();
                const displayDate = new Date(dateRaw).toLocaleString();
                const scorePerc = Math.round(((qr.score || 0) / (qr.total || 1)) * 100);

                return (
                  <tr key={qr.id || idx} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                    <td className="p-4 font-medium text-gray-600 text-xs">{displayDate}</td>
                    <td className="p-4 font-bold text-[#003366]">{qr.quizTitle || 'Geral'}</td>
                    <td className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wide">{qr.type || 'teorico'}</td>
                    <td className="p-4 text-center font-black">
                      <span className={scorePerc >= 70 ? 'text-emerald-600' : scorePerc >= 50 ? 'text-amber-600' : 'text-red-600'}>
                        {qr.score}/{qr.total} ({scorePerc}%)
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      <button 
                        onClick={() => handleDeleteResult(qr.id)}
                        disabled={!qr.id}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all disabled:opacity-30"
                        title="Excluir este resultado permanentemente"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                );
              })}
              {analytics.rawResults.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-gray-400 text-xs font-bold">
                    Nenhum resultado encontrado para o período/filtro selecionado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          {analytics.rawResults.length > 50 && (
             <p className="text-center text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-4">
               Mostrando os últimos 50 resultados (Total: {analytics.rawResults.length}). Use os filtros para refinar a busca.
             </p>
          )}
        </div>
      </div>

    </div>
  );
};

export default AdminStats;