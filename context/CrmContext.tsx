
import React, { createContext, useContext, ReactNode } from 'react';
import { Case, Client, Task, Fee, Expense, DocumentTemplate, Installment, FeeStatus, LegalDocument, CaseStatus, DocumentChecklistConfig, CaseDocument, FirmInfo, BrandingSettings, NotificationSettings } from '../types';
import { mockCases, mockClients, mockFees, mockExpenses, mockDocumentTemplates, initialBenefitTypes, initialCaseStatuses, mockDocumentChecklistConfig, mockFirmInfo, mockBrandingSettings, mockNotificationSettings } from '../data/mockData';
import { useLocalStorage } from '../hooks/useLocalStorage';

type CaseFormData = Omit<Case, 'id' | 'lastUpdate' | 'tasks' | 'aiSummary' | 'documents' | 'legalDocuments' | 'startDate'>;
type ClientFormData = Omit<Client, 'id' | 'createdAt'>;
type TemplateFormData = Omit<DocumentTemplate, 'id'>;

// Simula a latência da rede
const fakeApiCall = <T,>(data: T): Promise<T> => new Promise(resolve => setTimeout(() => resolve(data), 300));

interface CrmContextType {
  cases: Case[];
  clients: Client[];
  fees: Fee[];
  expenses: Expense[];
  documentTemplates: DocumentTemplate[];
  benefitTypes: string[];
  caseStatuses: CaseStatus[];
  documentChecklistConfig: DocumentChecklistConfig;
  firmInfo: FirmInfo;
  brandingSettings: BrandingSettings;
  notificationSettings: NotificationSettings;
  getCaseById: (id: string) => Case | undefined;
  getClientById: (id: string) => Client | undefined;
  getUrgentTasks: () => Task[];
  addTaskToCase: (caseId: string, taskData: Omit<Task, 'id' | 'caseId'>) => Promise<void>;
  updateTask: (updatedTask: Task) => Promise<void>;
  saveCase: (caseData: CaseFormData | Case) => Promise<Case>;
  addClient: (clientData: ClientFormData) => Promise<Client>;
  updateClient: (clientData: Client) => Promise<void>;
  deleteClient: (clientId: string) => Promise<void>;
  getFinancialsByCaseId: (caseId: string) => { totalFees: number; totalExpenses: number; balance: number };
  getFinancialsByClientId: (clientId: string) => { totalFees: number; totalExpenses: number; balance: number; paidFees: number; pendingFees: number };
  getGlobalFinancials: () => { totalRecebido: number; totalPendente: number; totalDespesas: number };
  addFee: (feeData: Omit<Fee, 'id'>) => Promise<void>;
  updateFee: (fee: Fee) => Promise<void>;
  deleteFee: (feeId: string) => Promise<void>;
  addExpense: (expenseData: Omit<Expense, 'id'>) => Promise<void>;
  updateExpense: (expense: Expense) => Promise<void>;
  deleteExpense: (expenseId: string) => Promise<void>;
  updateInstallmentStatus: (feeId: string, installmentId: string, newStatus: 'Pago' | 'Pendente') => Promise<void>;
  addTemplate: (templateData: TemplateFormData) => Promise<void>;
  updateTemplate: (templateData: DocumentTemplate) => Promise<void>;
  deleteTemplate: (templateId: string) => Promise<void>;
  updateCaseLegalDocumentStatus: (caseId: string, templateId: string, status: LegalDocument['status']) => Promise<void>;
  addDocumentToCase: (caseId: string, document: Omit<CaseDocument, 'uploadedAt'>) => Promise<void>;
  deleteDocumentFromCase: (caseId: string, documentName: string) => Promise<void>;
  addBenefitType: (type: string) => Promise<void>;
  removeBenefitType: (type: string) => Promise<void>;
  addCaseStatus: (status: string) => Promise<void>;
  removeCaseStatus: (status: string) => Promise<void>;
  updateChecklistItem: (benefitType: string, item: string, action: 'add' | 'remove') => Promise<void>;
  updateFirmInfo: (info: FirmInfo) => Promise<void>;
  updateBrandingSettings: (settings: BrandingSettings) => Promise<void>;
  updateNotificationSettings: (settings: NotificationSettings) => Promise<void>;
  resetAllData: () => Promise<void>;
}

const CrmContext = createContext<CrmContextType | undefined>(undefined);

