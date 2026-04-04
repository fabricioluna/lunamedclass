import React, { useState, useEffect } from 'react';
import { Download, Loader2, Search, Plus, FileCheck, X, User, CheckCircle2, Link as LinkIcon, Cloud, BadgeCheck } from 'lucide-react';
import { firestoreDB as db, storage } from '../firebase.ts';
import { collection, addDoc, query, where, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import type { Summary, SimulationInfo } from '../types.ts';

interface SummariesListViewProps {
  disciplineId: string;
  disciplines: SimulationInfo[];
  onBack: () => void;
  onShareClick?: () => void;
}

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

const SummariesListView: React.FC<SummariesListViewProps> = ({ disciplineId, disciplines, onBack }) => {
  const discipline = disciplines.find(d => d.id === disciplineId);
  const [summaries, setSummaries] = useState<Summary[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  
  const [uploadMode, setUploadMode] = useState<'file' | 'link'>('file');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const [formData, setFormData] = useState({ 
    title: '', 
    author: '', 
    description: '', 
    type: 'summary' as any,
    linkUrl: ''
  });

  useEffect(() => {
    const q = query(
      collection(db, "materials"), 
      where("disciplineId", "==", disciplineId)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Summary[];
      
      const sortedDocs = docs.sort((a, b) => {
        const timeA = a.createdAt?.seconds || 0;
        const timeB = b.createdAt?.seconds || 0;
        return timeB - timeA;
      });

      setSummaries(sortedDocs);
    }, (error) => {
      console.error("Erro ao carregar materiais:", error);
    });

    return () => unsubscribe();
  }, [disciplineId]);

  const handleConfirmUpload = async () => {
    if (!formData.title || !formData.author) {
      return alert("Título e Autor são obrigatórios.");
    }

    try {
      setIsUploading(true);

      if (uploadMode === 'file') {
        if (!selectedFile) return alert("Selecione um arquivo para enviar.");

        const MAX_MB = 50; 
        const MAX_BYTES = MAX_MB * 1024 * 1024; 

        if (selectedFile.size > MAX_BYTES) {
          setIsUploading(false);
          return alert(`⚠️ Arquivo muito grande!\nO limite é de ${MAX_MB} MB.\nPara arquivos maiores, use a opção "Link Nuvem".`);
        }

        const sRef = storageRef(storage, `materials/${disciplineId}/${Date.now()}_${selectedFile.name}`);
        const snap = await uploadBytes(sRef, selectedFile);
        const url = await getDownloadURL(snap.ref);
        const fileSize = formatFileSize(selectedFile.size);

        await addDoc(collection(db, "materials"), {
          title: formData.title,
          author: formData.author,
          description: formData.description,
          type: formData.type,
          disciplineId,
          url,
          date: new Date().toLocaleDateString('pt-BR'),
          label: selectedFile.name.split('.').pop()?.toUpperCase() || 'PDF',
          size: fileSize,
          createdAt: serverTimestamp(),
          isVerified: false // Material de aluno não é verificado por padrão
        });

      } else {
        if (!formData.linkUrl) return alert("Por favor, cole o link de compartilhamento.");
        if (!formData.linkUrl.startsWith('http')) return alert("O link deve começar com http:// ou https://");

        await addDoc(collection(db, "materials"), {
          title: formData.title,
          author: formData.author,
          description: formData.description,
          type: formData.type,
          disciplineId,
          url: formData.linkUrl,
          date: new Date().toLocaleDateString('pt-BR'),
          label: 'LINK',
          size: 'Nuvem Externa',
          createdAt: serverTimestamp(),
          isVerified: false // Material de aluno não é verificado por padrão
        });
      }

      alert("Material compartilhado com sucesso!");
      setShowForm(false); 
      setSelectedFile(null);
      setUploadMode('file');
      setFormData({ title: '', author: '', description: '', type: 'summary', linkUrl: '' });
    } catch (e) { 
      alert("Erro ao compartilhar o material. Verifique se o Firebase Storage e Firestore estão ativados no modo teste."); 
      console.error(e);
    } finally { 
      setIsUploading(false); 
    }
  };

  if (!discipline) return null;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 animate-in fade-in slide-in-from-bottom-8 duration-700 pb-32">
      <button onClick={onBack} className="text-[#003366] font-bold mb-8 flex items-center gap-2 hover:text-[#D4A017] transition-all">← Voltar à Disciplina</button>

      <div className="bg-white rounded-[3rem] p-8 md:p-12 shadow-xl border border-gray-100 mb-8 relative overflow-hidden text-left transition-colors duration-500">
         <div className="relative z-10 flex flex-col md:flex-row gap-8 justify-between items-start md:items-center">
           <div className="flex-1">
             <h1 className="text-4xl font-black text-[#003366] mb-2 tracking-tighter leading-tight text-left">Central de Materiais</h1>
             <p className="text-[#D4A017] text-[10px] font-black uppercase tracking-[0.3em] mb-4">{discipline.title}</p>
             <p className="text-gray-500 font-medium leading-relaxed text-left max-w-2xl text-sm">
               Compartilhe materiais com a turma. Arquivos até <b>50MB</b> podem ser enviados direto no portal. Para pastas do Drive/OneDrive ou arquivos mais pesados, adicione um <b>link de compartilhamento</b>.
             </p>
           </div>
           {!showForm ? (
             <button onClick={() => setShowForm(true)} className="bg-[#003366] text-white px-8 py-4 rounded-full font-black uppercase text-xs flex items-center gap-2 shadow-xl hover:bg-[#D4A017] hover:text-[#003366] hover:scale-105 transition-all shrink-0"><Plus size={18} /><span>Contribuir</span></button>
           ) : (
             <button onClick={() => {setShowForm(false); setSelectedFile(null); setUploadMode('file');}} className="bg-red-50 text-red-500 px-6 py-4 rounded-full font-black uppercase text-xs flex items-center gap-2 shrink-0"><X size={18} /><span>Cancelar</span></button>
           )}
         </div>

         {showForm && (
           <div className="mt-8 p-6 bg-gray-50 rounded-[2rem] border-2 border-dashed border-gray-200 animate-in zoom-in duration-300">
             
             <div className="flex p-1 bg-gray-200 rounded-2xl mb-6 shadow-inner overflow-hidden">
               <button onClick={() => setUploadMode('file')} className={`flex-1 py-3 px-2 text-[10px] sm:text-xs font-black uppercase rounded-xl transition-all flex items-center justify-center gap-2 ${uploadMode === 'file' ? 'bg-white text-[#003366] shadow-sm' : 'text-gray-500 hover:text-[#003366]'}`}>
                 <FileCheck size={16} /> <span className="hidden sm:inline">Upload de Arquivo (Até 50MB)</span><span className="sm:hidden">Arquivo</span>
               </button>
               <button onClick={() => setUploadMode('link')} className={`flex-1 py-3 px-2 text-[10px] sm:text-xs font-black uppercase rounded-xl transition-all flex items-center justify-center gap-2 ${uploadMode === 'link' ? 'bg-white text-[#003366] shadow-sm' : 'text-gray-500 hover:text-[#003366]'}`}>
                 <Cloud size={16} /> <span className="hidden sm:inline">Link (Arquivos Grandes / Pastas)</span><span className="sm:hidden">Link Nuvem</span>
               </button>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
               <input type="text" placeholder="Legenda / Título" className="bg-white p-4 rounded-xl outline-none font-bold text-sm border border-transparent focus:border-[#D4A017] transition-colors" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} />
               <input type="text" placeholder="Autor(a)" className="bg-white p-4 rounded-xl outline-none font-bold text-sm border border-transparent focus:border-[#D4A017] transition-colors" value={formData.author} onChange={e => setFormData({...formData, author: e.target.value})} />
               <select className="bg-white p-4 rounded-xl font-bold text-sm border border-transparent transition-colors text-gray-700" value={formData.type} onChange={e => setFormData({...formData, type: e.target.value as any})}>
                 <option value="summary">Resumo / Teórico</option><option value="script">Roteiro / Prática</option><option value="other">Outro / Pasta</option>
               </select>
             </div>
             <textarea placeholder="Descrição breve do material (Opcional)" className="w-full bg-white p-4 rounded-xl mb-6 min-h-[80px] font-bold text-sm border border-transparent outline-none focus:border-[#D4A017] resize-none transition-colors" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
             
             {uploadMode === 'file' ? (
               <>
                 {!selectedFile ? (
                   <label className="w-full cursor-pointer bg-white border-2 border-dashed border-[#003366] text-[#003366] p-8 rounded-2xl font-black uppercase text-xs text-center block hover:bg-[#003366]/5 transition-all shadow-sm">
                     <Plus className="inline mr-2" /> Escolher Arquivo do Dispositivo
                     <input type="file" className="hidden" onChange={e => e.target.files && setSelectedFile(e.target.files[0])} accept=".pdf,.doc,.docx,.ppt,.pptx,.txt" />
                   </label>
                 ) : (
                   <div className="bg-white border-2 border-green-200 p-8 rounded-3xl text-center shadow-lg animate-in zoom-in">
                     <div className="text-green-600 font-black uppercase text-[10px] tracking-widest mb-2"><CheckCircle2 className="inline mr-1" size={16} /> Arquivo Selecionado</div>
                     <h4 className="text-[#003366] font-black text-lg mb-1">{selectedFile.name}</h4>
                     <p className="text-gray-400 font-bold text-xs uppercase mb-6">{formatFileSize(selectedFile.size)}</p>
                     <div className="flex gap-3">
                        <button onClick={() => setSelectedFile(null)} className="flex-1 bg-gray-100 text-gray-500 p-4 rounded-xl font-black uppercase text-xs hover:bg-gray-200 transition-colors">Trocar</button>
                        <button onClick={handleConfirmUpload} disabled={isUploading} className="flex-[2] bg-[#003366] text-white p-4 rounded-xl font-black uppercase text-xs flex items-center justify-center gap-2 shadow-md hover:scale-[1.02] transition-all">
                          {isUploading ? <Loader2 className="animate-spin" /> : <CheckCircle2 size={18} />}
                          {isUploading ? 'ENVIANDO...' : 'CONFIRMAR E PUBLICAR'}
                        </button>
                     </div>
                   </div>
                 )}
               </>
             ) : (
               <div className="bg-white border-2 border-[#003366] p-6 rounded-2xl shadow-sm animate-in zoom-in">
                 <div className="flex items-center gap-2 mb-4">
                   <LinkIcon size={18} className="text-[#003366]" />
                   <span className="font-black text-[#003366] text-xs uppercase tracking-widest">URL de Compartilhamento</span>
                 </div>
                 <input
                   type="url"
                   placeholder="Cole aqui o link (ex: https://drive.google.com/...)"
                   className="w-full bg-gray-50 p-4 rounded-xl outline-none font-bold text-sm border border-transparent focus:border-[#D4A017] mb-6 transition-colors"
                   value={formData.linkUrl}
                   onChange={e => setFormData({...formData, linkUrl: e.target.value})}
                 />
                 <button onClick={handleConfirmUpload} disabled={isUploading} className="w-full bg-[#003366] text-white p-4 rounded-xl font-black uppercase text-xs flex items-center justify-center gap-2 shadow-md hover:scale-[1.02] transition-all">
                    {isUploading ? <Loader2 className="animate-spin" /> : <LinkIcon size={18} />}
                    {isUploading ? 'SALVANDO...' : 'CONFIRMAR E PUBLICAR LINK'}
                 </button>
               </div>
             )}
           </div>
         )}
      </div>

      <div className="mb-8 relative text-left">
        <Search className="absolute inset-y-0 left-6 flex items-center text-gray-400" size={20} />
        <input type="text" placeholder="Pesquisar material..." className="w-full bg-white pl-14 pr-6 py-5 rounded-2xl border-2 border-transparent focus:border-[#D4A017] outline-none font-bold shadow-sm transition-colors duration-500" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
      </div>

      <div className="space-y-4 text-left">
        {summaries.filter(s => s.title?.toLowerCase().includes(searchTerm.toLowerCase())).map((s) => (
          <div key={s.id} className={`bg-white p-6 rounded-[2.5rem] border flex items-start justify-between group transition-all shadow-sm ${s.isVerified ? 'border-emerald-200 bg-emerald-50/10' : 'border-gray-100 hover:border-[#D4A017]'}`}>
            <div className="flex items-start gap-5">
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all shrink-0 ${s.isVerified ? 'bg-emerald-100 text-emerald-700' : 'bg-[#003366]/5 text-[#003366] group-hover:bg-[#003366] group-hover:text-white'}`}>
                {s.label === 'LINK' ? <LinkIcon size={28} /> : <FileCheck size={28} />}
              </div>
              <div>
                <div className="flex items-center gap-3 mb-1 flex-wrap">
                  <h3 className="font-black text-[#003366] text-lg leading-tight">{s.title}</h3>
                  {s.isVerified && (
                    <span className="flex items-center gap-1 bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest shadow-sm" title="Material Oficial / Revisado por Monitores">
                      <BadgeCheck size={12} /> Revisado
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2 mt-1 mb-2">
                  <div className={`flex items-center gap-1 text-[10px] font-black uppercase tracking-wider ${s.isVerified ? 'text-emerald-600' : 'text-[#D4A017]'}`}><User size={12} /> {s.author}</div>
                  <span className="text-gray-300">|</span>
                  <span className="text-[10px] font-bold text-gray-400 uppercase">{s.date}</span>
                  
                  {s.size && (
                    <>
                      <span className="text-gray-300">|</span>
                      <span className="text-[10px] font-bold text-gray-400 uppercase">{s.size}</span>
                    </>
                  )}

                  <span className={`px-2 py-0.5 rounded text-[9px] font-black ${s.label === 'LINK' ? 'bg-[#003366]/10 text-[#003366]' : 'bg-gray-100 text-gray-500'}`}>
                    {s.label}
                  </span>
                </div>
                {s.description && <div className="bg-gray-50 p-3 rounded-xl text-xs text-gray-500 italic">"{s.description}"</div>}
              </div>
            </div>
            <a href={s.url} target="_blank" rel="noreferrer" className={`p-4 rounded-xl transition-all shrink-0 ${s.isVerified ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-600 hover:text-white' : 'bg-gray-50 hover:bg-[#D4A017] text-[#003366] hover:text-white'}`}>
              {s.label === 'LINK' ? <Cloud size={24} /> : <Download size={24} />}
            </a>
          </div>
        ))}
        {summaries.length === 0 && (
          <div className="text-center py-20 bg-white rounded-[3rem] border-2 border-dashed border-gray-100 text-gray-400 font-bold uppercase text-[10px] tracking-[0.3em] transition-colors duration-500">
             Nenhum material compartilhado ainda.
          </div>
        )}
      </div>
    </div>
  );
};

export default SummariesListView;