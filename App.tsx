
import React, { useState, useMemo, useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import Sidebar from './components/layout/Sidebar';
import Header from './components/layout/Header';
import Dashboard from './pages/Dashboard';
import Cases from './pages/Cases';
import Clients from './pages/Clients';
import { SettingsProvider, useSettings } from './context/SettingsContext';
import { CasesProvider } from './context/CasesContext';
import { FinancialProvider } from './context/FinancialContext';
import { ClientsProvider } from './context/ClientsContext';
import { ResetProvider } from './context/ResetContext';
import { ToastProvider } from './context/ToastContext';
import ToastContainer from './components/common/ToastContainer';
import Agenda from './pages/Agenda';
import CaseDetails from './pages/CaseDetails';
import ClientDetails from './pages/ClientDetails';
import Financials from './pages/Financials';
import DocumentTemplates from './pages/DocumentTemplates';
import Configuracoes from './pages/Configuracoes';
import DeadlineAlertModal from './components/common/DeadlineAlertModal';
import GlobalSearchModal from './components/search/GlobalSearchModal';
import { useCases } from './context/CasesContext';
import classNames from 'classnames';

export default function App() {
  return (
    <SettingsProvider>
      <CasesProvider>
        <FinancialProvider>
          <ClientsProvider>
            <ResetProvider>
              <ToastProvider>
                <AppContent />
              </ToastProvider>
            </ResetProvider>
          </ClientsProvider>
        </FinancialProvider>
      </CasesProvider>
    </SettingsProvider>
  );
}

const AppContent: React.FC = () => {
  const defaultSidebarState = typeof window !== 'undefined' ? window.innerWidth > 1024 : true;
  const [isSidebarOpen, setIsSidebarOpen] = useState(defaultSidebarState);
  const [isDeadlineModalOpen, setIsDeadlineModalOpen] = useState(false);
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [hasDismissedForToday, setHasDismissedForToday] = useState(() => {
    const today = new Date().toDateString();
    return sessionStorage.getItem('deadlineModalDismissed') === today;
  });
  const [hasAcknowledgedCurrentUrgentTasks, setHasAcknowledgedCurrentUrgentTasks] = useState(false);
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [sidebarBeforeFocus, setSidebarBeforeFocus] = useState(defaultSidebarState);
  const { getUrgentTasks } = useCases();
  const { theme, density } = useSettings();

  const urgentTasks = useMemo(() => getUrgentTasks(), [getUrgentTasks]);
  const urgentSignature = useMemo(() => urgentTasks.map(task => task.id).join('|'), [urgentTasks]);

  useEffect(() => {
    setHasAcknowledgedCurrentUrgentTasks(false);
  }, [urgentSignature]);

  useEffect(() => {
    if (!hasDismissedForToday && urgentTasks.length > 0 && !hasAcknowledgedCurrentUrgentTasks) {
      setIsDeadlineModalOpen(true);
    } else if (urgentTasks.length === 0) {
      setIsDeadlineModalOpen(false);
    }
  }, [hasDismissedForToday, urgentTasks, hasAcknowledgedCurrentUrgentTasks]);

  useEffect(() => {
    if (typeof document === 'undefined') {
      return;
    }
    const body = document.body;
    body.classList.remove('theme-light', 'theme-dark');
    body.classList.add(theme === 'dark' ? 'theme-dark' : 'theme-light');
  }, [theme]);

  useEffect(() => {
    if (typeof document === 'undefined') {
      return;
    }
    const body = document.body;
    body.classList.remove('density-compact', 'density-default', 'density-spacious');
    body.classList.add(`density-${density}`);
  }, [density]);

  const layoutClassName = classNames(
    'app-shell grid min-h-screen w-full grid-rows-[auto,1fr] transition-colors duration-300',
    isFocusMode ? 'grid-cols-1' : 'grid-cols-[auto,1fr]',
    {
      'density-compact': density === 'compact',
      'density-default': density === 'default',
      'density-spacious': density === 'spacious',
    },
  );

  const mainClassName = classNames(
    'app-main row-start-2 h-full overflow-x-hidden overflow-y-auto rounded-tl-3xl',
    'transition-[background-color,color,padding] duration-300',
    isFocusMode ? 'col-start-1' : 'col-start-2',
  );

  useEffect(() => {
    if (!isFocusMode) {
      setSidebarBeforeFocus(isSidebarOpen);
    }
  }, [isFocusMode, isSidebarOpen]);

  const handleFocusModeToggle = () => {
    setIsFocusMode(prev => {
      if (!prev) {
        setSidebarBeforeFocus(isSidebarOpen);
        setIsSidebarOpen(false);
        return true;
      }
      setIsSidebarOpen(sidebarBeforeFocus);
      return false;
    });
  };

  const handleCloseDeadlineModal = (dismiss: boolean) => {
    if (dismiss) {
      const today = new Date().toDateString();
      sessionStorage.setItem('deadlineModalDismissed', today);
      setHasDismissedForToday(true);
      setHasAcknowledgedCurrentUrgentTasks(true);
    } else {
      setHasAcknowledgedCurrentUrgentTasks(true);
    }
    setIsDeadlineModalOpen(false);
  };

  return (
    <>
      <DeadlineAlertModal
        isOpen={isDeadlineModalOpen}
        onClose={handleCloseDeadlineModal}
        urgentTasks={urgentTasks}
      />
      <GlobalSearchModal isOpen={isSearchModalOpen} onClose={() => setIsSearchModalOpen(false)} />
      <div className={layoutClassName}>
        <div className={classNames('col-start-1 row-span-2 transition-all duration-300', { hidden: isFocusMode })}>
          <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} isFocusMode={isFocusMode} />
        </div>
        <div className={classNames('row-start-1', isFocusMode ? 'col-start-1' : 'col-start-2')}>
          <Header
            onMenuClick={() => setIsSidebarOpen(!isSidebarOpen)}
            onSearchClick={() => setIsSearchModalOpen(true)}
            onFocusModeToggle={handleFocusModeToggle}
            isFocusMode={isFocusMode}
          />
        </div>
        <main className={mainClassName}>
          <div className={classNames('mx-auto w-full', isFocusMode ? 'max-w-screen-xl' : 'max-w-6xl')}>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/casos" element={<Cases />} />
              <Route path="/casos/:caseId" element={<CaseDetails />} />
              <Route path="/clientes" element={<Clients />} />
              <Route path="/clientes/:clientId" element={<ClientDetails />} />
              <Route path="/agenda" element={<Agenda />} />
              <Route path="/financeiro" element={<Financials />} />
              <Route path="/modelos" element={<DocumentTemplates />} />
              <Route path="/configuracoes" element={<Configuracoes />} />
            </Routes>
          </div>
        </main>
      </div>
      <ToastContainer />
    </>
  );
};
