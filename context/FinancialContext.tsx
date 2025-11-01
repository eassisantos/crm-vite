import React, { createContext, useContext, useMemo, useCallback, ReactNode, useState, useEffect } from 'react';
import { Expense, Fee, FeeStatus } from '../types';
import { mockExpenses, mockFees } from '../data/mockData';
import { executeCommand, fetchBootstrap } from '../services/apiClient';
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

interface FinancialSnapshot {
  fees: Fee[];
  expenses: Expense[];
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
  setFinancialsFromServer: (snapshot: FinancialSnapshot) => void;
}

const FinancialContext = createContext<FinancialContextValue | undefined>(undefined);

const calculateTotals = (items: { amount: number }[]) => items.reduce((sum, item) => sum + item.amount, 0);

export const FinancialProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [fees, setFees] = useState<Fee[]>(mockFees);
  const [expenses, setExpenses] = useState<Expense[]>(mockExpenses);
  const { cases } = useCases();

  useEffect(() => {
    let cancelled = false;
    const loadFinancials = async () => {
      try {
        const data = await fetchBootstrap();
        if (!cancelled) {
          setFees(data.fees);
          setExpenses(data.expenses);
        }
      } catch (error) {
        console.error('Não foi possível carregar os dados financeiros do servidor.', error);
      }
    };

    void loadFinancials();
    return () => {
      cancelled = true;
    };
  }, []);

  const applySnapshot = useCallback((snapshot: FinancialSnapshot) => {
    setFees(snapshot.fees);
    setExpenses(snapshot.expenses);
  }, []);

  const getFinancialsByCaseId = useCallback((caseId: string) => {
    const caseFees = fees.filter(f => f.caseId === caseId);
    const caseExpenses = expenses.filter(e => e.caseId === caseId);
    const totalFees = calculateTotals(caseFees);
    const totalExpenses = calculateTotals(caseExpenses);
    return { totalFees, totalExpenses, balance: totalFees - totalExpenses };
  }, [fees, expenses]);

  const getFinancialsByClientId = useCallback((clientId: string) => {
    const clientCaseIds = cases.filter(c => c.clientId === clientId).map(c => c.id);
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
    const snapshot = await executeCommand<FinancialSnapshot>({
      resource: 'financials',
      action: 'addFee',
      payload: feeData,
    });
    applySnapshot(snapshot);
  }, [applySnapshot]);

  const updateFee = useCallback(async (fee: Fee) => {
    const snapshot = await executeCommand<FinancialSnapshot>({
      resource: 'financials',
      action: 'updateFee',
      payload: fee,
    });
    applySnapshot(snapshot);
  }, [applySnapshot]);

  const deleteFee = useCallback(async (feeId: string) => {
    const snapshot = await executeCommand<FinancialSnapshot>({
      resource: 'financials',
      action: 'deleteFee',
      payload: { feeId },
    });
    applySnapshot(snapshot);
  }, [applySnapshot]);

  const addExpense = useCallback(async (expenseData: Omit<Expense, 'id'>) => {
    const snapshot = await executeCommand<FinancialSnapshot>({
      resource: 'financials',
      action: 'addExpense',
      payload: expenseData,
    });
    applySnapshot(snapshot);
  }, [applySnapshot]);

  const updateExpense = useCallback(async (expense: Expense) => {
    const snapshot = await executeCommand<FinancialSnapshot>({
      resource: 'financials',
      action: 'updateExpense',
      payload: expense,
    });
    applySnapshot(snapshot);
  }, [applySnapshot]);

  const deleteExpense = useCallback(async (expenseId: string) => {
    const snapshot = await executeCommand<FinancialSnapshot>({
      resource: 'financials',
      action: 'deleteExpense',
      payload: { expenseId },
    });
    applySnapshot(snapshot);
  }, [applySnapshot]);

  const updateInstallmentStatus = useCallback(async (feeId: string, installmentId: string, newStatus: 'Pago' | 'Pendente') => {
    const snapshot = await executeCommand<FinancialSnapshot>({
      resource: 'financials',
      action: 'updateInstallmentStatus',
      payload: { feeId, installmentId, status: newStatus },
    });
    applySnapshot(snapshot);
  }, [applySnapshot]);

  const removeFinancialsByCaseIds = useCallback(async (caseIds: string[]) => {
    if (caseIds.length === 0) {
      return;
    }
    const snapshot = await executeCommand<FinancialSnapshot>({
      resource: 'financials',
      action: 'removeByCaseIds',
      payload: { caseIds },
    });
    applySnapshot(snapshot);
  }, [applySnapshot]);

  const resetFinancials = useCallback(async () => {
    const snapshot = await executeCommand<FinancialSnapshot>({
      resource: 'financials',
      action: 'reset',
    });
    applySnapshot(snapshot);
  }, [applySnapshot]);

  const setFinancialsFromServer = useCallback((snapshot: FinancialSnapshot) => {
    applySnapshot(snapshot);
  }, [applySnapshot]);

  const value = useMemo(
    () => ({
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
      setFinancialsFromServer,
    }),
    [
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
      setFinancialsFromServer,
    ],
  );

  return <FinancialContext.Provider value={value}>{children}</FinancialContext.Provider>;
};

export const useFinancial = (): FinancialContextValue => {
  const context = useContext(FinancialContext);
  if (context === undefined) {
    throw new Error('useFinancial must be used within a FinancialProvider');
  }
  return context;
};
