
import React, { useState, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useClients } from '../context/ClientsContext';
import { useCases } from '../context/CasesContext';
import { Client, Case, CaseStatus } from '../types';
import { ArrowLeft, User, Mail, Phone, Home, Edit, PlusCircle, Briefcase, Gavel, Scale } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import ClientFormModal from '../components/client/ClientFormModal';
import CaseFormModal from '../components/case/CaseFormModal';
import ClientDetailTabs from '../components/client/ClientDetailTabs';
import ClientFinancials from '../components/client/ClientFinancials';

const DetailItem: React.FC<{ icon: React.ReactNode; label: string; value: React.ReactNode }> = ({ icon, label, value }) => (
  <div className="flex items-start py-2">
    <div className="text-slate-500 mt-1">{icon}</div>
    <div className="ml-4">
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <div className="text-md text-slate-800">{value || '-'}</div>
    </div>
  </div>
);

const statusColors: Record<CaseStatus, string> = {
  'Aberto': 'bg-blue-100 text-blue-800', 'Em Andamento': 'bg-yellow-100 text-yellow-800', 'Pendente': 'bg-orange-100 text-orange-800', 'Fechado': 'bg-green-100 text-green-800', 'Arquivado': 'bg-slate-100 text-slate-800', 'Análise Inicial': 'bg-cyan-100 text-cyan-800', 'Judicial': 'bg-purple-100 text-purple-800', 'Administrativo': 'bg-teal-100 text-teal-800', 'Concedido': 'bg-emerald-100 text-emerald-800', 'Negado': 'bg-red-100 text-red-800', 'Em Exigência': 'bg-amber-100 text-amber-800', 'Fase Recursal': 'bg-indigo-100 text-indigo-800', 'Finalizado': 'bg-gray-100 text-gray-800',
};

const StatusBadge = ({ status }: { status: CaseStatus }) => (
  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColors[status] || 'bg-gray-100 text-gray-800'}`}>
    {status}
  </span>
);

const ClientDetails: React.FC = () => {
  const { clientId } = useParams<{ clientId: string }>();
  const { getClientById, updateClient } = useClients();
  const { cases, saveCase } = useCases();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const client = useMemo(() => clientId ? getClientById(clientId) : null, [clientId, getClientById]);
  const clientCases = useMemo(() => cases.filter(c => c.clientId === clientId), [cases, clientId]);

  const [activeTab, setActiveTab] = useState<'overview' | 'cases' | 'financials'>('overview');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isCaseModalOpen, setIsCaseModalOpen] = useState(false);

  const handleSaveClient = (clientData: Omit<Client, 'id' | 'createdAt'> | Client) => {
    updateClient(clientData as Client);
    addToast('Dados do cliente atualizados!', 'success');
    setIsEditModalOpen(false);
  };

  const handleSaveCase = async (caseData: Omit<Case, 'id' | 'lastUpdate' | 'tasks' | 'aiSummary' | 'documents' | 'legalDocuments' | 'startDate'> | Case) => {
    const newCase = await saveCase(caseData as Case);
    addToast(`Novo caso "${newCase.title}" criado para ${client?.name}!`, 'success');
    setIsCaseModalOpen(false);
    navigate(`/casos/${newCase.id}`);
  };

  if (!client) {
    return <div className="text-center py-10"><h2 className="text-xl font-semibold">Cliente não encontrado</h2><p className="text-slate-500">O cliente que você está procurando não existe ou foi removido.</p></div>;
  }

  return (
    <>
      <ClientFormModal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} onSave={handleSaveClient} initialData={client} />
      <CaseFormModal isOpen={isCaseModalOpen} onClose={() => setIsCaseModalOpen(false)} onSave={handleSaveCase} initialData={null} preselectedClientId={client.id} />
      
      <div className="space-y-6">
        <Link to="/clientes" className="flex items-center text-sky-600 hover:underline font-medium"><ArrowLeft size={18} className="mr-2" />Voltar para Clientes</Link>
        
        <header className="pb-4 border-b border-slate-200">
            <div className="flex flex-col md:flex-row justify-between md:items-center gap-2">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">{client.name}</h1>
                    <p className="text-slate-600 mt-1">CPF: {client.cpf}</p>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={() => setIsEditModalOpen(true)} className="flex items-center bg-white border border-slate-300 text-slate-700 px-4 py-2 rounded-lg shadow-sm hover:bg-slate-50"><Edit size={16} className="mr-2" /> Editar Cliente</button>
                    <button onClick={() => setIsCaseModalOpen(true)} className="flex items-center bg-sky-600 text-white px-4 py-2 rounded-lg shadow-md hover:bg-sky-700"><PlusCircle size={16} className="mr-2" /> Novo Caso</button>
                </div>
            </div>
        </header>

        <ClientDetailTabs activeTab={activeTab} setActiveTab={setActiveTab} />

        <div className="bg-white p-6 rounded-b-xl shadow-sm">
            {activeTab === 'overview' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <div className="space-y-2">
                        <h3 className="font-semibold text-lg text-slate-800">Dados de Contato</h3>
                        <DetailItem icon={<Mail size={18} />} label="Email" value={client.email} />
                        <DetailItem icon={<Phone size={18} />} label="Telefone" value={client.phone} />
                    </div>
                    <div className="space-y-2">
                        <h3 className="font-semibold text-lg text-slate-800">Endereço</h3>
                        <DetailItem icon={<Home size={18} />} label="Logradouro" value={`${client.street}, ${client.number}`} />
                        <DetailItem icon={<MapPin size={18} />} label="Cidade/UF" value={`${client.city} - ${client.state}`} />
                    </div>
                    <div className="space-y-2">
                        <h3 className="font-semibold text-lg text-slate-800">Dados Pessoais</h3>
                        <DetailItem icon={<User size={18} />} label="Data de Nascimento" value={new Date(client.dateOfBirth + 'T00:00:00').toLocaleDateString('pt-BR')} />
                        <DetailItem icon={<User size={18} />} label="Nome da Mãe" value={client.motherName} />
                    </div>
                </div>
            )}

            {activeTab === 'cases' && (
                <div>
                    <h2 className="text-xl font-bold text-slate-800 mb-4">Casos de {client.name} ({clientCases.length})</h2>
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-slate-200">
                            <thead className="bg-slate-50"><tr><th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Título</th><th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Nº Processo</th><th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Natureza</th><th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Status</th></tr></thead>
                            <tbody className="divide-y divide-slate-200 bg-white">
                                {clientCases.map(c => (
                                    <tr key={c.id} className="hover:bg-slate-50">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900"><Link to={`/casos/${c.id}`} className="text-sky-600 hover:underline">{c.title}</Link></td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">{c.caseNumber || '-'}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">{c.nature === 'Judicial' ? <Gavel size={16} className="inline mr-1 text-purple-600"/> : <Scale size={16} className="inline mr-1 text-teal-600"/>}{c.nature}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm"><StatusBadge status={c.status} /></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {clientCases.length === 0 && <p className="text-center text-sm text-slate-500 py-8">Nenhum caso cadastrado para este cliente.</p>}
                    </div>
                </div>
            )}

            {activeTab === 'financials' && (
                <ClientFinancials client={client} />
            )}
        </div>
      </div>
    </>
  );
};

export default ClientDetails;
