import React, { createContext, useContext, useMemo, useCallback, ReactNode } from 'react';
import { useCases } from './CasesContext';
import { useClients } from './ClientsContext';
import { useFinancial } from './FinancialContext';
import { useSettings } from './SettingsContext';

interface ResetContextValue {
  resetAllData: () => Promise<void>;
}

const ResetContext = createContext<ResetContextValue | undefined>(undefined);

export const ResetProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { resetCases } = useCases();
  const { resetClients } = useClients();
  const { resetFinancials } = useFinancial();
  const { resetSettings } = useSettings();

  const resetAllData = useCallback(async () => {
    await Promise.all([resetCases(), resetClients(), resetFinancials(), resetSettings()]);
  }, [resetCases, resetClients, resetFinancials, resetSettings]);

  const value = useMemo(() => ({ resetAllData }), [resetAllData]);

  return <ResetContext.Provider value={value}>{children}</ResetContext.Provider>;
};

export const useReset = (): ResetContextValue => {
  const context = useContext(ResetContext);
  if (context === undefined) {
    throw new Error('useReset must be used within a ResetProvider');
  }
  return context;
};
