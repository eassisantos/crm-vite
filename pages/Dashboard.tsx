import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Users,
  Briefcase,
  Target,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Settings2,
  GripVertical,
  TrendingUp,
  TrendingDown,
  Scale,
  Clock,
  User,
} from 'lucide-react';
import {
  DndContext,
  closestCenter,
  DragEndEvent,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { SortableContext, useSortable, arrayMove, sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ResponsiveContainer, LineChart, Line, Tooltip } from 'recharts';

import LegalAssistant from '../components/ai/LegalAssistant';
import ClientFormModal from '../components/client/ClientFormModal';
import CaseFormModal from '../components/case/CaseFormModal';
import TaskFormModal from '../components/tasks/TaskFormModal';
import FinancialEntryModal from '../components/financials/FinancialEntryModal';
import Tabs, { TabPanel } from '../components/common/Tabs';

import { useCases } from '../context/CasesContext';
import { useClients } from '../context/ClientsContext';
import { useFinancial } from '../context/FinancialContext';
import { useSettings, DashboardWidgetKey } from '../context/SettingsContext';
import { useToast } from '../context/ToastContext';

import { Task, Case, Client, Fee, Expense, FeeStatus, CaseStatus } from '../types';

type ChangeInfo = {
  value: number;
  label: string;
  positive: boolean;
  neutral: boolean;
};

type SparklineDatum = { label: string; value: number };

type DashboardMetric = {
  id: DashboardWidgetKey;
  label: string;
  value: string;
  changeLabel: string;
  changeValue: number;
  isPositive: boolean;
  isNeutral: boolean;
  description: string;
  icon: React.ReactNode;
  actionLabel?: string;
  onAction?: () => void;
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

const getErrorMessage = (error: unknown, fallback: string) =>
  error instanceof Error && error.message ? error.message : fallback;

const parseDate = (value: string) => new Date(value.includes('T') ? value : `${value}T00:00:00`);

const getStartOfWeek = (date: Date) => {
  const start = new Date(date);
  const day = start.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  start.setDate(start.getDate() + diff);
  start.setHours(0, 0, 0, 0);
  return start;
};

const getPercentageChangeInfo = (current: number, previous: number): ChangeInfo => {
  if (previous === 0) {
    if (current === 0) {
      return { value: 0, label: '0%', positive: false, neutral: true };
    }
    return { value: 100, label: '+100%', positive: true, neutral: false };
  }
  const diff = ((current - previous) / previous) * 100;
  const rounded = Number.isFinite(diff) ? diff : 0;
  return {
    value: rounded,
    label: `${rounded >= 0 ? '+' : ''}${rounded.toFixed(1)}%`,
    positive: rounded > 0,
    neutral: rounded === 0,
  };
};

const getPointDifferenceInfo = (current: number, previous: number): ChangeInfo => {
  const diff = current - previous;
  const rounded = Number.isFinite(diff) ? diff : 0;
  return {
    value: rounded,
    label: `${rounded >= 0 ? '+' : ''}${rounded.toFixed(1)} pts`,
    positive: rounded > 0,
    neutral: rounded === 0,
  };
};

const getAbsoluteDifferenceInfo = (current: number, previous: number): ChangeInfo => {
  const diff = current - previous;
  return {
    value: diff,
    label: `${diff >= 0 ? '+' : ''}${diff.toLocaleString('pt-BR')}`,
    positive: diff > 0,
    neutral: diff === 0,
  };
};

const Sparkline: React.FC<{ data: SparklineDatum[]; color: string }> = ({ data, color }) => (
  <ResponsiveContainer width="100%" height={60}>
    <LineChart data={data} margin={{ top: 5, right: 0, left: 0, bottom: 0 }}>
      <Tooltip
        cursor={false}
        contentStyle={{ fontSize: '0.75rem', borderRadius: '0.75rem', borderColor: '#cbd5f5' }}
        labelStyle={{ fontWeight: 600 }}
      />
      <Line type="monotone" dataKey="value" stroke={color} strokeWidth={2} dot={false} />
    </LineChart>
  </ResponsiveContainer>
);

const TrendIndicator: React.FC<{ metric: DashboardMetric }> = ({ metric }) => {
  if (metric.isNeutral || metric.changeValue === 0) {
    return (
      <span className="flex items-center gap-1 text-xs font-medium text-slate-400">
        <Minus size={14} /> Estável
      </span>
    );
  }
  const Icon = metric.isPositive ? ArrowUpRight : ArrowDownRight;
  const tone = metric.isPositive ? 'text-emerald-600' : 'text-rose-600';
  return (
    <span className={`flex items-center gap-1 text-xs font-semibold ${tone}`}>
      <Icon size={14} /> {metric.changeLabel}
    </span>
  );
};

const MetricCard: React.FC<{
  metric: DashboardMetric;
  dragHandleProps: React.HTMLAttributes<HTMLSpanElement>;
  isDragging: boolean;
}> = ({ metric, dragHandleProps, isDragging }) => {
  return (
    <div
      className={`relative flex h-full flex-col rounded-xl border border-slate-100 bg-white p-5 shadow-sm transition-all duration-200 ${
        isDragging ? 'ring-2 ring-sky-200' : 'hover:-translate-y-1 hover:shadow-md'
      }`}
    >
      <span
        {...dragHandleProps}
        className="absolute right-3 top-3 cursor-grab text-slate-300 transition-colors hover:text-slate-500 active:cursor-grabbing"
        aria-label="Arrastar card"
      >
        <GripVertical size={16} />
      </span>
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-sky-50 text-sky-600">
          {metric.icon}
        </div>
        <div className="flex flex-1 flex-col">
          <p className="text-sm font-medium text-slate-500">{metric.label}</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">{metric.value}</p>
          <div className="mt-2"><TrendIndicator metric={metric} /></div>
        </div>
      </div>
      <p className="mt-4 text-xs text-slate-500">{metric.description}</p>
      {metric.actionLabel && metric.onAction && (
        <button
          type="button"
          onClick={metric.onAction}
          className="mt-4 inline-flex items-center gap-2 text-xs font-semibold text-sky-600 transition-colors hover:text-sky-700"
        >
          {metric.actionLabel}
        </button>
      )}
    </div>
  );
};

const SortableMetricCard: React.FC<{ metric: DashboardMetric }> = ({ metric }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: metric.id });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} className="h-full">
      <MetricCard metric={metric} dragHandleProps={{ ...attributes, ...listeners }} isDragging={isDragging} />
    </div>
  );
};
const MyAgenda: React.FC = () => {
  const { cases, getCaseById } = useCases();

  const allPendingTasks = useMemo(
    () => cases.flatMap(c => c.tasks.filter(t => !t.completed).map(task => ({ ...task, caseId: c.id }))),
    [cases],
  );

  const today = useMemo(() => {
    const base = new Date();
    base.setHours(0, 0, 0, 0);
    return base;
  }, []);

  const tomorrow = useMemo(() => {
    const next = new Date(today);
    next.setDate(today.getDate() + 1);
    return next;
  }, [today]);

  const nextWeek = useMemo(() => {
    const range = new Date(today);
    range.setDate(today.getDate() + 7);
    return range;
  }, [today]);

  const isSameDay = useCallback((d1: Date, d2: Date) => d1.toDateString() === d2.toDateString(), []);

  const tasksToday = allPendingTasks.filter(t => isSameDay(parseDate(t.dueDate), today));
  const tasksTomorrow = allPendingTasks.filter(t => isSameDay(parseDate(t.dueDate), tomorrow));
  const tasksNextWeek = allPendingTasks.filter(t => {
    const dueDate = parseDate(t.dueDate);
    return dueDate > tomorrow && dueDate <= nextWeek;
  });

  const sparklineData = useMemo(() => {
    return Array.from({ length: 7 }).map((_, index) => {
      const day = new Date(today);
      day.setDate(today.getDate() + index);
      const value = allPendingTasks.filter(task => isSameDay(parseDate(task.dueDate), day)).length;
      return {
        label: day.toLocaleDateString('pt-BR', { weekday: 'short' }),
        value,
      };
    });
  }, [allPendingTasks, isSameDay, today]);

  const TaskItem: React.FC<{ task: Task }> = ({ task }) => (
    <Link to={`/casos/${task.caseId}`} className="block rounded-md p-2 transition-colors hover:bg-slate-100">
      <p className="text-sm font-medium text-slate-800 truncate">{task.description}</p>
      <p className="text-xs text-slate-500 truncate">{getCaseById(task.caseId)?.title}</p>
    </Link>
  );

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-sky-100 bg-sky-50/60 p-4">
        <p className="text-xs font-semibold uppercase text-sky-600">Carga de tarefas (próximos 7 dias)</p>
        <Sparkline data={sparklineData} color="#0284c7" />
      </div>
      <div className="space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-red-600">Hoje</h3>
          <div className="mt-2 space-y-2">
            {tasksToday.length > 0 ? (
              tasksToday.map(task => <TaskItem key={task.id} task={task} />)
            ) : (
              <p className="text-sm text-slate-400">Nenhuma tarefa para hoje.</p>
            )}
          </div>
        </div>
        <div className="border-t pt-4">
          <h3 className="text-sm font-semibold text-yellow-600">Amanhã</h3>
          <div className="mt-2 space-y-2">
            {tasksTomorrow.length > 0 ? (
              tasksTomorrow.map(task => <TaskItem key={task.id} task={task} />)
            ) : (
              <p className="text-sm text-slate-400">Nenhuma tarefa para amanhã.</p>
            )}
          </div>
        </div>
        <div className="border-t pt-4">
          <h3 className="text-sm font-semibold text-sky-600">Próximos 7 dias</h3>
          <div className="mt-2 space-y-2">
            {tasksNextWeek.length > 0 ? (
              tasksNextWeek.map(task => <TaskItem key={task.id} task={task} />)
            ) : (
              <p className="text-sm text-slate-400">Nenhuma tarefa para a próxima semana.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const FinancialSummaryTab: React.FC = () => {
  const { getGlobalFinancials, fees, expenses } = useFinancial();
  const { totalRecebido, totalPendente, totalDespesas } = useMemo(() => getGlobalFinancials(), [getGlobalFinancials]);

  const monthsRange = useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return Array.from({ length: 6 }).map((_, index) => {
      const date = new Date(now);
      date.setMonth(now.getMonth() - (5 - index), 1);
      return date;
    });
  }, []);

  const monthlyBalanceData = useMemo(() => {
    return monthsRange.map(monthDate => {
      const label = monthDate.toLocaleDateString('pt-BR', { month: 'short' });
      const month = monthDate.getMonth();
      const year = monthDate.getFullYear();

      const monthFees = fees
        .filter(fee => {
          const due = parseDate(fee.dueDate);
          return due.getMonth() === month && due.getFullYear() === year && fee.status === FeeStatus.PAGO;
        })
        .reduce((sum, fee) => sum + fee.amount, 0);

      const monthExpenses = expenses
        .filter(expense => {
          const expenseDate = parseDate(expense.date);
          return expenseDate.getMonth() === month && expenseDate.getFullYear() === year;
        })
        .reduce((sum, expense) => sum + expense.amount, 0);

      return {
        label,
        value: monthFees - monthExpenses,
      };
    });
  }, [expenses, fees, monthsRange]);

  const SummaryItem: React.FC<{ icon: React.ReactNode; label: string; value: string; tone: string }> = ({ icon, label, value, tone }) => (
    <div className="flex items-center gap-3 rounded-lg border border-slate-100 bg-white p-4 shadow-sm">
      <div className={`flex h-10 w-10 items-center justify-center rounded-full ${tone}`}>{icon}</div>
      <div>
        <p className="text-xs text-slate-500">{label}</p>
        <p className="text-base font-semibold text-slate-800">{value}</p>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-emerald-100 bg-emerald-50/60 p-4">
        <p className="text-xs font-semibold uppercase text-emerald-600">Balanço dos últimos 6 meses</p>
        <Sparkline data={monthlyBalanceData} color="#10b981" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <SummaryItem icon={<TrendingUp size={18} />} label="Total Recebido" value={formatCurrency(totalRecebido)} tone="bg-emerald-100 text-emerald-700" />
        <SummaryItem icon={<Clock size={18} />} label="Pendente de Recebimento" value={formatCurrency(totalPendente)} tone="bg-yellow-100 text-yellow-700" />
        <SummaryItem icon={<TrendingDown size={18} />} label="Total de Despesas" value={formatCurrency(totalDespesas)} tone="bg-rose-100 text-rose-700" />
        <SummaryItem
          icon={<Scale size={18} />}
          label="Balanço (Recebido - Despesas)"
          value={formatCurrency(totalRecebido - totalDespesas)}
          tone="bg-sky-100 text-sky-700"
        />
      </div>
    </div>
  );
};

const RecentActivityTab: React.FC = () => {
  const { cases } = useCases();
  const { clients, getClientById } = useClients();

  type ActivityItem = { type: 'case' | 'client'; date: Date; data: Case | Client };

  const activityFeed = useMemo(() => {
    const caseActivities: ActivityItem[] = cases.map(c => ({ type: 'case', date: parseDate(c.lastUpdate), data: c }));
    const clientActivities: ActivityItem[] = clients.map(client => ({ type: 'client', date: new Date(client.createdAt), data: client }));

    return [...caseActivities, ...clientActivities]
      .sort((a, b) => b.date.getTime() - a.date.getTime())
      .slice(0, 7);
  }, [cases, clients]);

  const activitySparklineData = useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return Array.from({ length: 10 }).map((_, index) => {
      const day = new Date(now);
      day.setDate(now.getDate() - (9 - index));
      const value = activityFeed.filter(item => item.date.toDateString() === day.toDateString()).length;
      return {
        label: day.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }),
        value,
      };
    });
  }, [activityFeed]);

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-indigo-100 bg-indigo-50/60 p-4">
        <p className="text-xs font-semibold uppercase text-indigo-600">Movimentações nos últimos 10 dias</p>
        <Sparkline data={activitySparklineData} color="#6366f1" />
      </div>
      <div className="space-y-4">
        {activityFeed.map((item, index) => (
          <div key={index} className="flex items-start gap-4 rounded-lg border border-slate-100 bg-white p-4 shadow-sm">
            <div className={`flex h-10 w-10 items-center justify-center rounded-full ${item.type === 'case' ? 'bg-sky-100 text-sky-600' : 'bg-emerald-100 text-emerald-600'}`}>
              {item.type === 'case' ? <Briefcase size={18} /> : <User size={18} />}
            </div>
            <div className="flex-1">
              <p className="text-sm text-slate-800">
                {item.type === 'case' ? (
                  <>
                    Caso{' '}
                    <Link to={`/casos/${item.data.id}`} className="font-semibold text-sky-600 hover:underline">
                      {(item.data as Case).title}
                    </Link>{' '}
                    atualizado. Cliente: {getClientById((item.data as Case).clientId)?.name}
                  </>
                ) : (
                  <>
                    Novo cliente <span className="font-semibold text-emerald-600">{(item.data as Client).name}</span> cadastrado.
                  </>
                )}
              </p>
              <p className="text-xs text-slate-400">
                {item.date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const OperationalInsights: React.FC = () => {
  const [activeTab, setActiveTab] = useState('agenda');
  const { cases } = useCases();
  const { clients } = useClients();
  const { getGlobalFinancials } = useFinancial();

  const pendingTasks = useMemo(
    () => cases.flatMap(c => c.tasks).filter(task => !task.completed).length,
    [cases],
  );

  const financialSummary = useMemo(() => getGlobalFinancials(), [getGlobalFinancials]);

  const activityCount = useMemo(() => cases.length + clients.length, [cases, clients]);

  const tabs = useMemo(
    () => [
      { id: 'agenda', label: 'Minha Agenda', badge: pendingTasks },
      { id: 'finance', label: 'Resumo Financeiro', badge: formatCurrency(financialSummary.totalRecebido) },
      { id: 'activity', label: 'Atividade Recente', badge: activityCount },
    ],
    [activityCount, financialSummary.totalRecebido, pendingTasks],
  );

  return (
    <div>
      <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />
      {activeTab === 'agenda' && (
        <TabPanel id="agenda">
          <MyAgenda />
        </TabPanel>
      )}
      {activeTab === 'finance' && (
        <TabPanel id="finance">
          <FinancialSummaryTab />
        </TabPanel>
      )}
      {activeTab === 'activity' && (
        <TabPanel id="activity">
          <RecentActivityTab />
        </TabPanel>
      )}
    </div>
  );
};

interface MetricComputation {
  weeklyClients: { formattedValue: string; changeInfo: ChangeInfo };
  weeklyCases: { formattedValue: string; changeInfo: ChangeInfo };
  conversionRate: { formattedValue: string; changeInfo: ChangeInfo };
  activeCases: { formattedValue: string; changeInfo: ChangeInfo };
}

const computeDashboardMetricStats = (cases: Case[], clients: Client[]): MetricComputation => {
  const now = new Date();
  const startOfWeek = getStartOfWeek(now);
  const startOfLastWeek = new Date(startOfWeek);
  startOfLastWeek.setDate(startOfWeek.getDate() - 7);
  const endOfLastWeek = new Date(startOfWeek);
  endOfLastWeek.setDate(startOfWeek.getDate() - 1);

  const clientsThisWeek = clients.filter(client => parseDate(client.createdAt) >= startOfWeek).length;
  const clientsLastWeek = clients.filter(client => {
    const created = parseDate(client.createdAt);
    return created >= startOfLastWeek && created <= endOfLastWeek;
  }).length;

  const casesThisWeek = cases.filter(c => parseDate(c.startDate) >= startOfWeek).length;
  const casesLastWeek = cases.filter(c => {
    const startDate = parseDate(c.startDate);
    return startDate >= startOfLastWeek && startDate <= endOfLastWeek;
  }).length;

  const conversionCurrent = clientsThisWeek === 0 ? (casesThisWeek > 0 ? 100 : 0) : Math.min((casesThisWeek / clientsThisWeek) * 100, 100);
  const conversionPrevious = clientsLastWeek === 0 ? (casesLastWeek > 0 ? 100 : 0) : Math.min((casesLastWeek / clientsLastWeek) * 100, 100);

  const activeStatuses: CaseStatus[] = [
    'Aberto',
    'Em Andamento',
    'Pendente',
    'Análise Inicial',
    'Judicial',
    'Administrativo',
    'Em Exigência',
    'Fase Recursal',
  ];
  const activeCasesCurrent = cases.filter(c => activeStatuses.includes(c.status)).length;
  const activeCasesPrevious = cases.filter(c => activeStatuses.includes(c.status) && parseDate(c.startDate) < startOfWeek).length;

  return {
    weeklyClients: {
      formattedValue: clientsThisWeek.toLocaleString('pt-BR'),
      changeInfo: getPercentageChangeInfo(clientsThisWeek, clientsLastWeek),
    },
    weeklyCases: {
      formattedValue: casesThisWeek.toLocaleString('pt-BR'),
      changeInfo: getPercentageChangeInfo(casesThisWeek, casesLastWeek),
    },
    conversionRate: {
      formattedValue: `${conversionCurrent.toFixed(1)}%`,
      changeInfo: getPointDifferenceInfo(conversionCurrent, conversionPrevious),
    },
    activeCases: {
      formattedValue: activeCasesCurrent.toLocaleString('pt-BR'),
      changeInfo: getAbsoluteDifferenceInfo(activeCasesCurrent, activeCasesPrevious),
    },
  };
};
export default function Dashboard() {
  const { cases, saveCase, addTaskToCase } = useCases();
  const { clients, addClient } = useClients();
  const { addFee } = useFinancial();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const { dashboardWidgetOrder, hiddenDashboardWidgets, setDashboardWidgetOrder, setDashboardWidgetVisibility } = useSettings();

  const [clientModalOpen, setClientModalOpen] = useState(false);
  const [caseModalOpen, setCaseModalOpen] = useState(false);
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [feeModalOpen, setFeeModalOpen] = useState(false);
  const [isLayoutMenuOpen, setIsLayoutMenuOpen] = useState(false);

  const layoutMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isLayoutMenuOpen) {
      return;
    }
    const handleClickOutside = (event: MouseEvent) => {
      if (layoutMenuRef.current && !layoutMenuRef.current.contains(event.target as Node)) {
        setIsLayoutMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isLayoutMenuOpen]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const metricStats = useMemo(() => computeDashboardMetricStats(cases, clients), [cases, clients]);

  const metricsMap: Record<DashboardWidgetKey, DashboardMetric> = {
    weeklyClients: {
      id: 'weeklyClients',
      label: 'Novos clientes (7 dias)',
      value: metricStats.weeklyClients.formattedValue,
      changeLabel: metricStats.weeklyClients.changeInfo.label,
      changeValue: metricStats.weeklyClients.changeInfo.value,
      isPositive: metricStats.weeklyClients.changeInfo.positive,
      isNeutral: metricStats.weeklyClients.changeInfo.neutral,
      description: 'Clientes cadastrados na última semana em comparação com a semana anterior.',
      icon: <Users size={20} />,
      actionLabel: 'Adicionar cliente',
      onAction: () => setClientModalOpen(true),
    },
    weeklyCases: {
      id: 'weeklyCases',
      label: 'Casos iniciados (7 dias)',
      value: metricStats.weeklyCases.formattedValue,
      changeLabel: metricStats.weeklyCases.changeInfo.label,
      changeValue: metricStats.weeklyCases.changeInfo.value,
      isPositive: metricStats.weeklyCases.changeInfo.positive,
      isNeutral: metricStats.weeklyCases.changeInfo.neutral,
      description: 'Quantidade de novos casos abertos nesta semana.',
      icon: <Briefcase size={20} />,
      actionLabel: 'Cadastrar caso',
      onAction: () => setCaseModalOpen(true),
    },
    conversionRate: {
      id: 'conversionRate',
      label: 'Taxa de conversão semanal',
      value: metricStats.conversionRate.formattedValue,
      changeLabel: metricStats.conversionRate.changeInfo.label,
      changeValue: metricStats.conversionRate.changeInfo.value,
      isPositive: metricStats.conversionRate.changeInfo.positive,
      isNeutral: metricStats.conversionRate.changeInfo.neutral,
      description: 'Relação entre casos iniciados e novos clientes na semana.',
      icon: <Target size={20} />,
      actionLabel: 'Agendar tarefa de follow-up',
      onAction: () => setTaskModalOpen(true),
    },
    activeCases: {
      id: 'activeCases',
      label: 'Casos ativos',
      value: metricStats.activeCases.formattedValue,
      changeLabel: metricStats.activeCases.changeInfo.label,
      changeValue: metricStats.activeCases.changeInfo.value,
      isPositive: metricStats.activeCases.changeInfo.positive,
      isNeutral: metricStats.activeCases.changeInfo.neutral,
      description: 'Total de casos em andamento ou aguardando ações.',
      icon: <Activity size={20} />,
      actionLabel: 'Registrar honorário',
      onAction: () => setFeeModalOpen(true),
    },
  };

  const visibleMetricIds = useMemo(
    () => dashboardWidgetOrder.filter(id => !hiddenDashboardWidgets.includes(id)),
    [dashboardWidgetOrder, hiddenDashboardWidgets],
  );

  const visibleMetrics = useMemo(
    () =>
      visibleMetricIds
        .map(id => metricsMap[id])
        .filter((metric): metric is DashboardMetric => metric !== undefined),
    [metricsMap, visibleMetricIds],
  );

  const metricSettingsOptions = useMemo(
    () =>
      dashboardWidgetOrder
        .map(id => metricsMap[id])
        .filter((metric): metric is DashboardMetric => metric !== undefined),
    [dashboardWidgetOrder, metricsMap],
  );

  const handleMetricDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) {
        return;
      }
      const activeId = active.id as DashboardWidgetKey;
      const overId = over.id as DashboardWidgetKey;
      const oldIndex = dashboardWidgetOrder.indexOf(activeId);
      const newIndex = dashboardWidgetOrder.indexOf(overId);
      if (oldIndex === -1 || newIndex === -1) {
        return;
      }
      const reordered = arrayMove(dashboardWidgetOrder, oldIndex, newIndex);
      setDashboardWidgetOrder(reordered);
    },
    [dashboardWidgetOrder, setDashboardWidgetOrder],
  );

  const handleWidgetVisibilityChange = useCallback(
    (widgetId: DashboardWidgetKey, visible: boolean) => {
      setDashboardWidgetVisibility(widgetId, visible);
      if (visible && !dashboardWidgetOrder.includes(widgetId)) {
        setDashboardWidgetOrder([...dashboardWidgetOrder, widgetId]);
      }
    },
    [dashboardWidgetOrder, setDashboardWidgetOrder, setDashboardWidgetVisibility],
  );

  const handleSaveClient = async (clientData: Omit<Client, 'id' | 'createdAt'> | Client) => {
    try {
      await addClient(clientData as Omit<Client, 'id' | 'createdAt'>);
      addToast('Cliente adicionado com sucesso!', 'success');
      setClientModalOpen(false);
      navigate('/clientes');
    } catch (error) {
      addToast(getErrorMessage(error, 'Não foi possível adicionar o cliente. Tente novamente.'), 'error');
      throw error instanceof Error ? error : new Error('Não foi possível adicionar o cliente. Tente novamente.');
    }
  };

  const handleSaveCase = async (
    caseData: Omit<Case, 'id' | 'lastUpdate' | 'tasks' | 'aiSummary' | 'documents' | 'legalDocuments' | 'startDate'> | Case,
  ) => {
    try {
      await saveCase(caseData);
      addToast('Caso adicionado com sucesso!', 'success');
      setCaseModalOpen(false);
      navigate('/casos');
    } catch (error) {
      addToast(getErrorMessage(error, 'Não foi possível adicionar o caso. Tente novamente.'), 'error');
      throw error instanceof Error ? error : new Error('Não foi possível adicionar o caso. Tente novamente.');
    }
  };

  const handleSaveTask = async (taskData: Omit<Task, 'id' | 'completed' | 'caseId'>, caseId: string) => {
    try {
      await addTaskToCase(caseId, { ...taskData, completed: false });
      addToast('Tarefa adicionada com sucesso!', 'success');
      setTaskModalOpen(false);
    } catch (error) {
      addToast(getErrorMessage(error, 'Não foi possível adicionar a tarefa. Tente novamente.'), 'error');
      throw error instanceof Error ? error : new Error('Não foi possível adicionar a tarefa. Tente novamente.');
    }
  };

  const handleSaveFee = async (feeData: Omit<Fee, 'id'> | Omit<Expense, 'id'>) => {
    try {
      await addFee(feeData as Omit<Fee, 'id'>);
      addToast('Honorário adicionado com sucesso!', 'success');
      setFeeModalOpen(false);
    } catch (error) {
      addToast(getErrorMessage(error, 'Não foi possível adicionar o honorário. Tente novamente.'), 'error');
      throw error instanceof Error ? error : new Error('Não foi possível adicionar o honorário. Tente novamente.');
    }
  };

  return (
    <>
      <ClientFormModal isOpen={clientModalOpen} onClose={() => setClientModalOpen(false)} onSave={handleSaveClient} initialData={null} />
      <CaseFormModal isOpen={caseModalOpen} onClose={() => setCaseModalOpen(false)} onSave={handleSaveCase} initialData={null} />
      <TaskFormModal isOpen={taskModalOpen} onClose={() => setTaskModalOpen(false)} onSave={handleSaveTask} initialDate={new Date()} />
      <FinancialEntryModal isOpen={feeModalOpen} onClose={() => setFeeModalOpen(false)} onSave={handleSaveFee} initialData={null} entryType="fee" />

      <div className="space-y-8">
        <header>
          <h1 className="text-3xl font-bold text-slate-900">Olá, Dr. Usuário!</h1>
          <p className="text-slate-600 mt-1">Bem-vindo(a) de volta. Aqui está um resumo do seu escritório hoje.</p>
        </header>

        <section className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Indicadores principais</h2>
              <p className="text-sm text-slate-500">Acompanhe o desempenho semanal e ative os cards mais relevantes.</p>
            </div>
            <div ref={layoutMenuRef} className="relative">
              <button
                type="button"
                onClick={() => setIsLayoutMenuOpen(prev => !prev)}
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 transition-colors hover:border-sky-200 hover:text-sky-700"
              >
                <Settings2 size={16} /> Personalizar
              </button>
              {isLayoutMenuOpen && (
                <div className="absolute right-0 z-20 mt-2 w-64 rounded-2xl border border-slate-100 bg-white p-4 text-sm shadow-xl">
                  <p className="text-xs font-semibold uppercase text-slate-500">Cards visíveis</p>
                  <div className="mt-3 space-y-3">
                    {metricSettingsOptions.map(metric => (
                      <label key={metric.id} className="flex items-center justify-between gap-3 text-sm text-slate-600">
                        <span>{metric.label}</span>
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                          checked={!hiddenDashboardWidgets.includes(metric.id)}
                          onChange={event => handleWidgetVisibilityChange(metric.id, event.target.checked)}
                        />
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {visibleMetrics.length > 0 ? (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleMetricDragEnd}>
              <SortableContext items={visibleMetricIds}>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                  {visibleMetrics.map(metric => (
                    <SortableMetricCard key={metric.id} metric={metric} />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          ) : (
            <div className="rounded-lg border-2 border-dashed border-slate-200 p-6 text-center text-sm text-slate-400">
              Selecione pelo menos um card para exibir seus indicadores.
            </div>
          )}
        </section>

        <div className="grid grid-cols-1 gap-8 xl:grid-cols-[2fr,1fr]">
          <div className="space-y-8">
            <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
              <OperationalInsights />
            </div>
          </div>
          <aside className="xl:sticky xl:top-6">
            <LegalAssistant />
          </aside>
        </div>
      </div>
    </>
  );
}
