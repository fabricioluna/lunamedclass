import React, { useState, useEffect } from 'react';

type CalcType = 'UC' | 'HabMed' | 'IESC' | 'UCCG';

const CalculatorsView: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [activeCalc, setActiveCalc] = useState<CalcType>('UC');
  const [result, setResult] = useState<number | null>(null);
  const [extraPoints, setExtraPoints] = useState('');

  // --- ESTADOS: UNIDADE CURRICULAR (UC) ---
  const [numSps, setNumSps] = useState(6);
  const [spGrades, setSpGrades] = useState<string[]>(Array(6).fill(''));
  
  const [teoricaMode, setTeoricaMode] = useState<'acertos' | 'nota'>('acertos');
  const [praticaMode, setPraticaMode] = useState<'acertos' | 'nota'>('acertos');

  const [teoricaTotal, setTeoricaTotal] = useState('30');
  const [teoricaAcertos, setTeoricaAcertos] = useState('');
  const [teoricaNotaDirect, setTeoricaNotaDirect] = useState('');
  
  const [praticaAnatomiaAcertos, setPraticaAnatomiaAcertos] = useState('');
  const [praticaMorfoAcertos, setPraticaMorfoAcertos] = useState('');
  const [praticaAnatomiaNota, setPraticaAnatomiaNota] = useState('');
  const [praticaMorfoNota, setPraticaMorfoNota] = useState('');

  // --- ESTADOS: IESC ---
  const [iescGrades, setIescGrades] = useState({
    n1_teorica: '', n1_pratica: '', n1_extensao: '', n1_portfolio: '',
    n2_teorica: '', n2_pratica: '', n2_extensao: '', n2_portfolio: ''
  });

  // --- ESTADOS: UCCG ---
  const [uccgGrades, setUccgGrades] = useState({
    n1_teorica: '', n1_extensao: '', n2_teorica: '', n2_extensao: ''
  });

  // --- ESTADOS: HABMED ---
  const [habmedGrades, setHabmedGrades] = useState({
    n1_formativa: '', n1_somativa: '', n1_teorica: '',
    n2_formativa: '', n2_somativa: '', n2_teorica: ''
  });

  // --- FUNÇÕES DE CÁLCULO PARCIAL (UC) ---
  const getTutoriaPartial = () => {
    const sps = spGrades.map(v => parseFloat(v.replace(',', '.')) || 0);
    const average100 = (sps.reduce((a, b) => a + b, 0) / (sps.length || 1));
    return average100 / 10; 
  };

  const getTeoricaPartial = () => {
    if (teoricaMode === 'nota') return parseFloat(teoricaNotaDirect.replace(',', '.')) || 0;
    const total = parseFloat(teoricaTotal) || 1;
    const acertos = parseFloat(teoricaAcertos.replace(',', '.')) || 0;
    return (acertos / total) * 10;
  };

  const getPraticaPartial = () => {
    if (praticaMode === 'nota') {
      const a = parseFloat(praticaAnatomiaNota.replace(',', '.')) || 0;
      const m = parseFloat(praticaMorfoNota.replace(',', '.')) || 0;
      return (a + m) / 2; 
    }
    const a = parseFloat(praticaAnatomiaAcertos.replace(',', '.')) || 0;
    const m = parseFloat(praticaMorfoAcertos.replace(',', '.')) || 0;
    return ((a + m) / 20) * 10;
  };

  const getNeededHitsStatus = () => {
    const tutoria = getTutoriaPartial(); 
    const pratica = getPraticaPartial();
    const totalQ = parseFloat(teoricaTotal) || 30;
    const atuais = parseFloat(teoricaAcertos) || 0;
    const tpExtra = parseFloat(extraPoints.replace(',', '.')) || 0;
    
    const neededTeoricaGrade = (7 - tpExtra - (pratica * 0.30) - (tutoria * 0.28)) / 0.42;
    const totalNeededHits = Math.ceil((neededTeoricaGrade * totalQ) / 10);
    
    if (totalNeededHits <= 0 || atuais >= totalNeededHits) return { text: "Meta Atingida! 🎉", color: "text-green-500" };
    if (totalNeededHits > totalQ) return { text: "Meta impossível (7.0)", color: "text-red-400" };
    const missing = totalNeededHits - atuais;
    return { text: `Faltam ${missing} questões`, color: "text-[#003366]" };
  };

  // --- FUNÇÕES DE CÁLCULO PARCIAL (HABMED) ---
  const getHabMedN1 = () => {
    return (parseFloat(habmedGrades.n1_formativa.replace(',', '.')) * 0.10 || 0) + 
           (parseFloat(habmedGrades.n1_somativa.replace(',', '.')) * 0.25 || 0) + 
           (parseFloat(habmedGrades.n1_teorica.replace(',', '.')) * 0.15 || 0);
  };

  const getHabMedN2 = () => {
    return (parseFloat(habmedGrades.n2_formativa.replace(',', '.')) * 0.10 || 0) + 
           (parseFloat(habmedGrades.n2_somativa.replace(',', '.')) * 0.25 || 0) + 
           (parseFloat(habmedGrades.n2_teorica.replace(',', '.')) * 0.15 || 0);
  };

  const getHabMedStatus = () => {
    const current = getHabMedN1() + getHabMedN2() + (parseFloat(extraPoints.replace(',', '.')) || 0);
    if (current >= 7) {
      return { text: "Média 7.0 Atingida! 🎉", subtext: null, color: "text-green-500" };
    }
    const missing = 7 - current;
    const neededN2 = (missing * 2).toFixed(2);
    
    return { 
      text: `Faltam ${missing.toFixed(2)} pontos na Média Geral`, 
      subtext: `Nota necessária na N2: ${neededN2}`,
      color: "text-[#003366]" 
    };
  };

  // --- CÁLCULO AUTOMÁTICO (useEffect) ---
  useEffect(() => {
    let base = 0;
    const extra = parseFloat(extraPoints.replace(',', '.')) || 0;

    if (activeCalc === 'UC') {
      base = (getTeoricaPartial() * 0.42) + (getPraticaPartial() * 0.30) + (getTutoriaPartial() * 0.28);
    } else if (activeCalc === 'IESC') {
      const n1 = (parseFloat(iescGrades.n1_teorica) * 0.15) + (parseFloat(iescGrades.n1_pratica) * 0.10) + (parseFloat(iescGrades.n1_extensao) * 0.15) + (parseFloat(iescGrades.n1_portfolio) * 0.10);
      const n2 = (parseFloat(iescGrades.n2_teorica) * 0.15) + (parseFloat(iescGrades.n2_pratica) * 0.10) + (parseFloat(iescGrades.n2_extensao) * 0.15) + (parseFloat(iescGrades.n2_portfolio) * 0.10);
      base = n1 + n2;
    } else if (activeCalc === 'UCCG') {
      const n1 = (parseFloat(uccgGrades.n1_teorica) * 0.25) + (parseFloat(uccgGrades.n1_extensao) * 0.25);
      const n2 = (parseFloat(uccgGrades.n2_teorica) * 0.25) + (parseFloat(uccgGrades.n2_extensao) * 0.25);
      base = n1 + n2;
    } else if (activeCalc === 'HabMed') {
      base = getHabMedN1() + getHabMedN2();
    }

    setResult(parseFloat((base + extra).toFixed(2)));
  }, [
    activeCalc, spGrades, numSps, teoricaMode, praticaMode, teoricaTotal, 
    teoricaAcertos, teoricaNotaDirect, praticaAnatomiaAcertos, praticaMorfoAcertos, 
    praticaAnatomiaNota, praticaMorfoNota, extraPoints, iescGrades, habmedGrades, uccgGrades
  ]);

  // Sincroniza SPs
  useEffect(() => {
    setSpGrades(prev => {
      if (numSps > prev.length) return [...prev, ...Array(numSps - prev.length).fill('')];
      return prev.slice(0, numSps);
    });
  }, [numSps]);

  const handleInputChange = (value: string, setter: (v: string) => void) => {
    if (value === '' || /^[0-9]*\.?[0-9]*$/.test(value.replace(',', '.'))) setter(value);
  };

  const handleModuleInputChange = (setter: any, field: string, value: string) => {
    if (value === '' || /^[0-9]*\.?[0-9]*$/.test(value.replace(',', '.'))) {
      setter((prev: any) => ({ ...prev, [field]: value }));
    }
  };

  // --- CLASSES DE DESIGN ---
  const inputClass = "w-full bg-white text-[#003366] p-4 rounded-2xl border border-gray-200 focus:border-[#D4A017] outline-none font-bold text-center text-lg transition-all shadow-sm";
  const labelClass = "text-[10px] font-black uppercase text-gray-400 mb-2 block tracking-widest ml-1 text-center leading-relaxed";
  const sectionTitleClass = "text-[11px] font-black text-[#003366] uppercase tracking-[0.2em] mb-6 flex items-center justify-between gap-2 w-full";
  const numberBadge = "bg-[#003366] text-white px-2 min-w-6 h-6 rounded-lg flex items-center justify-center text-[10px] shadow-sm font-black";
  const toggleBtnClass = (active: boolean) => `px-3 py-1 text-[9px] font-black rounded-lg transition-all ${active ? 'bg-[#003366] text-white' : 'bg-gray-100 text-gray-400'}`;

  return (
    <div className="max-w-5xl mx-auto px-4 py-12 animate-in fade-in slide-in-from-bottom-6 duration-700">
      
      <div className="text-center mb-12">
        <h2 className="text-4xl md:text-5xl font-black text-[#003366] mb-2 tracking-tighter italic">Calculadora</h2>
        <p className="text-[#D4A017] text-[10px] font-black uppercase tracking-[0.3em]">Cálculo Automático • Turma VIII</p>
      </div>

      {/* SELETOR DE DISCIPLINAS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
        {(['UC', 'HabMed', 'IESC', 'UCCG'] as CalcType[]).map(type => (
          <button 
            key={type} 
            onClick={() => setActiveCalc(type)} 
            className={`py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all border-2 ${
              activeCalc === type 
                ? 'bg-[#003366] text-white border-[#003366] shadow-lg' 
                : 'bg-white text-gray-400 border-gray-100 hover:border-[#D4A017]'
            }`}
          >
            {type === 'HabMed' ? 'Hab. Médicas' : type === 'UC' ? 'Unidade Curricular' : type}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          
          {/* MÓDULO: UNIDADE CURRICULAR (UC) */}
          {activeCalc === 'UC' && (
            <div className="space-y-8 animate-in fade-in duration-500">
              <div className="bg-white p-8 md:p-10 rounded-[2.5rem] shadow-sm border border-gray-100">
                <div className={sectionTitleClass}>
                  <div className="flex items-center gap-3"><span className={numberBadge}>1</span> Tutoria (SPs)</div>
                  <div className="bg-gray-50 px-4 py-1.5 rounded-xl text-[10px] font-black border border-gray-100">
                    MÉDIA (0-10): <span className="text-[#D4A017]">{getTutoriaPartial().toFixed(2)}</span>
                  </div>
                </div>
                <div className="flex items-center gap-4 mb-8">
                  <label className="text-[10px] font-black uppercase text-gray-400">Quantidade:</label>
                  <select value={numSps} onChange={e => setNumSps(parseInt(e.target.value))} className="bg-gray-50 border-none px-4 py-2 rounded-xl text-[10px] font-black text-[#003366] outline-none">
                    {[2, 3, 4, 5, 6].map(n => <option key={n} value={n}>{n} SPs</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-4">
                  {spGrades.map((grade, idx) => (
                    <div key={idx}>
                      <label className="text-[9px] font-black text-gray-400 uppercase mb-2 block text-center">SP {idx + 1}</label>
                      <input type="text" value={grade} onChange={e => handleInputChange(e.target.value, (v) => { const newG = [...spGrades]; newG[idx] = v; setSpGrades(newG); })} placeholder="0-100" className={`${inputClass} !p-3 !text-sm !rounded-xl`} />
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white p-8 md:p-10 rounded-[2.5rem] shadow-sm border border-gray-100">
                <div className={sectionTitleClass}>
                  <div className="flex items-center gap-3"><span className={numberBadge}>2</span> Prova Prática</div>
                  <div className="flex bg-gray-50 p-1.5 rounded-2xl gap-1">
                    <button onClick={() => setPraticaMode('acertos')} className={toggleBtnClass(praticaMode === 'acertos')}>ACERTOS</button>
                    <button onClick={() => setPraticaMode('nota')} className={toggleBtnClass(praticaMode === 'nota')}>NOTA</button>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {praticaMode === 'acertos' ? (
                    <>
                      <div><label className={labelClass}>Anatomia (0-10 Acertos)</label><input type="text" value={praticaAnatomiaAcertos} onChange={e => handleInputChange(e.target.value, setPraticaAnatomiaAcertos)} placeholder="0" className={inputClass} /></div>
                      <div><label className={labelClass}>Morfofuncional (0-10 Acertos)</label><input type="text" value={praticaMorfoAcertos} onChange={e => handleInputChange(e.target.value, setPraticaMorfoAcertos)} placeholder="0" className={inputClass} /></div>
                    </>
                  ) : (
                    <>
                      <div><label className={labelClass}>Nota Anatomia (0 a 10.0)</label><input type="text" value={praticaAnatomiaNota} onChange={e => handleInputChange(e.target.value, setPraticaAnatomiaNota)} placeholder="0.0" className={inputClass} /></div>
                      <div><label className={labelClass}>Nota Morfo/Hist (0 a 10.0)</label><input type="text" value={praticaMorfoNota} onChange={e => handleInputChange(e.target.value, setPraticaMorfoNota)} placeholder="0.0" className={inputClass} /></div>
                    </>
                  )}
                </div>
              </div>

              <div className="bg-white p-8 md:p-10 rounded-[2.5rem] shadow-sm border border-gray-100">
                <div className={sectionTitleClass}>
                  <div className="flex items-center gap-3"><span className={numberBadge}>3</span> Prova Teórica</div>
                  <div className="flex bg-gray-50 p-1.5 rounded-2xl gap-1">
                    <button onClick={() => setTeoricaMode('acertos')} className={toggleBtnClass(teoricaMode === 'acertos')}>ACERTOS</button>
                    <button onClick={() => setTeoricaMode('nota')} className={toggleBtnClass(teoricaMode === 'nota')}>NOTA</button>
                  </div>
                </div>
                {teoricaMode === 'acertos' ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div><label className={labelClass}>Total Questões</label><input type="text" value={teoricaTotal} onChange={e => handleInputChange(e.target.value, setTeoricaTotal)} placeholder="30" className={inputClass} /></div>
                    <div><label className={labelClass}>Seus Acertos</label><input type="text" value={teoricaAcertos} onChange={e => handleInputChange(e.target.value, setTeoricaAcertos)} placeholder="0" className={inputClass} /></div>
                  </div>
                ) : (
                  <div><label className={labelClass}>Nota Final da Teórica</label><input type="text" value={teoricaNotaDirect} onChange={e => handleInputChange(e.target.value, setTeoricaNotaDirect)} placeholder="0.0" className={inputClass} /></div>
                )}
                <div className="mt-10 p-6 bg-[#D4A017]/5 rounded-[2rem] border border-[#D4A017]/20 flex flex-col items-center justify-center gap-2">
                  <div className="text-[10px] font-black text-[#D4A017] uppercase tracking-[0.3em]">🎯 Objetivo para Média 7.0</div>
                  <div className={`text-3xl font-black tracking-tighter ${getNeededHitsStatus().color}`}>
                    {getNeededHitsStatus().text}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* MÓDULO: IESC */}
          {activeCalc === 'IESC' && (
            <div className="space-y-8 animate-in fade-in duration-500">
              <div className="bg-white p-8 md:p-10 rounded-[2.5rem] shadow-sm border border-gray-100">
                <div className={sectionTitleClass}><div className="flex items-center gap-3"><span className={numberBadge}>N1</span></div></div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div><label className={labelClass}>Teórica (1.5)</label><input type="text" value={iescGrades.n1_teorica} onChange={e => handleModuleInputChange(setIescGrades, 'n1_teorica', e.target.value)} placeholder="0-10" className={inputClass} /></div>
                  <div><label className={labelClass}>Prática (1.0)</label><input type="text" value={iescGrades.n1_pratica} onChange={e => handleModuleInputChange(setIescGrades, 'n1_pratica', e.target.value)} placeholder="0-10" className={inputClass} /></div>
                  <div><label className={labelClass}>Extensão (1.5)</label><input type="text" value={iescGrades.n1_extensao} onChange={e => handleModuleInputChange(setIescGrades, 'n1_extensao', e.target.value)} placeholder="0-10" className={inputClass} /></div>
                  <div><label className={labelClass}>Portfólio (1.0)</label><input type="text" value={iescGrades.n1_portfolio} onChange={e => handleModuleInputChange(setIescGrades, 'n1_portfolio', e.target.value)} placeholder="0-10" className={inputClass} /></div>
                </div>
              </div>
              <div className="bg-white p-8 md:p-10 rounded-[2.5rem] shadow-sm border border-gray-100">
                <div className={sectionTitleClass}><div className="flex items-center gap-3"><span className={numberBadge}>N2</span></div></div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div><label className={labelClass}>Teórica (1.5)</label><input type="text" value={iescGrades.n2_teorica} onChange={e => handleModuleInputChange(setIescGrades, 'n2_teorica', e.target.value)} placeholder="0-10" className={inputClass} /></div>
                  <div><label className={labelClass}>Prática (1.0)</label><input type="text" value={iescGrades.n2_pratica} onChange={e => handleModuleInputChange(setIescGrades, 'n2_pratica', e.target.value)} placeholder="0-10" className={inputClass} /></div>
                  <div><label className={labelClass}>Extensão (1.5)</label><input type="text" value={iescGrades.n2_extensao} onChange={e => handleModuleInputChange(setIescGrades, 'n2_extensao', e.target.value)} placeholder="0-10" className={inputClass} /></div>
                  <div><label className={labelClass}>Portfólio (1.0)</label><input type="text" value={iescGrades.n2_portfolio} onChange={e => handleModuleInputChange(setIescGrades, 'n2_portfolio', e.target.value)} placeholder="0-10" className={inputClass} /></div>
                </div>
              </div>
            </div>
          )}

          {/* MÓDULO: UCCG */}
          {activeCalc === 'UCCG' && (
            <div className="space-y-8 animate-in fade-in duration-500">
              <div className="bg-white p-8 md:p-10 rounded-[2.5rem] shadow-sm border border-gray-100">
                <div className={sectionTitleClass}><div className="flex items-center gap-3"><span className={numberBadge}>N1</span></div></div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div><label className={labelClass}>Teórica (2.5)</label><input type="text" value={uccgGrades.n1_teorica} onChange={e => handleModuleInputChange(setUccgGrades, 'n1_teorica', e.target.value)} placeholder="0-10" className={inputClass} /></div>
                  <div><label className={labelClass}>Extensão (2.5)</label><input type="text" value={uccgGrades.n1_extensao} onChange={e => handleModuleInputChange(setUccgGrades, 'n1_extensao', e.target.value)} placeholder="0-10" className={inputClass} /></div>
                </div>
              </div>
              <div className="bg-white p-8 md:p-10 rounded-[2.5rem] shadow-sm border border-gray-100">
                <div className={sectionTitleClass}><div className="flex items-center gap-3"><span className={numberBadge}>N2</span></div></div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div><label className={labelClass}>Teórica (2.5)</label><input type="text" value={uccgGrades.n2_teorica} onChange={e => handleModuleInputChange(setUccgGrades, 'n2_teorica', e.target.value)} placeholder="0-10" className={inputClass} /></div>
                  <div><label className={labelClass}>Extensão (2.5)</label><input type="text" value={uccgGrades.n2_extensao} onChange={e => handleModuleInputChange(setUccgGrades, 'n2_extensao', e.target.value)} placeholder="0-10" className={inputClass} /></div>
                </div>
              </div>
            </div>
          )}

          {/* MÓDULO: HABMED (Habilidades Médicas) */}
          {activeCalc === 'HabMed' && (
            <div className="space-y-8 animate-in fade-in duration-500">
              <div className="bg-white p-8 md:p-10 rounded-[2.5rem] shadow-sm border border-gray-100">
                <div className={sectionTitleClass}>
                  <div className="flex items-center gap-3"><span className={numberBadge}>N1</span></div>
                  <div className="bg-gray-50 px-4 py-2 rounded-xl text-xs font-black border border-gray-200 shadow-sm flex items-center gap-2">
                    <span className="text-gray-500">MÉDIA UNIDADE:</span>
                    <span className="text-[#D4A017] text-lg md:text-xl">{(getHabMedN1() * 2).toFixed(2)}</span>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className={labelClass}>Teórica<br/>Peso Unid: 3,0<br/>Peso Geral: 1,5</label>
                    <input type="text" value={habmedGrades.n1_teorica} onChange={e => handleModuleInputChange(setHabmedGrades, 'n1_teorica', e.target.value)} placeholder="0-10" className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>P. Formativa<br/>Peso Unid: 2,0<br/>Peso Geral: 1,0</label>
                    <input type="text" value={habmedGrades.n1_formativa} onChange={e => handleModuleInputChange(setHabmedGrades, 'n1_formativa', e.target.value)} placeholder="0-10" className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>P. Somativa<br/>Peso Unid: 5,0<br/>Peso Geral: 2,5</label>
                    <input type="text" value={habmedGrades.n1_somativa} onChange={e => handleModuleInputChange(setHabmedGrades, 'n1_somativa', e.target.value)} placeholder="0-10" className={inputClass} />
                  </div>
                </div>
              </div>
              <div className="bg-white p-8 md:p-10 rounded-[2.5rem] shadow-sm border border-gray-100">
                <div className={sectionTitleClass}>
                  <div className="flex items-center gap-3"><span className={numberBadge}>N2</span></div>
                  <div className="bg-gray-50 px-4 py-2 rounded-xl text-xs font-black border border-gray-200 shadow-sm flex items-center gap-2">
                    <span className="text-gray-500">MÉDIA UNIDADE:</span>
                    <span className="text-[#D4A017] text-lg md:text-xl">{(getHabMedN2() * 2).toFixed(2)}</span>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className={labelClass}>Teórica<br/>Peso Unid: 3,0<br/>Peso Geral: 1,5</label>
                    <input type="text" value={habmedGrades.n2_teorica} onChange={e => handleModuleInputChange(setHabmedGrades, 'n2_teorica', e.target.value)} placeholder="0-10" className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>P. Formativa<br/>Peso Unid: 2,0<br/>Peso Geral: 1,0</label>
                    <input type="text" value={habmedGrades.n2_formativa} onChange={e => handleModuleInputChange(setHabmedGrades, 'n2_formativa', e.target.value)} placeholder="0-10" className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>P. Somativa<br/>Peso Unid: 5,0<br/>Peso Geral: 2,5</label>
                    <input type="text" value={habmedGrades.n2_somativa} onChange={e => handleModuleInputChange(setHabmedGrades, 'n2_somativa', e.target.value)} placeholder="0-10" className={inputClass} />
                  </div>
                </div>
              </div>
              {/* FEEDBACK DE PONTOS FALTANTES PARA HABMED */}
              <div className="bg-white p-8 md:p-10 rounded-[2.5rem] shadow-sm border border-gray-100">
                <div className="p-6 bg-[#D4A017]/5 rounded-[2rem] border border-[#D4A017]/20 flex flex-col items-center justify-center gap-2 text-center">
                  <div className="text-[10px] font-black text-[#D4A017] uppercase tracking-[0.3em]">🎯 Objetivo para Média 7.0</div>
                  <div className={`text-3xl font-black tracking-tighter ${getHabMedStatus().color}`}>
                    {getHabMedStatus().text}
                  </div>
                  {getHabMedStatus().subtext && (
                    <div className="text-sm font-black text-gray-500 mt-2 uppercase tracking-widest bg-white px-4 py-2 rounded-xl border border-gray-100 shadow-sm">
                      {getHabMedStatus().subtext}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* SIDEBAR RESULTADO */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-[3rem] p-10 shadow-2xl shadow-[#003366]/5 border border-gray-100 sticky top-32 flex flex-col items-center">
            <h3 className="text-[10px] font-black uppercase text-gray-400 tracking-[0.4em] mb-10 text-center">Média Final</h3>
            <div className="w-full flex flex-col items-center justify-center py-12 rounded-[2.5rem] bg-gray-50 border border-gray-100 mb-10">
              <div className="text-center">
                <div className={`text-8xl font-black tracking-tighter mb-2 ${result && result >= 7 ? 'text-green-500' : result && result >= 5 ? 'text-yellow-500' : 'text-red-500'}`}>
                  {result ? result.toFixed(2) : "0.00"}
                </div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#003366] opacity-60">Atualizado</p>
              </div>
            </div>
            <div className="w-full">
              <label className={labelClass}>Teste de Progresso (TP)</label>
              <input type="text" value={extraPoints} onChange={e => handleInputChange(e.target.value, setExtraPoints)} placeholder="0.0" className={`${inputClass} !text-base !p-3`} />
            </div>
          </div>
        </div>
      </div>

      <button onClick={onBack} className="mt-16 mx-auto block text-gray-400 hover:text-[#003366] transition-colors text-[9px] font-black uppercase tracking-[0.4em]">
        ← Voltar ao Início
      </button>
    </div>
  );
};

export default CalculatorsView;