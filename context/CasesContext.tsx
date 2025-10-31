import React, { createContext, useContext, useMemo, useCallback, ReactNode } from 'react';
import { Case, Task, CaseDocument, LegalDocument } from '../types';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { mockCases } from '../data/mockData';
import { fakeApiCall } from '../utils/fakeApiCall';
import { useSettings } from './SettingsContext';

type CaseFormData = Omit<Case, 'id' | 'lastUpdate' | 'tasks' | 'aiSummary' | 'documents' | 'legalDocuments' | 'startDate'>;

interface CasesContextValue {
  cases: Case[];
  getCaseById: (id: string) => Case | undefined;
  getUrgentTasks: () => Task[];
  addTaskToCase: (caseId: string, taskData: Omit<Task, 'id' | 'caseId'>) => Promise<void>;
  updateTask: (updatedTask: Task) => Promise<void>;
  saveCase: (caseData: CaseFormData | Case) => Promise<Case>;
  updateCaseLegalDocumentStatus: (caseId: string, templateId: string, status: LegalDocument['status']) => Promise<void>;
  addDocumentToCase: (caseId: string, document: Omit<CaseDocument, 'uploadedAt'>) => Promise<void>;
  deleteDocumentFromCase: (caseId: string, documentName: string) => Promise<void>;
  removeCasesByClientId: (clientId: string) => Promise<string[]>;
  resetCases: () => Promise<void>;
}

const CasesContext = createContext<CasesContextValue | undefined>(undefined);

export const CasesProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [cases, setCases] = useLocalStorage<Case[]>('crm_cases', mockCases);
  const { documentTemplates, notificationSettings } = useSettings();

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

  const addTaskToCase = useCallback(async (caseId: string, taskData: Omit<Task, 'id' | 'caseId'>) => {
    const newTask: Task = { ...taskData, caseId, id: `task-${Date.now()}` };
    await fakeApiCall(null);
    setCases(prev =>
      prev.map(c =>
        c.id === caseId
          ? {
              ...c,
              tasks: [...c.tasks, newTask],
              lastUpdate: new Date().toISOString().split('T')[0],
            }
          : c,
      ),
    );
  }, [setCases]);

  const updateTask = useCallback(async (updatedTask: Task) => {
    await fakeApiCall(null);
    setCases(prev =>
      prev.map(c =>
        c.id === updatedTask.caseId
          ? {
              ...c,
              tasks: c.tasks.map(t => (t.id === updatedTask.id ? updatedTask : t)),
              lastUpdate: new Date().toISOString().split('T')[0],
            }
          : c,
      ),
    );
  }, [setCases]);

  const saveCase = useCallback(async (caseData: CaseFormData | Case): Promise<Case> => {
    await fakeApiCall(null);
    if ('id' in caseData) {
      const existingCase = getCaseById(caseData.id);
      if (!existingCase) {
        throw new Error('Case not found');
      }
      const savedCase: Case = {
        ...existingCase,
        ...caseData,
        lastUpdate: new Date().toISOString().split('T')[0],
      };
      setCases(prev => prev.map(c => (c.id === caseData.id ? savedCase : c)));
      return savedCase;
    }

    const newCase: Case = {
      ...caseData,
      id: `case-${Date.now()}`,
      lastUpdate: new Date().toISOString().split('T')[0],
      startDate: new Date().toISOString().split('T')[0],
      tasks: [],
      aiSummary: '',
      documents: [],
      legalDocuments: documentTemplates.map(template => ({
        templateId: template.id,
        title: template.title,
        status: 'Pendente',
      })),
    };

    setCases(prev => [...prev, newCase]);
    return newCase;
  }, [documentTemplates, getCaseById, setCases]);

  const updateCaseLegalDocumentStatus = useCallback(async (caseId: string, templateId: string, status: LegalDocument['status']) => {
    await fakeApiCall(null);
    setCases(prev =>
      prev.map(c =>
        c.id === caseId
          ? {
              ...c,
              legalDocuments: c.legalDocuments.map(ld => (ld.templateId === templateId ? { ...ld, status } : ld)),
              lastUpdate: new Date().toISOString().split('T')[0],
            }
          : c,
      ),
    );
  }, [setCases]);

  const addDocumentToCase = useCallback(async (caseId: string, document: Omit<CaseDocument, 'uploadedAt'>) => {
    const newDocument: CaseDocument = { ...document, uploadedAt: new Date().toISOString().split('T')[0] };
    await fakeApiCall(null);
    setCases(prev =>
      prev.map(c =>
        c.id === caseId
          ? {
              ...c,
              documents: [...c.documents, newDocument],
              lastUpdate: new Date().toISOString().split('T')[0],
            }
          : c,
      ),
    );
  }, [setCases]);

  const deleteDocumentFromCase = useCallback(async (caseId: string, documentName: string) => {
    await fakeApiCall(null);
    setCases(prev =>
      prev.map(c =>
        c.id === caseId
          ? {
              ...c,
              documents: c.documents.filter(d => d.name !== documentName),
              lastUpdate: new Date().toISOString().split('T')[0],
            }
          : c,
      ),
    );
  }, [setCases]);

  const removeCasesByClientId = useCallback(async (clientId: string) => {
    await fakeApiCall(null);
    const caseIds = cases.filter(c => c.clientId === clientId).map(c => c.id);
    if (caseIds.length > 0) {
      setCases(prev => prev.filter(c => c.clientId !== clientId));
    }
    return caseIds;
  }, [cases, setCases]);

  const resetCases = useCallback(async () => {
    await fakeApiCall(null);
    setCases(mockCases);
  }, [setCases]);

  const value = useMemo(() => ({
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
  }), [
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
  ]);

  return <CasesContext.Provider value={value}>{children}</CasesContext.Provider>;
};

export const useCases = (): CasesContextValue => {
  const context = useContext(CasesContext);
  if (context === undefined) {
    throw new Error('useCases must be used within a CasesProvider');
  }
  return context;
};
