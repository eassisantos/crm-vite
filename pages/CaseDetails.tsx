
import React, { useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useCases } from '../context/CasesContext';
import { useClients } from '../context/ClientsContext';
import { Case, Client, SuggestedTask, CaseStatus, Fee, Expense, Task } from '../types';
import { ArrowLeft, User, Briefcase, Bot, Loader2, PlusCircle, Sparkles, AlertCircle, Clock, Gavel } from 'lucide-react';
import { generateCaseSummary, suggestTasksFromNotes, isGeminiAvailable } from '../services/geminiService';
import { renderSafeRichText } from '../utils/sanitize';
import DocumentManager from '../components/case/DocumentManager';
import LegalDocumentsManager from '../components/case/LegalDocumentsManager';
import { useToast } from '../context/ToastContext';
import TaskFormModal from '../components/tasks/TaskFormModal';
import CaseDetailTabs from '../components/case/CaseDetailTabs';
import CaseFinancials from '../components/case/CaseFinancials';

const getErrorMessage = (error: unknown, fallback: string) =>
  error instanceof Error && error.message ? error.message : fallback;

const DetailItem: React.FC<{ icon: React.ReactNode; label: string; value: React.ReactNode }> = ({ icon, label, value }) => (
  <div className="flex items-start">
    <div className="text-slate-500 mt-1">{icon}</div>
    <div className="ml-4">
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <div className="text-md text-slate-800">{value}</div>
    </div>
  </div>
);

const Spinner: React.FC = () => <Loader2 className="animate-spin" />;


const statusColors: Record<CaseStatus, string> = {
  'Aberto': 'bg-blue-100 text-blue-800',
  'Em Andamento': 'bg-yellow-100 text-yellow-800',
  'Pendente': 'bg-orange-100 text-orange-800',
  'Fechado': 'bg-green-100 text-green-800',
  'Arquivado': 'bg-slate-100 text-slate-800',
  'Análise Inicial': 'bg-cyan-100 text-cyan-800',
  'Judicial': 'bg-purple-100 text-purple-800',
  'Administrativo': 'bg-teal-100 text-teal-800',
  'Concedido': 'bg-emerald-100 text-emerald-800',
  'Negado': 'bg-red-100 text-red-800',
  'Em Exigência': 'bg-amber-100 text-amber-800',
  'Fase Recursal': 'bg-indigo-100 text-indigo-800',
  'Finalizado': 'bg-gray-100 text-gray-800',
};

