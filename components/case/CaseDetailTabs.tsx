
import React from 'react';
import { LayoutGrid, ListChecks, FolderOpen, DollarSign } from 'lucide-react';

type Tab = 'overview' | 'progress' | 'documents' | 'financials';

interface CaseDetailTabsProps {
  activeTab: Tab;
  setActiveTab: (tab: Tab) => void;
}

const TabButton: React.FC<{
  icon: React.ReactNode;
  label: string;
  isActive: boolean;
  onClick: () => void;
}> = ({ icon, label, isActive, onClick }) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-2 whitespace-nowrap py-3 px-4 border-b-2 font-medium text-sm transition-colors ${
      isActive
        ? 'border-sky-500 text-sky-600'
        : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
    }`}
    role="tab"
    aria-selected={isActive}
  >
    {icon}
    {label}
  </button>
);

const CaseDetailTabs: React.FC<CaseDetailTabsProps> = ({ activeTab, setActiveTab }) => {
  return (
    <div className="border-b border-slate-200 bg-white rounded-t-xl shadow-sm">
      <nav className="-mb-px flex space-x-4 overflow-x-auto px-6" aria-label="Tabs" role="tablist">
        <TabButton
          icon={<LayoutGrid size={16} />}
          label="Visão Geral"
          isActive={activeTab === 'overview'}
          onClick={() => setActiveTab('overview')}
        />
        <TabButton
          icon={<ListChecks size={16} />}
          label="Andamentos & Tarefas"
          isActive={activeTab === 'progress'}
          onClick={() => setActiveTab('progress')}
        />
        <TabButton
          icon={<FolderOpen size={16} />}
          label="Documentos"
          isActive={activeTab === 'documents'}
          onClick={() => setActiveTab('documents')}
        />
        <TabButton
          icon={<DollarSign size={16} />}
          label="Financeiro"
          isActive={activeTab === 'financials'}
          onClick={() => setActiveTab('financials')}
        />
      </nav>
    </div>
  );
};

export default CaseDetailTabs;
