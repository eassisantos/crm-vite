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

  const handleOperationError = (error: unknown, fallbackMessage: string): never => {
    console.error(fallbackMessage, error);
    if (error instanceof Error && error.message) {
      throw new Error(error.message);
    }
    throw new Error(fallbackMessage);
  };

  const getClientById = useCallback((id: string) => clients.find(c => c.id === id), [clients]);

  const addClient = useCallback(async (clientData: ClientFormData): Promise<Client> => {
    try {
      const newClient: Client = { ...clientData, id: `client-${Date.now()}`, createdAt: new Date().toISOString() };
      await fakeApiCall(null);
      setClients(prev => [...prev, newClient]);
      return newClient;
    } catch (error) {
      return handleOperationError(error, 'Não foi possível adicionar o cliente. Tente novamente.');
    }
  }, [setClients]);

  const updateClient = useCallback(async (clientData: Client) => {
    try {
      await fakeApiCall(null);
      setClients(prev => prev.map(c => (c.id === clientData.id ? clientData : c)));
    } catch (error) {
      handleOperationError(error, 'Não foi possível atualizar o cliente. Tente novamente.');
    }
  }, [setClients]);

  const deleteClient = useCallback(async (clientId: string) => {
    try {
      await fakeApiCall(null);
      const caseIds = await removeCasesByClientId(clientId);
      await removeFinancialsByCaseIds(caseIds);
      setClients(prev => prev.filter(c => c.id !== clientId));
    } catch (error) {
      handleOperationError(error, 'Não foi possível remover o cliente. Tente novamente.');
    }
  }, [removeCasesByClientId, removeFinancialsByCaseIds, setClients]);

  const resetClients = useCallback(async () => {
    try {
      await fakeApiCall(null);
      setClients(mockClients);
    } catch (error) {
      handleOperationError(error, 'Não foi possível restaurar a lista de clientes. Tente novamente.');
    }
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
