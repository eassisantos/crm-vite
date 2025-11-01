import React, { createContext, useContext, useMemo, useCallback, ReactNode, useState, useEffect } from 'react';
import { Case, Task, LegalDocument } from '../types';
import { mockCases } from '../data/mockData';
import { useSettings } from './SettingsContext';
import {
  executeCommand,
  fetchBootstrap,
  uploadCaseDocument,
  deleteCaseDocument as deleteDocumentRequest,
  type DeleteDocumentResponse,
  type UploadDocumentResponse,
} from '../services/apiClient';

interface CaseFormData extends Omit<Case, 'id' | 'lastUpdate' | 'tasks' | 'aiSummary' | 'documents' | 'legalDocuments' | 'startDate'> {}

interface CasesContextValue {
  cases: Case[];
  getCaseById: (id: string) => Case | undefined;
  getUrgentTasks: () => Task[];
  addTaskToCase: (caseId: string, taskData: Omit<Task, 'id' | 'caseId'>) => Promise<Task>;
  updateTask: (updatedTask: Task) => Promise<Task>;
  saveCase: (caseData: CaseFormData | Case) => Promise<Case>;
  updateCaseLegalDocumentStatus: (caseId: string, templateId: string, status: LegalDocument['status']) => Promise<Case>;
  addDocumentToCase: (caseId: string, file: File) => Promise<UploadDocumentResponse>;
  deleteDocumentFromCase: (caseId: string, documentId: string) => Promise<DeleteDocumentResponse>;
  removeCasesByClientId: (clientId: string) => Promise<{ removedCaseIds: string[]; cases: Case[] }>;
  resetCases: () => Promise<void>;
  setCasesFromServer: (serverCases: Case[]) => void;
}

const CasesContext = createContext<CasesContextValue | undefined>(undefined);

export const CasesProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [cases, setCases] = useState<Case[]>(mockCases);
  const { documentTemplates, notificationSettings } = useSettings();

  useEffect(() => {
    let cancelled = false;
    const loadCases = async () => {
      try {
        const data = await fetchBootstrap();
        if (!cancelled) {
          setCases(data.cases);
        }
      } catch (error) {
        console.error('Não foi possível carregar os casos do servidor.', error);
      }
    };

    void loadCases();
    return () => {
      cancelled = true;
    };
  }, []);

  const getCaseById = useCallback((id: string) => cases.find(c => c.id === id), [cases]);

  const getUrgentTasks = useCallback(() => {
    const today = new Date();
    const thresholdDate = new Date(new Date().setDate(today.getDate() + notificationSettings.deadlineThresholdDays));

    return cases
      .flatMap(c => c.tasks)
      .filter(task => {
        const dueDate = new Date(`${task.dueDate}T00:00:00`);
        return !task.completed && dueDate <= thresholdDate;
      })
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
  }, [cases, notificationSettings.deadlineThresholdDays]);

  const updateCaseInState = useCallback((updatedCase: Case) => {
    setCases(prev => {
      const exists = prev.some(c => c.id === updatedCase.id);
      if (exists) {
        return prev.map(c => (c.id === updatedCase.id ? updatedCase : c));
      }
      return [...prev, updatedCase];
    });
  }, []);

  const addTaskToCase = useCallback(
    async (caseId: string, taskData: Omit<Task, 'id' | 'caseId'>) => {
      const updatedCase = await executeCommand<Case>({
        resource: 'cases',
        action: 'addTask',
        payload: { caseId, task: taskData },
      });
      updateCaseInState(updatedCase);
      return updatedCase.tasks[updatedCase.tasks.length - 1];
    },
    [updateCaseInState],
  );

  const updateTask = useCallback(
    async (updatedTask: Task) => {
      const updatedCase = await executeCommand<Case>({
        resource: 'cases',
        action: 'updateTask',
        payload: { task: updatedTask },
      });
      updateCaseInState(updatedCase);
      return updatedTask;
    },
    [updateCaseInState],
  );

  const saveCase = useCallback(
    async (caseData: CaseFormData | Case): Promise<Case> => {
      if ('id' in caseData) {
        const updatedCase = await executeCommand<Case>({
          resource: 'cases',
          action: 'updateCase',
          payload: caseData,
        });
        updateCaseInState(updatedCase);
        return updatedCase;
      }

      const newCase = await executeCommand<Case>({
        resource: 'cases',
        action: 'createCase',
        payload: {
          ...caseData,
          legalDocuments: documentTemplates.map(template => ({
            templateId: template.id,
            title: template.title,
            status: 'Pendente' as const,
          })),
        },
      });
      updateCaseInState(newCase);
      return newCase;
    },
    [documentTemplates, updateCaseInState],
  );

  const updateCaseLegalDocumentStatus = useCallback(
    async (caseId: string, templateId: string, status: LegalDocument['status']) => {
      const updatedCase = await executeCommand<Case>({
        resource: 'cases',
        action: 'updateLegalDocumentStatus',
        payload: { caseId, templateId, status },
      });
      updateCaseInState(updatedCase);
      return updatedCase;
    },
    [updateCaseInState],
  );

  const addDocumentToCase = useCallback(
    async (caseId: string, file: File) => {
      const result = await uploadCaseDocument(caseId, file);
      updateCaseInState(result.case);
      return result;
    },
    [updateCaseInState],
  );

  const deleteDocumentFromCase = useCallback(
    async (caseId: string, documentId: string) => {
      const result = await deleteDocumentRequest(caseId, documentId);
      updateCaseInState(result.case);
      return result;
    },
    [updateCaseInState],
  );

  const removeCasesByClientId = useCallback(
    async (clientId: string) => {
      const result = await executeCommand<{ removedCaseIds: string[]; cases: Case[] }>({
        resource: 'cases',
        action: 'removeByClient',
        payload: { clientId },
      });
      setCases(result.cases);
      return result;
    },
    [],
  );

  const resetCases = useCallback(async () => {
    const result = await executeCommand<Case[]>({
      resource: 'cases',
      action: 'reset',
    });
    setCases(result);
  }, []);

  const setCasesFromServer = useCallback((serverCases: Case[]) => {
    setCases(serverCases);
  }, []);

  const value = useMemo(
    () => ({
      cases,
      getCaseById,
      getUrgentTasks,
      addTaskToCase,
      updateTask,
      saveCase,
      updateCaseLegalDocumentStatus,
      addDocumentToCase,
      deleteDocumentFromCase,
      removeCasesByClientId,
      resetCases,
      setCasesFromServer,
    }),
    [
      cases,
      getCaseById,
      getUrgentTasks,
      addTaskToCase,
      updateTask,
      saveCase,
      updateCaseLegalDocumentStatus,
      addDocumentToCase,
      deleteDocumentFromCase,
      removeCasesByClientId,
      resetCases,
      setCasesFromServer,
    ],
  );

  return <CasesContext.Provider value={value}>{children}</CasesContext.Provider>;
};

export const useCases = (): CasesContextValue => {
  const context = useContext(CasesContext);
  if (context === undefined) {
    throw new Error('useCases must be used within a CasesProvider');
  }
  return context;
};
