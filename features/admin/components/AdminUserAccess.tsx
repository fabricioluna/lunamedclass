import React, { useState } from 'react';
import { Period } from '../../../types';
import { UserProfile } from '../../../services/authService';
import * as adminService from '../../../services/adminService';
import { updateUserExtraPeriods } from '../../../services/authService';
import { Search, Loader2, Save, UserX, ShieldCheck } from 'lucide-react';

interface AdminUserAccessProps {
  periods: Period[];
}

// Libera período extra por e-mail (ex.: aluno do período 2 que também monitora o período 1).
// Não altera periodId (o "período de casa" do aluno, usado em matrícula/estatística) — só
// amplia o que a trava de rota em routes/AppRoutes.tsx (canAccessPeriod) deixa passar. A
// autoridade de dado continua sendo a Security Rule de cada coleção, não este campo.
const AdminUserAccess: React.FC<AdminUserAccessProps> = ({ periods }) => {
  const [emailInput, setEmailInput] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchedOnce, setSearchedOnce] = useState(false);
  const [foundUser, setFoundUser] = useState<UserProfile | null>(null);
  const [draftExtra, setDraftExtra] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  const handleSearch = async () => {
    const trimmed = emailInput.trim();
    if (!trimmed) return;

    setIsSearching(true);
    setSearchedOnce(false);
    try {
      const user = await adminService.findUserByEmail(trimmed);
      setFoundUser(user);
      setDraftExtra(user?.extraPeriodIds ?? []);
      setSearchedOnce(true);
    } catch (error) {
      console.error('Erro ao buscar usuário por e-mail:', error);
      alert('Erro ao buscar. Verifique a conexão e tente de novo.');
    } finally {
      setIsSearching(false);
    }
  };

  const toggleExtra = (periodId: string) => {
    setDraftExtra(prev =>
      prev.includes(periodId) ? prev.filter(id => id !== periodId) : [...prev, periodId]
    );
  };

  const isDirty = foundUser
    ? JSON.stringify([...draftExtra].sort()) !== JSON.stringify([...(foundUser.extraPeriodIds ?? [])].sort())
    : false;

  const handleSave = async () => {
    if (!foundUser) return;
    try {
      setIsSaving(true);
      await updateUserExtraPeriods(foundUser.uid, draftExtra);
      setFoundUser(prev => (prev ? { ...prev, extraPeriodIds: draftExtra } : prev));
      alert(`Acesso extra atualizado para ${foundUser.displayName || foundUser.email}.`);
    } catch (error) {
      console.error('Erro ao salvar período extra:', error);
      alert('Erro ao salvar. Verifique se sua conta tem o Custom Claim de admin.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-white p-8 rounded-[2.5rem] border shadow-sm animate-in fade-in duration-500">
      <div className="border-b pb-4 mb-6">
        <h3 className="text-xl font-black text-[#003366] uppercase tracking-tighter">Acesso Extra por Usuário</h3>
        <p className="text-gray-500 text-xs font-medium mt-2 max-w-2xl">
          Busque um usuário pelo e-mail (o mesmo que ele usa pra logar) e libere períodos além
          do período de casa dele — ex.: aluno do 2º período que também monitora o 1º. Isso não
          muda a matrícula/período oficial, só o que a navegação deixa passar.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-8">
        <input
          type="email"
          value={emailInput}
          onChange={e => setEmailInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') handleSearch(); }}
          placeholder="email@exemplo.com"
          className="flex-1 p-4 bg-gray-50 rounded-xl outline-none border-2 border-gray-200 focus:border-[#D4A017] transition-all font-bold text-[#003366]"
          disabled={isSearching}
        />
        <button
          onClick={handleSearch}
          disabled={!emailInput.trim() || isSearching}
          className="flex items-center justify-center gap-2 bg-[#003366] text-white px-6 py-4 rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-[#D4A017] transition-all disabled:opacity-50 shrink-0"
        >
          {isSearching ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
          Buscar
        </button>
      </div>

      {searchedOnce && !foundUser && (
        <div className="flex flex-col items-center text-center py-10 text-gray-400 border-2 border-dashed border-gray-100 rounded-2xl">
          <UserX size={32} className="mb-3" />
          <p className="font-bold text-sm text-gray-500">Nenhum usuário encontrado com esse e-mail.</p>
          <p className="text-xs mt-1 max-w-sm">
            Confira se está exatamente igual ao usado pra logar, e se a pessoa já logou ao menos
            uma vez (o perfil só existe depois do primeiro login).
          </p>
        </div>
      )}

      {foundUser && (
        <div className="border border-gray-100 rounded-2xl p-6 bg-gray-50">
          <div className="flex items-center gap-3 mb-1">
            <ShieldCheck size={18} className="text-[#D4A017]" />
            <span className="font-black text-[#003366]">{foundUser.displayName || 'Sem nome'}</span>
            <span className="text-[9px] font-black uppercase text-gray-400 tracking-widest bg-white px-2 py-1 rounded-md border border-gray-100">
              {foundUser.role}
            </span>
          </div>
          <p className="text-xs text-gray-500 mb-6">{foundUser.email}</p>

          {foundUser.role !== 'student' ? (
            <p className="text-xs text-gray-500 bg-white border border-gray-100 rounded-xl p-4 mb-2">
              Este papel ({foundUser.role}) já navega livre entre todos os períodos — a trava só
              existe para <code>role: student</code>. Definir o acesso extra abaixo não muda nada
              agora, mas fica pronto caso o papel volte a ser <code>student</code> no futuro.
            </p>
          ) : null}

          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-3">
            Período de casa: {periods.find(p => p.id === foundUser.periodId)?.name || 'Nenhum definido ainda'}
          </p>

          <div className="space-y-2 mb-6">
            {periods
              .filter(p => p.id !== foundUser.periodId)
              .map(period => (
                <label
                  key={period.id}
                  className="flex items-center gap-3 p-3 bg-white rounded-xl border border-gray-100 cursor-pointer hover:border-[#D4A017]/40 transition-all"
                >
                  <input
                    type="checkbox"
                    checked={draftExtra.includes(period.id)}
                    onChange={() => toggleExtra(period.id)}
                    className="w-4 h-4 accent-[#D4A017]"
                  />
                  <span className="font-bold text-sm text-[#003366]">{period.name}</span>
                </label>
              ))}
          </div>

          <button
            onClick={handleSave}
            disabled={!isDirty || isSaving}
            className={`flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all ${
              !isDirty || isSaving
                ? 'bg-gray-100 text-gray-300 cursor-not-allowed'
                : 'bg-[#003366] text-white hover:bg-[#D4A017] shadow-lg'
            }`}
          >
            {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            {isSaving ? 'Salvando' : 'Salvar Acesso Extra'}
          </button>
        </div>
      )}
    </div>
  );
};

export default AdminUserAccess;
