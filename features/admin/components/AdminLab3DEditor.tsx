import React, { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { Box, Hand, MapPin, PenLine, Plus, Trash2, Loader2, Save, X, Slash, Highlighter, Undo2, Eraser, Library } from 'lucide-react';
import { SimulationInfo, LabSimulation, LabQuestion, AcademicUnit, AnatomyMarker, AnatomyCameraView, AnatomyModelAsset } from '../../../types';
import type { AnatomyTool } from '../../../components/anatomy3d/AnatomyViewer';
import { addLabSimulation, updateLabSimulation } from '../../../services/labService';
import { isTextEntryTarget } from '../../../utils/keyboard';
import { formatMegabytes, modelUsage } from '../../../utils/anatomyModels';
import ModelUploadForm from './ModelUploadForm';
import {
  addMarkerToList, estimateDocBytes, FIRESTORE_DOC_SAFE_BYTES, LINE_SIZE_DEFAULT, lineRadiusFor, paintRadiusFor,
  PAINT_SIZE_MAX, PAINT_SIZE_MIN, questionMarkers, undoLastMarker,
} from '../../../utils/anatomyMarkers';

const AnatomyViewer = lazy(() => import('../../../components/anatomy3d/AnatomyViewer'));

interface Props {
  disciplines: SimulationInfo[];
  initial?: LabSimulation | null;
  onDone: () => void;
  // Banco de peças 3D (item 6.24); null enquanto carrega.
  models: AnatomyModelAsset[] | null;
  labSimulations: LabSimulation[];
}

interface DraftPiece {
  key: string;
  name: string;
  url: string;
}

interface DraftQuestion {
  id: string;
  pieceKey: string;
  question: string;
  answer: string;
  hint1: string;
  hint2: string;
  hint3: string;
  markers: AnatomyMarker[];
  camera: AnatomyCameraView | null;
}

// Marcas da questão em edição (nova ou selecionada) e o ângulo da última marca desenhada.
interface WorkMarks {
  markers: AnatomyMarker[];
  camera: AnatomyCameraView | null;
}

const EMPTY_WORK: WorkMarks = { markers: [], camera: null };

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

const MarkerIcon: React.FC<{ type: AnatomyMarker['type'] }> = ({ type }) => {
  const props = { size: 12, className: 'text-gray-400 shrink-0' };
  if (type === 'line') return <PenLine {...props} />;
  if (type === 'paint') return <Highlighter {...props} />;
  return <MapPin {...props} />;
};

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
      markers: questionMarkers(q.model3d),
      camera: q.model3d.camera ?? null,
    });
  }
  return { pieces, questions };
};

