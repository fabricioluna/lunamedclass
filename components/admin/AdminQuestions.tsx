import React, { useState, useMemo } from 'react';
import { Question, SimulationInfo } from '../../types';
import { Trash2, Edit3, X } from 'lucide-react';
import { parseResilientCSV } from '../../utils/csvHelper'; // Função agora vem exclusivamente do utilitário

interface AdminQuestionsProps {
  questions: Question[];
  disciplines: SimulationInfo[];
  onAddQuestions: (qs: Question[]) => void;
  onUpdateQuestion: (q: Question) => void;
  onRemoveQuestion: (id: string) => void;
  onClearQuestions: (disciplineId?: string) => void;
  onRemoveQuiz: (quizTitle: string, disciplineId?: string) => void;
}

const AdminQuestions: React.FC<AdminQuestionsProps> = ({
  questions,
  disciplines,
  onAddQuestions,
  onUpdateQuestion,
  onRemoveQuestion,
  onClearQuestions,
  onRemoveQuiz
}) => {
  // ESTADOS DE FILTRO
  const [discFilter, setDiscFilter] = useState(''); 
  const [themeFilter, setThemeFilter] = useState('');
  const [quizFilter, setQuizFilter] = useState(''); 

  // ESTADOS DE IMPORTAÇÃO CSV
  const [qDiscipline, setQDiscipline] = useState('');
  const [qTheme, setQTheme] = useState('');
  const [qTitle, setQTitle] = useState(''); 
  const [qAuthor, setQAuthor] = useState(''); 
  const [qFile, setQFile] = useState<File | null>(null);

  // ESTADOS DO MODAL DE EDIÇÃO / ADIÇÃO MANUAL
  const [isQuestionModalOpen, setIsQuestionModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [editingQId, setEditingQId] = useState<string>('');
  
  const [mqDiscipline, setMqDiscipline] = useState('');
  const [mqTheme, setMqTheme] = useState('');
  const [mqQuizTitle, setMqQuizTitle] = useState('');
  const [mqText, setMqText] = useState('');
  const [mqOptions, setMqOptions] = useState<string[]>(['', '', '', '']);
  const [mqAnswer, setMqAnswer] = useState(0);
  const [mqExplanation, setMqExplanation] = useState('');

  const uniqueQuizzes = useMemo(() => {
    const titles = new Set<string>();
    questions.forEach(q => {
      if (q.quizTitle && (!discFilter || q.disciplineId === discFilter)) {
        titles.add(q.quizTitle);
      }
    });
    return Array.from(titles).sort();
  }, [questions, discFilter]);

  const handleQuestionImport = (e: React.FormEvent) => {
    e.preventDefault();
    if (!qFile || !qDiscipline || !qTheme || !qTitle) {
      return alert('Por favor, preencha a disciplina, o tema e dê um título ao simulado!');
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        // Usa a função do csvHelper
        const lines = parseResilientCSV(text, 8); 
        
        const newQs: Question[] = lines.slice(1).map((line, idx) => {
          const parts = line.split(';');
          return {
            id: `q_${Date.now()}_${idx}`,
            disciplineId: qDiscipline,
            theme: qTheme,
            q: parts[0]?.trim() || '',
            options: [parts[1]?.trim() || '', parts[2]?.trim() || '', parts[3]?.trim() || '', parts[4]?.trim() || ''],
            answer: parseInt(parts[5]?.trim() || '0', 10),
            explanation: parts[6]?.trim() || '',
            tag: parts[7]?.trim() === 'true' ? 'Prática' : 'Teórica',
            isPractical: parts[7]?.trim() === 'true',
            quizTitle: qTitle,   
            author: qAuthor || 'Equipe' 
          };
        });
        onAddQuestions(newQs);
        alert(`${newQs.length} questões adicionadas ao simulado "${qTitle}"!`);
        setQFile(null);
        setQTitle('');
        setQAuthor('');
      } catch (err: any) { 
        alert('Erro ao ler o CSV de questões: ' + err.message); 
      }
    };
    reader.readAsText(qFile);
  };

  const handleOpenAddModal = () => {
    setModalMode('add');
    setEditingQId('');
    setMqDiscipline(discFilter || '');
    setMqTheme(themeFilter || '');
    setMqQuizTitle(quizFilter || '');
    setMqText('');
    setMqOptions(['', '', '', '']);
    setMqAnswer(0);
    setMqExplanation('');
    setIsQuestionModalOpen(true);
  };

  const handleOpenEditModal = (q: Question) => {
    setModalMode('edit');
    setEditingQId(q.id);
    setMqDiscipline(q.disciplineId);
    setMqTheme(q.theme);
    setMqQuizTitle(q.quizTitle || '');
    setMqText(q.q);
    
    const safeOptions = [...q.options];
    while(safeOptions.length < 4) safeOptions.push('');
    setMqOptions(safeOptions);
    
    setMqAnswer(q.answer);
    setMqExplanation(q.explanation);
    setIsQuestionModalOpen(true);
  };

  const handleSaveModalQuestion = () => {
    if (!mqDiscipline || !mqTheme || !mqQuizTitle || !mqText || mqOptions.some(o => !o.trim())) {
      return alert("Preencha a Disciplina, Tema, Simulado, o Enunciado e as 4 Alternativas!");
    }

    if (modalMode === 'edit') {
      const existingQ = questions.find(q => q.id === editingQId);
      if (existingQ) {
        onUpdateQuestion({
          ...existingQ,
          disciplineId: mqDiscipline,
          theme: mqTheme,
          quizTitle: mqQuizTitle,
          q: mqText,
          options: mqOptions,
          answer: mqAnswer,
          explanation: mqExplanation
        });
        alert("Questão atualizada com sucesso!");
      }
    } else {
      const newQ: Question = {
        id: `q_manual_${Date.now()}`,
        disciplineId: mqDiscipline,
        theme: mqTheme,
        quizTitle: mqQuizTitle,
        q: mqText,
        options: mqOptions,
        answer: mqAnswer,
        explanation: mqExplanation,
        tag: 'Teórica',
        isPractical: false,
        author: 'Admin'
      };
      onAddQuestions([newQ]);
      alert("Questão adicionada ao simulado com sucesso!");
    }
    setIsQuestionModalOpen(false);
  };

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in zoom-in duration-500">
        <div className="lg:col-span-4 bg-white p-8 rounded-[2.5rem] border shadow-sm h-fit">
          <h3 className="text-xl font-black text-[#003366] mb-6 uppercase tracking-tighter">Importar CSV Teórico</h3>
          <form onSubmit={handleQuestionImport} className="space-y-4">
            <select value={qDiscipline} onChange={e => setQDiscipline(e.target.value)} className="w-full p-4 bg-gray-50 rounded-xl font-bold text-sm outline-none border-2 border-transparent focus:border-[#003366]" required>
              <option value="">Disciplina...</option>
              {disciplines.map(d => <option key={d.id} value={d.id}>{d.title}</option>)}
            </select>
            <select value={qTheme} onChange={e => setQTheme(e.target.value)} className="w-full p-4 bg-gray-50 rounded-xl font-bold text-sm outline-none border-2 border-transparent focus:border-[#003366]" required>
              <option value="">Eixo Temático...</option>
              {disciplines.find(d => d.id === qDiscipline)?.themes?.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            
            <input type="text" placeholder="Nome do Simulado (Ex: P1 Cárdio Fafá)" value={qTitle} onChange={e => setQTitle(e.target.value)} maxLength={50} className="w-full p-4 bg-gray-50 rounded-xl font-bold text-sm outline-none border-2 border-transparent focus:border-[#003366]" required />
            <input type="text" placeholder="Autor (opcional)" value={qAuthor} onChange={e => setQAuthor(e.target.value)} maxLength={30} className="w-full p-4 bg-gray-50 rounded-xl font-bold text-sm outline-none border-2 border-transparent focus:border-[#003366]" />

            <input type="file" accept=".csv" onChange={e => setQFile(e.target.files ? e.target.files[0] : null)} className="w-full text-[10px] text-gray-400 font-black uppercase p-4 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200" required/>
            <button type="submit" disabled={!qFile} className="w-full bg-[#003366] text-white py-4 rounded-xl font-black uppercase text-[10px] tracking-widest shadow-lg hover:bg-[#D4A017] transition-all disabled:opacity-50">Subir Simulado 🚀</button>
          </form>
        </div>
        
        <div className="lg:col-span-8 bg-white p-8 rounded-[2.5rem] border shadow-sm">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4 border-b pb-4">
              <div className="flex flex-col gap-2">
                <h3 className="text-xl font-black text-[#003366] uppercase tracking-tighter">Gestão de Questões</h3>
                <div className="flex gap-2">
                  <button
                    onClick={handleOpenAddModal}
                    className="bg-[#D4A017] text-[#003366] px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest hover:scale-105 transition-all w-fit shadow-sm"
                  >
                    + Add Manual ✍️
                  </button>
                  <button
                    onClick={() => {
                      const pass = prompt(`⚠️ AÇÃO DESTRUTIVA: Apagar as questões ${discFilter ? 'da disciplina selecionada' : 'de TODAS as disciplinas'}?\nDigite a senha (fmst8) para confirmar:`);
                      if (pass === 'fmst8') {
                        onClearQuestions(discFilter || undefined);
                        alert("✅ Questões apagadas com sucesso.");
                      } else if (pass !== null) alert("❌ Senha incorreta.");
                    }}
                    className="bg-red-100 text-red-600 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-red-200 transition-all w-fit"
                  >
                    Apagar {discFilter ? 'da Disciplina' : 'Tudo'} 🗑️
                  </button>
                </div>
              </div>
              
              <div className="flex flex-wrap gap-2 items-center">
                  <select value={discFilter} onChange={e => { setDiscFilter(e.target.value); setThemeFilter(''); setQuizFilter(''); }} className="p-3 bg-gray-50 rounded-xl text-[10px] font-black uppercase outline-none border-2 border-transparent focus:border-[#003366]">
                    <option value="">Todas Disciplinas</option>
                    {disciplines.map(d => <option key={d.id} value={d.id}>{d.title}</option>)}
                  </select>
                  
                  <select value={themeFilter} onChange={e => setThemeFilter(e.target.value)} disabled={!discFilter} className="p-3 bg-gray-50 rounded-xl text-[10px] font-black uppercase outline-none border-2 border-transparent focus:border-[#003366] disabled:opacity-50 disabled:cursor-not-allowed">
                    <option value="">Todos os Temas</option>
                    {discFilter && disciplines.find(d => d.id === discFilter)?.themes?.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                  
                  <select value={quizFilter} onChange={e => setQuizFilter(e.target.value)} className="p-3 bg-gray-50 rounded-xl text-[10px] font-black uppercase outline-none border-2 border-transparent focus:border-[#003366] max-w-[200px] truncate">
                    <option value="">Todos os Simulados</option>
                    {uniqueQuizzes.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>

                  {quizFilter && (
                    <button
                      onClick={() => {
                        if (confirm(`⚠️ Tem a certeza que deseja APAGAR COMPLETAMENTE o simulado "${quizFilter}"?\n\nEsta ação irá remover todas as questões ligadas a este simulado do banco de dados.`)) {
                          onRemoveQuiz(quizFilter, discFilter || undefined);
                          setQuizFilter('');
                          alert(`✅ Simulado "${quizFilter}" apagado com sucesso!`);
                        }
                      }}
                      className="bg-red-500 text-white px-3 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-600 shadow-md transition-all flex items-center gap-1"
                      title="Apagar este simulado por completo"
                    >
                      <Trash2 size={14}/> Excluir Simulado
                    </button>
                  )}
              </div>
            </div>
            
            <div className="max-h-[600px] overflow-y-auto space-y-3 pr-2">
              {questions.filter(q => (!discFilter || q.disciplineId === discFilter) && (!themeFilter || q.theme === themeFilter) && (!quizFilter || q.quizTitle === quizFilter)).map(q => (
                <div key={q.id} className="p-4 bg-gray-50 rounded-2xl border flex justify-between items-start gap-4 group hover:border-[#D4A017] transition-all">
                  <div>
                    <p className="text-xs font-bold text-gray-700 leading-snug">{q.q}</p>
                    <div className="flex gap-2 mt-2 flex-wrap">
                        <span className="text-[8px] font-black uppercase tracking-widest bg-white px-2 py-0.5 rounded border text-[#003366]">{q.disciplineId}</span>
                        <span className="text-[8px] font-black uppercase tracking-widest bg-white px-2 py-0.5 rounded border text-[#D4A017]">{q.theme}</span>
                        {q.quizTitle && <span className="text-[8px] font-black uppercase tracking-widest bg-blue-50 px-2 py-0.5 rounded border border-blue-200 text-blue-800">📄 {q.quizTitle}</span>}
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 pt-1">
                    <button onClick={() => handleOpenEditModal(q)} className="text-blue-400 hover:text-blue-600 transition-colors bg-white p-1.5 rounded-lg border shadow-sm" title="Editar Questão">
                      <Edit3 size={16}/>
                    </button>
                    <button onClick={() => confirm("Excluir esta questão?") && onRemoveQuestion(q.id)} className="text-red-400 hover:text-red-600 transition-colors bg-white p-1.5 rounded-lg border shadow-sm" title="Excluir Questão">
                      <Trash2 size={16}/>
                    </button>
                  </div>
                </div>
              ))}
              {questions.filter(q => (!discFilter || q.disciplineId === discFilter) && (!themeFilter || q.theme === themeFilter) && (!quizFilter || q.quizTitle === quizFilter)).length === 0 && (
                <p className="text-center py-10 text-gray-300 italic font-bold">Nenhuma questão encontrada para este filtro.</p>
              )}
            </div>
        </div>
      </div>

      {/* MODAL SOBREPOSTO DE EDIÇÃO/CRIAÇÃO DE QUESTÃO (POPUP) */}
      {isQuestionModalOpen && (
        <div className="fixed inset-0 z-[100] bg-[#003366]/80 backdrop-blur-sm flex justify-center items-center p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-3xl rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[95vh]">
            
            <div className="p-6 md:px-8 border-b flex justify-between items-center bg-gray-50">
              <h3 className="text-xl md:text-2xl font-black text-[#003366] uppercase tracking-tighter">
                {modalMode === 'edit' ? '✏️ Editar Questão' : '➕ Nova Questão Manual'}
              </h3>
              <button onClick={() => setIsQuestionModalOpen(false)} className="text-gray-400 hover:text-red-500 transition-colors bg-white p-2 rounded-xl shadow-sm border">
                <X size={24}/>
              </button>
            </div>
            
            <div className="p-6 md:p-8 overflow-y-auto space-y-6 flex-1">
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div>
                   <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1 block">Disciplina</label>
                   <select value={mqDiscipline} onChange={e => { setMqDiscipline(e.target.value); setMqTheme(''); }} className="w-full p-4 bg-gray-50 rounded-xl font-bold text-sm border focus:border-[#003366] outline-none">
                     <option value="">Selecione...</option>
                     {disciplines.map(d => <option key={d.id} value={d.id}>{d.title}</option>)}
                   </select>
                 </div>
                 <div>
                   <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1 block">Tema</label>
                   <select value={mqTheme} onChange={e => setMqTheme(e.target.value)} className="w-full p-4 bg-gray-50 rounded-xl font-bold text-sm border focus:border-[#003366] outline-none" disabled={!mqDiscipline}>
                     <option value="">Selecione o Eixo...</option>
                     {mqDiscipline && disciplines.find(d => d.id === mqDiscipline)?.themes?.map(t => <option key={t} value={t}>{t}</option>)}
                   </select>
                 </div>
               </div>

               <div>
                 <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1 block">Simulado (Nome do Arquivo/Lista)</label>
                 <input type="text" value={mqQuizTitle} onChange={e => setMqQuizTitle(e.target.value)} placeholder="Ex: P1 Fisiologia" className="w-full p-4 bg-gray-50 rounded-xl font-bold text-sm border focus:border-[#003366] outline-none"/>
               </div>

               <div>
                 <label className="text-[10px] font-black uppercase tracking-widest text-[#003366] mb-1 block">Enunciado da Questão</label>
                 <textarea value={mqText} onChange={e => setMqText(e.target.value)} rows={3} placeholder="Digite a pergunta aqui..." className="w-full p-4 bg-gray-50 rounded-xl font-bold text-sm border focus:border-[#003366] outline-none resize-none"/>
               </div>

               <div className="space-y-3 bg-blue-50/50 p-4 md:p-6 rounded-2xl border border-blue-100">
                 <label className="text-[10px] font-black uppercase tracking-widest text-[#003366] block">Alternativas (Selecione a Correta)</label>
                 {mqOptions.map((opt, i) => (
                   <div key={i} className={`flex gap-3 items-center p-2 rounded-xl transition-all ${mqAnswer === i ? 'bg-emerald-50 border border-emerald-200' : ''}`}>
                     <input 
                       type="radio" 
                       name="correctAnswer" 
                       checked={mqAnswer === i} 
                       onChange={() => setMqAnswer(i)} 
                       className="w-5 h-5 accent-emerald-600 cursor-pointer"
                     />
                     <span className="font-black text-gray-400">{['A', 'B', 'C', 'D'][i]})</span>
                     <input 
                       type="text" 
                       value={opt} 
                       onChange={e => {
                         const newOpts = [...mqOptions];
                         newOpts[i] = e.target.value;
                         setMqOptions(newOpts);
                       }} 
                       placeholder={`Alternativa ${i + 1}`} 
                       className="w-full p-3 bg-white rounded-xl font-medium text-sm border outline-none focus:border-[#003366]"
                     />
                   </div>
                 ))}
               </div>

               <div>
                 <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1 block">Explicação / Feedback (Opcional)</label>
                 <textarea value={mqExplanation} onChange={e => setMqExplanation(e.target.value)} rows={2} placeholder="Por que essa é a resposta certa?" className="w-full p-4 bg-gray-50 rounded-xl font-medium text-sm border focus:border-[#003366] outline-none resize-none"/>
               </div>
            </div>

            <div className="p-6 md:px-8 border-t bg-gray-50 flex justify-end gap-3 shrink-0">
              <button onClick={() => setIsQuestionModalOpen(false)} className="px-6 py-3 rounded-xl font-bold text-gray-500 hover:bg-gray-200 transition-all">Cancelar</button>
              <button onClick={handleSaveModalQuestion} className="px-6 py-3 rounded-xl font-black uppercase tracking-widest bg-[#003366] text-white hover:bg-[#D4A017] transition-all shadow-md">
                Salvar Questão
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default AdminQuestions;