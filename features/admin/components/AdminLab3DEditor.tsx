import React, { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Box, Hand, MapPin, PenLine, Plus, Trash2, Loader2, Save, X, Upload, Slash, Highlighter, Undo2 } from 'lucide-react';
import { SimulationInfo, LabSimulation, LabQuestion, AcademicUnit, AnatomyMarker, AnatomyCameraView } from '../../../types';
import type { AnatomyTool } from '../../../components/anatomy3d/AnatomyViewer';
import { uploadFile } from '../../../services/storageService';
import { addLabSimulation, updateLabSimulation } from '../../../services/labService';
import {
  estimateDocBytes, FIRESTORE_DOC_SAFE_BYTES, paintRadiusFor, PAINT_SIZE_MAX, PAINT_SIZE_MIN,
} from '../../../utils/anatomyMarkers';

const AnatomyViewer = lazy(() => import('../../../components/anatomy3d/AnatomyViewer'));

interface Props {
  disciplines: SimulationInfo[];
  initial?: LabSimulation | null;
  onDone: () => void;
}

interface DraftPiece {
  key: string;
  name: string;
  url: string;
  file?: File;
}

interface DraftQuestion {
  id: string;
  pieceKey: string;
  question: string;
  answer: string;
  hint1: string;
  hint2: string;
  hint3: string;
  marker: AnatomyMarker;
  camera: AnatomyCameraView | null;
}

interface QuestionForm {
  question: string;
  answer: string;
  hint1: string;
  hint2: string;
  hint3: string;
}

const DEFAULT_QUESTION: Record<AnatomyMarker['type'], string> = {
  pin: 'Qual estrutura está indicada?',
  line: 'Qual estrutura está destacada?',
  paint: 'Qual estrutura está destacada?',
};
const DEFAULT_QUESTIONS = new Set(Object.values(DEFAULT_QUESTION));

const EMPTY_FORM: QuestionForm = { question: DEFAULT_QUESTION.pin, answer: '', hint1: '', hint2: '', hint3: '' };

const MARKER_LABEL: Record<AnatomyMarker['type'], string> = { pin: 'alfinete', line: 'linha', paint: 'marca-texto' };

const MarkerIcon: React.FC<{ type: AnatomyMarker['type'] }> = ({ type }) => {
  const props = { size: 12, className: 'text-gray-400 shrink-0' };
  if (type === 'line') return <PenLine {...props} />;
  if (type === 'paint') return <Highlighter {...props} />;
  return <MapPin {...props} />;
};

// Peças acima disso pesam no 4G do aluno; o script de conversão deixa um crânio em ~3 MB.
const LARGE_MODEL_BYTES = 25 * 1024 * 1024;

const hintOrEmpty = (value: string | undefined) => (value && value !== 'N/A' ? value : '');

const fromInitial = (sim: LabSimulation | null | undefined) => {
  const pieces: DraftPiece[] = [];
  const questions: DraftQuestion[] = [];
  for (const q of sim?.questions ?? []) {
    if (!q.model3d) continue;
    if (!pieces.some((p) => p.key === q.model3d!.modelUrl)) {
      pieces.push({ key: q.model3d.modelUrl, name: q.model3d.modelName, url: q.model3d.modelUrl });
    }
    questions.push({
      id: q.id,
      pieceKey: q.model3d.modelUrl,
      question: q.question,
      answer: q.answer,
      hint1: hintOrEmpty(q.aiIdentification),
      hint2: hintOrEmpty(q.aiLocation),
      hint3: hintOrEmpty(q.aiFunctions),
      marker: q.model3d.marker,
      camera: q.model3d.camera ?? null,
    });
  }
  return { pieces, questions };
};

const isPermissionError = (err: unknown) =>
  typeof err === 'object' && err !== null && String((err as { code?: string }).code).includes('unauthorized');