const AdminLab3DEditor: React.FC<Props> = ({ disciplines, initial, onDone, models, labSimulations }) => {
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
  const [lineSize, setLineSize] = useState(LINE_SIZE_DEFAULT);
  const [modelDiag, setModelDiag] = useState<number | null>(null);
  const [work, setWork] = useState<WorkMarks>(EMPTY_WORK);
  // Ângulo para onde a câmera pula ao selecionar uma questão já marcada.
  const [jumpCamera, setJumpCamera] = useState<AnatomyCameraView | undefined>(undefined);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [form, setForm] = useState<QuestionForm>(EMPTY_FORM);

  const [isSaving, setIsSaving] = useState(false);
  const [saveProgress, setSaveProgress] = useState('');

  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [pickerSearch, setPickerSearch] = useState('');

  const activePiece = pieces.find((p) => p.key === activePieceKey) ?? null;
  const pieceQuestions = questions.filter((q) => q.pieceKey === activePieceKey);
  const selected = questions.find((q) => q.id === selectedId) ?? null;
  const isEditingMarks = !!selected || work.markers.length > 0;
  const isUC = disciplines.find((d) => d.id === disc)?.category === 'UC';

  const resetForm = () => {
    setWork(EMPTY_WORK);
    setJumpCamera(undefined);
    setSelectedId(null);
    setForm((prev) => ({ ...EMPTY_FORM, question: DEFAULT_QUESTIONS.has(prev.question) ? prev.question : EMPTY_FORM.question }));
  };

  const addPieceFromBank = (model: AnatomyModelAsset) => {
    setIsPickerOpen(false);
    setPickerSearch('');
    if (!pieces.some((p) => p.key === model.url)) {
      setPieces((prev) => [...prev, { key: model.url, name: model.name, url: model.url }]);
    }
    setActivePieceKey(model.url);
    resetForm();
  };

  const handleRemovePiece = (key: string) => {
    const count = questions.filter((q) => q.pieceKey === key).length;
    if (!confirm(count > 0
      ? `Tirar a peça deste Lab junto com as ${count} questões marcadas nela? A peça continua no Banco de Peças 3D.`
      : 'Tirar esta peça do Lab? Ela continua no Banco de Peças 3D.')) return;
    setPieces((prev) => prev.filter((p) => p.key !== key));
    setQuestions((prev) => prev.filter((q) => q.pieceKey !== key));
    if (activePieceKey === key) setActivePieceKey(pieces.find((p) => p.key !== key)?.key ?? null);
    resetForm();
  };

  // Cada marca nova SOMA às da questão (estruturas pares, mais de um ponto) — item 6.22.
  const handleMarkerDrawn = (marker: AnatomyMarker, camera: AnatomyCameraView) => {
    const isFirst = work.markers.length === 0;
    setWork((prev) => ({ markers: addMarkerToList(prev.markers, marker), camera }));
    if (isFirst && !selected) {
      setForm((prev) => (DEFAULT_QUESTIONS.has(prev.question) ? { ...prev, question: DEFAULT_QUESTION[marker.type] } : prev));
    }
  };

  const handleUndoMarker = () => setWork((prev) => ({ ...prev, markers: undoLastMarker(prev.markers) }));

  // Atalhos de teclado para quem edita no computador (item 6.23). Ignorados enquanto se digita
  // num campo — senão escrever "Sutura" trocaria de ferramenta a cada letra.
  useEffect(() => {
    const shortcuts: Record<string, AnatomyTool> = { g: 'orbit', a: 'pin', l: 'line', r: 'straight', m: 'paint' };
    const onKeyDown = (event: KeyboardEvent) => {
      if (isTextEntryTarget(event.target)) return;
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') {
        event.preventDefault();
        setWork((prev) => ({ ...prev, markers: undoLastMarker(prev.markers) }));
        return;
      }
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      const next = shortcuts[event.key.toLowerCase()];
      if (next) setTool(next);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const handleClearMarkers = () => {
    if (work.markers.length > 1 && !confirm(`Apagar as ${work.markers.length} marcas desta questão?`)) return;
    setWork((prev) => ({ ...prev, markers: [] }));
  };

  const selectQuestion = (q: DraftQuestion) => {
    setWork({ markers: q.markers, camera: q.camera });
    setJumpCamera(q.camera ?? undefined);
    setSelectedId(q.id);
    setForm({ question: q.question, answer: q.answer, hint1: q.hint1, hint2: q.hint2, hint3: q.hint3 });
  };

  const handleCommitQuestion = () => {
    if (!activePieceKey) return;
    if (!form.question.trim() || !form.answer.trim()) {
      alert('Preencha a pergunta e a resposta.');
      return;
    }
    if (work.markers.length === 0) {
      alert('Marque pelo menos um ponto, linha ou área na peça.');
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
        ? { ...q, ...fields, markers: work.markers, camera: work.camera ?? q.camera }
        : q)));
    } else {
      setQuestions((prev) => [...prev, {
        id: `lab_q_${Date.now()}_${prev.length}`,
        pieceKey: activePieceKey,
        ...fields,
        markers: work.markers,
        camera: work.camera,
      }]);
    }
    resetForm();
  };

  const handleDeleteQuestion = (id: string) => {
    if (!confirm('Excluir esta questão?')) return;
    setQuestions((prev) => prev.filter((q) => q.id !== id));
    if (selectedId === id) resetForm();
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
      // As peças já estão no banco (item 6.24): salvar o Lab não sobe arquivo nenhum. O nome
      // vem do banco, que é onde a peça é renomeada.
      const bankName = new Map((models ?? []).map((m) => [m.url, m.name]));
      const pieceName = new Map(pieces.map((p) => [p.key, bankName.get(p.url) ?? (p.name.trim() || 'Peça 3D')]));
      const built: LabQuestion[] = questions.map((q) => ({
        id: q.id,
        question: q.question,
        answer: q.answer,
        // Firestore recusa campo `undefined` — dica vazia simplesmente não vai para o documento.
        ...(q.hint1 ? { aiIdentification: q.hint1 } : {}),
        ...(q.hint2 ? { aiLocation: q.hint2 } : {}),
        ...(q.hint3 ? { aiFunctions: q.hint3 } : {}),
        model3d: {
          modelUrl: q.pieceKey,
          modelName: pieceName.get(q.pieceKey)!,
          markers: q.markers,
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
      alert(`Erro ao salvar: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsSaving(false);
      setSaveProgress('');
    }
  };

  const toolButton = (value: AnatomyTool, icon: React.ReactNode, label: string, shortcut: string) => (
    <button
      onClick={() => setTool(value)}
      title={`${label} (atalho: ${shortcut})`}
      className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${tool === value ? 'bg-[#D4A017] text-[#003366]' : 'bg-white/10 text-white hover:bg-white/20'}`}
    >
      {icon} {label}
      <kbd className={`hidden md:inline text-[8px] font-black px-1 rounded ${tool === value ? 'bg-[#003366]/15' : 'bg-white/15'}`}>{shortcut}</kbd>
    </button>
  );

  const isLineTool = tool === 'line' || tool === 'straight';
  const sizeControl = tool === 'paint'
    ? { value: paintSize, set: setPaintSize, mm: modelDiag ? paintRadiusFor(modelDiag, paintSize) * 2 * 1000 : null }
    : isLineTool
      ? { value: lineSize, set: setLineSize, mm: modelDiag ? lineRadiusFor(modelDiag, lineSize) * 2 * 1000 : null }
      : null;

  const toolHint: Record<AnatomyTool, string> = {
    orbit: 'Arraste para girar; roda do mouse, pinça do touchpad ou a barra à direita para o zoom; botão direito (ou Shift + arrastar) para mover.',
    pin: 'Clique na peça para fincar o alfinete. Arrastar continua girando.',
    line: 'Pressione e arraste sobre a peça para desenhar à mão livre. Segure Espaço e arraste para girar sem trocar de ferramenta.',
    straight: 'Arraste do ponto inicial até o final (ou clique em um e depois no outro): a reta segue a superfície da peça. Segure Espaço e arraste para girar.',
    paint: 'Pressione e arraste para pintar. Vários traços somam na mesma área. Segure Espaço e arraste para girar.',
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
            <button onClick={() => handleRemovePiece(p.key)} disabled={isSaving} className="p-1 text-red-300 hover:text-red-500" title="Tirar a peça deste Lab (continua no banco)"><Trash2 size={14} /></button>
          </div>
        ))}
        <button
          onClick={() => setIsPickerOpen(true)}
          disabled={isSaving}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl border-2 border-dashed border-emerald-300 bg-emerald-50 text-emerald-700 text-xs font-black hover:bg-emerald-100 disabled:opacity-50"
        >
          <Library size={14} /> Adicionar peça do banco
        </button>
      </div>

      {isPickerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#003366]/70 backdrop-blur-sm" onClick={() => setIsPickerOpen(false)}>
          <div className="bg-white rounded-3xl p-6 w-full max-w-2xl max-h-[85vh] flex flex-col gap-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h4 className="text-lg font-black text-[#003366] uppercase tracking-tighter flex items-center gap-2"><Library size={18} /> Banco de Peças 3D</h4>
              <button onClick={() => setIsPickerOpen(false)} className="p-2 text-gray-400 hover:text-gray-600 bg-gray-100 rounded-full"><X size={16} /></button>
            </div>
            <input
              value={pickerSearch}
              onChange={(e) => setPickerSearch(e.target.value)}
              placeholder="Buscar peça pelo nome..."
              className="p-3 bg-gray-50 rounded-xl font-bold text-sm outline-none"
            />
            <div className="flex-1 overflow-y-auto space-y-2 min-h-[120px]">
              {models === null && <p className="text-center py-8 text-xs text-gray-400 font-bold">Carregando o banco…</p>}
              {models?.filter((m) => m.name.toLowerCase().includes(pickerSearch.trim().toLowerCase())).map((m) => {
                const inThisLab = pieces.some((p) => p.key === m.url);
                const usedIn = modelUsage(m.url, labSimulations).length;
                return (
                  <button
                    key={m.id}
                    onClick={() => addPieceFromBank(m)}
                    className="w-full flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:border-[#003366] hover:bg-blue-50/50 text-left transition-all"
                  >
                    <Box size={18} className="text-emerald-600 shrink-0" />
                    <span className="flex-1 min-w-0">
                      <span className="block font-black text-sm text-[#003366] truncate">{m.name}</span>
                      <span className="block text-[10px] font-bold text-gray-400">
                        {m.sizeBytes > 0 ? `${formatMegabytes(m.sizeBytes)} · ` : ''}{usedIn === 0 ? 'ainda não usada' : `em ${usedIn} Lab${usedIn > 1 ? 's' : ''}`}
                      </span>
                    </span>
                    <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg ${inThisLab ? 'bg-gray-100 text-gray-400' : 'bg-[#003366] text-white'}`}>
                      {inThisLab ? 'Já neste Lab' : 'Usar'}
                    </span>
                  </button>
                );
              })}
              {models?.length === 0 && <p className="text-center py-8 text-xs text-gray-400 font-bold">O banco ainda está vazio. Suba a primeira peça abaixo.</p>}
            </div>
            <div className="border-t pt-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2">Peça nova? Suba para o banco e ela já entra neste Lab</p>
              <ModelUploadForm onUploaded={addPieceFromBank} />
            </div>
          </div>
        </div>
      )}

      {activePiece ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* VISUALIZADOR */}
          <div className="lg:col-span-8">
            <div className="relative w-full h-[420px] md:h-[560px] rounded-[1.5rem] overflow-hidden bg-[#1b1d22]">
              <div className="absolute top-3 left-3 z-10 flex flex-wrap gap-2">
                {toolButton('orbit', <Hand size={14} />, 'Girar', 'G')}
                {toolButton('pin', <MapPin size={14} />, 'Alfinete', 'A')}
                {toolButton('line', <PenLine size={14} />, 'Linha livre', 'L')}
                {toolButton('straight', <Slash size={14} />, 'Reta', 'R')}
                {toolButton('paint', <Highlighter size={14} />, 'Marca-texto', 'M')}
              </div>
              {(sizeControl || work.markers.length > 0) && (
                <div className="absolute bottom-3 left-3 right-3 z-10 flex flex-wrap items-center gap-3 bg-black/60 backdrop-blur-sm rounded-xl px-3 py-2">
                  {sizeControl && (
                  <>
                  <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-white">
                    {tool === 'paint' ? 'Espessura do marca-texto' : 'Espessura da linha'}
                    <input
                      type="range"
                      min={PAINT_SIZE_MIN}
                      max={PAINT_SIZE_MAX}
                      value={sizeControl.value}
                      onChange={(e) => sizeControl.set(Number(e.target.value))}
                      className="w-28 accent-[#D4A017]"
                    />
                  </label>
                  {sizeControl.mm !== null && (
                    <span className="text-[10px] font-bold text-white/70">
                      ≈ {sizeControl.mm < 2 ? sizeControl.mm.toFixed(1).replace('.', ',') : Math.round(sizeControl.mm)} mm
                    </span>
                  )}
                  </>
                  )}
                  <span className="ml-auto text-[10px] font-bold text-white/70">
                    {work.markers.length} marca{work.markers.length === 1 ? '' : 's'}
                  </span>
                  <button
                    onClick={handleUndoMarker}
                    disabled={work.markers.length === 0}
                    title="Remove a última marca — no marca-texto, o último traço (atalho: Ctrl+Z)"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest bg-white/10 text-white hover:bg-white/20 disabled:opacity-30"
                  >
                    <Undo2 size={13} /> Desfazer
                  </button>
                  <button
                    onClick={handleClearMarkers}
                    disabled={work.markers.length === 0}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest bg-white/10 text-white hover:bg-white/20 disabled:opacity-30"
                  >
                    <Eraser size={13} /> Limpar
                  </button>
                </div>
              )}
              <Suspense fallback={<div className="w-full h-full" />}>
                <AnatomyViewer
                  modelUrl={activePiece.url}
                  markers={work.markers}
                  camera={jumpCamera}
                  tool={tool}
                  onMarkerDrawn={handleMarkerDrawn}
                  paintSize={paintSize}
                  lineSize={lineSize}
                  onModelLoaded={({ diag }) => setModelDiag(diag)}
                  className="w-full h-full"
                />
              </Suspense>
            </div>
            <p className="text-[10px] font-bold text-gray-400 mt-2">{toolHint[tool]} Cada marca soma às anteriores na mesma questão (ex.: um alfinete de cada lado). O ângulo da última marca é o ângulo em que a questão abre para o aluno.</p>
            <p className="mt-3 text-[10px] font-bold text-gray-400">
              O aluno vê esta peça como <span className="text-[#003366]">"{(models ?? []).find((m) => m.url === activePiece.url)?.name ?? activePiece.name}"</span>. Para mudar o nome, use Admin → Lab → Banco de Peças 3D (vale para todos os Labs que usam a peça).
            </p>
          </div>

          {/* FORMULÁRIO + LISTA */}
          <div className="lg:col-span-4 space-y-4">
            {isEditingMarks ? (
              <div className="p-4 rounded-2xl border-2 border-[#003366]/10 bg-blue-50/40 space-y-2">
                <p className="text-[10px] font-black uppercase tracking-widest text-[#003366]">
                  {selected ? `Editando questão ${pieceQuestions.findIndex((q) => q.id === selected.id) + 1}` : 'Nova questão'} · {work.markers.length} marca{work.markers.length === 1 ? '' : 's'}
                </p>
                <input value={form.question} onChange={(e) => setForm({ ...form, question: e.target.value })} placeholder="Pergunta" className="w-full p-3 bg-white rounded-xl font-bold text-sm outline-none border" />
                <input value={form.answer} onChange={(e) => setForm({ ...form, answer: e.target.value })} placeholder="Resposta (Ex: Sutura coronal)" className="w-full p-3 bg-white rounded-xl font-bold text-sm outline-none border" />
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
                {selected && <p className="text-[10px] text-gray-500 font-medium">Marcas novas somam às desta questão. Use Desfazer ou Limpar (embaixo da peça) para tirar.</p>}
              </div>
            ) : (
              <div className="p-4 rounded-2xl border-2 border-dashed border-gray-200 text-xs text-gray-500 font-medium leading-relaxed">
                Escolha <b>Alfinete</b>, <b>Linha</b>, <b>Reta</b> ou <b>Marca-texto</b> e marque a estrutura na peça — quantas marcas precisar. Depois escreva a pergunta e a resposta.
              </div>
            )}

            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Questões desta peça ({pieceQuestions.length})</p>
              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                {pieceQuestions.map((q, i) => (
                  <div key={q.id} className={`flex items-center gap-2 p-2 rounded-xl border transition-all ${q.id === selectedId ? 'border-[#003366] bg-blue-50' : 'border-gray-100 hover:border-gray-300'}`}>
                    <button onClick={() => selectQuestion(q)} className="flex-1 flex items-center gap-2 text-left">
                      <span className="w-6 h-6 rounded-full bg-[#e11d48] text-white text-[10px] font-black flex items-center justify-center shrink-0">{i + 1}</span>
                      {q.markers[0] && <MarkerIcon type={q.markers[0].type} />}
                      {q.markers.length > 1 && <span className="text-[9px] font-black text-gray-400 shrink-0">×{q.markers.length}</span>}
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
