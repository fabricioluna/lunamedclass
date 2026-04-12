import React, { useState } from 'react';
import { SimulationInfo, LabSimulation, LabQuestion } from '../../types';
import { Trash2, Microscope, Loader2 } from 'lucide-react';
import { firestoreDB, storage } from '../../firebase';
import { deleteObject, ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { parseResilientCSV } from '../../utils/csvHelper';

interface AdminLabProps {
  disciplines: SimulationInfo[];
  labSimulations: LabSimulation[];
  onAddLabSimulation?: (sim: LabSimulation) => void;
  onRemoveLabSimulation?: (id: string) => void;
  onClearLab?: (disciplineId?: string) => void;
}

const AdminLab: React.FC<AdminLabProps> = ({
  disciplines,
  labSimulations,
  onAddLabSimulation,
  onRemoveLabSimulation,
  onClearLab
}) => {
  const [discFilterLab, setDiscFilterLab] = useState('');
  const [labDisc, setLabDisc] = useState('');
  const [labTitle, setLabTitle] = useState('');
  const [labAuthor, setLabAuthor] = useState('');
  const [labDesc, setLabDesc] = useState('');
  const [labCsvFile, setLabCsvFile] = useState<File | null>(null);
  const [labImageFiles, setLabImageFiles] = useState<FileList | null>(null);
  const [isLabUploading, setIsLabUploading] = useState(false);
  const [labUploadProgress, setLabUploadProgress] = useState('');

  const handleLabImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!labCsvFile || !labImageFiles || labImageFiles.length === 0 || !labDisc || !labTitle || !labAuthor) {
      return alert("Preencha todos os campos e selecione o CSV e as Imagens!");
    }
    
    setIsLabUploading(true);

    try {
      const filesArray = Array.from(labImageFiles as FileList); 
      
      setLabUploadProgress('Analisando arquivo CSV com parser de alta precisão...');
      const csvText = await labCsvFile.text();
      const lines = parseResilientCSV(csvText); 

      // Remove cabeçalho se existir e ajusta o offset para contagem de linhas
      let startIndex = 0;
      if (lines[0] && lines[0].join('').toLowerCase().includes('imagem')) {
        startIndex = 1;
      }

      const parsedLines = [];
      const warnings: string[] = [];

      // Mapeamento dinâmico inteligente com rastreio de linhas
      for (let i = startIndex; i < lines.length; i++) {
        const parts = lines[i];
        const lineNum = i + 1; // Linha real na planilha do usuário

        let filename = '';
        let structure = '';
        let question = '';
        let answer = '';

        if (parts.length >= 4) {
            filename = parts[0]?.trim();
            structure = parts[1]?.trim();
            question = parts[2]?.trim();
            answer = parts[3]?.trim();
        } else if (parts.length === 3) {
            filename = parts[0]?.trim();
            question = parts[1]?.trim();
            answer = parts[2]?.trim();
            structure = answer;
        }

        // Validação Cirúrgica: Verifica se os campos vitais estão vazios
        if (!filename || !question || !answer) {
            warnings.push(`• Linha ${lineNum}: Ignorada. Dados Incompletos -> Imagem: [${filename || 'vazio'}], Pergunta: [${question || 'vazia'}], Resposta: [${answer || 'vazia'}]`);
            continue;
        }

        parsedLines.push({ filename, structure, question, answer, lineNum });
      }

      if (parsedLines.length === 0) throw new Error("CSV não contém linhas válidas com Imagem, Pergunta e Resposta.");

      const finalQuestions: LabQuestion[] = [];

      for (let i = 0; i < parsedLines.length; i++) {
        const item = parsedLines[i];
        
        // 1. UPLOAD DA IMAGEM
        setLabUploadProgress(`Fazendo upload da imagem ${i + 1} de ${parsedLines.length}: ${item.filename}`);

        const imageFile = filesArray.find(f => {
          const nameWithoutExt = f.name.substring(0, f.name.lastIndexOf('.')) || f.name;
          return f.name === item.filename || nameWithoutExt === item.filename;
        });

        if (!imageFile) {
          throw new Error(`A imagem referente a "${item.filename}" não foi encontrada. Certifique-se de que selecionou todas as imagens no painel.`);
        }

        const sRef = storageRef(storage, `lab_images/${labDisc}/${Date.now()}_${imageFile.name}`);
        const snap = await uploadBytes(sRef, imageFile as File); 
        const imageUrl = await getDownloadURL(snap.ref);

        // 2. GERAÇÃO DE DICAS VIA IA (LUNA ENGINE 2.0)
        setLabUploadProgress(`Gerando Dicas com IA para peça ${i + 1}: ${item.structure}...`);
        let identification = 'N/A';
        let location = 'N/A';
        let functions = 'N/A';

        try {
            const aiPrompt = `Atue como um especialista em anatomia médica. O aluno precisa identificar a estrutura: "${item.structure}". Gere 3 dicas diretas. Retorne APENAS um JSON válido no formato exato: {"identification": "Como identificar visualmente", "location": "Onde se localiza", "functions": "Qual a principal função"}. Sem marcações markdown ou textos fora do JSON.`;
            
            // Chamada nativa para a API híbrida do Luna MedClass
            const aiRes = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: aiPrompt })
            });

            if (aiRes.ok) {
                const data = await aiRes.json();
                const jsonText = data.response || data.text || '';
                
                // Regex Cirúrgica: Extrai apenas o miolo do JSON, ignorando formatações Markdown do Gemini
                const match = jsonText.match(/\{[\s\S]*\}/); 
                if (match) {
                    const parsed = JSON.parse(match[0]);
                    identification = parsed.identification || 'N/A';
                    location = parsed.location || 'N/A';
                    functions = parsed.functions || 'N/A';
                }
            } else {
                console.warn(`Luna Engine offline ou inacessível para a peça: ${item.structure}`);
            }
        } catch (e) {
            console.warn(`Falha na rede ao invocar IA para a peça ${item.structure}. Preenchendo com N/A.`, e);
        }

        finalQuestions.push({
          id: `lab_q_${Date.now()}_${i}`,
          imageUrl: imageUrl,
          imageName: item.filename, 
          question: item.question,
          answer: item.answer,
          aiIdentification: identification,
          aiLocation: location,
          aiFunctions: functions
        });
      }

      setLabUploadProgress('Salvando o ecossistema no banco de dados (Firestore)...');
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
      
      // RELATÓRIO FINAL DE INTEGRIDADE
      let finalMessage = `✅ Sucesso Absoluto! Simulado com ${finalQuestions.length} peças criado, indexado com IA e publicado!`;
      
      if (warnings.length > 0) {
        finalMessage += `\n\n⚠️ ALERTA DE INTEGRIDADE (Linhas Incompletas):\nO sistema protegeu o banco de dados ignorando as seguintes linhas do CSV:\n\n` + warnings.join('\n');
      }

      alert(finalMessage);
      
      setLabCsvFile(null); setLabImageFiles(null); setLabTitle(''); setLabDesc('');
      const imgInput = document.getElementById('labImageInput') as HTMLInputElement;
      if(imgInput) imgInput.value = '';
      const csvInput = document.getElementById('labCsvInput') as HTMLInputElement;
      if(csvInput) csvInput.value = '';

    } catch (err: any) { 
      alert('Erro Crítico no Upload: ' + err.message); 
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

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in zoom-in duration-500">
      <div className="lg:col-span-5 bg-white p-8 rounded-[2.5rem] border shadow-sm h-fit">
        <h3 className="text-xl font-black text-[#003366] mb-2 uppercase tracking-tighter">Criar Lab Virtual</h3>
        <p className="text-[10px] font-bold text-gray-500 mb-6 leading-relaxed bg-gray-50 p-3 rounded-xl border">
          <b>SISTEMA IA INTEGRADO:</b><br/>
          Você só precisa enviar de 3 a 4 colunas no CSV.<br/>
          O motor Luna Engine vai gerar as dicas morfológicas automaticamente durante o upload.<br/><br/>
          <b>Padrão (3 Colunas):</b> Imagem ; Pergunta ; Resposta<br/>
          <b>Padrão (4 Colunas):</b> Imagem ; Estrutura ; Pergunta ; Resposta
        </p>
        
        <form onSubmit={handleLabImport} className="space-y-4">
          <select value={labDisc} onChange={e => setLabDisc(e.target.value)} className="w-full p-4 bg-gray-50 rounded-xl font-bold text-sm outline-none border-2 border-transparent focus:border-[#003366]" required disabled={isLabUploading}>
            <option value="">Selecione a Disciplina...</option>
            {disciplines.map(d => <option key={d.id} value={d.id}>{d.title}</option>)}
          </select>
          <input type="text" placeholder="Título (Ex: P1 Histologia)" value={labTitle} onChange={e => setLabTitle(e.target.value)} maxLength={50} className="w-full p-4 bg-gray-50 rounded-xl font-bold text-sm outline-none" required disabled={isLabUploading} />
          <input type="text" placeholder="Autor (Seu Nome)" value={labAuthor} onChange={e => setLabAuthor(e.target.value)} maxLength={30} className="w-full p-4 bg-gray-50 rounded-xl font-bold text-sm outline-none" required disabled={isLabUploading} />
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
            {isLabUploading ? 'Processando Motor IA...' : 'Enviar Simulado Lab'}
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
            {(labSimulations || []).filter(s => !discFilterLab || s.disciplineId === discFilterLab).map(s => (
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
            {(labSimulations || []).filter(s => !discFilterLab || s.disciplineId === discFilterLab).length === 0 && <p className="text-center py-10 text-gray-300 italic font-bold">Nenhum simulado de laboratório cadastrado.</p>}
         </div>
      </div>
    </div>
  );
};

export default AdminLab;