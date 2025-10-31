
import React, { useMemo } from 'react';
import { Client, Fee, Expense, FeeStatus } from '../../types';
import { useCases } from '../../context/CasesContext';
import { useFinancial } from '../../context/FinancialContext';
import { DollarSign, TrendingDown, Scale, CheckCircle, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';

interface ClientFinancialsProps {
  client: Client;
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

const ClientFinancials: React.FC<ClientFinancialsProps> = ({ client }) => {
  const { cases } = useCases();
  const { fees, expenses, getFinancialsByClientId } = useFinancial();

  const clientCases = useMemo(() => cases.filter(c => c.clientId === client.id), [cases, client.id]);
  const clientCaseIds = useMemo(() => clientCases.map(c => c.id), [clientCases]);
  const clientFees = useMemo(() => fees.filter(f => clientCaseIds.includes(f.caseId)), [fees, clientCaseIds]);
  const clientExpenses = useMemo(() => expenses.filter(e => clientCaseIds.includes(e.caseId)), [expenses, clientCaseIds]);

  const { totalFees, totalExpenses, balance, paidFees, pendingFees } = getFinancialsByClientId(client.id);

  const getFeeStatusColor = (status: FeeStatus) => {
    switch (status) {
        case FeeStatus.PAGO: return 'bg-emerald-100 text-emerald-800';
        case FeeStatus.ATRASADO: return 'bg-red-100 text-red-800';
        case FeeStatus.PARCIALMENTE_PAGO: return 'bg-sky-100 text-sky-800';
        default: return 'bg-yellow-100 text-yellow-800';
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={<DollarSign size={20} className="text-blue-800" />} title="Total em Honorários" value={formatCurrency(totalFees)} color="bg-blue-100" />
        <StatCard icon={<CheckCircle size={20} className="text-emerald-800" />} title="Total Recebido" value={formatCurrency(paidFees)} color="bg-emerald-100" />
        <StatCard icon={<Clock size={20} className="text-yellow-800" />} title="Pendente" value={formatCurrency(pendingFees)} color="bg-yellow-100" />
        <StatCard icon={<TrendingDown size={20} className="text-red-800" />} title="Total de Despesas" value={formatCurrency(totalExpenses)} color="bg-red-100" />
      </div>
      <div className="p-4 bg-slate-100 rounded-lg text-center">
        <p className="text-sm text-slate-600">Balanço do Cliente (Recebido - Despesas)</p>
        <p className={`text-3xl font-bold ${balance >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{formatCurrency(balance)}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <h3 className="text-lg font-semibold text-slate-700 mb-2">Honorários</h3>
          <div className="overflow-x-auto bg-white rounded-lg border max-h-96 overflow-y-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 sticky top-0"><tr><th className="p-3 text-sm font-semibold text-slate-600">Descrição</th><th className="p-3 text-sm font-semibold text-slate-600">Valor</th><th className="p-3 text-sm font-semibold text-slate-600 text-center">Status</th></tr></thead>
              <tbody>
                {clientFees.map(fee => (
                  <tr key={fee.id} className="border-t border-slate-100">
                    <td className="p-3 font-medium text-slate-800"><Link to={`/casos/${fee.caseId}`} className="hover:underline">{fee.description}</Link></td>
                    <td className="p-3 font-semibold text-slate-800">{formatCurrency(fee.amount)}</td>
                    <td className="p-3 text-center"><span className={`text-xs font-semibold px-2 py-1 rounded-full ${getFeeStatusColor(fee.status)}`}>{fee.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
            {clientFees.length === 0 && <p className="text-center text-sm text-slate-500 py-4">Nenhum honorário para este cliente.</p>}
          </div>
        </div>

        <div>
          <h3 className="text-lg font-semibold text-slate-700 mb-2">Despesas</h3>
          <div className="overflow-x-auto bg-white rounded-lg border max-h-96 overflow-y-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 sticky top-0"><tr><th className="p-3 text-sm font-semibold text-slate-600">Descrição</th><th className="p-3 text-sm font-semibold text-slate-600">Valor</th><th className="p-3 text-sm font-semibold text-slate-600">Data</th></tr></thead>
              <tbody>
                {clientExpenses.map(expense => (
                  <tr key={expense.id} className="border-t border-slate-100">
                    <td className="p-3 font-medium text-slate-800"><Link to={`/casos/${expense.caseId}`} className="hover:underline">{expense.description}</Link></td>
                    <td className="p-3 font-semibold text-red-600">-{formatCurrency(expense.amount)}</td>
                    <td className="p-3 text-slate-500">{new Date(expense.date + 'T00:00:00').toLocaleDateString('pt-BR')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {clientExpenses.length === 0 && <p className="text-center text-sm text-slate-500 py-4">Nenhuma despesa para este cliente.</p>}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClientFinancials;
