import React, { useEffect, useMemo, useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Briefcase,
  Scale,
  Calendar,
  FileText,
  DollarSign,
  Settings,
  X,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useSettings } from '../../context/SettingsContext';
import { useCases } from '../../context/CasesContext';
import useBreakpoint from '../../hooks/useBreakpoint';
import type { CaseStatus } from '../../types';

interface SidebarProps {
    isOpen: boolean;
    onClose: () => void;
    isFocusMode: boolean;
}

interface SectionItem {
  to: string;
  icon: LucideIcon;
  label: string;
  badge: number;
}

interface NavSection {
  key: string;
  title: string;
  items: SectionItem[];
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose, isFocusMode }) => {
  const { brandingSettings, firmInfo, caseStatuses, sidebarStatus, setSidebarStatus } = useSettings();
  const { cases, getUrgentTasks } = useCases();
  const isCollapsed = useBreakpoint(1024, 'max');
  const shouldShowSidebar = !isFocusMode && (!isCollapsed || isOpen);

  const allTasks = useMemo(() => cases.flatMap(c => c.tasks), [cases]);
  const urgentTasks = useMemo(() => getUrgentTasks(), [getUrgentTasks]);

  const upcomingTasks = useMemo(() => {
    const now = new Date();
    const weekAhead = new Date();
    weekAhead.setDate(now.getDate() + 7);
    return allTasks.filter(task => {
      const dueDate = new Date(`${task.dueDate}T00:00:00`);
      return !task.completed && dueDate >= now && dueDate <= weekAhead;
    }).length;
  }, [allTasks]);

  const uniqueClients = useMemo(() => new Set(cases.map(c => c.clientId)).size, [cases]);

  const activeCases = useMemo(
    () => cases.filter(c => !['Fechado', 'Finalizado', 'Arquivado'].includes(c.status)).length,
    [cases],
  );

  const pendingDocuments = useMemo(
    () =>
      cases.reduce(
        (total, currentCase) =>
          total + currentCase.legalDocuments.filter(document => document.status !== 'Assinado').length,
        0,
      ),
    [cases],
  );

  const focusStatusCount = useMemo(
    () => cases.filter(currentCase => currentCase.status === sidebarStatus).length,
    [cases, sidebarStatus],
  );

  const navSections: NavSection[] = useMemo(
    () => [
      {
        key: 'operacoes',
        title: 'Operações',
        items: [
          { to: '/', label: 'Dashboard', icon: LayoutDashboard, badge: urgentTasks.length },
          { to: '/agenda', label: 'Agenda', icon: Calendar, badge: upcomingTasks },
        ],
      },
      {
        key: 'gestao',
        title: 'Gestão',
        items: [
          { to: '/clientes', label: 'Clientes', icon: Users, badge: uniqueClients },
          { to: '/casos', label: 'Casos', icon: Briefcase, badge: activeCases },
          { to: '/financeiro', label: 'Financeiro', icon: DollarSign, badge: allTasks.length },
          { to: '/modelos', label: 'Modelos', icon: FileText, badge: pendingDocuments },
        ],
      },
      {
        key: 'configuracoes',
        title: 'Configurações',
        items: [
          { to: '/configuracoes', label: 'Configurações', icon: Settings, badge: focusStatusCount },
        ],
      },
    ],
    [
      activeCases,
      focusStatusCount,
      pendingDocuments,
      uniqueClients,
      upcomingTasks,
      urgentTasks.length,
      allTasks.length,
    ],
  );

  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setCollapsedSections(prev => {
      let hasChanges = false;
      const updated: Record<string, boolean> = { ...prev };

      navSections.forEach(section => {
        if (!(section.key in updated)) {
          updated[section.key] = false;
          hasChanges = true;
        }
      });

      Object.keys(updated).forEach(sectionKey => {
        if (!navSections.some(section => section.key === sectionKey)) {
          delete updated[sectionKey];
          hasChanges = true;
        }
      });

      return hasChanges ? updated : prev;
    });
  }, [navSections]);

  useEffect(() => {
    if (caseStatuses.length > 0 && !caseStatuses.includes(sidebarStatus)) {
      setSidebarStatus(caseStatuses[0]);
    }
  }, [caseStatuses, sidebarStatus, setSidebarStatus]);

  const startOfWeek = useMemo(() => {
    const now = new Date();
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    const day = start.getDay();
    start.setDate(start.getDate() - day);
    return start;
  }, []);

  const casesUpdatedThisWeek = useMemo(
    () =>
      cases.filter(currentCase => {
        const lastUpdateDate = new Date(`${currentCase.lastUpdate}T00:00:00`);
        return lastUpdateDate >= startOfWeek;
      }).length,
    [cases, startOfWeek],
  );

  const weeklyGoal = useMemo(() => Math.max(1, Math.round(Math.max(cases.length, 1) * 0.6)), [cases.length]);
  const weeklyProgress = useMemo(
    () => Math.min(100, Math.round((casesUpdatedThisWeek / weeklyGoal) * 100)),
    [casesUpdatedThisWeek, weeklyGoal],
  );

  const handleToggleSection = (sectionKey: string) => {
    setCollapsedSections(prev => ({ ...prev, [sectionKey]: !prev[sectionKey] }));
  };

  return (
    <>
        {/* Overlay for mobile */}
        <div
            className={`fixed inset-0 bg-black bg-opacity-50 z-20 lg:hidden transition-opacity ${shouldShowSidebar ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
            onClick={onClose}
        ></div>

        <aside
            className={`fixed inset-y-0 left-0 w-64 bg-slate-800 text-white flex flex-col p-4 transform transition-transform duration-300 ease-in-out z-30 ${shouldShowSidebar ? 'translate-x-0' : '-translate-x-full'} lg:relative lg:translate-x-0 lg:w-64 lg:flex-shrink-0 ${isFocusMode ? 'pointer-events-none opacity-0 lg:opacity-0' : ''}`}
            aria-hidden={isFocusMode}
        >
            <div className="flex items-center justify-between mb-6 px-2 h-16 border-b border-slate-700 -m-4 p-4">
                <div className="flex items-center min-w-0">
                    {brandingSettings.logo ? (
                        <img src={brandingSettings.logo} alt="Logo do Escritório" className="h-8 w-auto" />
                    ) : (
                        <Scale className="h-8 w-8 text-sky-400 flex-shrink-0" />
                    )}
                    <h1 className="ml-3 text-lg font-bold tracking-tight truncate" title={firmInfo.name}>{firmInfo.name}</h1>
                </div>
                <button onClick={onClose} className="lg:hidden p-1 text-slate-400 hover:text-white">
                    <X size={24} />
                </button>
            </div>

            <nav className="flex-1 mt-4 space-y-4 overflow-y-auto pr-1">
              {navSections.map(section => {
                const isSectionCollapsed = collapsedSections[section.key];
                return (
                  <div key={section.key}>
                    <button
                      type="button"
                      onClick={() => handleToggleSection(section.key)}
                      className="flex w-full items-center justify-between px-3 text-[11px] font-semibold uppercase tracking-wide text-slate-400"
                    >
                      <span>{section.title}</span>
                      {isSectionCollapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
                    </button>
                    {!isSectionCollapsed && (
                      <div className="mt-2 space-y-1.5">
                        {section.items.map(item => {
                          const Icon = item.icon;
                          const badgeValue = item.badge;
                          return (
                            <NavLink
                              key={item.to}
                              to={item.to}
                              onClick={onClose}
                              className={({ isActive }) =>
                                `flex items-center justify-between rounded-lg px-4 py-2.5 text-sm font-medium transition-colors duration-200 ${
                                  isActive
                                    ? 'bg-slate-900 text-white shadow-inner'
                                    : 'text-slate-300 hover:bg-slate-700/50 hover:text-white'
                                }`
                              }
                            >
                              <span className="flex items-center">
                                <Icon size={20} />
                                <span className="ml-3">{item.label}</span>
                              </span>
                              <span className="ml-3 inline-flex min-w-[28px] items-center justify-center rounded-full bg-slate-700 px-2 text-xs font-semibold text-slate-100">
                                {badgeValue > 99 ? '99+' : badgeValue}
                              </span>
                            </NavLink>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </nav>

            <div className="mt-6 space-y-4">
              <div className="rounded-lg border border-slate-700/60 bg-slate-900/40 p-4">
                <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                  <span>Semana Atual</span>
                  <span>
                    {casesUpdatedThisWeek}/{weeklyGoal}
                  </span>
                </div>
                <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-700">
                  <div className="h-full rounded-full bg-sky-500 transition-all" style={{ width: `${weeklyProgress}%` }}></div>
                </div>
                <p className="mt-2 text-xs text-slate-400">
                  Casos atualizados recentemente indicam ritmo saudável.
                </p>
              </div>

              <div className="rounded-lg border border-slate-700/50 bg-slate-900/30 p-4">
                <label htmlFor="sidebar-status" className="block text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                  Status prioritário
                </label>
                <select
                  id="sidebar-status"
                  value={sidebarStatus}
                  onChange={event => setSidebarStatus(event.target.value as CaseStatus)}
                  className="mt-2 w-full rounded-md border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                >
                  {caseStatuses.map(status => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
                <p className="mt-2 text-xs text-slate-400">
                  Casos neste status: <span className="font-semibold text-slate-100">{focusStatusCount}</span>
                </p>
              </div>

              <div className="text-center text-xs text-slate-500 px-2">
                <p className="font-semibold text-slate-400">CRM Jurídico AI</p>
                <p>&copy; {new Date().getFullYear()} &bull; v2.2.0</p>
              </div>
            </div>
        </aside>
    </>
  );
};

export default Sidebar;
