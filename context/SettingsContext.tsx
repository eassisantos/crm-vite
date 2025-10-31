import React, { createContext, useContext, useMemo, useCallback, ReactNode } from 'react';
import {
  DocumentTemplate,
  DocumentChecklistConfig,
  FirmInfo,
  BrandingSettings,
  NotificationSettings,
  CaseStatus,
} from '../types';
import {
  mockDocumentTemplates,
  mockDocumentChecklistConfig,
  mockFirmInfo,
  mockBrandingSettings,
  mockNotificationSettings,
  initialBenefitTypes,
  initialCaseStatuses,
} from '../data/mockData';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { fakeApiCall } from '../utils/fakeApiCall';

interface SettingsContextValue {
  documentTemplates: DocumentTemplate[];
  benefitTypes: string[];
  caseStatuses: CaseStatus[];
  documentChecklistConfig: DocumentChecklistConfig;
  firmInfo: FirmInfo;
  brandingSettings: BrandingSettings;
  notificationSettings: NotificationSettings;
  addTemplate: (templateData: Omit<DocumentTemplate, 'id'>) => Promise<void>;
  updateTemplate: (template: DocumentTemplate) => Promise<void>;
  deleteTemplate: (templateId: string) => Promise<void>;
  addBenefitType: (type: string) => Promise<void>;
  removeBenefitType: (type: string) => Promise<void>;
  addCaseStatus: (status: string) => Promise<void>;
  removeCaseStatus: (status: string) => Promise<void>;
  updateChecklistItem: (benefitType: string, item: string, action: 'add' | 'remove') => Promise<void>;
  updateFirmInfo: (info: FirmInfo) => Promise<void>;
  updateBrandingSettings: (settings: BrandingSettings) => Promise<void>;
  updateNotificationSettings: (settings: NotificationSettings) => Promise<void>;
  resetSettings: () => Promise<void>;
}

