
import React, { useState, useMemo } from 'react';
import { useCases } from '../context/CasesContext';
import { useClients } from '../context/ClientsContext';
import { useFinancial } from '../context/FinancialContext';
import { Task, Case, Client, Fee, Expense } from '../types';
import { Link, useNavigate } from 'react-router-dom';
import { UserPlus, Briefcase, PlusCircle, DollarSign, CalendarClock, Check, Clock, User, TrendingUp, TrendingDown, Scale } from 'lucide-react';
import LegalAssistant from '../components/ai/LegalAssistant';
import ClientFormModal from '../components/client/ClientFormModal';
import CaseFormModal from '../components/case/CaseFormModal';
import TaskFormModal from '../components/tasks/TaskFormModal';
import FinancialEntryModal from '../components/financials/FinancialEntryModal';
import { useToast } from '../context/ToastContext';

const formatCurrency = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

const getErrorMessage = (error: unknown, fallback: string) =>
  error instanceof Error && error.message ? error.message : fallback;

const QuickAccessButton: React.FC<{ icon: React.ReactNode; label: string; onClick: () => void; }> = ({ icon, label, onClick }) => (
  <button onClick={onClick} className="flex flex-col items-center justify-center gap-2 p-4 bg-white rounded-xl shadow-sm text-slate-700 hover:bg-sky-50 hover:text-sky-600 transition-all duration-200 hover:shadow-md">
    <div className="p-3 bg-slate-100 rounded-full">{icon}</div>
    <span className="text-sm font-semibold">{label}</span>
  </button>
);

const MyAgenda: React.FC = () => {
  const { cases, getCaseById } = useCases();
  const allTasks = useMemo(() => cases.flatMap(c => c.tasks).filter(t => !t.completed), [cases]);

  const today = new Date(); today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
  const nextWeek = new Date(today); nextWeek.setDate(today.getDate() + 7);

  const isSameDay = (d1: Date, d2: Date) => d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth() && d1.getDate() === d2.getDate();

  const tasksToday = allTasks.filter(t => isSameDay(new Date(t.dueDate + 'T00:00:00'), today));
  const tasksTomorrow = allTasks.filter(t => isSameDay(new Date(t.dueDate + 'T00:00:00'), tomorrow));
  const tasksNextWeek = allTasks.filter(t => {
    const dueDate = new Date(t.dueDate + 'T00:00:00');
    return dueDate > tomorrow && dueDate <= nextWeek;
  });

  const TaskItem: React.FC<{ task: Task }> = ({ task }) => (
    <Link to={`/casos/${task.caseId}`} className="block p-2 rounded-md hover:bg-slate-100">
      <p className="text-sm font-medium text-slate-800 truncate">{task.description}</p>
      <p className="text-xs text-slate-500 truncate">{getCaseById(task.caseId)?.title}</p>
    </Link>
  );

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm">
      <h2 className="text-xl font-bold text-slate-800 mb-4">Minha Agenda</h2>
      <div className="space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-red-600 mb-2">Hoje</h3>
          {tasksToday.length > 0 ? tasksToday.map(t => <TaskItem key={t.id} task={t} />) : <p className="text-sm text-slate-400">Nenhuma tarefa para hoje.</p>}
        </div>
        <div className="border-t pt-4">
          <h3 className="text-sm font-semibold text-yellow-600 mb-2">Amanhã</h3>
          {tasksTomorrow.length > 0 ? tasksTomorrow.map(t => <TaskItem key={t.id} task={t} />) : <p className="text-sm text-slate-400">Nenhuma tarefa para amanhã.</p>}
        </div>
        <div className="border-t pt-4">
          <h3 className="text-sm font-semibold text-sky-600 mb-2">Próximos 7 dias</h3>
          {tasksNextWeek.length > 0 ? tasksNextWeek.map(t => <TaskItem key={t.id} task={t} />) : <p className="text-sm text-slate-400">Nenhuma tarefa para a próxima semana.</p>}
        </div>
      </div>
    </div>
  );
};

