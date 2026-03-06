import React, { useState, useEffect } from 'react';
import { Question, OsceStation, SimulationInfo, Summary, QuizResult, ReferenceMaterial, LabSimulation, LabQuestion } from '../types.ts';
import { Trash2, Plus, BookOpen, Layers, BarChart3, FileText, ClipboardList, Stethoscope, Microscope, Loader2 } from 'lucide-react';

// IMPORTAÇÕES NOVAS DO FIREBASE (FIRESTORE E STORAGE) E DA IA
import { firestoreDB, storage } from '../firebase.ts';
import { collection, query, onSnapshot, doc, deleteDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { ref as storageRef, deleteObject, uploadBytes, getDownloadURL } from 'firebase/storage';
import { generateLabTips } from '../services/aiService.ts';

interface AdminViewProps {
  questions: Question[];
  osceStations: OsceStation[];
  disciplines: SimulationInfo[];
  summaries: Summary[];
  quizResults: QuizResult[];
  labSimulations?: LabSimulation[];
  onAddSummary: (s: Summary) => void;
  onRemoveSummary: (id: string) => void;
  onAddQuestions: (qs: Question[]) => void;
  onUpdateQuestion: (q: Question) => void;
  onAddOsceStations: (os: OsceStation[]) => void;
  onAddLabSimulation?: (sim: LabSimulation) => void;
  onRemoveLabSimulation?: (id: string) => void;
  onRemoveQuestion: (id: string) => void;
  onRemoveOsceStation: (id: string) => void;
  onClearDatabase: () => void;
  onClearResults: () => void;
  onClearQuestions: (disciplineId?: string) => void;
  onClearOsce: (disciplineId?: string) => void;
  onClearMaterials: (disciplineId?: string) => void;
  onClearLab?: (disciplineId?: string) => void;
  onAddTheme: (disciplineId: string, themeName: string) => void;
  onRemoveTheme: (disciplineId: string, themeName: string) => void;
  onUpdateReferences: (disciplineId: string, refs: ReferenceMaterial[]) => void;
  onBack: () => void;
}

const parseResilientCSV = (text: string, expectedColumns: number) => {
  const rawLines = text.split('\n');
  const mergedLines: string[] = [];
  let currentLine = '';

  for (let i = 0; i < rawLines.length; i++) {
    const line = rawLines[i].replace(/\r/g, '').trim();
    if (!line && !currentLine) continue;
    
    currentLine = currentLine ? currentLine + ' ' + line : line;
    const semicolonCount = (currentLine.match(/;/g) || []).length;
    
    if (semicolonCount >= expectedColumns - 1) {
      mergedLines.push(currentLine);
      currentLine = '';
    }
  }
  if (currentLine) mergedLines.push(currentLine);
  return mergedLines;
};

const AdminView: React.FC<AdminViewProps> = ({
  questions,
  osceStations,
  disciplines,
  quizResults,
  labSimulations = [],
  onAddQuestions,
  onAddOsceStations,
  onAddLabSimulation, 
  onRemoveQuestion,
  onRemoveOsceStation,
  onRemoveLabSimulation,
  onClearDatabase,
  onClearResults,
  onClearQuestions,
  onClearOsce,
  onClearLab,
  onAddTheme,
  onRemoveTheme,
  onUpdateReferences,
  onBack
}) => {
  const [isAuthorized, setIsAuthorized] = useState(() => sessionStorage.getItem('fms_admin_auth') === 'true');
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [activeTab, setActiveTab] = useState<'questions' | 'osce' | 'stats' | 'references' | 'materials' | 'themes' | 'lab'>('stats');
  
  const [discFilter, setDiscFilter] = useState(''); 
  const [themeFilter, setThemeFilter] = useState('');
  
  const [discFilterOsce, setDiscFilterOsce] = useState(''); 
  const [themeFilterOsce, setThemeFilterOsce] = useState(''); 

  const [discFilterMat, setDiscFilterMat] = useState(''); 
  const [discFilterLab, setDiscFilterLab] = useState('');
  const [selectedDiscId, setSelectedDiscId] = useState('');
  const [newTheme, setNewTheme] = useState('');
  
  const [refTitle, setRefTitle] = useState('');
  const [refAuthor, setRefAuthor] = useState('');
  const [refType, setRefType] = useState<'book' | 'article' | 'link' | 'video'>('book');
  const [refUrl, setRefUrl] = useState('');

  const [qDiscipline, setQDiscipline] = useState('');
  const [qTheme, setQTheme] = useState('');
  const [qFile, setQFile] = useState<File | null>(null);

  const [osceDiscipline, setOsceDiscipline] = useState('');
  const [osceTheme, setOsceTheme] = useState('');
  const [osceFile, setOsceFile] = useState<File | null>(null);
  const [oscePreview, setOscePreview] = useState<OsceStation[] | null>(null);

  const [matDisc, setMatDisc] = useState('');
  const [matType, setMatType] = useState<'summary' | 'script' | 'other'>('summary');
  const [matTitle, setMatTitle] = useState('');
  const [matUrl, setMatUrl] = useState('');

  const [liveMaterials, setLiveMaterials] = useState<Summary[]>([]);

  // === ESTADOS ESPECÍFICOS DO LABORATÓRIO ===
  const [labDisc, setLabDisc] = useState('');
  const [labTitle, setLabTitle] = useState('');
  const [labAuthor, setLabAuthor] = useState('');
  const [labDesc, setLabDesc] = useState('');
  const [labCsvFile, setLabCsvFile] = useState<File | null>(null);
  const [labImageFiles, setLabImageFiles] = useState<FileList | null>(null);
  const [isLabUploading, setIsLabUploading] = useState(false);
  const [labUploadProgress, setLabUploadProgress] = useState('');

  useEffect(() => {
    const q = query(collection(firestoreDB, "materials"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Summary[];
      const sortedDocs = docs.sort((a, b) => {
        const timeA = a.createdAt?.seconds || 0;
        const timeB = b.createdAt?.seconds || 0;
        return timeB - timeA;
      });
      setLiveMaterials(sortedDocs);
    });
    return () => unsubscribe();
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (login === 'luna' && password === 'fmst8') {
      setIsAuthorized(true);
      sessionStorage.setItem('fms_admin_auth', 'true');
    } else {
      alert('Credenciais incorretas!');
    }
  };

  const handleGlobalReset = () => {
    const pass = prompt("⚠️ AÇÃO DESTRUTIVA: Apagar absolutamente TODO o banco de dados?\n\nPara confirmar, digite a senha de administrador (fmst8):");
    if (pass === 'fmst8') {
      onClearDatabase();
      alert("✅ Banco de dados completamente resetado.");
    } else if (pass !== null) {
      alert("❌ Senha incorreta. Ação cancelada.");
    }
  };

  const handleAddTheme = () => {
    if (!selectedDiscId || !newTheme) return;
    onAddTheme(selectedDiscId, newTheme);
    setNewTheme('');
  };

  const handleAddReference = () => {
    if (!selectedDiscId || !refTitle) return;
    const currentDisc = disciplines.find(d => d.id === selectedDiscId);
    const newRef: ReferenceMaterial = {
      id: `ref_${Date.now()}`,
      title: refTitle,
      author: refAuthor,
      type: refType,
      url: refUrl
    };
    const updatedRefs = [...(currentDisc?.references || []), newRef];
    onUpdateReferences(selectedDiscId, updatedRefs);
    setRefTitle(''); setRefAuthor(''); setRefUrl('');
  };

  const handleRemoveReference = (refId: string) => {
    const currentDisc = disciplines.find(d => d.id === selectedDiscId);
    if (!currentDisc) return;
    const updatedRefs = (currentDisc.references || []).filter(r => r.id !== refId);
    onUpdateReferences(selectedDiscId, updatedRefs);
  };

  const handlePublishAdminMaterial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!matDisc || !matTitle || !matUrl) return;

    try {
      await addDoc(collection(firestoreDB, "materials"), {
        title: matTitle,
        author: "Administração",
        description: "Adicionado via Painel Admin",
        type: matType,
        disciplineId: matDisc,
        url: matUrl,
        date: new Date().toLocaleDateString('pt-BR'),
        label: 'LINK',
        size: 'Nuvem',
        createdAt: serverTimestamp()
      });
      setMatTitle(''); setMatUrl('');
      alert('Material publicado com sucesso!');
    } catch (error) {
      console.error(error);
      alert('Erro ao publicar material.');
    }
  };

  const handleDeleteLiveMaterial = async (mat: Summary) => {
    if (!confirm(`Excluir permanentemente o material "${mat.title || mat.label}"?`)) return;
    
    try {
      await deleteDoc(doc(firestoreDB, "materials", mat.id));
      if (mat.url && mat.url.includes("firebasestorage")) {
        try {
          const fileRef = storageRef(storage, mat.url);
          await deleteObject(fileRef);
        } catch (storageErr) {
          console.log("Arquivo físico não encontrado ou já deletado.");
        }
      }
    } catch (error) {
      console.error("Erro ao deletar:", error);
      alert("Erro ao excluir o material.");
    }
  };

  const handleClearLiveMaterials = async () => {
    const pass = prompt(`⚠️ AÇÃO DESTRUTIVA: Apagar os materiais ${discFilterMat ? 'da disciplina selecionada' : 'de TODAS as disciplinas'} e DESTRUIR OS ARQUIVOS PDFs DO SERVIDOR?\nDigite a senha (fmst8) para confirmar:`);
    if (pass === 'fmst8') {
      try {
        const matsToDelete = liveMaterials.filter(m => !discFilterMat || m.disciplineId === discFilterMat);
        for (const mat of matsToDelete) {
          await deleteDoc(doc(firestoreDB, "materials", mat.id));
          if (mat.url && mat.url.includes("firebasestorage")) {
            try { await deleteObject(storageRef(storage, mat.url)); } catch (e) {}
          }
        }
        alert("✅ Todos os materiais e arquivos foram apagados com sucesso.");
      } catch (error) {
        alert("Erro ao limpar materiais.");
      }
    } else if (pass !== null) {
      alert("❌ Senha incorreta.");
    }
  };

  // --- NOVA FUNÇÃO: O PROCESSAMENTO INTELIGENTE DO LABORATÓRIO COM BUSCA FLEXÍVEL DE EXTENSÃO ---
  const handleLabImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!labCsvFile || !labImageFiles || labImageFiles.length === 0 || !labDisc || !labTitle || !labAuthor) {
      return alert("Preencha todos os campos e selecione o CSV e as Imagens!");
    }
    
    setIsLabUploading(true);

    try {
      const filesArray = Array.from(labImageFiles as FileList); 
      
      setLabUploadProgress('Lendo o arquivo CSV...');
      const csvText = await labCsvFile.text();
      const lines = parseResilientCSV(csvText, 3); // Formato: NomeArquivo ; Pergunta ; Resposta

      const parsedLines = lines.slice(1).map(line => {
        const parts = line.split(';');
        return {
          filename: parts[0]?.trim(), // Agora pode ser '001' ou '001.jpg'
          question: parts[1]?.trim(),
          answer: parts[2]?.trim()
        };
      }).filter(l => l.filename && l.question && l.answer);

      if (parsedLines.length === 0) throw new Error("CSV vazio ou fora do formato (Identificador_Imagem ; Pergunta ; Resposta).");

      const finalQuestions: LabQuestion[] = [];

      for (let i = 0; i < parsedLines.length; i++) {
        const item = parsedLines[i];
        setLabUploadProgress(`Processando ${i + 1} de ${parsedLines.length}: ${item.filename}`);

        // A MÁGICA: Achar a imagem com ou sem a extensão!
        const imageFile = filesArray.find(f => {
          const nameWithoutExt = f.name.substring(0, f.name.lastIndexOf('.')) || f.name;
          return f.name === item.filename || nameWithoutExt === item.filename;
        });

        if (!imageFile) {
          throw new Error(`A imagem referente a "${item.filename}" não foi encontrada. Certifique-se de que selecionou todas as imagens.`);
        }

        const sRef = storageRef(storage, `lab_images/${labDisc}/${Date.now()}_${imageFile.name}`);
        const snap = await uploadBytes(sRef, imageFile as File); 
        const imageUrl = await getDownloadURL(snap.ref);

        setLabUploadProgress(`Gerando dicas de IA para: ${item.answer}...`);
        const aiTips = await generateLabTips(item.answer, item.question);

        finalQuestions.push({
          id: `lab_q_${Date.now()}_${i}`,
          imageUrl: imageUrl,
          question: item.question,
          answer: item.answer,
          aiIdentification: aiTips.identification,
          aiLocation: aiTips.location,
          aiFunctions: aiTips.functions
        });
      }

      setLabUploadProgress('Salvando Simulado no banco...');
      const newSim: LabSimulation = {
        id: `lab_sim_${Date.now()}`,
        disciplineId: labDisc,
        title: labTitle,
        author: labAuthor,
        description: labDesc,
        questions: finalQuestions,
        createdAt: Date.now()
      };

      if (onAddLabSimulation) onAddLabSimulation(newSim);
      alert(`✅ Sucesso! Simulado de Laboratório com ${finalQuestions.length} peças publicado. A IA gerou as dicas e as imagens foram hospedadas!`);
      
      setLabCsvFile(null); setLabImageFiles(null); setLabTitle(''); setLabDesc('');
      const imgInput = document.getElementById('labImageInput') as HTMLInputElement;
      if(imgInput) imgInput.value = '';
      const csvInput = document.getElementById('labCsvInput') as HTMLInputElement;
      if(csvInput) csvInput.value = '';

    } catch (err: any) { 
      alert('Erro no Upload: ' + err.message); 
    } finally {
      setIsLabUploading(false);
      setLabUploadProgress('');
    }
  };

  const handleDeleteLab = async (simId: string) => {
    if (!confirm("Excluir este simulado e TODAS as imagens vinculadas a ele do servidor?")) return;
    const sim = labSimulations.find(s => s.id === simId);
    if (!sim) return;

    if (onRemoveLabSimulation) onRemoveLabSimulation(simId);

    sim.questions.forEach(async (q) => {
      if (q.imageUrl && q.imageUrl.includes('firebasestorage')) {
        try { await deleteObject(storageRef(storage, q.imageUrl)); } catch (e) { console.log('Imagem já apagada'); }
      }
    });
  };

  // --- FUNÇÕES DE IMPORTAÇÃO (QUESTÕES / OSCE) --- //
  const handleQuestionImport = (e: React.FormEvent) => {
    e.preventDefault();
    if (!qFile || !qDiscipline || !qTheme) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
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
            isPractical: parts[7]?.trim() === 'true'
          };
        });
        onAddQuestions(newQs);
        alert(`${newQs.length} questões adicionadas com sucesso!`);
        setQFile(null);
      } catch (err: any) { 
        alert('Erro ao ler o CSV de questões: ' + err.message); 
      }
    };
    reader.readAsText(qFile);
  };

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
        correctOrderIndices: station.correctOrderIndices.filter((n: any) => n !== null && n !== undefined)
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

  if (!isAuthorized) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-4">
        <div className="bg-white p-10 rounded-[2.5rem] shadow-2xl border border-gray-100 w-full max-w-md text-center">
          <div className="w-20 h-20 bg-[#003366] text-white rounded-3xl flex items-center justify-center text-3xl mx-auto mb-6 shadow-xl">🔐</div>
          <h2 className="text-2xl font-black text-[#003366] mb-8 uppercase tracking-tighter">Acesso Restrito</h2>
          <form onSubmit={handleLogin} className="space-y-4">
            <input type="text" placeholder="Usuário" value={login} onChange={e => setLogin(e.target.value)} className="w-full p-4 bg-gray-50 rounded-xl outline-none border-2 border-transparent focus:border-[#D4A017] font-bold" />
            <input type="password" placeholder="Senha" value={password} onChange={e => setPassword(e.target.value)} className="w-full p-4 bg-gray-50 rounded-xl outline-none border-2 border-transparent focus:border-[#D4A017] font-bold" />
            <button type="submit" className="w-full bg-[#003366] text-white py-4 rounded-xl font-bold uppercase tracking-widest shadow-lg hover:bg-[#D4A017] hover:text-[#003366] transition-all">Entrar</button>
            <button type="button" onClick={onBack} className="w-full text-[10px] font-black text-gray-400 mt-4 uppercase tracking-widest">Voltar ao Portal</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <div className="flex flex-col md:flex-row justify-between items-center mb-10 border-b pb-8 gap-4">
        <div className="flex items-center gap-4">
           <button onClick={onBack} className="bg-gray-100 p-3 rounded-xl hover:bg-gray-200 transition-all text-[#003366]">←</button>
           <div>
             <h2 className="text-3xl font-black text-[#003366] tracking-tighter uppercase">Painel de Controle</h2>
             <p className="text-[10px] font-black text-[#D4A017] uppercase tracking-widest">Gestão de Dados em Nuvem</p>
           </div>
        </div>
        <div className="flex gap-2">
           <button onClick={onClearResults} className="bg-orange-100 text-orange-600 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-orange-200 transition-all">Limpar Resultados</button>
           <button onClick={handleGlobalReset} className="bg-red-500 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-600 shadow-lg transition-all">Resetar Banco Total</button>
        </div>
      </div>

      <nav className="flex flex-wrap gap-2 mb-12">
        {[
          { id: 'stats', label: 'Estatísticas', icon: <BarChart3 size={16}/> },
          { id: 'themes', label: 'Temas/Eixos', icon: <Layers size={16}/> },
          { id: 'questions', label: 'Questões', icon: <FileText size={16}/> },
          { id: 'osce', label: 'OSCE', icon: <Stethoscope size={16}/> },
          { id: 'lab', label: 'Laboratório IA', icon: <Microscope size={16}/> },
          { id: 'references', label: 'Referências', icon: <BookOpen size={16}/> },
          { id: 'materials', label: 'Materiais', icon: <ClipboardList size={16}/> },
        ].map(tab => (
          <button 
            key={tab.id}
            onClick={() => { setActiveTab(tab.id as any); }} 
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all
              ${activeTab === tab.id ? 'bg-[#003366] text-white shadow-xl scale-105' : 'bg-white text-gray-400 border border-gray-100 hover:border-gray-300'}
            `}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </nav>

      {/* VIEW: ESTATÍSTICAS */}
      {activeTab === 'stats' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 animate-in fade-in duration-500">
          <div className="bg-[#003366] p-8 rounded-[2.5rem] text-white shadow-xl relative overflow-hidden">
             <div className="absolute -right-4 -bottom-4 text-6xl opacity-10">📝</div>
             <p className="text-[9px] font-black uppercase tracking-widest opacity-60 mb-2">Simulados Realizados</p>
             <h4 className="text-5xl font-black">{quizResults.length}</h4>
          </div>
          <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm">
             <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-2">Total de Questões</p>
             <h4 className="text-5xl font-black text-[#003366]">{questions.length}</h4>
          </div>
          <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm">
             <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-2">Estações OSCE</p>
             <h4 className="text-5xl font-black text-[#003366]">{osceStations.length}</h4>
          </div>
          <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm">
             <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-2">Labs Virtuais</p>
             <h4 className="text-5xl font-black text-[#D4A017]">{labSimulations.length}</h4>
          </div>
        </div>
      )}

      {/* VIEW: NOVO LABORATÓRIO IA */}
      {activeTab === 'lab' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in zoom-in duration-500">
          <div className="lg:col-span-5 bg-white p-8 rounded-[2.5rem] border shadow-sm h-fit">
            <h3 className="text-xl font-black text-[#003366] mb-2 uppercase tracking-tighter">Criar Lab com IA</h3>
            <p className="text-[10px] font-bold text-gray-400 mb-6 leading-relaxed">
              1. Selecione o CSV. A coluna de imagens pode ter apenas o nome (Ex: <b>001</b> ou <b>001.jpg</b>).<br/>
              2. Selecione TODAS as imagens do computador.<br/>
              A Inteligência Artificial vai gerar as dicas baseadas nas suas respostas!
            </p>
            
            <form onSubmit={handleLabImport} className="space-y-4">
              <select value={labDisc} onChange={e => setLabDisc(e.target.value)} className="w-full p-4 bg-gray-50 rounded-xl font-bold text-sm outline-none border-2 border-transparent focus:border-[#003366]" required disabled={isLabUploading}>
                <option value="">Selecione a Disciplina...</option>
                {disciplines.map(d => <option key={d.id} value={d.id}>{d.title}</option>)}
              </select>
              <input type="text" placeholder="Título (Ex: P1 Histologia)" value={labTitle} onChange={e => setLabTitle(e.target.value)} className="w-full p-4 bg-gray-50 rounded-xl font-bold text-sm outline-none" required disabled={isLabUploading} />
              <input type="text" placeholder="Autor (Seu Nome)" value={labAuthor} onChange={e => setLabAuthor(e.target.value)} className="w-full p-4 bg-gray-50 rounded-xl font-bold text-sm outline-none" required disabled={isLabUploading} />
              <textarea placeholder="Descrição para os alunos..." value={labDesc} onChange={e => setLabDesc(e.target.value)} className="w-full p-4 bg-gray-50 rounded-xl font-bold text-sm outline-none resize-none" rows={2} disabled={isLabUploading}></textarea>
              
              <div className="bg-gray-50 p-4 rounded-xl border-2 border-dashed border-gray-200">
                <label className="block text-[10px] font-black uppercase text-[#003366] mb-2">1. Selecione o arquivo CSV</label>
                <input id="labCsvInput" type="file" accept=".csv" onChange={e => setLabCsvFile(e.target.files ? e.target.files[0] : null)} className="w-full text-xs text-gray-700 font-bold" required disabled={isLabUploading} />
              </div>

              <div className="bg-emerald-50/50 p-4 rounded-xl border-2 border-dashed border-emerald-200">
                <label className="block text-[10px] font-black uppercase text-emerald-700 mb-2">2. Selecione TODAS as Imagens</label>
                <input id="labImageInput" type="file" accept="image/*" multiple onChange={e => setLabImageFiles(e.target.files)} className="w-full text-xs text-emerald-700 font-bold" required disabled={isLabUploading} />
                {labImageFiles && <p className="text-[9px] font-black mt-2 text-emerald-600">{labImageFiles.length} imagens selecionadas.</p>}
              </div>

              <button type="submit" disabled={isLabUploading || !labCsvFile || !labImageFiles} className="w-full bg-[#003366] text-white py-4 rounded-xl font-black uppercase text-[10px] tracking-widest shadow-lg hover:bg-[#D4A017] transition-all disabled:opacity-50 flex justify-center items-center gap-2">
                {isLabUploading ? <Loader2 size={16} className="animate-spin"/> : <Microscope size={16}/>}
                {isLabUploading ? 'Processando com IA...' : 'Enviar Simulado Mágico'}
              </button>

              {isLabUploading && (
                <div className="bg-blue-50 text-[#003366] p-3 rounded-xl text-xs font-bold text-center animate-pulse border border-blue-200">
                  {labUploadProgress}
                </div>
              )}
            </form>
          </div>
          
          <div className="lg:col-span-7 bg-white p-8 rounded-[2.5rem] border shadow-sm">
             <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4 border-b pb-4">
                <div className="flex flex-col gap-2">
                  <h3 className="text-xl font-black text-[#003366] uppercase tracking-tighter">Labs em Nuvem</h3>
                  <button onClick={() => { if (prompt(`⚠️ Apagar Labs?\nSenha (fmst8):`) === 'fmst8') onClearLab && onClearLab(discFilterLab || undefined); }} className="bg-red-100 text-red-600 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-red-200 transition-all w-fit">Apagar {discFilterLab ? 'da Disciplina' : 'Tudo'} 🗑️</button>
                </div>
                <select value={discFilterLab} onChange={e => setDiscFilterLab(e.target.value)} className="p-3 bg-gray-50 rounded-xl text-[10px] font-black uppercase outline-none border-2 border-transparent focus:border-[#003366]">
                  <option value="">Todas Disciplinas</option>
                  {disciplines.map(d => <option key={d.id} value={d.id}>{d.title}</option>)}
                </select>
             </div>
             <div className="max-h-[600px] overflow-y-auto space-y-3 pr-2">
                {labSimulations.filter(s => !discFilterLab || s.disciplineId === discFilterLab).map(s => (
                  <div key={s.id} className="p-5 bg-emerald-50/40 rounded-[1.5rem] border border-emerald-100 flex justify-between items-center group transition-all hover:border-red-100">
                    <div>
                      <h4 className="font-bold text-[#003366] text-sm mb-1">{s.title} <span className="text-gray-400 font-medium text-xs">({s.questions.length} peças)</span></h4>
                      <p className="text-[9px] font-black uppercase text-[#D4A017] tracking-widest">{s.disciplineId} • Por {s.author}</p>
                    </div>
                    <button onClick={() => handleDeleteLab(s.id)} className="text-red-300 hover:text-red-500 transition-colors p-2" title="Deletar Simulado e Imagens do Servidor">
                      <Trash2 size={20}/>
                    </button>
                  </div>
                ))}
                {labSimulations.filter(s => !discFilterLab || s.disciplineId === discFilterLab).length === 0 && <p className="text-center py-10 text-gray-300 italic font-bold">Nenhum simulado de laboratório cadastrado.</p>}
             </div>
          </div>
        </div>
      )}

      {/* VIEW: TEMAS */}
      {activeTab === 'themes' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in slide-in-from-right-10 duration-500">
          <div className="lg:col-span-1 bg-white p-8 rounded-[2.5rem] border shadow-sm h-fit">
            <h3 className="text-xl font-black text-[#003366] mb-6 uppercase tracking-tighter">Novo Eixo Temático</h3>
            <div className="space-y-4">
              <select value={selectedDiscId} onChange={e => setSelectedDiscId(e.target.value)} className="w-full p-4 bg-gray-50 rounded-xl font-bold text-sm outline-none border-2 border-transparent focus:border-[#D4A017]">
                <option value="">Selecione a Disciplina...</option>
                {disciplines.map(d => <option key={d.id} value={d.id}>{d.title}</option>)}
              </select>
              <input type="text" placeholder="Nome do Tema (ex: Fisiologia Renal)" value={newTheme} onChange={e => setNewTheme(e.target.value)} className="w-full p-4 bg-gray-50 rounded-xl font-bold text-sm outline-none border-2 border-transparent focus:border-[#D4A017]" />
              <button onClick={handleAddTheme} className="w-full bg-[#003366] text-white py-4 rounded-xl font-black uppercase text-[10px] tracking-widest shadow-lg flex items-center justify-center gap-2 hover:bg-[#D4A017] transition-all">
                <Plus size={16}/> Adicionar Tema
              </button>
            </div>
          </div>
          <div className="lg:col-span-2 space-y-4">
            {selectedDiscId ? (
              <div className="bg-white p-8 rounded-[2.5rem] border shadow-sm">
                <h3 className="text-xl font-black text-[#003366] mb-6 uppercase tracking-tighter">Temas de {disciplines.find(d => d.id === selectedDiscId)?.title}</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {disciplines.find(d => d.id === selectedDiscId)?.themes?.map(theme => (
                    <div key={theme} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border group hover:border-[#D4A017] transition-all">
                      <span className="text-xs font-bold text-gray-700">{theme}</span>
                      <button onClick={() => confirm(`Excluir tema "${theme}"?`) && onRemoveTheme(selectedDiscId, theme)} className="text-red-300 hover:text-red-500 transition-colors">
                        <Trash2 size={16}/>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="bg-gray-50 h-64 rounded-[2.5rem] border-2 border-dashed flex flex-col items-center justify-center text-gray-400">
                 <Layers size={48} className="mb-4 opacity-20"/>
                 <p className="font-bold italic">Selecione uma disciplina para gerenciar temas</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* VIEW: QUESTÕES */}
      {activeTab === 'questions' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in zoom-in duration-500">
          <div className="lg:col-span-4 bg-white p-8 rounded-[2.5rem] border shadow-sm h-fit">
            <h3 className="text-xl font-black text-[#003366] mb-6 uppercase tracking-tighter">Importar CSV</h3>
            <form onSubmit={handleQuestionImport} className="space-y-4">
              <select value={qDiscipline} onChange={e => setQDiscipline(e.target.value)} className="w-full p-4 bg-gray-50 rounded-xl font-bold text-sm outline-none border-2 border-transparent focus:border-[#003366]" required>
                <option value="">Disciplina...</option>
                {disciplines.map(d => <option key={d.id} value={d.id}>{d.title}</option>)}
              </select>
              <select value={qTheme} onChange={e => setQTheme(e.target.value)} className="w-full p-4 bg-gray-50 rounded-xl font-bold text-sm outline-none border-2 border-transparent focus:border-[#003366]" required>
                <option value="">Eixo Temático...</option>
                {disciplines.find(d => d.id === qDiscipline)?.themes?.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              <input type="file" accept=".csv" onChange={e => setQFile(e.target.files ? e.target.files[0] : null)} className="w-full text-[10px] text-gray-400 font-black uppercase p-4 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200" />
              <button type="submit" disabled={!qFile} className="w-full bg-[#003366] text-white py-4 rounded-xl font-black uppercase text-[10px] tracking-widest shadow-lg hover:bg-[#D4A017] transition-all disabled:opacity-50">Subir Questões 🚀</button>
            </form>
          </div>
          
          <div className="lg:col-span-8 bg-white p-8 rounded-[2.5rem] border shadow-sm">
             <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4 border-b pb-4">
                <div className="flex flex-col gap-2">
                  <h3 className="text-xl font-black text-[#003366] uppercase tracking-tighter">Gestão de Questões</h3>
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
                <div className="flex flex-wrap gap-2">
                    <select value={discFilter} onChange={e => { setDiscFilter(e.target.value); setThemeFilter(''); }} className="p-3 bg-gray-50 rounded-xl text-[10px] font-black uppercase outline-none border-2 border-transparent focus:border-[#003366]">
                      <option value="">Todas Disciplinas</option>
                      {disciplines.map(d => <option key={d.id} value={d.id}>{d.title}</option>)}
                    </select>
                    <select value={themeFilter} onChange={e => setThemeFilter(e.target.value)} disabled={!discFilter} className="p-3 bg-gray-50 rounded-xl text-[10px] font-black uppercase outline-none border-2 border-transparent focus:border-[#003366] disabled:opacity-50 disabled:cursor-not-allowed">
                      <option value="">Todos os Temas</option>
                      {discFilter && disciplines.find(d => d.id === discFilter)?.themes?.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                </div>
             </div>
             <div className="max-h-[600px] overflow-y-auto space-y-3 pr-2">
                {questions.filter(q => (!discFilter || q.disciplineId === discFilter) && (!themeFilter || q.theme === themeFilter)).map(q => (
                  <div key={q.id} className="p-4 bg-gray-50 rounded-2xl border flex justify-between items-start gap-4 group hover:border-red-100 transition-all">
                    <div>
                      <p className="text-xs font-bold text-gray-700 leading-snug">{q.q}</p>
                      <div className="flex gap-2 mt-2">
                         <span className="text-[8px] font-black uppercase tracking-widest bg-white px-2 py-0.5 rounded border text-[#003366]">{q.disciplineId}</span>
                         <span className="text-[8px] font-black uppercase tracking-widest bg-white px-2 py-0.5 rounded border text-[#D4A017]">{q.theme}</span>
                      </div>
                    </div>
                    <button onClick={() => confirm("Excluir esta questão?") && onRemoveQuestion(q.id)} className="text-red-300 hover:text-red-500 transition-colors pt-1"><Trash2 size={16}/></button>
                  </div>
                ))}
                {questions.filter(q => (!discFilter || q.disciplineId === discFilter) && (!themeFilter || q.theme === themeFilter)).length === 0 && (
                  <p className="text-center py-10 text-gray-300 italic font-bold">Nenhuma questão encontrada para este filtro.</p>
                )}
             </div>
          </div>
        </div>
      )}

      {/* VIEW: OSCE COM PREVIEW */}
      {activeTab === 'osce' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in slide-in-from-right-10 duration-500">
           <div className="lg:col-span-4 space-y-6 h-fit">
              {!oscePreview ? (
                <div className="bg-white p-8 rounded-[2.5rem] border shadow-sm">
                  <h3 className="text-xl font-black text-[#003366] mb-6 uppercase tracking-tighter">Importar OSCE (JSON)</h3>
                  <form onSubmit={handleOsceReadPreview} className="space-y-4">
                    <select value={osceDiscipline} onChange={e => setOsceDiscipline(e.target.value)} className="w-full p-4 bg-gray-50 rounded-xl font-bold text-sm outline-none border-2 border-transparent focus:border-[#003366]" required>
                      <option value="">Disciplina...</option>
                      {disciplines.map(d => <option key={d.id} value={d.id}>{d.title}</option>)}
                    </select>
                    <select value={osceTheme} onChange={e => setOsceTheme(e.target.value)} className="w-full p-4 bg-gray-50 rounded-xl font-bold text-sm outline-none border-2 border-transparent focus:border-[#003366]" required>
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
                           value={discFilterOsce} 
                           onChange={e => { setDiscFilterOsce(e.target.value); setThemeFilterOsce(''); }} 
                           className="p-3 bg-gray-50 rounded-xl text-[10px] font-black uppercase outline-none border-2 border-transparent focus:border-[#003366]"
                         >
                           <option value="">Todas Disciplinas</option>
                           {disciplines.map(d => <option key={d.id} value={d.id}>{d.title}</option>)}
                         </select>
                         
                         <select 
                           value={themeFilterOsce} 
                           onChange={e => setThemeFilterOsce(e.target.value)} 
                           disabled={!discFilterOsce} 
                           className="p-3 bg-gray-50 rounded-xl text-[10px] font-black uppercase outline-none border-2 border-transparent focus:border-[#003366] disabled:opacity-50 disabled:cursor-not-allowed"
                         >
                           <option value="">Todos os Temas</option>
                           {discFilterOsce && disciplines.find(d => d.id === discFilterOsce)?.themes?.map(t => (
                             <option key={t} value={t}>{t}</option>
                           ))}
                         </select>
                     </div>
                  </div>

                  <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
                     {osceStations
                       .filter(s => (!discFilterOsce || s.disciplineId === discFilterOsce) && (!themeFilterOsce || s.theme === themeFilterOsce))
                       .map(station => (
                       <div key={station.id} className="p-5 bg-gray-50 rounded-[1.5rem] border flex justify-between items-center hover:border-red-100 group transition-all">
                          <div>
                            <h4 className="font-bold text-[#003366] text-sm">{station.title}</h4>
                            <div className="flex gap-2 mt-1">
                              <p className="text-[9px] font-black uppercase text-gray-400 tracking-widest">{station.disciplineId}</p>
                              <p className="text-[9px] font-black uppercase text-[#D4A017] tracking-widest">• {station.theme}</p>
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
      )}

      {/* VIEW: REFERÊNCIAS */}
      {activeTab === 'references' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in slide-in-from-right-10 duration-500">
          <div className="lg:col-span-4 bg-white p-8 rounded-[2.5rem] border shadow-sm h-fit">
            <h3 className="text-xl font-black text-[#003366] mb-6 uppercase tracking-tighter">Nova Referência</h3>
            <div className="space-y-4">
              <select value={selectedDiscId} onChange={e => setSelectedDiscId(e.target.value)} className="w-full p-4 bg-gray-50 rounded-xl font-bold text-sm outline-none border-2 border-transparent focus:border-[#D4A017]">
                <option value="">Disciplina...</option>
                {disciplines.map(d => <option key={d.id} value={d.id}>{d.title}</option>)}
              </select>
              <input type="text" placeholder="Título do Material" value={refTitle} onChange={e => setRefTitle(e.target.value)} className="w-full p-4 bg-gray-50 rounded-xl font-bold text-sm" />
              <input type="text" placeholder="Autor (opcional)" value={refAuthor} onChange={e => setRefAuthor(e.target.value)} className="w-full p-4 bg-gray-50 rounded-xl font-bold text-sm" />
              <select value={refType} onChange={e => setRefType(e.target.value as any)} className="w-full p-4 bg-gray-50 rounded-xl font-bold text-sm">
                <option value="book">Livro</option>
                <option value="article">Artigo/PDF</option>
                <option value="link">Link Externo</option>
                <option value="video">Vídeo</option>
              </select>
              <input type="url" placeholder="URL (opcional)" value={refUrl} onChange={e => setRefUrl(e.target.value)} className="w-full p-4 bg-gray-50 rounded-xl font-bold text-sm" />
              <button onClick={handleAddReference} className="w-full bg-[#003366] text-white py-4 rounded-xl font-black uppercase text-[10px] tracking-widest shadow-lg hover:bg-[#D4A017] transition-all">
                Salvar Referência
              </button>
            </div>
          </div>
          <div className="lg:col-span-8 bg-white p-8 rounded-[2.5rem] border shadow-sm">
            {selectedDiscId ? (
              <>
                <h3 className="text-xl font-black text-[#003366] mb-6 uppercase tracking-tighter">Bibliografia de {disciplines.find(d => d.id === selectedDiscId)?.title}</h3>
                <div className="space-y-3">
                  {(disciplines.find(d => d.id === selectedDiscId)?.references || []).map(ref => (
                    <div key={ref.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border group hover:border-red-100 transition-all">
                      <div className="flex items-center gap-4">
                        <div className="text-xl">{ref.type === 'book' ? '📖' : '🔗'}</div>
                        <div>
                          <p className="text-sm font-black text-[#003366]">{ref.title}</p>
                          <p className="text-[9px] text-gray-400 font-bold uppercase">{ref.author || 'Sem Autor'}</p>
                        </div>
                      </div>
                      <button onClick={() => handleRemoveReference(ref.id)} className="text-red-300 hover:text-red-500 transition-colors">
                        <Trash2 size={18}/>
                      </button>
                    </div>
                  ))}
                  {(disciplines.find(d => d.id === selectedDiscId)?.references || []).length === 0 && <p className="text-center py-10 text-gray-300 italic font-bold">Nenhuma referência cadastrada.</p>}
                </div>
              </>
            ) : <p className="text-center py-20 text-gray-300 font-bold italic">Selecione uma disciplina ao lado.</p>}
          </div>
        </div>
      )}

      {/* VIEW: MATERIAIS CONECTADO AO FIRESTORE */}
      {activeTab === 'materials' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in zoom-in duration-500">
          <div className="lg:col-span-4 bg-white p-8 rounded-[2.5rem] border shadow-sm h-fit">
            <h3 className="text-xl font-black text-[#003366] mb-6 uppercase tracking-tighter">Publicar Material</h3>
            <form onSubmit={handlePublishAdminMaterial} className="space-y-4">
              <select value={matDisc} onChange={e => setMatDisc(e.target.value)} className="w-full p-4 bg-gray-50 rounded-xl font-bold text-sm" required>
                <option value="">Disciplina...</option>
                {disciplines.map(d => <option key={d.id} value={d.id}>{d.title}</option>)}
              </select>
              
              <select value={matType} onChange={e => setMatType(e.target.value as any)} className="w-full p-4 bg-gray-50 rounded-xl font-bold text-sm" required>
                <option value="summary">Resumo Teórico</option>
                <option value="script">Roteiro de Prática</option>
                <option value="other">Outro / Material Extra</option>
              </select>

              <input type="text" placeholder="Título do Material" value={matTitle} onChange={e => setMatTitle(e.target.value)} className="w-full p-4 bg-gray-50 rounded-xl font-bold text-sm" required />
              <input type="url" placeholder="Link (Drive, Youtube...)" value={matUrl} onChange={e => setMatUrl(e.target.value)} className="w-full p-4 bg-gray-50 rounded-xl font-bold text-sm" required />
              
              <button type="submit" className="w-full bg-[#003366] text-white py-4 rounded-xl font-black uppercase text-[10px] tracking-widest shadow-lg hover:bg-[#D4A017] transition-all">Publicar Material 🚀</button>
            </form>
          </div>
          <div className="lg:col-span-8 bg-white p-8 rounded-[2.5rem] border shadow-sm">
             <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4 border-b pb-4">
                <div className="flex flex-col gap-2">
                  <h3 className="text-xl font-black text-[#003366] uppercase tracking-tighter">Gestão de Materiais em Nuvem</h3>
                  <button
                    onClick={handleClearLiveMaterials}
                    className="bg-red-100 text-red-600 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-red-200 transition-all w-fit shadow-sm"
                  >
                    Apagar {discFilterMat ? 'da Disciplina' : 'Tudo'} (INCLUI ARQUIVOS) 🗑️
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                    <select value={discFilterMat} onChange={e => setDiscFilterMat(e.target.value)} className="p-3 bg-gray-50 rounded-xl text-[10px] font-black uppercase outline-none border-2 border-transparent focus:border-[#003366]">
                      <option value="">Todas Disciplinas</option>
                      {disciplines.map(d => <option key={d.id} value={d.id}>{d.title}</option>)}
                    </select>
                </div>
             </div>
             
             <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
                {liveMaterials.filter(s => !discFilterMat || s.disciplineId === discFilterMat).map(s => (
                  <div key={s.id} className="p-4 bg-gray-50 rounded-2xl border flex justify-between items-center group hover:border-red-100 transition-all">
                    <div className="flex items-center gap-4">
                       <span className="text-2xl">{s.label === 'LINK' ? '🔗' : '📄'}</span>
                       <div>
                          <p className="text-sm font-bold text-[#003366]">{s.title || s.label}</p>
                          <p className="text-[9px] font-black uppercase text-gray-400 mt-1">
                            {s.disciplineId} • {s.type === 'summary' ? 'Resumo' : s.type === 'script' ? 'Roteiro' : 'Outro'} • {s.date} {s.author ? `• por ${s.author}` : ''}
                          </p>
                       </div>
                    </div>
                    <button onClick={() => handleDeleteLiveMaterial(s)} className="text-red-300 hover:text-red-500 transition-colors p-2">
                      <Trash2 size={20}/>
                    </button>
                  </div>
                ))}
                {liveMaterials.filter(s => !discFilterMat || s.disciplineId === discFilterMat).length === 0 && (
                  <p className="text-center py-10 text-gray-300 italic font-bold">Nenhum material encontrado.</p>
                )}
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminView;