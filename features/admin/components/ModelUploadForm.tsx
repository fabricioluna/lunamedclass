import React, { useState } from 'react';
import { Upload, Loader2 } from 'lucide-react';
import type { AnatomyModelAsset } from '../../../types';
import { uploadAnatomyModel } from '../../../services/anatomyModelsService';

interface Props {
  onUploaded?: (model: AnatomyModelAsset) => void;
}

// Peças acima disso pesam no 4G do aluno; o script de conversão deixa um crânio em ~1,5 MB.
const LARGE_MODEL_BYTES = 25 * 1024 * 1024;

const isPermissionError = (err: unknown) =>
  typeof err === 'object' && err !== null && String((err as { code?: string }).code).includes('unauthorized');

// Sobe uma peça .glb para o banco de peças 3D (item 6.24). Usado na aba do banco e dentro do
// editor do Lab — lá, a peça nova já entra no Lab que está sendo montado.
const ModelUploadForm: React.FC<Props> = ({ onUploaded }) => {
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = e.target.files?.[0] ?? null;
    e.target.value = '';
    if (!picked) return;
    if (!picked.name.toLowerCase().endsWith('.glb')) {
      alert('Envie o arquivo .glb (convertido pelo script). O .usdz do iPhone precisa ser convertido antes.');
      return;
    }
    if (picked.size > LARGE_MODEL_BYTES && !confirm(`Esta peça tem ${(picked.size / 1024 / 1024).toFixed(0)} MB e vai demorar a abrir no celular dos alunos. Usar mesmo assim?`)) {
      return;
    }
    setFile(picked);
    if (!name.trim()) setName(picked.name.replace(/\.glb$/i, '').replace(/[_-]+/g, ' '));
  };

  const handleUpload = async () => {
    if (!file || !name.trim()) return;
    setIsUploading(true);
    try {
      const model = await uploadAnatomyModel(file, name.trim());
      setFile(null);
      setName('');
      onUploaded?.(model);
    } catch (err) {
      console.error('Erro ao subir peça 3D:', err);
      alert(isPermissionError(err)
        ? 'O Firebase recusou o envio da peça. A regra do Storage precisa liberar a pasta lab_models/ para o admin (console do Firebase → Storage → Regras).'
        : `Erro ao subir a peça: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="flex flex-col md:flex-row gap-2 md:items-center">
      <label className={`flex items-center gap-1.5 px-3 py-3 rounded-xl border-2 border-dashed border-emerald-300 bg-emerald-50 text-emerald-700 text-xs font-black cursor-pointer hover:bg-emerald-100 shrink-0 ${isUploading ? 'opacity-50 pointer-events-none' : ''}`}>
        <Upload size={14} /> {file ? file.name : 'Escolher arquivo .glb'}
        <input type="file" accept=".glb,model/gltf-binary" onChange={handleFile} className="hidden" />
      </label>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Nome da peça (ex.: Crânio — vista completa)"
        maxLength={40}
        disabled={isUploading}
        className="flex-1 p-3 bg-gray-50 rounded-xl font-bold text-sm outline-none"
      />
      <button
        onClick={handleUpload}
        disabled={!file || !name.trim() || isUploading}
        className="bg-[#003366] text-white px-5 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-[#D4A017] disabled:opacity-40 flex items-center justify-center gap-2 shrink-0"
      >
        {isUploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
        {isUploading ? 'Enviando…' : 'Subir para o banco'}
      </button>
    </div>
  );
};

export default ModelUploadForm;
