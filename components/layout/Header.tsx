import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Menu, User, Bell, Search, Maximize2, Minimize2, Plus, AlertTriangle } from 'lucide-react';
import NotificationsDropdown from './NotificationsDropdown';
import { useCases } from '../../context/CasesContext';
import classNames from 'classnames';
import ThemeToggle from '../common/ThemeToggle';
import DensityToggle from '../common/DensityToggle';
import { useSettings } from '../../context/SettingsContext';
import { useClients } from '../../context/ClientsContext';
import { useFinancial } from '../../context/FinancialContext';
import { useBreadcrumbs } from '../../utils/navigation';
import { Link, matchPath } from 'react-router-dom';

interface HeaderProps {
  onMenuClick: () => void;
  onSearchClick: () => void;
  onFocusModeToggle: () => void;
  isFocusMode: boolean;
}

const primaryActionMap: Record<string, string> = {
  '/': 'Registrar atividade',
  '/casos': 'Novo caso',
  '/casos/:caseId': 'Adicionar tarefa',
  '/clientes': 'Novo cliente',
  '/clientes/:clientId': 'Adicionar atendimento',
  '/agenda': 'Nova reunião',
  '/financeiro': 'Novo lançamento',
  '/modelos': 'Novo modelo',
  '/configuracoes': 'Atualizar preferências',
};

