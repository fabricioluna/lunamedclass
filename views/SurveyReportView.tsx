import React, { useEffect, useState } from 'react';
import { ChevronLeft, BarChart3, PieChart, HeartHandshake, MessageSquare, TrendingUp, Users, Printer, Stethoscope } from 'lucide-react';
import { ref, get } from 'firebase/database';
import { db } from '../firebase';
import { SurveyResponse } from '../types';

interface SurveyReportViewProps {
  onBack: () => void;
}

const SurveyReportView: React.FC<SurveyReportViewProps> = ({ onBack }) => {
  const [data, setData] = useState<SurveyResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchSurveys = async () => {
      if (!db) return;
      try {
        const snapshot = await get(ref(db, 'surveys'));
        if (snapshot.exists()) {
          const rawData = snapshot.val();
          const parsedData = Object.values(rawData) as SurveyResponse[];
          setData(parsedData.filter(d => d.unit === 'Turma 9 - HM1'));
        }
      } catch (error) {
        console.error("Erro ao buscar dados:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchSurveys();
  }, []);

  const handlePrint = () => {
    window.print();
  };

  if (isLoading) {
    return (
      <div className="flex-grow flex flex-col items-center justify-center p-6 bg-[#f4f7f6]">
        <div className="w-12 h-12 border-4 border-[#003366]/20 border-t-[#D4A017] rounded-full animate-spin mb-4"></div>
        <h2 className="text-[#003366] font-black uppercase tracking-widest text-xs">Tabulando Dados Estatísticos...</h2>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="flex-grow flex flex-col items-center justify-center p-6 bg-[#f4f7f6] text-center">
        <BarChart3 className="w-16 h-16 text-gray-300 mb-4" />
        <h2 className="text-xl font-black text-gray-500 mb-2">Nenhum dado coletado</h2>
        <p className="text-gray-400 text-sm mb-6">Nenhum aluno da Turma 9 respondeu à pesquisa ainda.</p>
        <button onClick={onBack} className="bg-[#003366] text-white px-6 py-2 rounded-xl font-bold hover:bg-[#002244]">Voltar</button>
      </div>
    );
  }

  // === MOTOR ESTATÍSTICO ===
  const total = data.length;

  const usageCounts = data.reduce((acc, curr) => {
    acc[curr.answers.usagePattern] = (acc[curr.answers.usagePattern] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const avgLikert = {
    timeSaved: (data.reduce((sum, d) => sum + d.answers.q2_timeSaved, 0) / total).toFixed(1),
    interface: (data.reduce((sum, d) => sum + d.answers.q3_interface, 0) / total).toFixed(1),
    simulators: (data.reduce((sum, d) => sum + d.answers.q4_simulators, 0) / total).toFixed(1),
    finalImpact: (data.reduce((sum, d) => sum + d.answers.q5_finalImpact, 0) / total).toFixed(1),
  };

  const npsData = data.filter(d => d.answers.q8_nps !== undefined && d.answers.q8_nps !== -1);
  const totalNps = npsData.length;
  let promoters = 0, passives = 0, detractors = 0;
  
  npsData.forEach(d => {
    if (d.answers.q8_nps >= 9) promoters++;
    else if (d.answers.q8_nps >= 7) passives++;
    else detractors++;
  });

  const npsScore = totalNps > 0 ? Math.round(((promoters - detractors) / totalNps) * 100) : 0;
  
  let npsZone = { label: 'Crítica', color: 'text-red-500', bg: 'bg-red-50' };
  if (npsScore >= 75) npsZone = { label: 'Excelência', color: 'text-green-500', bg: 'bg-green-50' };
  else if (npsScore >= 50) npsZone = { label: 'Qualidade', color: 'text-blue-500', bg: 'bg-blue-50' };
  else if (npsScore >= 0) npsZone = { label: 'Aperfeiçoamento', color: 'text-yellow-500', bg: 'bg-yellow-50' };

  return (
    <div className="w-full h-full bg-[#f4f7f6] print:bg-white">
      
      {/* ========================================================================= */}
      {/* 1. VISÃO WEB (DASHBOARD INTERATIVO) - SOME NA HORA DE IMPRIMIR            */}
      {/* ========================================================================= */}
      <div className="print:hidden flex flex-col pb-20 animate-in fade-in duration-500">
        <div className="bg-white p-4 flex items-center justify-between border-b sticky top-0 z-20 shadow-sm">
          <div className="flex items-center">
            <button onClick={onBack} className="p-2 mr-3 bg-gray-100 rounded-full text-[#003366] hover:bg-gray-200 transition-colors">
              <ChevronLeft size={24} />
            </button>
            <div>
              <h1 className="text-xl font-black text-[#003366] leading-tight">Relatório de Eficácia</h1>
              <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Habilidades Médicas 1</p>
            </div>
          </div>
          
          <button 
            onClick={handlePrint}
            className="flex items-center gap-2 bg-[#D4A017] text-white px-4 py-2 rounded-xl font-bold hover:bg-yellow-600 transition-colors text-xs uppercase tracking-wider shadow-sm"
          >
            <Printer size={16} />
            <span className="hidden sm:inline">Exportar PDF</span>
          </button>
        </div>

        <div className="p-4 md:p-8 max-w-5xl mx-auto w-full space-y-6">
          {/* KPI GLOBAL WEB */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col items-center justify-center text-center">
              <Users className="text-[#003366] mb-2" size={28} />
              <span className="text-3xl font-black text-[#003366]">{total}</span>
              <span className="text-[10px] uppercase font-bold text-gray-400 tracking-widest mt-1">Amostra (N)</span>
            </div>
            <div className={`col-span-2 md:col-span-3 p-6 rounded-3xl border flex items-center justify-between shadow-sm ${npsZone.bg} border-white`}>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <HeartHandshake className={npsZone.color} size={24} />
                  <h3 className={`text-sm font-black uppercase tracking-widest ${npsZone.color}`}>Net Promoter Score</h3>
                </div>
                <p className="text-xs text-gray-600 font-medium">Zona de {npsZone.label}</p>
              </div>
              <div className="text-right">
                <span className={`text-5xl font-black tracking-tighter ${npsZone.color}`}>{npsScore}</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* LIKERT WEB */}
            <div className="bg-white p-6 md:p-8 rounded-3xl border border-gray-100 shadow-sm">
              <div className="flex items-center gap-2 mb-6">
                <TrendingUp className="text-[#D4A017]" size={20} />
                <h3 className="font-black text-[#003366] text-lg">Métricas de Impacto (0-5)</h3>
              </div>
              <div className="space-y-6">
                {[
                  { label: 'Redução de Carga Mental', score: avgLikert.timeSaved },
                  { label: 'Usabilidade (TAM)', score: avgLikert.interface },
                  { label: 'Eficácia Prática / Diagnóstico', score: avgLikert.simulators },
                  { label: 'Autoeficácia / Redução Ansiedade', score: avgLikert.finalImpact },
                ].map((metric, i) => (
                  <div key={i}>
                    <div className="flex justify-between text-sm font-bold mb-2">
                      <span className="text-gray-600">{metric.label}</span>
                      <span className="text-[#003366]">{metric.score}</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
                      <div 
                        className="bg-gradient-to-r from-[#003366] to-[#00509e] h-3 rounded-full" 
                        style={{ width: `${(Number(metric.score) / 5) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* PADRÃO DE USO WEB */}
            <div className="bg-white p-6 md:p-8 rounded-3xl border border-gray-100 shadow-sm">
              <div className="flex items-center gap-2 mb-6">
                <PieChart className="text-[#D4A017]" size={20} />
                <h3 className="font-black text-[#003366] text-lg">Engajamento</h3>
              </div>
              <div className="space-y-4">
                {Object.entries(usageCounts).sort((a, b) => b[1] - a[1]).map(([pattern, count], i) => {
                  const percentage = Math.round((count / total) * 100);
                  return (
                    <div key={i} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center font-black text-[#003366] border border-gray-100">
                          {percentage}%
                        </div>
                        <span className="text-xs font-bold text-gray-600 max-w-[150px] leading-tight">{pattern}</span>
                      </div>
                      <span className="text-xl font-black text-gray-300">{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* QUALITATIVO WEB */}
          <div className="bg-white p-6 md:p-8 rounded-3xl border border-gray-100 shadow-sm">
            <div className="flex items-center gap-2 mb-6">
              <MessageSquare className="text-[#D4A017]" size={20} />
              <h3 className="font-black text-[#003366] text-lg">Análise de Discurso</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <h4 className="text-xs font-black uppercase tracking-widest text-gray-400 mb-4 border-b pb-2">O que mais ajudou</h4>
                <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                  {data.filter(d => d.answers.q6_bestFeature).map((d, i) => (
                    <div key={i} className="p-4 bg-blue-50/50 rounded-2xl text-sm text-gray-700 italic border border-blue-100/50">"{d.answers.q6_bestFeature}"</div>
                  ))}
                </div>
              </div>
              <div>
                <h4 className="text-xs font-black uppercase tracking-widest text-[#D4A017] mb-4 border-b pb-2">Expectativas N2</h4>
                <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                  {data.filter(d => d.answers.q7_nextUnit).map((d, i) => (
                    <div key={i} className="p-4 bg-yellow-50/50 rounded-2xl text-sm text-gray-700 italic border border-yellow-100/50">"{d.answers.q7_nextUnit}"</div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. VISÃO PDF (DOCUMENTO OFICIAL) - SÓ APARECE NA HORA DE IMPRIMIR         */}
      {/* ========================================================================= */}
      <div className="hidden print:block bg-white text-black w-full max-w-4xl mx-auto py-8">
        
        {/* CABEÇALHO ACADÊMICO OFICIAL */}
        <div className="flex items-center justify-between border-b-4 border-[#003366] pb-6 mb-8">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-[#003366] rounded-2xl flex items-center justify-center text-white" style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
              <Stethoscope size={32} />
            </div>
            <div>
              <h1 className="text-2xl font-black text-[#003366] uppercase tracking-widest leading-none">Luna MedClass</h1>
              <p className="text-sm font-bold text-gray-500 uppercase tracking-widest mt-1">Data Science Engine</p>
            </div>
          </div>
          <div className="text-right text-sm">
            <p className="font-bold text-[#003366] text-lg uppercase tracking-wider mb-1">Relatório Técnico</p>
            <p className="text-gray-600"><strong>Disciplina:</strong> Habilidades Médicas 1</p>
            <p className="text-gray-600"><strong>Amostra (N):</strong> {total} alunos</p>
            <p className="text-gray-600"><strong>Data:</strong> {new Date().toLocaleDateString()}</p>
          </div>
        </div>

        {/* MÉTRICAS PRINCIPAIS (NPS) */}
        <div className="mb-10 p-6 border-2 border-gray-200 rounded-2xl bg-gray-50 break-inside-avoid" style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
          <h2 className="text-lg font-black text-[#003366] uppercase tracking-widest border-b border-gray-300 pb-2 mb-4">1. Indicador de Aceitação Global</h2>
          <div className="flex justify-between items-center">
            <div>
              <p className="font-bold text-gray-700 text-lg">Net Promoter Score (NPS)</p>
              <p className="text-sm text-gray-500">Métrica de recomendação institucional para as próximas turmas.</p>
            </div>
            <div className="text-right">
              <span className={`text-4xl font-black ${npsZone.color}`}>{npsScore}</span>
              <p className={`text-xs font-bold uppercase tracking-widest ${npsZone.color}`}>Zona de {npsZone.label}</p>
            </div>
          </div>
        </div>

        {/* LIKERT - TABELA ACADÊMICA */}
        <div className="mb-10 break-inside-avoid">
          <h2 className="text-lg font-black text-[#003366] uppercase tracking-widest border-b-2 border-gray-200 pb-2 mb-4">2. Avaliação de Variáveis Latentes (Escala Likert 1-5)</h2>
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-100 text-[#003366] uppercase tracking-wider text-xs" style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
                <th className="p-3 border border-gray-300">Construto Avaliado</th>
                <th className="p-3 border border-gray-300 text-center">Média (μ)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="p-3 border border-gray-300 font-medium text-sm">Redução de Carga Mental (Teoria de Sweller)</td>
                <td className="p-3 border border-gray-300 text-center font-black text-[#003366]">{avgLikert.timeSaved}</td>
              </tr>
              <tr className="bg-gray-50" style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
                <td className="p-3 border border-gray-300 font-medium text-sm">Usabilidade e Interface (Modelo TAM)</td>
                <td className="p-3 border border-gray-300 text-center font-black text-[#003366]">{avgLikert.interface}</td>
              </tr>
              <tr>
                <td className="p-3 border border-gray-300 font-medium text-sm">Eficácia Diagnóstica Prática (Simulados)</td>
                <td className="p-3 border border-gray-300 text-center font-black text-[#003366]">{avgLikert.simulators}</td>
              </tr>
              <tr className="bg-gray-50" style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
                <td className="p-3 border border-gray-300 font-medium text-sm">Autoeficácia e Redução de Ansiedade (Teoria de Bandura)</td>
                <td className="p-3 border border-gray-300 text-center font-black text-[#003366]">{avgLikert.finalImpact}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* PADRÃO DE USO - LISTA */}
        <div className="mb-10 break-inside-avoid">
          <h2 className="text-lg font-black text-[#003366] uppercase tracking-widest border-b-2 border-gray-200 pb-2 mb-4">3. Frequência de Engajamento</h2>
          <div className="space-y-2">
            {Object.entries(usageCounts).sort((a, b) => b[1] - a[1]).map(([pattern, count], i) => {
              const percentage = Math.round((count / total) * 100);
              return (
                <div key={i} className="flex justify-between items-center border-b border-gray-200 py-2">
                  <span className="text-sm font-medium text-gray-700">{pattern}</span>
                  <span className="font-black text-[#003366]">{percentage}% <span className="text-gray-400 font-normal text-xs">(n={count})</span></span>
                </div>
              );
            })}
          </div>
        </div>

        {/* ANÁLISE DE DISCURSO (CITAÇÕES) - Removida a quebra de página forçada */}
        <div className="mt-10">
          <h2 className="text-lg font-black text-[#003366] uppercase tracking-widest border-b-2 border-gray-200 pb-2 mb-6">4. Análise Qualitativa de Discurso (Amostragem)</h2>
          
          <h3 className="text-sm font-black text-gray-500 uppercase tracking-widest mb-4">4.1. Funcionalidades de Maior Impacto na Prova</h3>
          <div className="space-y-4 mb-8">
            {data.filter(d => d.answers.q6_bestFeature).map((d, i) => (
              <div key={`pos-${i}`} className="pl-4 border-l-4 border-[#003366] text-sm text-gray-800 italic break-inside-avoid" style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
                "{d.answers.q6_bestFeature}"
              </div>
            ))}
          </div>

          <h3 className="text-sm font-black text-[#D4A017] uppercase tracking-widest mb-4" style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>4.2. Demandas e Expectativas para a N2</h3>
          <div className="space-y-4">
            {data.filter(d => d.answers.q7_nextUnit).map((d, i) => (
              <div key={`neg-${i}`} className="pl-4 border-l-4 border-[#D4A017] text-sm text-gray-800 italic break-inside-avoid" style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
                "{d.answers.q7_nextUnit}"
              </div>
            ))}
          </div>
        </div>
        
        {/* RODAPÉ DA IMPRESSÃO */}
        <div className="mt-12 pt-4 border-t border-gray-300 text-center text-xs text-gray-400 break-inside-avoid">
          Gerado automaticamente por Luna MedClass Data Engine.
        </div>

      </div>
    </div>
  );
};

export default SurveyReportView;