export const CrmProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [cases, setCases] = useLocalStorage<Case[]>('crm_cases', mockCases);
  const [clients, setClients] = useLocalStorage<Client[]>('crm_clients', mockClients);
  const [fees, setFees] = useLocalStorage<Fee[]>('crm_fees', mockFees);
  const [expenses, setExpenses] = useLocalStorage<Expense[]>('crm_expenses', mockExpenses);
  const [documentTemplates, setDocumentTemplates] = useLocalStorage<DocumentTemplate[]>('crm_documentTemplates', mockDocumentTemplates);
  const [benefitTypes, setBenefitTypes] = useLocalStorage<string[]>('crm_benefitTypes', initialBenefitTypes);
  const [caseStatuses, setCaseStatuses] = useLocalStorage<CaseStatus[]>('crm_caseStatuses', initialCaseStatuses);
  const [documentChecklistConfig, setDocumentChecklistConfig] = useLocalStorage<DocumentChecklistConfig>('crm_documentChecklistConfig', mockDocumentChecklistConfig);
  const [firmInfo, setFirmInfo] = useLocalStorage<FirmInfo>('crm_firmInfo', mockFirmInfo);
  const [brandingSettings, setBrandingSettings] = useLocalStorage<BrandingSettings>('crm_brandingSettings', mockBrandingSettings);
  const [notificationSettings, setNotificationSettings] = useLocalStorage<NotificationSettings>('crm_notificationSettings', mockNotificationSettings);

  const getCaseById = (id: string) => cases.find(c => c.id === id);
  const getClientById = (id: string) => clients.find(c => c.id === id);

  const getUrgentTasks = () => {
    const today = new Date();
    const thresholdDate = new Date(new Date().setDate(today.getDate() + notificationSettings.deadlineThresholdDays));
    
    return cases
      .flatMap(c => c.tasks)
      .filter(task => {
        const dueDate = new Date(task.dueDate + 'T00:00:00');
        return !task.completed && dueDate <= thresholdDate;
      })
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
  };

  const addTaskToCase = async (caseId: string, taskData: Omit<Task, 'id' | 'caseId'>) => {
    const newTask: Task = { ...taskData, caseId, id: `task-${Date.now()}` };
    await fakeApiCall(null);
    setCases(prev => prev.map(c => c.id === caseId ? { ...c, tasks: [...c.tasks, newTask], lastUpdate: new Date().toISOString().split('T')[0] } : c));
  };

  const updateTask = async (updatedTask: Task) => {
    await fakeApiCall(null);
    setCases(prev => prev.map(c => c.id === updatedTask.caseId ? { ...c, tasks: c.tasks.map(t => t.id === updatedTask.id ? updatedTask : t), lastUpdate: new Date().toISOString().split('T')[0] } : c));
  };

  const saveCase = async (caseData: CaseFormData | Case): Promise<Case> => {
    await fakeApiCall(null);
    let savedCase: Case;
    if ('id' in caseData) {
      savedCase = { ...getCaseById(caseData.id)!, ...caseData, lastUpdate: new Date().toISOString().split('T')[0] };
      setCases(prev => prev.map(c => c.id === caseData.id ? savedCase : c));
    } else {
      savedCase = { ...caseData, id: `case-${Date.now()}`, lastUpdate: new Date().toISOString().split('T')[0], startDate: new Date().toISOString().split('T')[0], tasks: [], aiSummary: '', documents: [], legalDocuments: documentTemplates.map(t => ({ templateId: t.id, title: t.title, status: 'Pendente' })) };
      setCases(prev => [...prev, savedCase]);
    }
    return savedCase;
  };

  const addClient = async (clientData: ClientFormData): Promise<Client> => {
    const newClient: Client = { ...clientData, id: `client-${Date.now()}`, createdAt: new Date().toISOString() };
    await fakeApiCall(null);
    setClients(prev => [...prev, newClient]);
    return newClient;
  };

  const updateClient = async (clientData: Client) => {
    await fakeApiCall(null);
    setClients(prev => prev.map(c => c.id === clientData.id ? clientData : c));
  };

  const deleteClient = async (clientId: string) => {
    await fakeApiCall(null);
    const casesToDelete = cases.filter(c => c.clientId === clientId).map(c => c.id);
    setClients(prev => prev.filter(c => c.id !== clientId));
    setCases(prev => prev.filter(c => c.clientId !== clientId));
    setFees(prev => prev.filter(f => !casesToDelete.includes(f.caseId)));
    setExpenses(prev => prev.filter(e => !casesToDelete.includes(e.caseId)));
  };

  const getFinancialsByCaseId = (caseId: string) => {
    const caseFees = fees.filter(f => f.caseId === caseId);
    const caseExpenses = expenses.filter(e => e.caseId === caseId);
    const totalFees = caseFees.reduce((sum, f) => sum + f.amount, 0);
    const totalExpenses = caseExpenses.reduce((sum, e) => sum + e.amount, 0);
    return { totalFees, totalExpenses, balance: totalFees - totalExpenses };
  };

  const getFinancialsByClientId = (clientId: string) => {
    const clientCaseIds = cases.filter(c => c.clientId === clientId).map(c => c.id);
    const clientFees = fees.filter(f => clientCaseIds.includes(f.caseId));
    const clientExpenses = expenses.filter(e => clientCaseIds.includes(e.caseId));
    
    const totalFees = clientFees.reduce((sum, f) => sum + f.amount, 0);
    const totalExpenses = clientExpenses.reduce((sum, e) => sum + e.amount, 0);
    const paidFees = clientFees.filter(f => f.status === FeeStatus.PAGO).reduce((sum, f) => sum + f.amount, 0);
    const pendingFees = totalFees - paidFees;

    return { totalFees, totalExpenses, balance: paidFees - totalExpenses, paidFees, pendingFees };
  };

  const getGlobalFinancials = () => {
    const totalRecebido = fees.filter(f => f.status === FeeStatus.PAGO).reduce((sum, f) => sum + f.amount, 0);
    const totalPendente = fees.filter(f => f.status === FeeStatus.PENDENTE || f.status === FeeStatus.ATRASADO || f.status === FeeStatus.PARCIALMENTE_PAGO).reduce((sum, f) => sum + f.amount, 0);
    const totalDespesas = expenses.reduce((sum, e) => sum + e.amount, 0);
    return { totalRecebido, totalPendente, totalDespesas };
  };

  const addFee = async (feeData: Omit<Fee, 'id'>) => {
    const newFee: Fee = { ...feeData, id: `fee-${Date.now()}` };
    await fakeApiCall(null);
    setFees(prev => [...prev, newFee]);
  };

  const updateFee = async (updatedFee: Fee) => {
    await fakeApiCall(null);
    setFees(prev => prev.map(f => f.id === updatedFee.id ? updatedFee : f));
  };

  const deleteFee = async (feeId: string) => {
    await fakeApiCall(null);
    setFees(prev => prev.filter(f => f.id !== feeId));
  };

  const addExpense = async (expenseData: Omit<Expense, 'id'>) => {
    const newExpense: Expense = { ...expenseData, id: `exp-${Date.now()}` };
    await fakeApiCall(null);
    setExpenses(prev => [...prev, newExpense]);
  };

  const updateExpense = async (updatedExpense: Expense) => {
    await fakeApiCall(null);
    setExpenses(prev => prev.map(e => e.id === updatedExpense.id ? updatedExpense : e));
  };

  const deleteExpense = async (expenseId: string) => {
    await fakeApiCall(null);
    setExpenses(prev => prev.filter(e => e.id !== expenseId));
  };

  const updateInstallmentStatus = async (feeId: string, installmentId: string, newStatus: 'Pago' | 'Pendente') => {
    await fakeApiCall(null);
    setFees(prevFees => prevFees.map(fee => {
        if (fee.id === feeId && fee.installments) {
            const newInstallments = fee.installments.map(inst => inst.id === installmentId ? { ...inst, status: newStatus } : inst);
            const paidCount = newInstallments.filter(i => i.status === 'Pago').length;
            let newFeeStatus = FeeStatus.PENDENTE;
            if (paidCount === 0) newFeeStatus = FeeStatus.PENDENTE;
            else if (paidCount === newInstallments.length) newFeeStatus = FeeStatus.PAGO;
            else newFeeStatus = FeeStatus.PARCIALMENTE_PAGO;
            return { ...fee, installments: newInstallments, status: newFeeStatus };
        }
        return fee;
    }));
  };

  const addTemplate = async (templateData: TemplateFormData) => {
    const newTemplate: DocumentTemplate = { ...templateData, id: `template-${Date.now()}` };
    await fakeApiCall(null);
    setDocumentTemplates(prev => [...prev, newTemplate]);
  };

  const updateTemplate = async (templateData: DocumentTemplate) => {
    await fakeApiCall(null);
    setDocumentTemplates(prev => prev.map(t => t.id === templateData.id ? templateData : t));
  };

  const deleteTemplate = async (templateId: string) => {
    await fakeApiCall(null);
    setDocumentTemplates(prev => prev.filter(t => t.id !== templateId));
  };

  const updateCaseLegalDocumentStatus = async (caseId: string, templateId: string, status: LegalDocument['status']) => {
    await fakeApiCall(null);
    setCases(prev => prev.map(c => {
        if (c.id === caseId) {
            return { ...c, legalDocuments: c.legalDocuments.map(ld => ld.templateId === templateId ? { ...ld, status } : ld), lastUpdate: new Date().toISOString().split('T')[0] };
        }
        return c;
    }));
  };

  const addDocumentToCase = async (caseId: string, document: Omit<CaseDocument, 'uploadedAt'>) => {
    const newDocument: CaseDocument = { ...document, uploadedAt: new Date().toISOString().split('T')[0] };
    await fakeApiCall(null);
    setCases(prev => prev.map(c => c.id === caseId ? { ...c, documents: [...c.documents, newDocument], lastUpdate: new Date().toISOString().split('T')[0] } : c));
  };

  const deleteDocumentFromCase = async (caseId: string, documentName: string) => {
    await fakeApiCall(null);
    setCases(prev => prev.map(c => c.id === caseId ? { ...c, documents: c.documents.filter(d => d.name !== documentName), lastUpdate: new Date().toISOString().split('T')[0] } : c));
  };

  const addBenefitType = async (type: string) => {
    if (type && !benefitTypes.includes(type)) {
      await fakeApiCall(null);
      setBenefitTypes(prev => [...prev, type]);
      setDocumentChecklistConfig(prev => ({ ...prev, [type]: ["Documento de Identificação (RG/CNH)", "CPF", "Comprovante de Residência"] }));
    }
  };

  const removeBenefitType = async (type: string) => {
    await fakeApiCall(null);
    setBenefitTypes(prev => prev.filter(t => t !== type));
    setDocumentChecklistConfig(prev => {
        const newConfig = { ...prev };
        delete newConfig[type];
        return newConfig;
    });
  };

  const addCaseStatus = async (status: string) => {
    if (status && !caseStatuses.includes(status as CaseStatus)) {
      await fakeApiCall(null);
      setCaseStatuses(prev => [...prev, status as CaseStatus]);
    }
  };

  const removeCaseStatus = async (status: string) => {
    await fakeApiCall(null);
    setCaseStatuses(prev => prev.filter(s => s !== status));
  };

  const updateChecklistItem = async (benefitType: string, item: string, action: 'add' | 'remove') => {
    await fakeApiCall(null);
    setDocumentChecklistConfig(prev => {
        const newConfig = { ...prev };
        const currentItems = newConfig[benefitType] || [];
        if (action === 'add' && item.trim() && !currentItems.includes(item)) {
            newConfig[benefitType] = [...currentItems, item];
        }
        if (action === 'remove') {
            newConfig[benefitType] = currentItems.filter(i => i !== item);
        }
        return newConfig;
    });
  };

  const updateFirmInfo = async (info: FirmInfo) => {
    await fakeApiCall(null);
    setFirmInfo(info);
  };

  const updateBrandingSettings = async (settings: BrandingSettings) => {
    await fakeApiCall(null);
    setBrandingSettings(settings);
  };

  const updateNotificationSettings = async (settings: NotificationSettings) => {
    await fakeApiCall(null);
    setNotificationSettings(settings);
  };

  const resetAllData = async () => {
    await fakeApiCall(null);
    setCases(mockCases);
    setClients(mockClients);
    setFees(mockFees);
    setExpenses(mockExpenses);
    setDocumentTemplates(mockDocumentTemplates);
    setBenefitTypes(initialBenefitTypes);
    setCaseStatuses(initialCaseStatuses);
    setDocumentChecklistConfig(mockDocumentChecklistConfig);
    setFirmInfo(mockFirmInfo);
    setBrandingSettings(mockBrandingSettings);
    setNotificationSettings(mockNotificationSettings);
  };

  const value = { cases, clients, fees, expenses, documentTemplates, benefitTypes, caseStatuses, documentChecklistConfig, firmInfo, brandingSettings, notificationSettings, getCaseById, getClientById, getUrgentTasks, addTaskToCase, updateTask, saveCase, addClient, updateClient, deleteClient, getFinancialsByCaseId, getFinancialsByClientId, getGlobalFinancials, addFee, updateFee, deleteFee, addExpense, updateExpense, deleteExpense, updateInstallmentStatus, addTemplate, updateTemplate, deleteTemplate, updateCaseLegalDocumentStatus, addDocumentToCase, deleteDocumentFromCase, addBenefitType, removeBenefitType, addCaseStatus, removeCaseStatus, updateChecklistItem, updateFirmInfo, updateBrandingSettings, updateNotificationSettings, resetAllData };

  return <CrmContext.Provider value={value}>{children}</CrmContext.Provider>;
};

export const useCrmData = (): CrmContextType => {
  const context = useContext(CrmContext);
  if (context === undefined) {
    throw new Error('useCrmData must be used within a CrmProvider');
  }
  return context;
};