const AdminLab3DEditor: React.FC<Props> = ({ disciplines, initial, onDone }) => {
  const initialDraft = useMemo(() => fromInitial(initial), [initial]);

  const [disc, setDisc] = useState(initial?.disciplineId ?? '');
  const [unit, setUnit] = useState<AcademicUnit>(initial?.unit ?? 'N1');
  const [title, setTitle] = useState(initial?.title ?? '');
  const [author, setAuthor] = useState(initial?.author ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');

  const [pieces, setPieces] = useState<DraftPiece[]>(initialDraft.pieces);
  const [questions, setQuestions] = useState<DraftQuestion[]>(initialDraft.questions);
  const [activePieceKey, setActivePieceKey] = useState<string | null>(initialDraft.pieces[0]?.key ?? null);

  const [tool, setTool] = useState<AnatomyTool>('pin');
  const [paintSize, setPaintSize] = useState(4);
  const [modelDiag, setModelDiag] = useState<number | null>(null);
  const [draft, setDraft] = useState<{ marker: AnatomyMarker; camera: AnatomyCameraView } | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [form, setForm] = useState<QuestionForm>(EMPTY_FORM);

  const [isSaving, setIsSaving] = useState(false);
  const [saveProgress, setSaveProgress] = useState('');

  const objectUrlsRef = useRef<string[]>([]);
  useEffect(() => () => objectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url)), []);

  const activePiece = pieces.find((p) => p.key === activePieceKey) ?? null;
  const pieceQuestions = questions.filter((q) => q.pieceKey === activePieceKey);
  const selected = questions.find((q) => q.id === selectedId) ?? null;
  const shownMarker = draft?.marker ?? selected?.marker ?? null;
  const isUC = disciplines.find((d) => d.id === disc)?.category === 'UC';

  const resetForm = () => {
    setDraft(null);
    setSelectedId(null);
    setForm((prev) => ({ ...EMPTY_FORM, question: DEFAULT_QUESTIONS.has(prev.question) ? prev.question : EMPTY_FORM.question }));
  };

  const handleAddPiece = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.glb')) {
      alert('Envie o arquivo .glb (convertido pelo script). O .usdz do iPhone precisa ser convertido antes.');
      return;
    }
    if (file.size > LARGE_MODEL_BYTES && !confirm(`Esta peça tem ${(file.size / 1024 / 1024).toFixed(0)} MB e vai demorar a abrir no celular dos alunos. Usar mesmo assim?`)) {
      return;
    }
    const url = URL.createObjectURL(file);
    objectUrlsRef.current.push(url);
    const piece: DraftPiece = { key: url, name: file.name.replace(/\.glb$/i, ''), url, file };
    setPieces((prev) => [...prev, piece]);
    setActivePieceKey(piece.key);
    resetForm();
  };

  const handleRemovePiece = (key: string) => {
    const count = questions.filter((q) => q.pieceKey === key).length;
    if (!confirm(count > 0 ? `Remover a peça e as ${count} questões marcadas nela?` : 'Remover esta peça?')) return;
    setPieces((prev) => prev.filter((p) => p.key !== key));
    setQuestions((prev) => prev.filter((q) => q.pieceKey !== key));
    if (activePieceKey === key) setActivePieceKey(pieces.find((p) => p.key !== key)?.key ?? null);
    resetForm();
  };

  const renamePiece = (name: string) => {
    if (!activePiece) return;
    setPieces((prev) => prev.map((p) => (p.key === activePiece.key ? { ...p, name } : p)));
  };

  const handleMarkerDrawn = (marker: AnatomyMarker, camera: AnatomyCameraView) => {
    setDraft({ marker, camera });
    setForm((prev) => (DEFAULT_QUESTIONS.has(prev.question) ? { ...prev, question: DEFAULT_QUESTION[marker.type] } : prev));
  };

  const selectQuestion = (q: DraftQuestion) => {
    setDraft(null);
    setSelectedId(q.id);
    setForm({ question: q.question, answer: q.answer, hint1: q.hint1, hint2: q.hint2, hint3: q.hint3 });
  };

  const handleCommitQuestion = () => {
    if (!activePieceKey) return;
    if (!form.question.trim() || !form.answer.trim()) {
      alert('Preencha a pergunta e a resposta.');
      return;
    }
    const fields = {
      question: form.question.trim(),
      answer: form.answer.trim(),
      hint1: form.hint1.trim(),
      hint2: form.hint2.trim(),
      hint3: form.hint3.trim(),
    };
    if (selected) {
      setQuestions((prev) => prev.map((q) => (q.id === selected.id
        ? { ...q, ...fields, ...(draft ? { marker: draft.marker, camera: draft.camera } : {}) }
        : q)));
    } else {
      if (!draft) return;
      setQuestions((prev) => [...prev, {
        id: `lab_q_${Date.now()}_${prev.length}`,
        pieceKey: activePieceKey,
        ...fields,
        marker: draft.marker,
        camera: draft.camera,
      }]);
    }
    resetForm();
  };

  const handleDeleteQuestion = (id: string) => {
    if (!confirm('Excluir esta questão?')) return;
    setQuestions((prev) => prev.filter((q) => q.id !== id));
    if (selectedId === id) resetForm();
  };

  // Desfaz o último traço do marca-texto em edição; sem traços sobrando, volta ao que estava.
  const handleUndoPaintStroke = () => {
    if (draft?.marker.type !== 'paint') return;
    const strokes = draft.marker.strokes.slice(0, -1);
    setDraft(strokes.length > 0 ? { ...draft, marker: { type: 'paint', strokes } } : null);
  };

  const handleSave = async () => {
    if (!disc || !title.trim() || !author.trim()) {
      alert('Preencha disciplina, título e autor.');
      return;
    }
    if (questions.length === 0) {
      alert('Marque pelo menos uma questão em alguma peça.');
      return;
    }
    // Checado ANTES de subir as peças: se o banco recusar o documento, não sobra arquivo órfão.
    const approxBytes = estimateDocBytes(questions);
    if (approxBytes > FIRESTORE_DOC_SAFE_BYTES) {
      alert(`Este Lab ficou grande demais para o banco de dados (${Math.round(approxBytes / 1024)} KB de marcações, limite ~${Math.round(FIRESTORE_DOC_SAFE_BYTES / 1024)} KB). O marca-texto é o que mais ocupa: use uma espessura maior (menos pontos) ou divida as questões em dois Labs.`);
      return;
    }
    setIsSaving(true);
    try {
      const targetUnit: AcademicUnit = isUC ? 'N1' : unit;
      const usedKeys = new Set(questions.map((q) => q.pieceKey));
      const remoteUrl = new Map<string, string>();
      const toUpload = pieces.filter((p) => usedKeys.has(p.key));
      for (let i = 0; i < toUpload.length; i++) {
        const piece = toUpload[i];
        if (!piece.file) {
          remoteUrl.set(piece.key, piece.url);
          continue;
        }
        setSaveProgress(`Enviando peça ${i + 1} de ${toUpload.length}: ${piece.name}…`);
        const safeName = piece.file.name.replace(/[^\w.-]+/g, '_');
        remoteUrl.set(piece.key, await uploadFile(`lab_models/${disc}/${targetUnit}/${Date.now()}_${safeName}`, piece.file));
      }

      const pieceName = new Map(pieces.map((p) => [p.key, p.name.trim() || 'Peça 3D']));
      const built: LabQuestion[] = questions.map((q) => ({
        id: q.id,
        question: q.question,
        answer: q.answer,
        // Firestore recusa campo `undefined` — dica vazia simplesmente não vai para o documento.
        ...(q.hint1 ? { aiIdentification: q.hint1 } : {}),
        ...(q.hint2 ? { aiLocation: q.hint2 } : {}),
        ...(q.hint3 ? { aiFunctions: q.hint3 } : {}),
        model3d: {
          modelUrl: remoteUrl.get(q.pieceKey)!,
          modelName: pieceName.get(q.pieceKey)!,
          marker: q.marker,
          ...(q.camera ? { camera: q.camera } : {}),
        },
      }));
      // Lab misto (lâminas + peças) não é criado por esta tela, mas se existir as lâminas ficam.
      const imageQuestions = (initial?.questions ?? []).filter((q) => !q.model3d);

      setSaveProgress('Salvando no banco de dados…');
      const { firebaseId: _firebaseId, ...base } = initial ?? ({} as Partial<LabSimulation>);
      const sim: LabSimulation = {
        ...base,
        id: initial?.id ?? `lab_sim_${Date.now()}`,
        disciplineId: disc,
        unit: targetUnit,
        title: title.trim(),
        author: author.trim(),
        description: description.trim(),
        questions: [...imageQuestions, ...built],
        createdAt: initial?.createdAt ?? Date.now(),
      };
      if (initial) await updateLabSimulation(initial, sim);
      else await addLabSimulation(sim);

      alert(`✅ Lab 3D salvo com ${built.length} questões na unidade ${targetUnit}.`);
      onDone();
    } catch (err) {
      console.error('Erro ao salvar Lab 3D:', err);
      alert(isPermissionError(err)
        ? 'O Firebase recusou o envio da peça. A regra do Storage precisa liberar a pasta lab_models/ para o admin (console do Firebase → Storage → Regras).'
        : `Erro ao salvar: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsSaving(false);
      setSaveProgress('');
    }
  };

  const toolButton = (value: AnatomyTool, icon: React.ReactNode, label: string) => (
    <button
      onClick={() => setTool(value)}
      className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${tool === value ? 'bg-[#D4A017] text-[#003366]' : 'bg-white/10 text-white hover:bg-white/20'}`}
    >
      {icon} {label}
    </button>
  );

  const toolHint: Record<AnatomyTool, string> = {
    orbit: 'Arraste para girar, roda/pinça para zoom, botão direito para mover.',
    pin: 'Clique na peça para fincar o alfinete. Arrastar continua girando.',
    line: 'Pressione e arraste sobre a peça para desenhar à mão livre. Para girar, volte ao modo Girar.',
    straight: 'Clique no ponto inicial e depois no final: a reta segue a superfície da peça. Arrastar continua girando.',
    paint: 'Pressione e arraste para pintar. Vários traços somam na mesma área. Para girar, volte ao modo Girar.',
  };

  return (
    <div className="bg-white p-6 md:p-8 rounded-[2.5rem] border shadow-sm space-y-6">
      <div className="flex items-center justify-between gap-4">
        <h3 className="text-xl font-black text-[#003366] uppercase tracking-tighter">{initial ? 'Editar Lab 3D' : 'Criar Lab 3D'}</h3>
        <button onClick={onDone} disabled={isSaving} className="text-gray-400 hover:text-[#003366] text-[10px] font-black uppercase flex items-center gap-1"><X size={14} /> Fechar</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        <select value={disc} onChange={(e) => setDisc(e.target.value)} disabled={isSaving} className="p-3 bg-gray-50 rounded-xl font-bold text-sm outline-none border-2 border-transparent focus:border-[#003366]">
          <option value="">Selecione a Disciplina...</option>
          {disciplines.map((d) => <option key={d.id} value={d.id}>{d.title}</option>)}
        </select>
        {disc && !isUC ? (
          <select value={unit} onChange={(e) => setUnit(e.target.value as AcademicUnit)} disabled={isSaving} className="p-3 bg-blue-50 text-blue-900 rounded-xl font-black text-sm outline-none border-2 border-blue-200">
            <option value="N1">Unidade N1</option>
            <option value="N2">Unidade N2</option>
          </select>
        ) : <div className="hidden lg:block" />}
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Título (Ex: Crânio — vista lateral)" maxLength={50} disabled={isSaving} className="p-3 bg-gray-50 rounded-xl font-bold text-sm outline-none" />
        <input value={author} onChange={(e) => setAuthor(e.target.value)} placeholder="Autor" maxLength={30} disabled={isSaving} className="p-3 bg-gray-50 rounded-xl font-bold text-sm outline-none" />
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Descrição para os alunos..." rows={1} disabled={isSaving} className="md:col-span-2 lg:col-span-4 p-3 bg-gray-50 rounded-xl font-bold text-sm outline-none resize-none" />
      </div>

      {/* PEÇAS */}
      <div className="flex flex-wrap items-center gap-2">
        {pieces.map((p) => (
          <div key={p.key} className={`flex items-center gap-1 pl-3 pr-1 py-1 rounded-xl border-2 transition-all ${p.key === activePieceKey ? 'border-[#003366] bg-blue-50' : 'border-gray-100 bg-gray-50'}`}>
            <button onClick={() => { setActivePieceKey(p.key); resetForm(); }} className="flex items-center gap-1.5 text-xs font-black text-[#003366]">
              <Box size={14} /> {p.name || 'Peça 3D'}
              <span className="text-[10px] text-gray-400 font-bold">({questions.filter((q) => q.pieceKey === p.key).length})</span>
            </button>
            <button onClick={() => handleRemovePiece(p.key)} disabled={isSaving} className="p-1 text-red-300 hover:text-red-500" title="Remover peça"><Trash2 size={14} /></button>
          </div>
        ))}
        <label className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border-2 border-dashed border-emerald-300 bg-emerald-50 text-emerald-700 text-xs font-black cursor-pointer hover:bg-emerald-100 ${isSaving ? 'opacity-50 pointer-events-none' : ''}`}>
          <Upload size={14} /> Adicionar peça (.glb)
          <input type="file" accept=".glb,model/gltf-binary" onChange={handleAddPiece} className="hidden" />
        </label>
      </div>

      {activePiece ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* VISUALIZADOR */}
          <div className="lg:col-span-8">
            <div className="relative w-full h-[420px] md:h-[560px] rounded-[1.5rem] overflow-hidden bg-[#1b1d22]">
              <div className="absolute top-3 left-3 z-10 flex flex-wrap gap-2">
                {toolButton('orbit', <Hand size={14} />, 'Girar')}
                {toolButton('pin', <MapPin size={14} />, 'Alfinete')}
                {toolButton('line', <PenLine size={14} />, 'Linha livre')}
                {toolButton('straight', <Slash size={14} />, 'Reta')}
                {toolButton('paint', <Highlighter size={14} />, 'Marca-texto')}
              </div>
              {tool === 'paint' && (
                <div className="absolute bottom-3 left-3 right-3 z-10 flex flex-wrap items-center gap-3 bg-black/60 backdrop-blur-sm rounded-xl px-3 py-2">
                  <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-white">
                    Espessura
                    <input
                      type="range"
                      min={PAINT_SIZE_MIN}
                      max={PAINT_SIZE_MAX}
                      value={paintSize}
                      onChange={(e) => setPaintSize(Number(e.target.value))}
                      className="w-28 accent-[#D4A017]"
                    />
                  </label>
                  {modelDiag && (
                    <span className="text-[10px] font-bold text-white/70">
                      ≈ {Math.max(1, Math.round(paintRadiusFor(modelDiag, paintSize) * 2 * 1000))} mm
                    </span>
                  )}
                  <button
                    onClick={handleUndoPaintStroke}
                    disabled={draft?.marker.type !== 'paint'}
                    className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest bg-white/10 text-white hover:bg-white/20 disabled:opacity-30"
                  >
                    <Undo2 size={13} /> Desfazer traço
                  </button>
                </div>
              )}
              <Suspense fallback={<div className="w-full h-full" />}>
                <AnatomyViewer
                  modelUrl={activePiece.url}
                  marker={shownMarker}
                  camera={draft ? undefined : selected?.camera ?? undefined}
                  tool={tool}
                  onMarkerDrawn={handleMarkerDrawn}
                  paintSize={paintSize}
                  onModelLoaded={({ diag }) => setModelDiag(diag)}
                  className="w-full h-full"
                />
              </Suspense>
            </div>
            <p className="text-[10px] font-bold text-gray-400 mt-2">{toolHint[tool]} O ângulo em que você marca é o ângulo em que a questão abre para o aluno.</p>
            <input
              value={activePiece.name}
              onChange={(e) => renamePiece(e.target.value)}
              placeholder="Nome da peça (aparece para o aluno)"
              maxLength={40}
              disabled={isSaving}
              className="mt-3 w-full p-3 bg-gray-50 rounded-xl font-bold text-sm outline-none"
            />
          </div>

          {/* FORMULÁRIO + LISTA */}
          <div className="lg:col-span-4 space-y-4">
            {draft || selected ? (
              <div className="p-4 rounded-2xl border-2 border-[#003366]/10 bg-blue-50/40 space-y-2">
                <p className="text-[10px] font-black uppercase tracking-widest text-[#003366]">
                  {selected ? `Editando questão ${pieceQuestions.findIndex((q) => q.id === selected.id) + 1}${draft ? ' — marca redesenhada' : ''}` : `Nova questão (${draft ? MARKER_LABEL[draft.marker.type] : ''})`}
                </p>
                <input value={form.question} onChange={(e) => setForm({ ...form, question: e.target.value })} placeholder="Pergunta" className="w-full p-3 bg-white rounded-xl font-bold text-sm outline-none border" />
                <input value={form.answer} onChange={(e) => setForm({ ...form, answer: e.target.value })} placeholder="Resposta (Ex: Sutura coronal)" autoFocus className="w-full p-3 bg-white rounded-xl font-bold text-sm outline-none border" />
                <details className="text-xs">
                  <summary className="cursor-pointer text-[10px] font-black uppercase text-gray-500">Dicas (opcional)</summary>
                  <div className="space-y-2 mt-2">
                    <input value={form.hint1} onChange={(e) => setForm({ ...form, hint1: e.target.value })} placeholder="Identificação" className="w-full p-2 bg-white rounded-lg text-xs outline-none border" />
                    <input value={form.hint2} onChange={(e) => setForm({ ...form, hint2: e.target.value })} placeholder="Localização" className="w-full p-2 bg-white rounded-lg text-xs outline-none border" />
                    <input value={form.hint3} onChange={(e) => setForm({ ...form, hint3: e.target.value })} placeholder="Funções" className="w-full p-2 bg-white rounded-lg text-xs outline-none border" />
                  </div>
                </details>
                <div className="flex gap-2 pt-1">
                  <button onClick={handleCommitQuestion} className="flex-1 bg-[#003366] text-white py-3 rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-[#D4A017] flex items-center justify-center gap-1.5">
                    <Plus size={14} /> {selected ? 'Salvar questão' : 'Adicionar questão'}
                  </button>
                  <button onClick={resetForm} className="px-4 bg-gray-100 text-gray-500 rounded-xl font-black uppercase text-[10px]">Cancelar</button>
                </div>
                {selected && <p className="text-[10px] text-gray-500 font-medium">Para mudar a marca desta questão, desenhe de novo na peça.</p>}
              </div>
            ) : (
              <div className="p-4 rounded-2xl border-2 border-dashed border-gray-200 text-xs text-gray-500 font-medium leading-relaxed">
                Escolha <b>Alfinete</b> ou <b>Linha</b> e marque a estrutura na peça. Depois escreva a pergunta e a resposta.
              </div>
            )}

            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Questões desta peça ({pieceQuestions.length})</p>
              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                {pieceQuestions.map((q, i) => (
                  <div key={q.id} className={`flex items-center gap-2 p-2 rounded-xl border transition-all ${q.id === selectedId ? 'border-[#003366] bg-blue-50' : 'border-gray-100 hover:border-gray-300'}`}>
                    <button onClick={() => selectQuestion(q)} className="flex-1 flex items-center gap-2 text-left">
                      <span className="w-6 h-6 rounded-full bg-[#e11d48] text-white text-[10px] font-black flex items-center justify-center shrink-0">{i + 1}</span>
                      <MarkerIcon type={q.marker.type} />
                      <span className="text-xs font-bold text-[#003366] truncate">{q.answer}</span>
                    </button>
                    <button onClick={() => handleDeleteQuestion(q.id)} className="p-1 text-red-300 hover:text-red-500"><Trash2 size={14} /></button>
                  </div>
                ))}
                {pieceQuestions.length === 0 && <p className="text-xs text-gray-300 italic font-bold">Nenhuma questão marcada ainda.</p>}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-10 rounded-[1.5rem] border-2 border-dashed border-gray-200 text-center text-sm text-gray-400 font-bold">
          Adicione uma peça (.glb) para começar a marcar.
        </div>
      )}

      <div className="flex flex-col sm:flex-row items-center gap-3 border-t pt-6">
        <p className="flex-1 text-xs font-bold text-gray-500">
          {questions.length} questões em {new Set(questions.map((q) => q.pieceKey)).size} peça(s). Nada vai para o servidor até você salvar.
        </p>
        <button onClick={handleSave} disabled={isSaving} className="bg-[#003366] text-white px-8 py-4 rounded-xl font-black uppercase text-[10px] tracking-widest shadow-lg hover:bg-[#D4A017] disabled:opacity-50 flex items-center gap-2">
          {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          {isSaving ? saveProgress || 'Salvando…' : initial ? 'Salvar alterações' : 'Salvar Lab 3D'}
        </button>
      </div>
    </div>
  );
};

export default AdminLab3DEditor;
