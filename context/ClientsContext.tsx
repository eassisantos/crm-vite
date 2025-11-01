import React, { createContext, useContext, useMemo, useCallback, ReactNode, useState, useEffect } from 'react';
import { Case, Client, Expense, Fee } from '../types';
import { mockClients } from '../data/mockData';
import { useCases } from './CasesContext';
import { useFinancial } from './FinancialContext';
import { executeCommand, fetchBootstrap } from '../services/apiClient';

interface ClientFormData extends Omit<Client, 'id' | 'createdAt'> {}

interface ClientsContextValue {
  clients: Client[];
  getClientById: (id: string) => Client | undefined;
  addClient: (clientData: ClientFormData) => Promise<Client>;
  updateClient: (clientData: Client) => Promise<Client>;
  deleteClient: (clientId: string) => Promise<void>;
  resetClients: () => Promise<void>;
  setClientsFromServer: (serverClients: Client[]) => void;
}

const ClientsContext = createContext<ClientsContextValue | undefined>(undefined);

export const ClientsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [clients, setClients] = useState<Client[]>(mockClients);
  const { setCasesFromServer } = useCases();
  const { setFinancialsFromServer } = useFinancial();

  useEffect(() => {
    let cancelled = false;
    const loadClients = async () => {
      try {
        const data = await fetchBootstrap();
        if (!cancelled) {
          setClients(data.clients);
        }
      } catch (error) {
        console.error('Não foi possível carregar os clientes do servidor.', error);
      }
    };

    void loadClients();
    return () => {
      cancelled = true;
    };
  }, []);

  const getClientById = useCallback((id: string) => clients.find(c => c.id === id), [clients]);

  const addClient = useCallback(
    async (clientData: ClientFormData): Promise<Client> => {
      const newClient = await executeCommand<Client>({
        resource: 'clients',
        action: 'create',
        payload: clientData,
      });
      setClients(prev => [...prev, newClient]);
      return newClient;
    },
    [],
  );

  const updateClient = useCallback(
    async (clientData: Client) => {
      const updatedClient = await executeCommand<Client>({
        resource: 'clients',
        action: 'update',
        payload: clientData,
      });
      setClients(prev => prev.map(c => (c.id === updatedClient.id ? updatedClient : c)));
      return updatedClient;
    },
    [],
  );

  const deleteClient = useCallback(
    async (clientId: string) => {
      const result = await executeCommand<{
        clients: Client[];
        cases: Case[];
        fees: Fee[];
        expenses: Expense[];
        removedCaseIds: string[];
      }>({
        resource: 'clients',
        action: 'delete',
        payload: { clientId },
      });

      setClients(result.clients);
      setCasesFromServer(result.cases);
      setFinancialsFromServer({ fees: result.fees, expenses: result.expenses });
    },
    [setCasesFromServer, setFinancialsFromServer],
  );

  const resetClients = useCallback(async () => {
    const result = await executeCommand<Client[]>({
      resource: 'clients',
      action: 'reset',
    });
    setClients(result);
  }, []);

  const setClientsFromServer = useCallback((serverClients: Client[]) => {
    setClients(serverClients);
  }, []);

  const value = useMemo(
    () => ({
      clients,
      getClientById,
      addClient,
      updateClient,
      deleteClient,
      resetClients,
      setClientsFromServer,
    }),
    [clients, getClientById, addClient, updateClient, deleteClient, resetClients, setClientsFromServer],
  );

  return <ClientsContext.Provider value={value}>{children}</ClientsContext.Provider>;
};

export const useClients = (): ClientsContextValue => {
  const context = useContext(ClientsContext);
  if (context === undefined) {
    throw new Error('useClients must be used within a ClientsProvider');
  }
  return context;
};