const SettingsContext = createContext<SettingsContextValue | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [documentTemplates, setDocumentTemplates] = useLocalStorage<DocumentTemplate[]>(
    'crm_documentTemplates',
    mockDocumentTemplates,
  );
  const [benefitTypes, setBenefitTypes] = useLocalStorage<string[]>('crm_benefitTypes', initialBenefitTypes);
  const [caseStatuses, setCaseStatuses] = useLocalStorage<CaseStatus[]>('crm_caseStatuses', initialCaseStatuses);
  const [documentChecklistConfig, setDocumentChecklistConfig] = useLocalStorage<DocumentChecklistConfig>(
    'crm_documentChecklistConfig',
    mockDocumentChecklistConfig,
  );
  const [firmInfo, setFirmInfo] = useLocalStorage<FirmInfo>('crm_firmInfo', mockFirmInfo);
  const [brandingSettings, setBrandingSettings] = useLocalStorage<BrandingSettings>(
    'crm_brandingSettings',
    mockBrandingSettings,
  );
  const [notificationSettings, setNotificationSettings] = useLocalStorage<NotificationSettings>(
    'crm_notificationSettings',
    mockNotificationSettings,
  );

  const addTemplate = useCallback(async (templateData: Omit<DocumentTemplate, 'id'>) => {
    const newTemplate: DocumentTemplate = { ...templateData, id: `template-${Date.now()}` };
    await fakeApiCall(null);
    setDocumentTemplates(prev => [...prev, newTemplate]);
  }, [setDocumentTemplates]);

  const updateTemplate = useCallback(async (template: DocumentTemplate) => {
    await fakeApiCall(null);
    setDocumentTemplates(prev => prev.map(t => (t.id === template.id ? template : t)));
  }, [setDocumentTemplates]);

  const deleteTemplate = useCallback(async (templateId: string) => {
    await fakeApiCall(null);
    setDocumentTemplates(prev => prev.filter(t => t.id !== templateId));
  }, [setDocumentTemplates]);

  const addBenefitType = useCallback(async (type: string) => {
    if (!type || benefitTypes.includes(type)) {
      return;
    }
    await fakeApiCall(null);
    setBenefitTypes(prev => [...prev, type]);
    setDocumentChecklistConfig(prev => ({
      ...prev,
      [type]: ['Documento de Identificação (RG/CNH)', 'CPF', 'Comprovante de Residência'],
    }));
  }, [benefitTypes, setBenefitTypes, setDocumentChecklistConfig]);

  const removeBenefitType = useCallback(async (type: string) => {
    await fakeApiCall(null);
    setBenefitTypes(prev => prev.filter(t => t !== type));
    setDocumentChecklistConfig(prev => {
      const newConfig = { ...prev };
      delete newConfig[type];
      return newConfig;
    });
  }, [setBenefitTypes, setDocumentChecklistConfig]);

  const addCaseStatus = useCallback(async (status: string) => {
    if (!status || caseStatuses.includes(status as CaseStatus)) {
      return;
    }
    await fakeApiCall(null);
    setCaseStatuses(prev => [...prev, status as CaseStatus]);
  }, [caseStatuses, setCaseStatuses]);

  const removeCaseStatus = useCallback(async (status: string) => {
    await fakeApiCall(null);
    setCaseStatuses(prev => prev.filter(s => s !== status));
  }, [setCaseStatuses]);

  const updateChecklistItem = useCallback(async (benefitType: string, item: string, action: 'add' | 'remove') => {
    await fakeApiCall(null);
    setDocumentChecklistConfig(prev => {
      const currentItems = prev[benefitType] || [];
      if (action === 'add' && item.trim() && !currentItems.includes(item)) {
        return { ...prev, [benefitType]: [...currentItems, item] };
      }
      if (action === 'remove') {
        return { ...prev, [benefitType]: currentItems.filter(i => i !== item) };
      }
      return prev;
    });
  }, [setDocumentChecklistConfig]);

  const updateFirmInfo = useCallback(async (info: FirmInfo) => {
    await fakeApiCall(null);
    setFirmInfo(info);
  }, [setFirmInfo]);

  const updateBrandingSettings = useCallback(async (settings: BrandingSettings) => {
    await fakeApiCall(null);
    setBrandingSettings(settings);
  }, [setBrandingSettings]);

  const updateNotificationSettings = useCallback(async (settings: NotificationSettings) => {
    await fakeApiCall(null);
    setNotificationSettings(settings);
  }, [setNotificationSettings]);

  const resetSettings = useCallback(async () => {
    await fakeApiCall(null);
    setDocumentTemplates(mockDocumentTemplates);
    setBenefitTypes(initialBenefitTypes);
    setCaseStatuses(initialCaseStatuses);
    setDocumentChecklistConfig(mockDocumentChecklistConfig);
    setFirmInfo(mockFirmInfo);
    setBrandingSettings(mockBrandingSettings);
    setNotificationSettings(mockNotificationSettings);
  }, [setDocumentTemplates, setBenefitTypes, setCaseStatuses, setDocumentChecklistConfig, setFirmInfo, setBrandingSettings, setNotificationSettings]);

  const value = useMemo(() => ({
    documentTemplates,
    benefitTypes,
    caseStatuses,
    documentChecklistConfig,
    firmInfo,
    brandingSettings,
    notificationSettings,
    addTemplate,
    updateTemplate,
    deleteTemplate,
    addBenefitType,
    removeBenefitType,
    addCaseStatus,
    removeCaseStatus,
    updateChecklistItem,
    updateFirmInfo,
    updateBrandingSettings,
    updateNotificationSettings,
    resetSettings,
  }), [
    documentTemplates,
    benefitTypes,
    caseStatuses,
    documentChecklistConfig,
    firmInfo,
    brandingSettings,
    notificationSettings,
    addTemplate,
    updateTemplate,
    deleteTemplate,
    addBenefitType,
    removeBenefitType,
    addCaseStatus,
    removeCaseStatus,
    updateChecklistItem,
    updateFirmInfo,
    updateBrandingSettings,
    updateNotificationSettings,
    resetSettings,
  ]);

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
};

export const useSettings = (): SettingsContextValue => {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};
