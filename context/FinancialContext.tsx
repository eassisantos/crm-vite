import React, { createContext, useContext, useMemo, useCallback, ReactNode } from 'react';
import { Case, Expense, Fee, FeeStatus } from '../types';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { mockExpenses, mockFees } from '../data/mockData';
import { fakeApiCall } from '../utils/fakeApiCall';
import { useCases } from './CasesContext';

interface FinancialSummary {
  totalFees: number;
  totalExpenses: number;
  balance: number;
}

interface ClientFinancialSummary extends FinancialSummary {
  paidFees: number;
  pendingFees: number;
}

interface GlobalFinancialSummary {
  totalRecebido: number;
  totalPendente: number;
  totalDespesas: number;
}

interface FinancialContextValue {
  fees: Fee[];
  expenses: Expense[];
  getFinancialsByCaseId: (caseId: string) => FinancialSummary;
  getFinancialsByClientId: (clientId: string) => ClientFinancialSummary;
  getGlobalFinancials: () => GlobalFinancialSummary;
  addFee: (feeData: Omit<Fee, 'id'>) => Promise<void>;
  updateFee: (fee: Fee) => Promise<void>;
  deleteFee: (feeId: string) => Promise<void>;
  addExpense: (expenseData: Omit<Expense, 'id'>) => Promise<void>;
  updateExpense: (expense: Expense) => Promise<void>;
  deleteExpense: (expenseId: string) => Promise<void>;
  updateInstallmentStatus: (feeId: string, installmentId: string, newStatus: 'Pago' | 'Pendente') => Promise<void>;
  removeFinancialsByCaseIds: (caseIds: string[]) => Promise<void>;
  resetFinancials: () => Promise<void>;
}

const FinancialContext = createContext<FinancialContextValue | undefined>(undefined);

const calculateTotals = (items: { amount: number }[]) => items.reduce((sum, item) => sum + item.amount, 0);