const StatusBadge = ({ status }: { status: CaseStatus }) => (
  <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold ${statusColors[status] || 'bg-slate-100 text-slate-800'}`}>
    {status}
  </span>
);

interface Note {
  timestamp: string;
  content: string;
}

const parseNotes = (notes: string): Note[] => {
  if (!notes || !notes.trim()) return [];
  const entries = notes.split(/--- (.*?) ---/);
  const parsedNotes: Note[] = [];

  if (entries[0] && entries[0].trim()) {
    parsedNotes.push({ timestamp: 'Data inicial', content: entries[0].trim() });
  }

  for (let i = 1; i < entries.length; i += 2) {
    const timestamp = entries[i].trim();
    const content = entries[i + 1] ? entries[i + 1].trim() : '';
    if (content) {
      parsedNotes.push({ timestamp, content });
    }
  }
  return parsedNotes.reverse();
};

const NotesTimeline: React.FC<{ notes: string }> = ({ notes }) => {
  const parsedNotes = useMemo(() => parseNotes(notes), [notes]);

  if (parsedNotes.length === 0) {
    return <p className="text-slate-500 text-center py-4">Nenhuma nota adicionada.</p>;
  }

  return (
    <div className="space-y-4 max-h-96 overflow-y-auto p-1">
      {parsedNotes.map((note, index) => (
        <div key={index} className="p-4 bg-slate-50 rounded-lg border border-slate-200">
          <p className="text-xs font-semibold text-slate-500 mb-2 flex items-center"><Clock size={12} className="mr-1.5" />{note.timestamp}</p>
          <pre className="whitespace-pre-wrap font-sans text-sm text-slate-700">{note.content}</pre>
        </div>
      ))}
    </div>
  );
};

const CaseDetails: React.FC = () => {
  const { caseId } = useParams<{ caseId: string }>();
  const { getCaseById, saveCase, addTaskToCase, updateTask, cases } = useCases();
  const { getClientById } = useClients();
  const { addToast } = useToast();
  const isAIAvailable = isGeminiAvailable;
  
  const { caseData, client } = useMemo(() => {
    if (!caseId) return { caseData: null, client: null };
    const foundCase = getCaseById(caseId);
    if (!foundCase) return { caseData: null, client: null };
    const foundClient = getClientById(foundCase.clientId);
    return { caseData: foundCase, client: foundClient || null };
  }, [caseId, getCaseById, getClientById, cases]);

  const [activeTab, setActiveTab] = useState<'overview' | 'progress' | 'documents' | 'financials'>('overview');
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [isSuggestingTasks, setIsSuggestingTasks] = useState(false);
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [suggestedTasks, setSuggestedTasks] = useState<SuggestedTask[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [newNote, setNewNote] = useState('');

  const handleGenerateSummary = async () => {
    if (!caseData || !client) return;
    if (!isAIAvailable) {
      const message =
        'Resumo automatizado indisponível. Defina VITE_API_BASE_URL apontando para o Worker para ativar a IA.';
      setError(message);
      addToast(message, 'warning');
      return;
    }
    setIsGeneratingSummary(true);
    setError(null);
    try {
      const summary = await generateCaseSummary(caseData, client);
      await saveCase({ ...caseData, aiSummary: summary, lastUpdate: new Date().toISOString().split('T')[0] });
      addToast('Resumo gerado com sucesso!', 'success');
    } catch (e: any) {
      const message = getErrorMessage(e, 'Não foi possível gerar o resumo do caso. Tente novamente.');
      setError(message);
      addToast(message, 'error');
    } finally {
      setIsGeneratingSummary(false);
    }
  };

  const handleSuggestTasks = async () => {
    if (!caseData?.notes) return;
    if (!isAIAvailable) {
      const message =
        'Sugestões de tarefas indisponíveis. Defina VITE_API_BASE_URL apontando para o Worker para ativar a IA.';
      setError(message);
      addToast(message, 'warning');
      return;
    }
    setIsSuggestingTasks(true);
    setError(null);
    setSuggestedTasks([]);
    try {
      const suggestionsString = await suggestTasksFromNotes(caseData.notes);
      const suggestions: SuggestedTask[] = JSON.parse(suggestionsString);
      setSuggestedTasks(suggestions);
      addToast(`${suggestions.length} tarefa(s) sugerida(s) pela IA.`, 'info');
    } catch (e: any) {
      setError(e.message || 'Falha ao sugerir tarefas.');
      addToast(e.message || 'Falha ao sugerir tarefas.', 'error');
    } finally {
      setIsSuggestingTasks(false);
    }
  };

  const handleAddSuggestedTask = async (suggestedTask: SuggestedTask) => {
    if (!caseData) return;
    try {
      await addTaskToCase(caseData.id, {
        description: suggestedTask.description,
        dueDate: suggestedTask.dueDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        completed: false,
      });
      setSuggestedTasks(prev => prev.filter(t => t.description !== suggestedTask.description));
      addToast('Tarefa sugerida adicionada!', 'success');
    } catch (error) {
      addToast(getErrorMessage(error, 'Não foi possível adicionar a tarefa sugerida. Tente novamente.'), 'error');
    }
  };

  const handleToggleTask = async (taskId: string) => {
    if (!caseData) return;
    const task = caseData.tasks.find(t => t.id === taskId);
    if (task) {
      try {
        await updateTask({ ...task, completed: !task.completed });
        addToast(`Tarefa ${task.completed ? 'marcada como pendente' : 'concluída'}!`, 'success');
      } catch (error) {
        addToast(getErrorMessage(error, 'Não foi possível atualizar a tarefa. Tente novamente.'), 'error');
      }
    }
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!caseData || !newNote.trim()) return;
    setIsAddingNote(true);
    const timestamp = new Date().toLocaleString('pt-BR');
    const updatedNotes = `${caseData.notes}\n\n--- ${timestamp} ---\n${newNote}`;
    try {
      await saveCase({ ...caseData, notes: updatedNotes.trim(), lastUpdate: new Date().toISOString().split('T')[0] });
      addToast('Nova nota adicionada com sucesso!', 'success');
      setNewNote('');
    } catch (error) {
      addToast(getErrorMessage(error, 'Não foi possível adicionar a nova nota. Tente novamente.'), 'error');
    } finally {
      setIsAddingNote(false);
    }
  };

  const handleSaveTask = async (taskData: Omit<Task, 'id' | 'completed' | 'caseId'>, targetCaseId: string) => {
    try {
      await addTaskToCase(targetCaseId, { ...taskData, completed: false });
      addToast('Nova tarefa adicionada com sucesso!', 'success');
    } catch (error) {
      addToast(getErrorMessage(error, 'Não foi possível adicionar a nova tarefa. Tente novamente.'), 'error');
      throw error instanceof Error ? error : new Error('Não foi possível adicionar a nova tarefa. Tente novamente.');
    }
  };

  if (!caseData || !client) {
    return <div className="text-center py-10"><h2 className="text-xl font-semibold">Caso não encontrado</h2><p className="text-slate-500">O caso que você está procurando não existe ou foi removido.</p></div>;
  }

  return (
    <>
      <TaskFormModal isOpen={isTaskModalOpen} onClose={() => setIsTaskModalOpen(false)} onSave={handleSaveTask} initialDate={new Date()} preselectedCaseId={caseData.id} />
      <div className="space-y-6">
        <Link to="/casos" className="flex items-center text-sky-600 hover:underline font-medium"><ArrowLeft size={18} className="mr-2" />Voltar para Casos</Link>
        <header className="pb-4 border-b border-slate-200">
            <div className="flex flex-col md:flex-row justify-between md:items-center gap-2">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">{caseData.benefitType}: {caseData.title}</h1>
                    <p className="text-slate-600 mt-1">{caseData.caseNumber}</p>
                </div>
                <StatusBadge status={caseData.status} />
            </div>
        </header>
        {error && <div className="my-4 p-4 bg-red-100 text-red-800 border border-red-200 rounded-lg">{error}</div>}
        {!isAIAvailable && (
          <div className="my-4 flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            <Sparkles size={18} className="mt-0.5 text-amber-600" />
            <p>
              Os recursos de IA estão desativados porque a variável de ambiente <strong>VITE_API_BASE_URL</strong> não foi
              definida. Entre em contato com o administrador para habilitar os recursos automáticos.
            </p>
          </div>
        )}
        
        {suggestedTasks.length > 0 && (<div className="bg-sky-50 p-6 rounded-xl shadow-md border border-sky-200"><h2 className="text-xl font-bold text-sky-800 mb-4 flex items-center"><Sparkles size={22} className="mr-2"/> Tarefas Sugeridas pela IA</h2><ul className="space-y-3">{suggestedTasks.map((task, index) => (<li key={index} className="p-3 bg-white rounded-lg shadow-sm flex items-center justify-between"><div><p className="font-medium text-slate-800">{task.description}</p><p className="text-xs text-slate-500 mt-1"><strong>Justificativa:</strong> {task.reasoning}</p></div><button onClick={() => handleAddSuggestedTask(task)} className="ml-4 flex-shrink-0 flex items-center bg-emerald-500 text-white px-3 py-1 rounded-lg shadow-sm hover:bg-emerald-600"><PlusCircle size={16} className="mr-1.5"/> Adicionar</button></li>))}</ul></div>)}

        <CaseDetailTabs activeTab={activeTab} setActiveTab={setActiveTab} />

        <div className="bg-white p-6 rounded-b-xl shadow-sm">
            {activeTab === 'overview' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 space-y-6">
                        <div className="flex justify-between items-center">
                            <h2 className="text-xl font-bold text-slate-800 flex items-center"><Bot size={24} className="mr-2 text-sky-600"/> Resumo com IA</h2>
                            <button onClick={handleGenerateSummary} disabled={isGeneratingSummary || !isAIAvailable} className="flex items-center bg-sky-600 text-white px-4 py-2 rounded-lg shadow-md hover:bg-sky-700 transition-colors disabled:bg-slate-400 disabled:cursor-not-allowed">{isGeneratingSummary ? <Spinner /> : <Sparkles size={20} />}<span className="ml-2">{isGeneratingSummary ? 'Gerando...' : 'Gerar Resumo'}</span></button>
                        </div>
                        {caseData.aiSummary ? <div className="prose prose-slate max-w-none p-4 bg-slate-50 rounded-lg border" dangerouslySetInnerHTML={{ __html: renderSafeRichText(caseData.aiSummary) }} /> : <div className="text-center py-8 text-slate-500"><p>Clique para criar um resumo do caso usando IA.</p></div>}
                    </div>
                    <div className="space-y-4 bg-slate-50 p-6 rounded-lg border">
                        <h2 className="text-xl font-bold text-slate-800">Informações Gerais</h2>
                        <DetailItem icon={<User size={20} />} label="Cliente" value={client.name} />
                        <DetailItem icon={<Gavel size={20} />} label="Natureza" value={caseData.nature} />
                        <DetailItem icon={<Briefcase size={20} />} label="Tipo de Ação" value={caseData.benefitType} />
                        <DetailItem icon={<AlertCircle size={20} />} label="Status" value={<StatusBadge status={caseData.status} />} />
                    </div>
                </div>
            )}

            {activeTab === 'progress' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div>
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold text-slate-800">Notas / Andamentos</h2>
                            <button onClick={handleSuggestTasks} disabled={isSuggestingTasks || !caseData.notes || !isAIAvailable} className="flex items-center text-xs bg-sky-100 text-sky-700 px-2 py-1 rounded-lg hover:bg-sky-200 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed">{isSuggestingTasks ? <Spinner /> : <Sparkles size={14} />}<span className="ml-1.5">Sugerir Tarefas</span></button>
                        </div>
                        <NotesTimeline notes={caseData.notes} />
                        <form onSubmit={handleAddNote} className="mt-4">
                            <textarea value={newNote} onChange={e => setNewNote(e.target.value)} placeholder="Registre um andamento, uma conversa com o cliente, ou uma observação sobre o caso..." rows={3} className="w-full border-slate-300 rounded-md shadow-sm text-sm focus:ring-sky-500 focus:border-sky-500"></textarea>
                            <button type="submit" disabled={!newNote.trim() || isAddingNote} className="mt-2 w-full flex justify-center items-center p-2 bg-sky-600 text-white rounded-md hover:bg-sky-700 disabled:bg-slate-400 disabled:cursor-not-allowed">{isAddingNote ? <Spinner/> : <PlusCircle size={16} className="mr-2"/>}Adicionar Nota</button>
                        </form>
                    </div>
                    <div>
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold text-slate-800">Tarefas</h2>
                            <button onClick={() => setIsTaskModalOpen(true)} className="flex items-center text-xs bg-sky-100 text-sky-700 px-2 py-1 rounded-lg hover:bg-sky-200"><PlusCircle size={14} className="mr-1.5" />Adicionar Tarefa</button>
                        </div>
                        <ul className="space-y-3 max-h-[60vh] overflow-y-auto">{caseData.tasks.length > 0 ? caseData.tasks.map(task => (<li key={task.id} className="flex items-center"><input type="checkbox" id={`task-${task.id}`} checked={task.completed} onChange={() => handleToggleTask(task.id)} className="h-4 w-4 text-sky-600 border-gray-300 rounded focus:ring-sky-500 cursor-pointer" /><label htmlFor={`task-${task.id}`} className={`ml-3 cursor-pointer ${task.completed ? 'line-through text-slate-500' : 'text-slate-800'}`}>{task.description}</label><span className="ml-auto text-sm text-slate-400">{new Date(task.dueDate+'T00:00:00').toLocaleDateString('pt-BR')}</span></li>)) : <p className="text-slate-500 text-center py-4">Nenhuma tarefa para este caso.</p>}</ul>
                    </div>
                </div>
            )}

            {activeTab === 'documents' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <LegalDocumentsManager caseData={caseData} />
                    <DocumentManager caseData={caseData} clientBenefitType={caseData.benefitType} />
                </div>
            )}

            {activeTab === 'financials' && (
                <CaseFinancials caseData={caseData} />
            )}
        </div>
      </div>
    </>
  );
};

export default CaseDetails;
