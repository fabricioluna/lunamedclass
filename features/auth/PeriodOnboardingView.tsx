import { GraduationCap } from 'lucide-react';
import { Period } from '../../types';

interface PeriodOnboardingViewProps {
  periods: Period[];
  selectedPeriod: string;
  onSelectPeriod: (periodId: string) => void;
  isProcessing: boolean;
  onConfirm: () => void;
}

const PeriodOnboardingView: React.FC<PeriodOnboardingViewProps> = ({
  periods, selectedPeriod, onSelectPeriod, isProcessing, onConfirm
}) => {
  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 py-8 animate-in fade-in duration-700 bg-[#f4f7f6]">
      <div className="bg-white p-8 md:p-10 rounded-[2.5rem] shadow-2xl w-full max-w-md text-center border-4 border-[#003366]/10">
        <div className="w-16 h-16 bg-[#D4A017] text-[#003366] rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
          <GraduationCap size={32} />
        </div>
        <h2 className="text-2xl font-black text-[#003366] mb-2 uppercase tracking-tighter">Quase Lá!</h2>
        <p className="text-xs text-gray-500 font-bold mb-8 uppercase tracking-widest leading-relaxed px-4">
          Para liberarmos suas disciplinas e simuladores clínicos, informe o seu semestre atual.
        </p>
        <div className="relative mb-6 text-left">
          <select
            value={selectedPeriod}
            onChange={(e) => onSelectPeriod(e.target.value)}
            className="w-full pl-4 pr-4 py-4 bg-gray-50 rounded-xl outline-none border-2 border-transparent focus:border-[#003366] transition-all font-bold text-[#003366] appearance-none"
          >
            <option value="" disabled>Selecione seu Período Atual...</option>
            {periods.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
        <button
          onClick={onConfirm}
          disabled={!selectedPeriod || isProcessing}
          className="w-full bg-[#003366] text-white py-4 rounded-xl font-black uppercase tracking-widest shadow-lg hover:bg-[#D4A017] hover:text-[#003366] transition-all disabled:opacity-50"
        >
          {isProcessing ? 'Gravando...' : 'Concluir Prontuário'}
        </button>
      </div>
    </div>
  );
};

export default PeriodOnboardingView;