export default function Header({ onMenuClick, onSearchClick, onFocusModeToggle, isFocusMode }: HeaderProps) {
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const { getUrgentTasks, getCaseById } = useCases();
  const { getClientById } = useClients();
  const { fees } = useFinancial();
  const urgentTasks = useMemo(() => getUrgentTasks(), [getUrgentTasks]);
  const urgentTasksCount = urgentTasks.length;
  const notificationsRef = useRef<HTMLDivElement>(null);
  const { density } = useSettings();

  const breadcrumbs = useBreadcrumbs((pattern, params) => {
    if (pattern === '/casos/:caseId') {
      const caseData = getCaseById(params.caseId ?? '');
      return caseData?.title ?? 'Detalhes do Caso';
    }
    if (pattern === '/clientes/:clientId') {
      const client = getClientById(params.clientId ?? '');
      return client?.name ?? 'Detalhes do Cliente';
    }
    return undefined;
  });

  const primaryActionLabel = useMemo(() => {
    const currentPath = breadcrumbs[breadcrumbs.length - 1]?.path ?? '/';
    const matchEntry = Object.entries(primaryActionMap).find(([pattern]) =>
      matchPath({ path: pattern, end: true }, currentPath),
    );
    return matchEntry?.[1] ?? 'Nova ação';
  }, [breadcrumbs]);

  const todaysBillableHours = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const HOURLY_RATE = 350;

    const totalAmount = fees.reduce((sum, fee) => {
      if (fee.installments?.length) {
        const todaysInstallments = fee.installments.filter(inst => inst.dueDate === today);
        const installmentsTotal = todaysInstallments.reduce((acc, inst) => acc + inst.amount, 0);
        return sum + installmentsTotal;
      }
      if (fee.dueDate === today) {
        return sum + fee.amount;
      }
      return sum;
    }, 0);

    if (totalAmount === 0) {
      return 0;
    }

    return Math.max(1, Math.round(totalAmount / HOURLY_RATE));
  }, [fees]);

  const headerClassName = classNames(
    'app-header flex flex-shrink-0 flex-wrap items-center justify-between bg-surface shadow-soft z-10 border-b border-subtle',
    'transition-[height,padding] duration-300',
    {
      'h-14 px-4 gap-4': density === 'compact',
      'h-16 px-6 gap-6': density === 'default',
      'h-20 px-8 gap-8': density === 'spacious',
    },
  );

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
        setIsNotificationsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handlePrimaryAction = () => {
    console.info(`[Primary Action Triggered] ${primaryActionLabel}`);
  };

  return (
    <header className={headerClassName}>
      <div className="order-1 flex items-center gap-4">
        <button
          type="button"
          className="icon-button lg:hidden"
          onClick={onMenuClick}
          aria-label="Alternar menu"
        >
          <Menu className="h-6 w-6" />
        </button>
        <button
          onClick={onSearchClick}
          className="flex items-center gap-2 rounded-full border border-subtle bg-surface px-3 py-1.5 text-sm text-secondary shadow-soft transition-colors duration-200 hover:bg-surface-muted hover:text-primary"
        >
          <Search size={16} />
          <span className="hidden sm:inline">Busca Rápida...</span>
          <kbd className="hidden sm:inline-block rounded border bg-white px-1.5 font-sans text-xs font-medium text-slate-400">
            ⌘K
          </kbd>
        </button>
      </div>

      <div className="order-3 flex w-full flex-col gap-3 text-center md:order-2 md:w-auto md:flex-1 md:flex-row md:items-center md:justify-center md:text-left">
        <nav className="flex flex-wrap items-center justify-center gap-2 text-xs font-medium text-secondary md:text-sm">
          {breadcrumbs.map((breadcrumb, index) => {
            const isLast = index === breadcrumbs.length - 1;
            return (
              <React.Fragment key={breadcrumb.path}>
                {index > 0 && <span className="text-subtle">/</span>}
                {isLast ? (
                  <span className="text-primary font-semibold">{breadcrumb.label}</span>
                ) : (
                  <Link
                    to={breadcrumb.path}
                    className="transition-colors duration-200 hover:text-primary"
                  >
                    {breadcrumb.label}
                  </Link>
                )}
              </React.Fragment>
            );
          })}
        </nav>
        <div className="flex flex-wrap items-center justify-center gap-3 md:justify-start">
          <div className="flex items-center gap-2 rounded-full border border-subtle bg-surface px-3 py-1 text-xs font-medium text-secondary shadow-soft">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            <span>{urgentTasksCount} urgentes</span>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-subtle bg-surface px-3 py-1 text-xs font-medium text-secondary shadow-soft">
            <span className="inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
            <span>{todaysBillableHours}h faturáveis hoje</span>
          </div>
          <button
            type="button"
            onClick={handlePrimaryAction}
            className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-on-primary shadow-soft transition-colors duration-200 hover:brightness-105"
          >
            <Plus className="h-4 w-4" />
            {primaryActionLabel}
          </button>
        </div>
      </div>

      <div className="order-2 ml-auto flex items-center gap-3 md:order-3">
        <button
          type="button"
          onClick={onFocusModeToggle}
          className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium shadow-soft transition-colors duration-200 ${
            isFocusMode
              ? 'border-transparent bg-sky-600 text-white hover:bg-sky-700'
              : 'border-subtle bg-surface text-secondary hover:bg-surface-muted hover:text-primary'
          }`}
          aria-pressed={isFocusMode}
        >
          {isFocusMode ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          {isFocusMode ? 'Sair do Foco' : 'Modo Foco'}
        </button>
        <ThemeToggle />
        <DensityToggle />
        <div className="relative" ref={notificationsRef}>
          <button
            onClick={() => setIsNotificationsOpen(prev => !prev)}
            className="relative icon-button"
          >
            <Bell className="h-6 w-6" />
            {urgentTasksCount > 0 && (
              <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white">
                {urgentTasksCount}
              </span>
            )}
          </button>
          <NotificationsDropdown isOpen={isNotificationsOpen} onClose={() => setIsNotificationsOpen(false)} />
        </div>
        <div className="h-8 w-px bg-surface-muted"></div>
        <div className="flex items-center space-x-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-sky-100 text-sky-600">
            <User className="h-6 w-6" />
          </div>
          <div className="hidden md:block">
            <p className="text-sm font-medium text-primary">Dr. Usuário</p>
            <p className="text-xs text-secondary">Advogado</p>
          </div>
        </div>
      </div>
    </header>
  );
}
