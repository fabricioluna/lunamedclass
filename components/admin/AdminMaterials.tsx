import React, { useState, useEffect } from 'react';
import { SimulationInfo, Summary } from '../../types';
import { Trash2, Loader2, BadgeCheck } from 'lucide-react';
import { firestoreDB, storage } from '../../firebase';
import { collection, query, onSnapshot, doc, deleteDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { ref as storageRef, deleteObject, uploadBytes, getDownloadURL } from 'firebase/storage';
import { ROOMS } from '../../constants';
import { formatFileSize } from '../../utils/formatters'; // <-- IMPORTAÇÃO AQUI

interface AdminMaterialsProps {
  disciplines: SimulationInfo[];
}

const AdminMaterials: React.FC<AdminMaterialsProps> = ({ disciplines }) => {
  // ESTADOS LOCAIS
  const [matRoom, setMatRoom] = useState(''); 
  const [matDisc, setMatDisc] = useState('');
  const [matType, setMatType] = useState<'summary' | 'script' | 'other'>('summary');
  const [matTitle, setMatTitle] = useState('');
  const [matAuthor, setMatAuthor] = useState('');
  const [matUrl, setMatUrl] = useState('');
  const [matUploadMode, setMatUploadMode] = useState<'file' | 'link'>('link');
  const [matFile, setMatFile] = useState<File | null>(null);
  const [matIsVerified, setMatIsVerified] = useState(true);
  const [isMatUploading, setIsMatUploading] = useState(false);
  const [discFilterMat, setDiscFilterMat] = useState(''); 
  const [liveMaterials, setLiveMaterials] = useState<Summary[]>([]);

  // BUSCAR MATERIAIS EM TEMPO REAL
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

  // FUNÇÕES DE AÇÃO
  const handlePublishAdminMaterial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!matDisc || !matTitle) return alert("Preencha a disciplina e o título.");

    const finalAuthor = matAuthor.trim() !== '' 
      ? matAuthor 
      : (matIsVerified ? "Monitoria / Equipe Luna" : "Administração");

    try {
      setIsMatUploading(true);

      if (matUploadMode === 'file') {
        if (!matFile) {
          setIsMatUploading(false);
          return alert("Selecione um arquivo para enviar.");
        }

        const sRef = storageRef(storage, `materials/${matDisc}/${Date.now()}_${matFile.name}`);
        const snap = await uploadBytes(sRef, matFile);
        const url = await getDownloadURL(snap.ref);
        const fileSize = formatFileSize(matFile.size);

        await addDoc(collection(firestoreDB, "materials"), {
          title: matTitle,
          author: finalAuthor,
          description: "Adicionado via Painel Admin",
          type: matType,
          disciplineId: matDisc,
          url: url,
          date: new Date().toLocaleDateString('pt-BR'),
          label: matFile.name.split('.').pop()?.toUpperCase() || 'ARQUIVO',
          size: fileSize,
          createdAt: serverTimestamp(),
          isVerified: matIsVerified 
        });

      } else {
        if (!matUrl) {
          setIsMatUploading(false);
          return alert("Insira o link de compartilhamento.");
        }

        await addDoc(collection(firestoreDB, "materials"), {
          title: matTitle,
          author: finalAuthor,
          description: "Adicionado via Painel Admin",
          type: matType,
          disciplineId: matDisc,
          url: matUrl,
          date: new Date().toLocaleDateString('pt-BR'),
          label: 'LINK',
          size: 'Nuvem Externa',
          createdAt: serverTimestamp(),
          isVerified: matIsVerified 
        });
      }

      setMatTitle(''); 
      setMatAuthor('');
      setMatUrl(''); 
      setMatFile(null);
      alert(`Material ${matIsVerified ? 'Oficial ' : ''}publicado com sucesso!`);
      const fileInput = document.getElementById('adminFileInput') as HTMLInputElement;
      if(fileInput) fileInput.value = '';

    } catch (error) {
      console.error(error);
      alert('Erro ao publicar material. Verifique a conexão com o Firebase.');
    } finally {
      setIsMatUploading(false);
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

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in zoom-in duration-500">
      <div className="lg:col-span-4 bg-white p-8 rounded-[2.5rem] border shadow-sm h-fit">
        <h3 className="text-xl font-black text-[#003366] mb-6 uppercase tracking-tighter">Publicar Material Oficial</h3>
        <form onSubmit={handlePublishAdminMaterial} className="space-y-4">
          
          <select value={matRoom} onChange={e => { setMatRoom(e.target.value); setMatDisc(''); }} className="w-full p-4 bg-gray-50 rounded-xl font-bold text-sm outline-none border-2 border-transparent focus:border-[#D4A017]" required disabled={isMatUploading}>
            <option value="">Sala / Turma...</option>
            {ROOMS.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>

          <select value={matDisc} onChange={e => setMatDisc(e.target.value)} className="w-full p-4 bg-gray-50 rounded-xl font-bold text-sm outline-none border-2 border-transparent focus:border-[#D4A017]" required disabled={isMatUploading || !matRoom}>
            <option value="">Disciplina...</option>
            {disciplines
              .filter(d => !matRoom || d.roomId === matRoom)
              .map(d => <option key={d.id} value={d.id}>{d.title}</option>)}
          </select>
          
          <select value={matType} onChange={e => setMatType(e.target.value as any)} className="w-full p-4 bg-gray-50 rounded-xl font-bold text-sm outline-none border-2 border-transparent focus:border-[#D4A017]" required disabled={isMatUploading}>
            <option value="summary">Resumo Teórico</option>
            <option value="script">Roteiro de Prática</option>
            <option value="other">Outro / Material Extra</option>
          </select>

          <input type="text" placeholder="Título do Material" value={matTitle} onChange={e => setMatTitle(e.target.value)} className="w-full p-4 bg-gray-50 rounded-xl font-bold text-sm outline-none border-2 border-transparent focus:border-[#D4A017]" required disabled={isMatUploading} />
          
          <input type="text" placeholder="Autor (ex: João Silva)" value={matAuthor} onChange={e => setMatAuthor(e.target.value)} className="w-full p-4 bg-gray-50 rounded-xl font-bold text-sm outline-none border-2 border-transparent focus:border-[#D4A017]" disabled={isMatUploading} />

          <div className="flex p-1 bg-gray-100 rounded-xl mb-2 shadow-inner">
            <button type="button" onClick={() => setMatUploadMode('link')} className={`flex-1 py-2 text-[10px] font-black uppercase rounded-lg transition-all ${matUploadMode === 'link' ? 'bg-white text-[#003366] shadow-sm' : 'text-gray-500 hover:text-[#003366]'}`} disabled={isMatUploading}>Link (Nuvem)</button>
            <button type="button" onClick={() => setMatUploadMode('file')} className={`flex-1 py-2 text-[10px] font-black uppercase rounded-lg transition-all ${matUploadMode === 'file' ? 'bg-white text-[#003366] shadow-sm' : 'text-gray-500 hover:text-[#003366]'}`} disabled={isMatUploading}>Arquivo Local</button>
          </div>

          {matUploadMode === 'link' ? (
            <input type="url" placeholder="Link Compartilhado (Drive...)" value={matUrl} onChange={e => setMatUrl(e.target.value)} className="w-full p-4 bg-gray-50 rounded-xl font-bold text-sm outline-none border-2 border-transparent focus:border-[#D4A017]" required disabled={isMatUploading} />
          ) : (
            <div className="bg-gray-50 p-4 rounded-xl border border-dashed border-gray-300">
              <label className="block text-[10px] font-black uppercase text-[#003366] mb-2 cursor-pointer">
                Selecionar Arquivo PDF / DOCX
                <input id="adminFileInput" type="file" onChange={e => setMatFile(e.target.files ? e.target.files[0] : null)} className="w-full text-xs text-gray-700 mt-2" required disabled={isMatUploading} />
              </label>
            </div>
          )}

          <label className="flex items-center gap-3 p-4 bg-emerald-50 rounded-xl cursor-pointer border border-emerald-100 transition-all hover:bg-emerald-100 mt-2">
            <input type="checkbox" checked={matIsVerified} onChange={e => setMatIsVerified(e.target.checked)} className="w-5 h-5 accent-emerald-600" disabled={isMatUploading}/>
            <span className="text-[10px] font-black text-emerald-800 uppercase tracking-widest flex items-center gap-1">
              Selo de Verificado <BadgeCheck size={14}/>
            </span>
          </label>

          <button type="submit" disabled={isMatUploading} className="w-full bg-[#003366] text-white py-4 rounded-xl font-black uppercase text-[10px] tracking-widest shadow-lg hover:bg-[#D4A017] transition-all flex justify-center items-center gap-2 mt-4">
            {isMatUploading ? <Loader2 size={16} className="animate-spin"/> : null}
            {isMatUploading ? 'Enviando...' : 'Publicar Material 🚀'}
          </button>
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
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-bold text-[#003366]">{s.title || s.label}</p>
                        {s.isVerified && <span title="Material Verificado"><BadgeCheck size={14} className="text-emerald-500" /></span>}
                      </div>
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
  );
};

export default AdminMaterials;