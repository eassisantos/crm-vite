import React, { useState, useMemo } from 'react';
import { useFinancial } from '../context/FinancialContext';
import { useCases } from '../context/CasesContext';
import { useClients } from '../context/ClientsContext';
import { Fee, FeeStatus, FeeType, Expense } from '../types';
import { Link } from 'react-router-dom';
import { DollarSign, CheckCircle, TrendingDown, PlusCircle, Scale, Edit, Trash2, Settings } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import FinancialEntryModal from '../components/financials/FinancialEntryModal';
import InstallmentManagerModal from '../components/financials/InstallmentManagerModal';
import ConfirmationModal from '../components/common/ConfirmationModal';
import ActionMenu, { ActionMenuItem } from '../components/common/ActionMenu';

const getErrorMessage = (error: unknown, fallback: string) =>
  error instanceof Error && error.message ? error.message : fallback;

const StatCard: React.FC<{ icon: React.ReactNode; title: string; value: string; color: string }> = ({ icon, title, value, color }) => (
  <div className="bg-white p-6 rounded-xl shadow-sm flex items-center">
    <div className={`p-3 rounded-full mr-4 ${color}`}>{icon}</div>
    <div>
      <p className="text-sm text-slate-500 font-medium">{title}</p>
      <p className="text-2xl font-bold text-slate-800">{value}</p>
    </div>
  </div>
);

const formatCurrency = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

