import React, { createContext, useContext, useMemo, useCallback, ReactNode } from 'react';
import { Client } from '../types';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { mockClients } from '../data/mockData';
import { fakeApiCall } from '../utils/fakeApiCall';
import { useCases } from './CasesContext';
import { useFinancial } from './FinancialContext';

type ClientFormData = Omit<Client, 'id' | 'createdAt'>;

interface ClientsContextValue {
  clients: Client[];
  getClientById: (id: string) => Client | undefined;
  addClient: (clientData: ClientFormData) => Promise<Client>;
  updateClient: (clientData: Client) => Promise<void>;
  deleteClient: (clientId: string) => Promise<void>;
  resetClients: () => Promise<void>;
}

const ClientsContext = createContext<ClientsContextValue | undefined>(undefined);

export const ClientsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [clients, setClients] = useLocalStorage<Client[]>('crm_clients', mockClients);
  const { removeCasesByClientId } = useCases();
  const { removeFinancialsByCaseIds } = useFinancial();

  const getClientById = useCallback((id: string) => clients.find(c => c.id === id), [clients]);

  const addClient = useCallback(async (clientData: ClientFormData): Promise<Client> => {
    const newClient: Client = { ...clientData, id: `client-${Date.now()}`, createdAt: new Date().toISOString() };
    await fakeApiCall(null);
    setClients(prev => [...prev, newClient]);
    return newClient;
  }, [setClients]);

  const updateClient = useCallback(async (clientData: Client) => {
    await fakeApiCall(null);
    setClients(prev => prev.map(c => (c.id === clientData.id ? clientData : c)));
  }, [setClients]);

  const deleteClient = useCallback(async (clientId: string) => {
    await fakeApiCall(null);
    const caseIds = await removeCasesByClientId(clientId);
    await removeFinancialsByCaseIds(caseIds);
    setClients(prev => prev.filter(c => c.id !== clientId));
  }, [removeCasesByClientId, removeFinancialsByCaseIds, setClients]);

  const resetClients = useCallback(async () => {
    await fakeApiCall(null);
    setClients(mockClients);
  }, [setClients]);

  const value = useMemo(() => ({
    clients,
    getClientById,
    addClient,
    updateClient,
    deleteClient,
    resetClients,
  }), [clients, getClientById, addClient, updateClient, deleteClient, resetClients]);

  return <ClientsContext.Provider value={value}>{children}</ClientsContext.Provider>;
};

export const useClients = (): ClientsContextValue => {
  const context = useContext(ClientsContext);
  if (context === undefined) {
    throw new Error('useClients must be used within a ClientsProvider');
  }
  return context;
};
