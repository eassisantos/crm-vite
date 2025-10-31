
import React, { useState, useMemo } from 'react';
import { useCrmData } from '../context/CrmContext';
import { PlusCircle, Edit, Trash2, Briefcase, Search, UserPlus } from 'lucide-react';
import ClientFormModal from '../components/client/ClientFormModal';
import CaseFormModal from '../components/case/CaseFormModal';
import { Client, Case } from '../types';
import { useToast } from '../context/ToastContext';
import { Link } from 'react-router-dom';
import ConfirmationModal from '../components/common/ConfirmationModal';

export default function Clients() {
  const { clients, cases, addClient, updateClient, deleteClient, saveCase } = useCrmData();
  const { addToast } = useToast();
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [clientToDelete, setClientToDelete] = useState<Client | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [isCaseModalOpen, setIsCaseModalOpen] = useState(false);
  const [selectedClientForNewCase, setSelectedClientForNewCase] = useState<string | null>(null);

  const clientCaseCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    cases.forEach(c => {
        if (c.status !== 'Finalizado' && c.status !== 'Concedido' && c.status !== 'Fechado' && c.status !== 'Arquivado') {
            counts[c.clientId] = (counts[c.clientId] || 0) + 1;
        }
    });
    return counts;
  }, [cases]);

  const filteredClients = useMemo(() => {
    if (!searchTerm) return clients;
    const lowercasedFilter = searchTerm.toLowerCase();
    return clients.filter(client => 
        client.name.toLowerCase().includes(lowercasedFilter) ||
        client.cpf.toLowerCase().includes(lowercasedFilter)
    );
  }, [clients, searchTerm]);

  const handleOpenModalForAdd = () => {
    setEditingClient(null);
    setIsFormModalOpen(true);
  };

  const handleOpenModalForEdit = (client: Client) => {
    setEditingClient(client);
    setIsFormModalOpen(true);
  };

  const handleCloseFormModal = () => {
    setIsFormModalOpen(false);
    setEditingClient(null);
  };

  const handleSaveClient = (clientData: Omit<Client, 'id' | 'createdAt'> | Client) => {
    if ('id' in clientData) {
      updateClient(clientData);
      addToast('Cliente atualizado com sucesso!', 'success');
    } else {
      addClient(clientData);
      addToast('Cliente adicionado com sucesso!', 'success');
    }
    handleCloseFormModal();
  };

  const handleDeleteRequest = (client: Client) => {
    setClientToDelete(client);
    setIsConfirmModalOpen(true);
  };

  const confirmDeleteClient = () => {
    if (clientToDelete) {
        deleteClient(clientToDelete.id);
        addToast('Cliente excluído com sucesso.', 'info');
        setClientToDelete(null);
    }
  };

  const handleNewCaseForClient = (client: Client) => {
    setSelectedClientForNewCase(client.id);
    setIsCaseModalOpen(true);
  };

  const handleCloseCaseModal = () => {
    setIsCaseModalOpen(false);
    setSelectedClientForNewCase(null);
  };

  const handleSaveCase = async (caseData: Omit<Case, 'id' | 'lastUpdate' | 'tasks' | 'aiSummary' | 'documents' | 'legalDocuments' | 'startDate'> | Case) => {
    await saveCase(caseData as Case);
    const clientName = clients.find(c => c.id === (caseData as any).clientId)?.name;
    addToast(`Novo caso para ${clientName || 'cliente'} criado com sucesso!`, 'success');
    handleCloseCaseModal();
  };

  return (
    <>
      <ClientFormModal
        isOpen={isFormModalOpen}
        onClose={handleCloseFormModal}
        onSave={handleSaveClient}
        initialData={editingClient}
      />
      <CaseFormModal
        isOpen={isCaseModalOpen}
        onClose={handleCloseCaseModal}
        onSave={handleSaveCase}
        initialData={null}
        preselectedClientId={selectedClientForNewCase || undefined}
      />
      <ConfirmationModal
        isOpen={isConfirmModalOpen}
        onClose={() => setIsConfirmModalOpen(false)}
        onConfirm={confirmDeleteClient}
        title={`Excluir Cliente: ${clientToDelete?.name}`}
        message="Tem certeza que deseja excluir este cliente? Todos os casos e dados financeiros associados também serão removidos permanentemente. Esta ação não pode ser desfeita."
        confirmText="Excluir"
      />
      <div className="space-y-6">
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Clientes</h1>
            <p className="text-slate-600 mt-1">Gerencie sua carteira de clientes.</p>
          </div>
          <button
            onClick={handleOpenModalForAdd}
            className="flex items-center bg-sky-600 text-white px-4 py-2 rounded-lg shadow-md hover:bg-sky-700 transition-colors"
          >
            <PlusCircle size={20} className="mr-2" />
            Novo Cliente
          </button>
        </header>

        <div className="bg-white rounded-xl shadow-sm">
            <div className="border-b p-4">
                <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                    <input 
                        type="text" 
                        placeholder="Buscar por nome ou CPF..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full rounded-lg border-slate-300 bg-slate-50 py-2 pl-10 pr-4 text-sm focus:border-sky-500 focus:ring-sky-500 sm:w-72" />
                </div>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-left">
                <thead className="border-b-2 border-slate-200 bg-slate-50">
                    <tr>
                    <th className="p-3 text-sm font-semibold text-slate-600">Nome</th>
                    <th className="p-3 text-sm font-semibold text-slate-600 hidden md:table-cell">CPF</th>
                    <th className="p-3 text-sm font-semibold text-slate-600 hidden lg:table-cell">Email</th>
                    <th className="p-3 text-sm font-semibold text-slate-600">Telefone</th>
                    <th className="p-3 text-sm font-semibold text-slate-600 text-right">Ações</th>
                    </tr>
                </thead>
                <tbody>
                    {filteredClients.map(client => (
                    <tr key={client.id} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="p-3 font-medium text-slate-800">
                            <div className="flex items-center">
                                <Link to={`/clientes/${client.id}`} className="text-sky-600 hover:underline">{client.name}</Link>
                                {clientCaseCounts[client.id] > 0 && (
                                    <Link to={`/casos?clientId=${client.id}`} className="ml-2 flex items-center text-xs font-semibold bg-sky-100 text-sky-800 px-2 py-0.5 rounded-full hover:bg-sky-200 transition-colors">
                                        <Briefcase size={12} className="mr-1" />
                                        {clientCaseCounts[client.id]}
                                    </Link>
                                )}
                            </div>
                        </td>
                        <td className="p-3 text-slate-700 hidden md:table-cell">{client.cpf}</td>
                        <td className="p-3 text-slate-700 hidden lg:table-cell">{client.email}</td>
                        <td className="p-3 text-slate-700">{client.phone}</td>
                        <td className="p-3 text-right">
                        <div className="flex justify-end items-center space-x-1">
                            <button onClick={() => handleNewCaseForClient(client)} className="p-2 text-slate-500 hover:text-sky-600 transition-colors" title="Novo Caso para este Cliente">
                                <Briefcase size={18} />
                            </button>
                            <button onClick={() => handleOpenModalForEdit(client)} className="p-2 text-slate-500 hover:text-sky-600 transition-colors" title="Editar Cliente">
                            <Edit size={18} />
                            </button>
                            <button onClick={() => handleDeleteRequest(client)} className="p-2 text-slate-500 hover:text-red-600 transition-colors" title="Excluir Cliente">
                            <Trash2 size={18} />
                            </button>
                        </div>
                        </td>
                    </tr>
                    ))}
                </tbody>
                </table>
            </div>
            {filteredClients.length === 0 && (
                <div className="text-center py-12 px-4">
                    <UserPlus className="mx-auto h-12 w-12 text-slate-400" />
                    <h3 className="mt-2 text-sm font-medium text-slate-900">Nenhum cliente encontrado</h3>
                    <p className="mt-1 text-sm text-slate-500">Comece cadastrando um novo cliente.</p>
                    <button onClick={handleOpenModalForAdd} className="mt-4 inline-flex items-center rounded-md bg-sky-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2">
                        <PlusCircle size={20} className="mr-2" />
                        Adicionar Cliente
                    </button>
                </div>
            )}
        </div>
      </div>
    </>
  );
}
