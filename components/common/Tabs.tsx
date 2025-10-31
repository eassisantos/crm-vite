import React from 'react';
import classNames from 'classnames';

export interface TabDefinition {
  id: string;
  label: string;
  badge?: string | number;
  icon?: React.ReactNode;
}

interface TabsProps {
  tabs: TabDefinition[];
  activeTab: string;
  onChange: (tabId: string) => void;
  renderTab?: (tab: TabDefinition, isActive: boolean) => React.ReactNode;
  className?: string;
}

interface TabPanelProps {
  id: string;
  children: React.ReactNode;
}

export const TabPanel: React.FC<TabPanelProps> = ({ id, children }) => {
  return (
    <div role="tabpanel" data-tab-panel-id={id} className="mt-4">
      {children}
    </div>
  );
};

const Tabs: React.FC<TabsProps> = ({ tabs, activeTab, onChange, renderTab, className }) => {
  return (
    <div className={classNames('flex flex-col', className)}>
      <div className="-mb-px flex flex-wrap gap-2 border-b border-slate-200 pb-2">
        {tabs.map(tab => {
          const isActive = tab.id === activeTab;
          const defaultContent = (
            <span className="flex items-center gap-2 text-sm font-medium">
              {tab.icon}
              {tab.label}
              {tab.badge !== undefined && (
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
                  {tab.badge}
                </span>
              )}
            </span>
          );
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onChange(tab.id)}
              className={classNames(
                'rounded-full px-4 py-2 text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500',
                isActive
                  ? 'bg-sky-100 text-sky-700 shadow-sm'
                  : 'bg-white text-slate-500 hover:bg-slate-100 hover:text-slate-700',
              )}
            >
              {renderTab ? renderTab(tab, isActive) : defaultContent}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default Tabs;
