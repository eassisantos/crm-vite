import React, {
  createContext,
  useContext,
  useMemo,
  useCallback,
  ReactNode,
  useState,
  useEffect,
} from 'react';
import {
  DocumentTemplate,
  DocumentChecklistConfig,
  FirmInfo,
  BrandingSettings,
  NotificationSettings,
  CaseStatus,
  SettingsState,
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
import { executeCommand, fetchBootstrap } from '../services/apiClient';

export type ThemeMode = 'light' | 'dark';
export type DensityMode = 'compact' | 'default' | 'spacious';
export type DashboardWidgetKey =
  | 'weeklyClients'
  | 'weeklyCases'
  | 'conversionRate'
  | 'activeCases';

const DEFAULT_DASHBOARD_WIDGET_ORDER: DashboardWidgetKey[] = [
  'weeklyClients',
  'weeklyCases',
  'conversionRate',
  'activeCases',
];

interface SettingsContextValue {
  documentTemplates: DocumentTemplate[];
  benefitTypes: string[];
  caseStatuses: CaseStatus[];
  sidebarStatus: CaseStatus;
  documentChecklistConfig: DocumentChecklistConfig;
  firmInfo: FirmInfo;
  brandingSettings: BrandingSettings;
  notificationSettings: NotificationSettings;
  theme: ThemeMode;
  density: DensityMode;
  dashboardWidgetOrder: DashboardWidgetKey[];
  hiddenDashboardWidgets: DashboardWidgetKey[];
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;
  setDensity: (density: DensityMode) => void;
  setSidebarStatus: (status: CaseStatus) => void;
  setDashboardWidgetOrder: (order: DashboardWidgetKey[]) => void;
  setDashboardWidgetVisibility: (widget: DashboardWidgetKey, visible: boolean) => void;
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

const readLocalStorage = (key: string): string | null => {
  if (typeof window === 'undefined') {
    return null;
  }
  try {
    return window.localStorage.getItem(key);
  } catch (error) {
    console.warn(`Não foi possível ler a chave ${key} do localStorage.`, error);
    return null;
  }
};

const writeLocalStorage = (key: string, value: string): void => {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    window.localStorage.setItem(key, value);
  } catch (error) {
    console.warn(`Não foi possível persistir a chave ${key} no localStorage.`, error);
  }
};

export const SettingsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<ThemeMode>(() => {
    const stored = readLocalStorage('crm_theme');
    return stored === 'dark' ? 'dark' : 'light';
  });
  const [density, setDensityState] = useState<DensityMode>(() => {
    const stored = readLocalStorage('crm_density');
    return stored === 'compact' || stored === 'spacious' ? (stored as DensityMode) : 'default';
  });

  useEffect(() => {
    writeLocalStorage('crm_theme', theme);
  }, [theme]);

  useEffect(() => {
    writeLocalStorage('crm_density', density);
  }, [density]);

  const [documentTemplates, setDocumentTemplates] = useState<DocumentTemplate[]>(mockDocumentTemplates);
  const [benefitTypes, setBenefitTypes] = useState<string[]>(initialBenefitTypes);
  const [caseStatuses, setCaseStatuses] = useState<CaseStatus[]>(initialCaseStatuses);
  const [documentChecklistConfig, setDocumentChecklistConfig] =
    useState<DocumentChecklistConfig>(mockDocumentChecklistConfig);
  const [firmInfo, setFirmInfo] = useState<FirmInfo>(mockFirmInfo);
  const [brandingSettings, setBrandingSettings] = useState<BrandingSettings>(mockBrandingSettings);
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>(mockNotificationSettings);
  const [sidebarStatus, setSidebarStatusState] = useState<CaseStatus>(initialCaseStatuses[0]);
  const [dashboardWidgetOrder, setDashboardWidgetOrderState] =
    useState<DashboardWidgetKey[]>(DEFAULT_DASHBOARD_WIDGET_ORDER);
  const [hiddenDashboardWidgets, setHiddenDashboardWidgets] = useState<DashboardWidgetKey[]>([]);

 const applySettingsState = useCallback((state: SettingsState) => {
   setDocumentTemplates(state.documentTemplates);
   setBenefitTypes(state.benefitTypes);
   setCaseStatuses(state.caseStatuses);
   setDocumentChecklistConfig(state.documentChecklistConfig);
   setFirmInfo(state.firmInfo);
   setBrandingSettings(state.brandingSettings);
   setNotificationSettings(state.notificationSettings);
    const availableStatuses = state.caseStatuses.length > 0 ? state.caseStatuses : initialCaseStatuses;
    setSidebarStatusState(prev => (availableStatuses.includes(prev) ? prev : availableStatuses[0]));
  }, []);

  useEffect(() => {
    let cancelled = false;
    const loadSettings = async () => {
      try {
        const data = await fetchBootstrap();
        if (!cancelled) {
          applySettingsState(data.settings);
        }
      } catch (error) {
        console.error('Não foi possível carregar as configurações do servidor.', error);
      }
    };

    void loadSettings();
    return () => {
      cancelled = true;
    };
  }, [applySettingsState]);

  const setTheme = useCallback((newTheme: ThemeMode) => {
    setThemeState(prev => (prev === newTheme ? prev : newTheme));
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState(prev => (prev === 'dark' ? 'light' : 'dark'));
  }, []);

  const setDensity = useCallback((newDensity: DensityMode) => {
    setDensityState(prev => (prev === newDensity ? prev : newDensity));
  }, []);

  const setDashboardWidgetOrder = useCallback((order: DashboardWidgetKey[]) => {
    setDashboardWidgetOrderState(prev => {
      if (prev.length === order.length && prev.every((item, index) => item === order[index])) {
        return prev;
      }
      return order;
    });
  }, []);

  const setDashboardWidgetVisibility = useCallback(
    (widget: DashboardWidgetKey, visible: boolean) => {
      setHiddenDashboardWidgets(prev => {
        const isHidden = prev.includes(widget);
        if (!visible && !isHidden) {
          return [...prev, widget];
        }
        if (visible && isHidden) {
          return prev.filter(item => item !== widget);
        }
        return prev;
      });
    },
    [],
  );

  const addTemplate = useCallback(
    async (templateData: Omit<DocumentTemplate, 'id'>) => {
      const settings = await executeCommand<SettingsState>({
        resource: 'settings',
        action: 'addTemplate',
        payload: templateData,
      });
      applySettingsState(settings);
    },
    [applySettingsState],
  );

  const updateTemplate = useCallback(
    async (template: DocumentTemplate) => {
      const settings = await executeCommand<SettingsState>({
        resource: 'settings',
        action: 'updateTemplate',
        payload: template,
      });
      applySettingsState(settings);
    },
    [applySettingsState],
  );

  const deleteTemplate = useCallback(
    async (templateId: string) => {
      const settings = await executeCommand<SettingsState>({
        resource: 'settings',
        action: 'deleteTemplate',
        payload: { templateId },
      });
      applySettingsState(settings);
    },
    [applySettingsState],
  );

  const addBenefitType = useCallback(
    async (type: string) => {
      const settings = await executeCommand<SettingsState>({
        resource: 'settings',
        action: 'addBenefitType',
        payload: { value: type },
      });
      applySettingsState(settings);
    },
    [applySettingsState],
  );

  const removeBenefitType = useCallback(
    async (type: string) => {
      const settings = await executeCommand<SettingsState>({
        resource: 'settings',
        action: 'removeBenefitType',
        payload: { value: type },
      });
      applySettingsState(settings);
    },
    [applySettingsState],
  );

  const addCaseStatus = useCallback(
    async (status: string) => {
      const settings = await executeCommand<SettingsState>({
        resource: 'settings',
        action: 'addCaseStatus',
        payload: { value: status },
      });
      applySettingsState(settings);
    },
    [applySettingsState],
  );

  const removeCaseStatus = useCallback(
    async (status: string) => {
      const settings = await executeCommand<SettingsState>({
        resource: 'settings',
        action: 'removeCaseStatus',
        payload: { value: status },
      });
      applySettingsState(settings);
    },
    [applySettingsState],
  );

  const updateChecklistItem = useCallback(
    async (benefitType: string, item: string, action: 'add' | 'remove') => {
      const settings = await executeCommand<SettingsState>({
        resource: 'settings',
        action: 'updateChecklistItem',
        payload: { benefitType, item, action },
      });
      applySettingsState(settings);
    },
    [applySettingsState],
  );

  const updateFirmInfo = useCallback(
    async (info: FirmInfo) => {
      const settings = await executeCommand<SettingsState>({
        resource: 'settings',
        action: 'updateFirmInfo',
        payload: info,
      });
      applySettingsState(settings);
    },
    [applySettingsState],
  );

  const updateBrandingSettings = useCallback(
    async (settingsData: BrandingSettings) => {
      const settings = await executeCommand<SettingsState>({
        resource: 'settings',
        action: 'updateBrandingSettings',
        payload: settingsData,
      });
      applySettingsState(settings);
    },
    [applySettingsState],
  );

  const updateNotificationSettings = useCallback(
    async (settingsData: NotificationSettings) => {
      const settings = await executeCommand<SettingsState>({
        resource: 'settings',
        action: 'updateNotificationSettings',
        payload: settingsData,
      });
      applySettingsState(settings);
    },
    [applySettingsState],
  );

  const resetSettings = useCallback(async () => {
    const settings = await executeCommand<SettingsState>({
      resource: 'settings',
      action: 'reset',
    });
    applySettingsState(settings);
  }, [applySettingsState]);

  const value = useMemo(
    () => ({
      documentTemplates,
      benefitTypes,
      caseStatuses,
      sidebarStatus,
      documentChecklistConfig,
      firmInfo,
      brandingSettings,
      notificationSettings,
      theme,
      density,
      dashboardWidgetOrder,
      hiddenDashboardWidgets,
      setTheme,
      toggleTheme,
      setDensity,
      setSidebarStatus: setSidebarStatusState,
      setDashboardWidgetOrder,
      setDashboardWidgetVisibility,
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
    }),
    [
      documentTemplates,
      benefitTypes,
      caseStatuses,
      sidebarStatus,
      documentChecklistConfig,
      firmInfo,
      brandingSettings,
      notificationSettings,
      theme,
      density,
      dashboardWidgetOrder,
      hiddenDashboardWidgets,
      setTheme,
      toggleTheme,
      setDensity,
      setSidebarStatusState,
      setDashboardWidgetOrder,
      setDashboardWidgetVisibility,
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
    ],
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
};

export const useSettings = (): SettingsContextValue => {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};