export const FinancialProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [fees, setFees] = useLocalStorage<Fee[]>('crm_fees', mockFees);
  const [expenses, setExpenses] = useLocalStorage<Expense[]>('crm_expenses', mockExpenses);
  const { cases } = useCases();

  const getFinancialsByCaseId = useCallback((caseId: string) => {
    const caseFees = fees.filter(f => f.caseId === caseId);
    const caseExpenses = expenses.filter(e => e.caseId === caseId);
    const totalFees = calculateTotals(caseFees);
    const totalExpenses = calculateTotals(caseExpenses);
    return { totalFees, totalExpenses, balance: totalFees - totalExpenses };
  }, [fees, expenses]);

  const getFinancialsByClientId = useCallback((clientId: string) => {
    const clientCaseIds = cases.filter(c => c.clientId === clientId).map((c: Case) => c.id);
    const clientFees = fees.filter(f => clientCaseIds.includes(f.caseId));
    const clientExpenses = expenses.filter(e => clientCaseIds.includes(e.caseId));

    const totalFees = calculateTotals(clientFees);
    const totalExpenses = calculateTotals(clientExpenses);
    const paidFees = clientFees.filter(f => f.status === FeeStatus.PAGO).reduce((sum, f) => sum + f.amount, 0);
    const pendingFees = totalFees - paidFees;

    return { totalFees, totalExpenses, balance: paidFees - totalExpenses, paidFees, pendingFees };
  }, [cases, fees, expenses]);

  const getGlobalFinancials = useCallback(() => {
    const totalRecebido = fees.filter(f => f.status === FeeStatus.PAGO).reduce((sum, f) => sum + f.amount, 0);
    const totalPendente = fees
      .filter(f => [FeeStatus.PENDENTE, FeeStatus.ATRASADO, FeeStatus.PARCIALMENTE_PAGO].includes(f.status))
      .reduce((sum, f) => sum + f.amount, 0);
    const totalDespesas = calculateTotals(expenses);
    return { totalRecebido, totalPendente, totalDespesas };
  }, [fees, expenses]);

  const addFee = useCallback(async (feeData: Omit<Fee, 'id'>) => {
    const newFee: Fee = { ...feeData, id: `fee-${Date.now()}` };
    await fakeApiCall(null);
    setFees(prev => [...prev, newFee]);
  }, [setFees]);

  const updateFee = useCallback(async (fee: Fee) => {
    await fakeApiCall(null);
    setFees(prev => prev.map(f => (f.id === fee.id ? fee : f)));
  }, [setFees]);

  const deleteFee = useCallback(async (feeId: string) => {
    await fakeApiCall(null);
    setFees(prev => prev.filter(f => f.id !== feeId));
  }, [setFees]);

  const addExpense = useCallback(async (expenseData: Omit<Expense, 'id'>) => {
    const newExpense: Expense = { ...expenseData, id: `exp-${Date.now()}` };
    await fakeApiCall(null);
    setExpenses(prev => [...prev, newExpense]);
  }, [setExpenses]);

  const updateExpense = useCallback(async (expense: Expense) => {
    await fakeApiCall(null);
    setExpenses(prev => prev.map(e => (e.id === expense.id ? expense : e)));
  }, [setExpenses]);

  const deleteExpense = useCallback(async (expenseId: string) => {
    await fakeApiCall(null);
    setExpenses(prev => prev.filter(e => e.id !== expenseId));
  }, [setExpenses]);

  const updateInstallmentStatus = useCallback(async (feeId: string, installmentId: string, newStatus: 'Pago' | 'Pendente') => {
    await fakeApiCall(null);
    setFees(prevFees =>
      prevFees.map(fee => {
        if (fee.id !== feeId || !fee.installments) {
          return fee;
        }
        const installments = fee.installments.map(inst => (inst.id === installmentId ? { ...inst, status: newStatus } : inst));
        const paidCount = installments.filter(i => i.status === 'Pago').length;
        let nextStatus = FeeStatus.PENDENTE;
        if (paidCount === installments.length) {
          nextStatus = FeeStatus.PAGO;
        } else if (paidCount > 0) {
          nextStatus = FeeStatus.PARCIALMENTE_PAGO;
        }
        return { ...fee, installments, status: nextStatus };
      }),
    );
  }, [setFees]);

  const removeFinancialsByCaseIds = useCallback(async (caseIds: string[]) => {
    if (caseIds.length === 0) {
      return;
    }
    await fakeApiCall(null);
    setFees(prev => prev.filter(f => !caseIds.includes(f.caseId)));
    setExpenses(prev => prev.filter(e => !caseIds.includes(e.caseId)));
  }, [setFees, setExpenses]);

  const resetFinancials = useCallback(async () => {
    await fakeApiCall(null);
    setFees(mockFees);
    setExpenses(mockExpenses);
  }, [setFees, setExpenses]);

  const value = useMemo(() => ({
    fees,
    expenses,
    getFinancialsByCaseId,
    getFinancialsByClientId,
    getGlobalFinancials,
    addFee,
    updateFee,
    deleteFee,
    addExpense,
    updateExpense,
    deleteExpense,
    updateInstallmentStatus,
    removeFinancialsByCaseIds,
    resetFinancials,
  }), [
    fees,
    expenses,
    getFinancialsByCaseId,
    getFinancialsByClientId,
    getGlobalFinancials,
    addFee,
    updateFee,
    deleteFee,
    addExpense,
    updateExpense,
    deleteExpense,
    updateInstallmentStatus,
    removeFinancialsByCaseIds,
    resetFinancials,
  ]);

  return <FinancialContext.Provider value={value}>{children}</FinancialContext.Provider>;
};

export const useFinancial = (): FinancialContextValue => {
  const context = useContext(FinancialContext);
  if (context === undefined) {
    throw new Error('useFinancial must be used within a FinancialProvider');
  }
  return context;
};
