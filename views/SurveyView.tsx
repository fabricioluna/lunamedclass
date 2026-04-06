import React, { useState } from 'react';
import { ChevronLeft, Send, CheckCircle, Star, HeartHandshake } from 'lucide-react';
import { SurveyAnswers, SurveyResponse } from '../types';

interface SurveyViewProps {
  onBack: () => void;
  onSaveResult: (data: SurveyResponse) => void;
}

const SurveyView: React.FC<SurveyViewProps> = ({ onBack, onSaveResult }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const [answers, setAnswers] = useState<SurveyAnswers>({
    usagePattern: '',
    q2_timeSaved: 0,
    q3_interface: 0,
    q4_simulators: 0,
    q5_finalImpact: 0,
    q6_bestFeature: '',
    q7_nextUnit: '',
    q8_nps: -1 // Inicializa como não selecionado
  });

  const handleLikert = (field: keyof SurveyAnswers, value: number) => {
    setAnswers(prev => ({ ...prev, [field]: value }));
  };

  const isFormValid = 
    answers.usagePattern !== '' &&
    answers.q2_timeSaved > 0 &&
    answers.q3_interface > 0 &&
    answers.q4_simulators > 0 &&
    answers.q5_finalImpact > 0 &&
    answers.q8_nps !== -1 && // Validação da métrica NPS
    answers.q6_bestFeature.trim().length > 5 &&
    answers.q7_nextUnit.trim().length > 5;

  const handleSubmit = () => {
    if (!isFormValid) return;
    
    setIsSubmitting(true);
    
    const payload: SurveyResponse = {
      unit: 'Turma 9 - HM1',
      answers: { ...answers },
      createdAt: new Date().toLocaleString()
    };

    onSaveResult(payload);

    setTimeout(() => {
      setIsSubmitting(false);
      setIsSuccess(true);
    }, 800);
  };

  if (isSuccess) {
    return (
      <div className="flex-grow flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-500">
        <CheckCircle className="w-24 h-24 text-green-500 mb-6" />
        <h2 className="text-3xl font-black text-[#003366] mb-3">Avaliação Recebida!</h2>
        <p className="text-gray-600 mb-10 max-w-lg text-lg">
          Seu feedback anônimo é fundamental para evoluirmos a inteligência do Luna MedClass. Agradecemos a colaboração!
        </p>
        <button 
          onClick={onBack}
          className="bg-[#003366] text-white px-10 py-4 rounded-2xl font-black uppercase tracking-widest hover:bg-[#002244] transition-all shadow-lg hover:shadow-xl"
        >
          Voltar ao Início
        </button>
      </div>
    );
  }

  // REFINAMENTO SEMÂNTICO 
  const likertQuestions: { id: keyof SurveyAnswers; text: string }[] = [
    { id: 'q2_timeSaved', text: 'Revisão Eficiente: A centralização dos resumos poupou meu tempo e reduziu a carga mental de buscar PDFs fragmentados em grupos.' },
    { id: 'q3_interface', text: 'Usabilidade: A interface do portal é intuitiva e me permitiu focar 100% no conteúdo de Habilidades Médicas 1.' },
    { id: 'q4_simulators', text: 'Eficácia Prática: Os Simulados Teóricos atuaram como um "diagnóstico", ajudando a identificar minhas lacunas e fixar os conceitos fundamentais da disciplina antes da prova.' },
    { id: 'q5_finalImpact', text: 'Autoeficácia e Nota: O uso do Luna MedClass aumentou minha confiança, reduziu minha ansiedade e impactou positivamente no meu resultado final.' }
  ];

  return (
    <div className="flex flex-col h-full bg-[#f4f7f6] animate-in slide-in-from-bottom-8 duration-500 pb-20">
      <div className="bg-white p-4 flex items-center border-b sticky top-0 z-20 shadow-sm">
        <button onClick={onBack} className="p-2 mr-3 bg-gray-100 rounded-full text-[#003366] hover:bg-gray-200 transition-colors">
          <ChevronLeft size={24} />
        </button>
        <div>
          <h1 className="text-xl font-black text-[#003366] leading-tight">Avaliação HM1</h1>
          <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Pesquisa Institucional Anônima</p>
        </div>
      </div>

      <div className="flex-grow p-4 md:p-8 max-w-3xl mx-auto w-full space-y-8 mt-4">
        
        <div className="bg-[#003366] text-white p-6 md:p-8 rounded-[2rem] shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-10">
            <Star size={100} />
          </div>
          <h2 className="text-2xl font-black mb-2 relative z-10">Sua Voz no Luna MedClass</h2>
          <p className="text-blue-100 text-sm font-medium relative z-10 max-w-lg">
            Sua opinião vai direcionar o desenvolvimento dos novos módulos. Responda com sinceridade (sua identidade não será registrada).
          </p>
        </div>

        {/* 1. PADRÃO DE USO */}
        <div className="bg-white p-6 md:p-8 rounded-[2rem] border border-gray-100 shadow-sm">
          <h3 className="text-lg font-black text-[#003366] mb-4">1. Padrão de Uso na Unidade 1</h3>
          <div className="space-y-3">
            {[
              'Uso pontual (1 a 2 dias antes da prova)',
              'Uso intermitente (alguns dias na semana da prova)',
              'Uso contínuo (acessei frequentemente)'
            ].map((opt) => (
              <label key={opt} className={`flex items-center p-4 md:p-5 border-2 rounded-2xl cursor-pointer transition-all ${answers.usagePattern === opt ? 'border-[#D4A017] bg-yellow-50/30' : 'border-gray-100 hover:border-gray-300'}`}>
                <input 
                  type="radio" 
                  name="usage" 
                  className="hidden" 
                  checked={answers.usagePattern === opt}
                  onChange={() => setAnswers(prev => ({ ...prev, usagePattern: opt }))}
                />
                <div className={`w-5 h-5 rounded-full border-2 mr-4 flex items-center justify-center ${answers.usagePattern === opt ? 'border-[#D4A017]' : 'border-gray-300'}`}>
                  {answers.usagePattern === opt && <div className="w-2.5 h-2.5 bg-[#D4A017] rounded-full" />}
                </div>
                <span className={`text-sm md:text-base font-bold ${answers.usagePattern === opt ? 'text-[#003366]' : 'text-gray-600'}`}>{opt}</span>
              </label>
            ))}
          </div>
        </div>

        {/* 2. ESCALA LIKERT */}
        <div className="space-y-4">
          <h3 className="text-lg font-black text-[#003366] ml-2 mt-4">2. Avaliação de Impacto</h3>
          <div className="bg-blue-50 text-blue-800 p-4 rounded-xl text-xs font-bold mb-4 flex items-start gap-2">
            <Star className="w-4 h-4 mt-0.5 shrink-0" />
            <p>1 estrela (Discordo Totalmente) a 5 estrelas (Concordo Totalmente).</p>
          </div>

          {likertQuestions.map((q) => (
            <div key={q.id} className="bg-white p-6 md:p-8 rounded-[2rem] border border-gray-100 shadow-sm transition-all hover:shadow-md">
              <p className="text-base font-bold text-gray-700 mb-6">{q.text}</p>
              <div className="flex justify-between items-center px-2 md:px-8">
                {[1, 2, 3, 4, 5].map((val) => (
                  <button 
                    key={val}
                    onClick={() => handleLikert(q.id, val)}
                    className={`p-3 md:p-4 rounded-full transition-all duration-300 flex flex-col items-center gap-2 ${Number(answers[q.id]) >= val ? 'text-[#D4A017] scale-110 bg-yellow-50' : 'text-gray-300 hover:text-gray-400 bg-gray-50'}`}
                  >
                    <Star fill={Number(answers[q.id]) >= val ? 'currentColor' : 'none'} size={32} />
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* 3. NPS - NET PROMOTER SCORE */}
        <div className="bg-white p-6 md:p-8 rounded-[2rem] border border-gray-100 shadow-sm relative overflow-hidden">
          <div className="absolute -right-4 -top-4 opacity-5 text-[#D4A017]">
            <HeartHandshake size={150} />
          </div>
          <h3 className="text-lg font-black text-[#003366] mb-2 relative z-10">3. Recomendação Institucional</h3>
          <p className="text-sm text-gray-500 font-medium mb-8 relative z-10">
            Em uma escala de 0 a 10, o quanto você recomendaria o Luna MedClass para um calouro do próximo semestre?
          </p>
          
          <div className="flex flex-wrap gap-2 justify-center relative z-10">
            {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((val) => (
              <button
                key={val}
                onClick={() => handleLikert('q8_nps', val)}
                className={`w-10 h-10 md:w-12 md:h-12 flex items-center justify-center rounded-full font-black text-sm md:text-base transition-all duration-300 ${
                  answers.q8_nps === val 
                    ? 'bg-[#D4A017] text-white scale-110 shadow-lg' 
                    : 'bg-gray-100 text-gray-400 hover:bg-gray-200 hover:text-gray-600'
                }`}
              >
                {val}
              </button>
            ))}
          </div>
          
          <div className="flex justify-between mt-6 text-[10px] md:text-xs font-black text-gray-400 uppercase tracking-widest relative z-10">
            <span>0 - Não recomendaria</span>
            <span>10 - Com certeza</span>
          </div>
        </div>

        {/* 4. PERGUNTAS ABERTAS */}
        <div className="bg-white p-6 md:p-8 rounded-[2rem] border border-gray-100 shadow-sm space-y-8">
          <div>
            <h3 className="text-lg font-black text-[#003366] mb-2">4. Feedback Aberto</h3>
            <p className="text-sm text-gray-500 font-medium mb-4">Qual funcionalidade (Resumos ou Simulados) mais te salvou na hora da prova e por quê?</p>
            <textarea 
              rows={4}
              className="w-full p-4 border-2 border-gray-100 rounded-2xl bg-gray-50 text-base font-medium focus:ring-4 focus:ring-[#D4A017]/20 focus:border-[#D4A017] outline-none resize-none transition-all"
              placeholder="Digite sua resposta sincera..."
              value={answers.q6_bestFeature}
              onChange={e => setAnswers(prev => ({ ...prev, q6_bestFeature: e.target.value }))}
            />
          </div>

          <div className="pt-6 border-t border-gray-100">
            <h3 className="text-lg font-black text-[#003366] mb-2">5. Expectativas para a N2</h3>
            <p className="text-sm text-gray-500 font-medium mb-4">O que você espera encontrar de novidades no sistema para te ajudar na N2?</p>
            <textarea 
              rows={4}
              className="w-full p-4 border-2 border-gray-100 rounded-2xl bg-gray-50 text-base font-medium focus:ring-4 focus:ring-[#D4A017]/20 focus:border-[#D4A017] outline-none resize-none transition-all"
              placeholder="Descreva as novas funcionalidades ou conteúdos que você gostaria de ter..."
              value={answers.q7_nextUnit}
              onChange={e => setAnswers(prev => ({ ...prev, q7_nextUnit: e.target.value }))}
            />
          </div>
        </div>

        <button 
          disabled={!isFormValid || isSubmitting}
          onClick={handleSubmit}
          className="w-full bg-[#003366] flex items-center justify-center gap-3 text-white py-6 rounded-[2rem] font-black uppercase tracking-widest text-lg shadow-xl disabled:opacity-50 disabled:cursor-not-allowed hover:bg-green-600 transition-all group"
        >
          {isSubmitting ? (
            <div className="w-6 h-6 border-4 border-white/30 border-t-white rounded-full animate-spin"/>
          ) : (
            <>
              <Send size={24} className="group-hover:-translate-y-1 transition-transform" /> 
              Enviar Avaliação
            </>
          )}
        </button>

        {!isFormValid && (
          <p className="text-center text-red-500 text-xs font-bold uppercase tracking-wider">
            Responda todas as perguntas para enviar.
          </p>
        )}

      </div>
    </div>
  );
};

export default SurveyView;