const FinancialSummary: React.FC = () => {
  const { getGlobalFinancials } = useFinancial();
  const { totalRecebido, totalPendente, totalDespesas } = getGlobalFinancials();

  const SummaryItem: React.FC<{ icon: React.ReactNode; label: string; value: string; color: string }> = ({ icon, label, value, color }) => (
    <div className="flex items-center">
      <div className={`p-2 rounded-full mr-3 ${color}`}>{icon}</div>
      <div>
        <p className="text-sm text-slate-500">{label}</p>
        <p className="font-bold text-slate-800">{value}</p>
      </div>
    </div>
  );

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm">
      <h2 className="text-xl font-bold text-slate-800 mb-4">Resumo Financeiro</h2>
      <div className="space-y-4">
        <SummaryItem icon={<TrendingUp size={18} />} label="Total Recebido" value={formatCurrency(totalRecebido)} color="bg-emerald-100 text-emerald-700" />
        <SummaryItem icon={<Clock size={18} />} label="Pendente de Recebimento" value={formatCurrency(totalPendente)} color="bg-yellow-100 text-yellow-700" />
        <SummaryItem icon={<TrendingDown size={18} />} label="Total de Despesas" value={formatCurrency(totalDespesas)} color="bg-red-100 text-red-700" />
        <div className="border-t pt-4">
          <SummaryItem icon={<Scale size={18} />} label="Balanço (Recebido - Despesas)" value={formatCurrency(totalRecebido - totalDespesas)} color="bg-sky-100 text-sky-700" />
        </div>
      </div>
    </div>
  );
};

const RecentActivity: React.FC = () => {
  const { cases } = useCases();
  const { clients, getClientById } = useClients();
  const navigate = useNavigate();

  type ActivityItem = { type: 'case' | 'client', date: Date, data: Case | Client };

  const activityFeed = useMemo(() => {
    const caseActivities: ActivityItem[] = cases.map(c => ({ type: 'case', date: new Date(c.lastUpdate + 'T00:00:00'), data: c }));
    const clientActivities: ActivityItem[] = clients.map(cl => ({ type: 'client', date: new Date(cl.createdAt), data: cl }));
    
    return [...caseActivities, ...clientActivities]
      .sort((a, b) => b.date.getTime() - a.date.getTime())
      .slice(0, 7);
  }, [cases, clients]);

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm">
      <h2 className="text-xl font-bold text-slate-800 mb-4">Atividade Recente</h2>
      <div className="space-y-4">
        {activityFeed.map((item, index) => (
          <div key={index} className="flex items-start gap-4">
            <div className={`mt-1 p-2 rounded-full ${item.type === 'case' ? 'bg-sky-100 text-sky-600' : 'bg-emerald-100 text-emerald-600'}`}>
              {item.type === 'case' ? <Briefcase size={16} /> : <User size={16} />}
            </div>
            <div className="flex-1">
              <p className="text-sm text-slate-800">
                {item.type === 'case' ? (
                  <>
                    Caso <Link to={`/casos/${item.data.id}`} className="font-semibold text-sky-600 hover:underline">{(item.data as Case).title}</Link> atualizado.
                    <span className="text-slate-500"> Cliente: {getClientById((item.data as Case).clientId)?.name}</span>
                  </>
                ) : (
                  <>
                    Novo cliente <span className="font-semibold text-emerald-600">{(item.data as Client).name}</span> cadastrado.
                  </>
                )}
              </p>
              <p className="text-xs text-slate-400">{item.date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default function Dashboard() {
  const { addClient } = useClients();
  const { saveCase, addTaskToCase } = useCases();
  const { addFee } = useFinancial();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const [clientModalOpen, setClientModalOpen] = useState(false);
  const [caseModalOpen, setCaseModalOpen] = useState(false);
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [feeModalOpen, setFeeModalOpen] = useState(false);

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

  const handleSaveCase = async (caseData: Omit<Case, 'id' | 'lastUpdate' | 'tasks' | 'aiSummary' | 'documents' | 'legalDocuments' | 'startDate'> | Case) => {
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

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <QuickAccessButton icon={<UserPlus size={20} />} label="Novo Cliente" onClick={() => setClientModalOpen(true)} />
          <QuickAccessButton icon={<Briefcase size={20} />} label="Novo Caso" onClick={() => setCaseModalOpen(true)} />
          <QuickAccessButton icon={<PlusCircle size={20} />} label="Nova Tarefa" onClick={() => setTaskModalOpen(true)} />
          <QuickAccessButton icon={<DollarSign size={20} />} label="Novo Honorário" onClick={() => setFeeModalOpen(true)} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          <div className="lg:col-span-2 space-y-8">
            <RecentActivity />
            <LegalAssistant />
          </div>
          <div className="space-y-8 lg:sticky lg:top-8">
            <MyAgenda />
            <FinancialSummary />
          </div>
        </div>
      </div>
    </>
  );
}
