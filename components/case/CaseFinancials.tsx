
import React, { useState, useMemo } from 'react';
import { Case, Fee, Expense, FeeStatus, FeeType } from '../../types';
import { useCrmData } from '../../context/CrmContext';
import { useToast } from '../../context/ToastContext';
import { DollarSign, TrendingDown, Scale, PlusCircle, Edit, Trash2, Settings, MoreVertical } from 'lucide-react';
import FinancialEntryModal from '../financials/FinancialEntryModal';
import ConfirmationModal from '../common/ConfirmationModal';
import InstallmentManagerModal from '../financials/InstallmentManagerModal';

interface CaseFinancialsProps {
  caseData: Case;
}

const formatCurrency = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

const StatCard: React.FC<{ icon: React.ReactNode; title: string; value: string; color: string }> = ({ icon, title, value, color }) => (
  <div className="bg-slate-50 p-4 rounded-lg flex items-center">
    <div className={`p-3 rounded-full mr-4 ${color}`}>{icon}</div>
    <div>
      <p className="text-sm text-slate-500 font-medium">{title}</p>
      <p className="text-xl font-bold text-slate-800">{value}</p>
    </div>
  </div>
);

const CaseFinancials: React.FC<CaseFinancialsProps> = ({ caseData }) => {
  const { fees, expenses, updateFee, deleteFee, deleteExpense, addFee, addExpense } = useCrmData();
  const { addToast } = useToast();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'fee' | 'expense'>('fee');
  const [editingEntry, setEditingEntry] = useState<Fee | Expense | null>(null);
  const [deletingEntry, setDeletingEntry] = useState<Fee | Expense | null>(null);
  const [managingInstallments, setManagingInstallments] = useState<Fee | null>(null);

  const caseFees = useMemo(() => fees.filter(f => f.caseId === caseData.id), [fees, caseData.id]);
  const caseExpenses = useMemo(() => expenses.filter(e => e.caseId === caseData.id), [expenses, caseData.id]);

  const { totalFees, totalExpenses, balance } = useMemo(() => {
    const totalFees = caseFees.reduce((sum, f) => sum + f.amount, 0);
    const totalExpenses = caseExpenses.reduce((sum, e) => sum + e.amount, 0);
    return { totalFees, totalExpenses, balance: totalFees - totalExpenses };
  }, [caseFees, caseExpenses]);

  const handleOpenModal = (type: 'fee' | 'expense', entry: Fee | Expense | null = null) => {
    setModalType(type);
    setEditingEntry(entry);
    setIsModalOpen(true);
  };

  const handleSaveEntry = (data: Omit<Fee, 'id'> | Omit<Expense, 'id'> | Fee | Expense) => {
    if ('id' in data) { // Update
      if ('dueDate' in data) {
        updateFee(data as Fee);
        addToast('Honorário atualizado!', 'success');
      } else {
        updateExpense(data as Expense);
        addToast('Despesa atualizada!', 'success');
      }
    } else { // Create
      if ('dueDate' in data) {
        addFee(data as Omit<Fee, 'id'>);
        addToast('Novo honorário adicionado!', 'success');
      } else {
        addExpense(data as Omit<Expense, 'id'>);
        addToast('Nova despesa adicionada!', 'success');
      }
    }
    setIsModalOpen(false);
    setEditingEntry(null);
  };

  const handleDeleteRequest = (entry: Fee | Expense) => {
    setDeletingEntry(entry);
  };

  const confirmDelete = () => {
    if (!deletingEntry) return;
    if ('dueDate' in deletingEntry) {
      deleteFee(deletingEntry.id);
      addToast('Honorário excluído.', 'info');
    } else {
      deleteExpense(deletingEntry.id);
      addToast('Despesa excluída.', 'info');
    }
    setDeletingEntry(null);
  };

  const getFeeStatusColor = (status: FeeStatus) => {
    switch (status) {
        case FeeStatus.PAGO: return 'bg-emerald-100 text-emerald-800';
        case FeeStatus.ATRASADO: return 'bg-red-100 text-red-800';
        case FeeStatus.PARCIALMENTE_PAGO: return 'bg-sky-100 text-sky-800';
        default: return 'bg-yellow-100 text-yellow-800';
    }
  };

  return (
    <>
      <FinancialEntryModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSave={handleSaveEntry} initialData={editingEntry} entryType={modalType} preselectedCaseId={caseData.id} />
      <ConfirmationModal isOpen={!!deletingEntry} onClose={() => setDeletingEntry(null)} onConfirm={confirmDelete} title="Excluir Lançamento" message={`Tem certeza que deseja excluir "${deletingEntry?.description}"?`} />
      {managingInstallments && <InstallmentManagerModal fee={managingInstallments} onClose={() => setManagingInstallments(null)} />}

      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard icon={<DollarSign size={20} className="text-emerald-800" />} title="Total de Honorários" value={formatCurrency(totalFees)} color="bg-emerald-100" />
          <StatCard icon={<TrendingDown size={20} className="text-red-800" />} title="Total de Despesas" value={formatCurrency(totalExpenses)} color="bg-red-100" />
          <StatCard icon={<Scale size={20} className="text-indigo-800" />} title="Balanço do Caso" value={formatCurrency(balance)} color="bg-indigo-100" />
        </div>

        <div className="space-y-6">
          <div>
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-lg font-semibold text-slate-700">Honorários</h3>
              <button onClick={() => handleOpenModal('fee')} className="flex items-center text-xs bg-sky-100 text-sky-700 px-2 py-1 rounded-md hover:bg-sky-200"><PlusCircle size={12} className="mr-1" /> Adicionar</button>
            </div>
            <div className="overflow-x-auto bg-white rounded-lg border">
              <table className="w-full text-left">
                <thead className="bg-slate-50"><tr><th className="p-3 text-sm font-semibold text-slate-600">Descrição</th><th className="p-3 text-sm font-semibold text-slate-600">Valor</th><th className="p-3 text-sm font-semibold text-slate-600">Vencimento</th><th className="p-3 text-sm font-semibold text-slate-600 text-center">Status</th><th className="p-3"></th></tr></thead>
                <tbody>
                  {caseFees.map(fee => (
                    <tr key={fee.id} className="border-t border-slate-100 hover:bg-slate-50">
                      <td className="p-3 font-medium text-slate-800">{fee.description}</td>
                      <td className="p-3 font-semibold text-slate-800">{formatCurrency(fee.amount)}</td>
                      <td className="p-3 text-slate-500">{new Date(fee.dueDate + 'T00:00:00').toLocaleDateString('pt-BR')}</td>
                      <td className="p-3 text-center"><span className={`text-xs font-semibold px-2 py-1 rounded-full ${getFeeStatusColor(fee.status)}`}>{fee.status}</span></td>
                      <td className="p-3 text-right">
                        <div className="flex justify-end items-center">
                          {fee.type === FeeType.PARCELADO && <button onClick={() => setManagingInstallments(fee)} className="p-2 rounded-full hover:bg-slate-200"><Settings size={16} /></button>}
                          <button onClick={() => handleOpenModal('fee', fee)} className="p-2 rounded-full hover:bg-slate-200"><Edit size={16} /></button>
                          <button onClick={() => handleDeleteRequest(fee)} className="p-2 rounded-full hover:bg-slate-200 text-red-500"><Trash2 size={16} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {caseFees.length === 0 && <p className="text-center text-sm text-slate-500 py-4">Nenhum honorário para este caso.</p>}
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-lg font-semibold text-slate-700">Despesas</h3>
              <button onClick={() => handleOpenModal('expense')} className="flex items-center text-xs bg-red-100 text-red-700 px-2 py-1 rounded-md hover:bg-red-200"><PlusCircle size={12} className="mr-1" /> Adicionar</button>
            </div>
            <div className="overflow-x-auto bg-white rounded-lg border">
              <table className="w-full text-left">
                <thead className="bg-slate-50"><tr><th className="p-3 text-sm font-semibold text-slate-600">Descrição</th><th className="p-3 text-sm font-semibold text-slate-600">Valor</th><th className="p-3 text-sm font-semibold text-slate-600">Data</th><th className="p-3"></th></tr></thead>
                <tbody>
                  {caseExpenses.map(expense => (
                    <tr key={expense.id} className="border-t border-slate-100 hover:bg-slate-50">
                      <td className="p-3 font-medium text-slate-800">{expense.description}</td>
                      <td className="p-3 font-semibold text-red-600">-{formatCurrency(expense.amount)}</td>
                      <td className="p-3 text-slate-500">{new Date(expense.date + 'T00:00:00').toLocaleDateString('pt-BR')}</td>
                      <td className="p-3 text-right">
                        <div className="flex justify-end items-center">
                          <button onClick={() => handleOpenModal('expense', expense)} className="p-2 rounded-full hover:bg-slate-200"><Edit size={16} /></button>
                          <button onClick={() => handleDeleteRequest(expense)} className="p-2 rounded-full hover:bg-slate-200 text-red-500"><Trash2 size={16} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {caseExpenses.length === 0 && <p className="text-center text-sm text-slate-500 py-4">Nenhuma despesa para este caso.</p>}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default CaseFinancials;