export default function Financials() {
  const { fees, expenses, addFee, addExpense, updateFee, updateExpense, deleteFee, deleteExpense } = useFinancial();
  const { cases } = useCases();
  const { getClientById } = useClients();
  const { addToast } = useToast();
  const [activeTab, setActiveTab] = useState<'fees' | 'expenses'>('fees');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'fee' | 'expense'>('fee');
  const [editingEntry, setEditingEntry] = useState<Fee | Expense | null>(null);
  const [deletingEntry, setDeletingEntry] = useState<Fee | Expense | null>(null);
  const [managingInstallments, setManagingInstallments] = useState<Fee | null>(null);

  const totalRecebido = useMemo(() => fees.filter(f => f.status === FeeStatus.PAGO).reduce((sum, f) => sum + f.amount, 0), [fees]);
  const totalDespesas = useMemo(() => expenses.reduce((sum, e) => sum + e.amount, 0), [expenses]);
  const balanco = totalRecebido - totalDespesas;

  const getFeeStatusColor = (status: FeeStatus) => {
    switch (status) {
        case FeeStatus.PAGO: return 'bg-emerald-100 text-emerald-800';
        case FeeStatus.ATRASADO: return 'bg-red-100 text-red-800';
        case FeeStatus.PARCIALMENTE_PAGO: return 'bg-sky-100 text-sky-800';
        default: return 'bg-yellow-100 text-yellow-800';
    }
  };

  const handleOpenModal = (type: 'fee' | 'expense', entry: Fee | Expense | null = null) => {
    setModalType(type);
    setEditingEntry(entry);
    setIsModalOpen(true);
  };

  const handleSaveEntry = async (data: Omit<Fee, 'id'> | Omit<Expense, 'id'> | Fee | Expense) => {
    try {
      if ('id' in data) { // Update
        if ('dueDate' in data) {
          await updateFee(data as Fee);
          addToast('Honorário atualizado!', 'success');
        } else {
          await updateExpense(data as Expense);
          addToast('Despesa atualizada!', 'success');
        }
      } else { // Create
        if ('dueDate' in data) {
          await addFee(data as Omit<Fee, 'id'>);
          addToast('Novo honorário adicionado!', 'success');
        } else {
          await addExpense(data as Omit<Expense, 'id'>);
          addToast('Nova despesa adicionada!', 'success');
        }
      }
      setIsModalOpen(false);
      setEditingEntry(null);
    } catch (error) {
      const fallback = 'dueDate' in data ? 'Não foi possível salvar o honorário. Tente novamente.' : 'Não foi possível salvar a despesa. Tente novamente.';
      addToast(getErrorMessage(error, fallback), 'error');
      throw error instanceof Error ? error : new Error(fallback);
    }
  };

  const handleDeleteRequest = (entry: Fee | Expense) => {
    setDeletingEntry(entry);
  };

  const confirmDelete = async () => {
    if (!deletingEntry) return;
    try {
      if ('dueDate' in deletingEntry) {
        await deleteFee(deletingEntry.id);
        addToast('Honorário excluído.', 'info');
      } else {
        await deleteExpense(deletingEntry.id);
        addToast('Despesa excluída.', 'info');
      }
      setDeletingEntry(null);
    } catch (error) {
      const fallback = 'dueDate' in deletingEntry ? 'Não foi possível excluir o honorário. Tente novamente.' : 'Não foi possível excluir a despesa. Tente novamente.';
      addToast(getErrorMessage(error, fallback), 'error');
    }
  };

  const handleFeeStatusChange = (fee: Fee, newStatus: FeeStatus) => {
    if (fee.type === FeeType.PARCELADO) {
        addToast('Status de honorários parcelados é gerenciado na tela de parcelas.', 'info');
        return;
    }
    try {
      await updateFee({ ...fee, status: newStatus });
      addToast('Status do honorário atualizado.', 'success');
    } catch (error) {
      addToast(getErrorMessage(error, 'Não foi possível atualizar o status do honorário. Tente novamente.'), 'error');
    }
  };

  return (
    <>
      <FinancialEntryModal 
        isOpen={isModalOpen} 
        onClose={() => { setIsModalOpen(false); setEditingEntry(null); }} 
        onSave={handleSaveEntry}
        initialData={editingEntry}
        entryType={modalType}
      />
      <ConfirmationModal
        isOpen={!!deletingEntry}
        onClose={() => setDeletingEntry(null)}
        onConfirm={confirmDelete}
        title="Excluir Lançamento"
        message={`Tem certeza que deseja excluir "${deletingEntry?.description}"? Esta ação não pode ser desfeita.`}
      />
      {managingInstallments && <InstallmentManagerModal fee={managingInstallments} onClose={() => setManagingInstallments(null)} />}

      <div className="space-y-8">
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
                <h1 className="text-3xl font-bold text-slate-900">Gestão Financeira</h1>
                <p className="text-slate-600 mt-1">Controle de honorários, despesas e recebíveis.</p>
            </div>
            <div className="flex items-center gap-2">
                <button onClick={() => handleOpenModal('expense')} className="flex items-center bg-red-500 text-white px-4 py-2 rounded-lg shadow-md hover:bg-red-600 transition-colors">
                    <PlusCircle size={20} className="mr-2" />
                    Despesa
                </button>
                <button onClick={() => handleOpenModal('fee')} className="flex items-center bg-sky-600 text-white px-4 py-2 rounded-lg shadow-md hover:bg-sky-700 transition-colors">
                    <PlusCircle size={20} className="mr-2" />
                    Honorário
                </button>
            </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatCard icon={<CheckCircle size={24} className="text-emerald-800" />} title="Total Recebido" value={formatCurrency(totalRecebido)} color="bg-emerald-100" />
          <StatCard icon={<TrendingDown size={24} className="text-red-800" />} title="Total de Despesas" value={formatCurrency(totalDespesas)} color="bg-red-100" />
          <StatCard icon={<Scale size={24} className="text-indigo-800" />} title="Balanço" value={formatCurrency(balanco)} color="bg-indigo-100" />
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm">
            <div className="border-b border-slate-200 mb-4">
                <nav className="-mb-px flex space-x-6">
                    <button onClick={() => setActiveTab('fees')} className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'fees' ? 'border-sky-500 text-sky-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}`}>Honorários</button>
                    <button onClick={() => setActiveTab('expenses')} className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'expenses' ? 'border-sky-500 text-sky-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}`}>Despesas</button>
                </nav>
            </div>

            {activeTab === 'fees' && (
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="border-b-2 border-slate-200 bg-slate-50"><tr><th className="p-3 text-sm font-semibold text-slate-600">Descrição</th><th className="p-3 text-sm font-semibold text-slate-600">Cliente</th><th className="p-3 text-sm font-semibold text-slate-600">Valor</th><th className="p-3 text-sm font-semibold text-slate-600">Vencimento</th><th className="p-3 text-sm font-semibold text-slate-600 text-center">Status</th><th className="p-3 text-sm font-semibold text-slate-600 text-right">Ações</th></tr></thead>
                        <tbody>
                        {fees.map(fee => {
                            const caseData = cases.find(c => c.id === fee.caseId);
                            const client = getClientById(caseData?.clientId || '');
                            return (
                            <tr key={fee.id} className="border-b border-slate-100 hover:bg-slate-50">
                                <td className="p-3 font-medium text-slate-800"><p>{fee.description}</p><Link to={`/casos/${fee.caseId}`} className="text-xs text-sky-600 hover:underline">{caseData?.title || 'Caso não encontrado'}</Link></td>
                                <td className="p-3 text-slate-700">{client?.name || 'Cliente não encontrado'}</td>
                                <td className="p-3 font-semibold text-slate-800">{formatCurrency(fee.amount)}</td>
                                <td className="p-3 text-slate-500">{new Date(fee.dueDate + 'T00:00:00').toLocaleDateString('pt-BR')}</td>
                                <td className="p-3 text-center">
                                    {fee.type === FeeType.PARCELADO ? (
                                        <button onClick={() => setManagingInstallments(fee)} className={`text-xs font-semibold w-full px-2 py-1 rounded-full ${getFeeStatusColor(fee.status)}`}>
                                            {fee.status} ({fee.installments?.filter(i => i.status === 'Pago').length}/{fee.installments?.length})
                                        </button>
                                    ) : (
                                        <select value={fee.status} onChange={(e) => handleFeeStatusChange(fee, e.target.value as FeeStatus)} className={`text-xs font-semibold border-0 rounded-full appearance-none cursor-pointer text-center ${getFeeStatusColor(fee.status)}`}>
                                            <option value={FeeStatus.PENDENTE}>Pendente</option>
                                            <option value={FeeStatus.PAGO}>Pago</option>
                                            <option value={FeeStatus.ATRASADO}>Atrasado</option>
                                        </select>
                                    )}
                                </td>
                                <td className="p-3 text-right">
                                    <ActionMenu>
                                        <ActionMenuItem icon={<Edit size={16} />} label="Editar" onClick={() => handleOpenModal('fee', fee)} />
                                        {fee.type === FeeType.PARCELADO && (<ActionMenuItem icon={<Settings size={16} />} label="Gerenciar Parcelas" onClick={() => setManagingInstallments(fee)} />)}
                                        <ActionMenuItem icon={<Trash2 size={16} />} label="Excluir" onClick={() => handleDeleteRequest(fee)} className="text-red-600" />
                                    </ActionMenu>
                                </td>
                            </tr>
                            );
                        })}
                        </tbody>
                    </table>
                </div>
            )}

            {activeTab === 'expenses' && (
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="border-b-2 border-slate-200 bg-slate-50"><tr><th className="p-3 text-sm font-semibold text-slate-600">Descrição</th><th className="p-3 text-sm font-semibold text-slate-600">Cliente</th><th className="p-3 text-sm font-semibold text-slate-600">Valor</th><th className="p-3 text-sm font-semibold text-slate-600">Data</th><th className="p-3 text-sm font-semibold text-slate-600 text-right">Ações</th></tr></thead>
                        <tbody>
                        {expenses.map(expense => {
                            const caseData = cases.find(c => c.id === expense.caseId);
                            const client = getClientById(caseData?.clientId || '');
                            return (
                            <tr key={expense.id} className="border-b border-slate-100 hover:bg-slate-50">
                                <td className="p-3 font-medium text-slate-800"><p>{expense.description}</p><Link to={`/casos/${expense.caseId}`} className="text-xs text-sky-600 hover:underline">{caseData?.title || 'Caso não encontrado'}</Link></td>
                                <td className="p-3 text-slate-700">{client?.name || 'Cliente não encontrado'}</td>
                                <td className="p-3 font-semibold text-red-600">-{formatCurrency(expense.amount)}</td>
                                <td className="p-3 text-slate-500">{new Date(expense.date + 'T00:00:00').toLocaleDateString('pt-BR')}</td>
                                <td className="p-3 text-right">
                                    <ActionMenu>
                                        <ActionMenuItem icon={<Edit size={16} />} label="Editar" onClick={() => handleOpenModal('expense', expense)} />
                                        <ActionMenuItem icon={<Trash2 size={16} />} label="Excluir" onClick={() => handleDeleteRequest(expense)} className="text-red-600" />
                                    </ActionMenu>
                                </td>
                            </tr>
                            );
                        })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
      </div>
    </>
  );
}
