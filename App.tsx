
import React, { useState, useMemo, useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import Sidebar from './components/layout/Sidebar';
import Header from './components/layout/Header';
import Dashboard from './pages/Dashboard';
import Cases from './pages/Cases';
import Clients from './pages/Clients';
import { SettingsProvider } from './context/SettingsContext';
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
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth > 1024);
  const [isDeadlineModalOpen, setIsDeadlineModalOpen] = useState(false);
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [hasDismissedForToday, setHasDismissedForToday] = useState(() => {
    const today = new Date().toDateString();
    return sessionStorage.getItem('deadlineModalDismissed') === today;
  });
  const [hasAcknowledgedCurrentUrgentTasks, setHasAcknowledgedCurrentUrgentTasks] = useState(false);
  const { getUrgentTasks } = useCases();

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
      <div className="flex h-screen bg-slate-100">
        <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header onMenuClick={() => setIsSidebarOpen(!isSidebarOpen)} onSearchClick={() => setIsSearchModalOpen(true)} />
          <main className="flex-1 overflow-x-hidden overflow-y-auto bg-slate-50 p-4 sm:p-6 lg:p-8">
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
          </main>
        </div>
      </div>
      <ToastContainer />
    </>
  );
};
