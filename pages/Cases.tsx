
import React, { useState, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Case, CaseStatus, Client } from '../types';
import { Plus, Search, ChevronDown, Edit, XCircle, Scale, Gavel, LayoutGrid, List } from 'lucide-react';
import { useCrmData } from '../context/CrmContext';
import { useToast } from '../context/ToastContext';
import CaseFormModal from '../components/case/CaseFormModal';
import CaseKanbanView from '../components/case/CaseKanbanView';

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
  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColors[status] || 'bg-gray-100 text-gray-800'}`}>
    {status}
  </span>
);

const NatureBadge: React.FC<{ nature: 'Judicial' | 'Administrativo' }> = ({ nature }) => {
    const isJudicial = nature === 'Judicial';
    const color = isJudicial ? 'bg-purple-100 text-purple-800' : 'bg-teal-100 text-teal-800';
    const icon = isJudicial ? <Gavel size={12} className="mr-1" /> : <Scale size={12} className="mr-1" />;
    return (
        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${color}`}>
            {icon}
            {nature}
        </span>
    );
};

export default function Cases() {
  const { cases, getClientById, saveCase } = useCrmData();
  const { addToast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCase, setEditingCase] = useState<Case | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [natureFilter, setNatureFilter] = useState<'all' | 'Judicial' | 'Administrativo'>('all');
  const [viewMode, setViewMode] = useState<'table' | 'kanban'>('table');

  const clientIdFilter = searchParams.get('clientId');

  const filteredCases = useMemo(() => {
    let tempCases = cases;

    if (clientIdFilter) {
      tempCases = tempCases.filter(c => c.clientId === clientIdFilter);
    }
    
    if (natureFilter !== 'all') {
        tempCases = tempCases.filter(c => c.nature === natureFilter);
    }

    if (searchTerm) {
      const lowercasedFilter = searchTerm.toLowerCase();
      tempCases = tempCases.filter(c => {
        const client = getClientById(c.clientId);
        return (
          c.title.toLowerCase().includes(lowercasedFilter) ||
          (c.caseNumber && c.caseNumber.toLowerCase().includes(lowercasedFilter)) ||
          (client && client.name.toLowerCase().includes(lowercasedFilter))
        );
      });
    }
    return tempCases;
  }, [cases, searchTerm, clientIdFilter, natureFilter, getClientById]);
  
  const clientFilterName = useMemo(() => {
    if (!clientIdFilter) return null;
    return getClientById(clientIdFilter)?.name;
  }, [clientIdFilter, getClientById]);

  const handleOpenModal = (caseData: Case | null = null) => {
    setEditingCase(caseData);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingCase(null);
  };

  const handleSaveCase = async (caseData: Omit<Case, 'id' | 'lastUpdate' | 'tasks' | 'aiSummary' | 'documents' | 'legalDocuments' | 'startDate'> | Case) => {
    await saveCase(caseData as Case);
    addToast(`Caso "${caseData.title}" salvo com sucesso!`, 'success');
    handleCloseModal();
  };

  return (
    <>
      <CaseFormModal 
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSave={handleSaveCase}
        initialData={editingCase}
        preselectedClientId={clientIdFilter || undefined}
      />
      <div className="space-y-6 h-full flex flex-col">
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <h1 className="text-3xl font-bold text-slate-800">Gestão de Casos</h1>
          <button 
            onClick={() => handleOpenModal()}
            className="inline-flex items-center justify-center rounded-md bg-sky-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2">
            <Plus className="-ml-1 mr-2 h-5 w-5" />
            Novo Caso
          </button>
        </div>

        {clientFilterName && (
            <div className="flex items-center bg-sky-100 text-sky-800 text-sm font-medium px-4 py-2 rounded-md">
                <span>Filtrando casos para: <strong>{clientFilterName}</strong></span>
                <button onClick={() => setSearchParams({})} className="ml-auto p-1 rounded-full hover:bg-sky-200"><XCircle size={18} /></button>
            </div>
        )}

        <div className="rounded-xl bg-white shadow-sm flex-1 flex flex-col">
          <div className="border-b p-4 flex flex-col sm:flex-row gap-4 justify-between items-center">
            <div className="relative w-full sm:w-auto">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar por número, título ou cliente..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full rounded-lg border-slate-300 bg-slate-50 py-2 pl-10 pr-4 text-sm focus:border-sky-500 focus:ring-sky-500 sm:w-72"
              />
            </div>
            <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 p-1 bg-slate-100 rounded-lg">
                    <button onClick={() => setNatureFilter('all')} className={`px-3 py-1 text-sm font-medium rounded-md ${natureFilter === 'all' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:bg-slate-200'}`}>Todos</button>
                    <button onClick={() => setNatureFilter('Judicial')} className={`px-3 py-1 text-sm font-medium rounded-md ${natureFilter === 'Judicial' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:bg-slate-200'}`}>Judiciais</button>
                    <button onClick={() => setNatureFilter('Administrativo')} className={`px-3 py-1 text-sm font-medium rounded-md ${natureFilter === 'Administrativo' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:bg-slate-200'}`}>Administrativos</button>
                </div>
                <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
                    <button onClick={() => setViewMode('table')} className={`p-2 rounded-md ${viewMode === 'table' ? 'bg-white shadow-sm text-sky-600' : 'text-slate-500 hover:bg-slate-200'}`}><List size={18} /></button>
                    <button onClick={() => setViewMode('kanban')} className={`p-2 rounded-md ${viewMode === 'kanban' ? 'bg-white shadow-sm text-sky-600' : 'text-slate-500 hover:bg-slate-200'}`}><LayoutGrid size={18} /></button>
                </div>
            </div>
          </div>
          
          {viewMode === 'table' ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    {['Nº do Processo', 'Título', 'Cliente', 'Natureza', 'Status', 'Última Atualização'].map(header => (
                      <th key={header} scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                        <div className="flex items-center gap-1">
                          {header} <ChevronDown className="h-4 w-4" />
                        </div>
                      </th>
                    ))}
                    <th scope="col" className="relative px-6 py-3">
                      <span className="sr-only">Ações</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {filteredCases.map((c) => {
                    const client = getClientById(c.clientId);
                    return (
                      <tr key={c.id} className="hover:bg-slate-50">
                        <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-slate-900">
                          <Link to={`/casos/${c.id}`} className="text-sky-600 hover:text-sky-900">
                            {c.caseNumber || '-'}
                          </Link>
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-600">{c.title}</td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-600">{client?.name || 'N/A'}</td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm"><NatureBadge nature={c.nature} /></td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm">
                          <StatusBadge status={c.status} />
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-600">{new Date(c.lastUpdate + 'T00:00:00').toLocaleDateString('pt-BR')}</td>
                        <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium space-x-4">
                          <Link to={`/casos/${c.id}`} className="text-sky-600 hover:text-sky-900">Detalhes</Link>
                          <button onClick={() => handleOpenModal(c)} className="text-slate-500 hover:text-sky-700">
                            <Edit size={16} />
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex-1 overflow-hidden p-4">
                <CaseKanbanView cases={filteredCases} />
            </div>
          )}

           {filteredCases.length === 0 && (
            <div className="text-center py-12 px-4 flex-1 flex flex-col justify-center items-center">
              <Search className="mx-auto h-12 w-12 text-slate-400" />
              <h3 className="mt-2 text-sm font-medium text-slate-900">Nenhum caso encontrado</h3>
              <p className="mt-1 text-sm text-slate-500">Tente ajustar sua busca ou filtro.</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
