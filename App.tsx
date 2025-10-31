
import React, { useState, useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import Sidebar from './components/layout/Sidebar';
import Header from './components/layout/Header';
import Dashboard from './pages/Dashboard';
import Cases from './pages/Cases';
import Clients from './pages/Clients';
import { CrmProvider } from './context/CrmContext';
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

export default function App() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth > 1024);
  const [isDeadlineModalOpen, setIsDeadlineModalOpen] = useState(false);
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);

  useEffect(() => {
    const dismissed = sessionStorage.getItem('deadlineModalDismissed');
    const today = new Date().toDateString();
    if (dismissed !== today) {
      // Use a timeout to ensure data context is loaded
      setTimeout(() => setIsDeadlineModalOpen(true), 1500);
    }
  }, []);

  const handleCloseDeadlineModal = (dismiss: boolean) => {
    if (dismiss) {
      sessionStorage.setItem('deadlineModalDismissed', new Date().toDateString());
    }
    setIsDeadlineModalOpen(false);
  };

  return (
    <CrmProvider>
      <ToastProvider>
        <DeadlineAlertModal isOpen={isDeadlineModalOpen} onClose={handleCloseDeadlineModal} />
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
      </ToastProvider>
    </CrmProvider>
  );
}
