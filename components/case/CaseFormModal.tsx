
import React, { useState, useEffect } from 'react';
import { Case, CaseStatus } from '../../types';
import { useClients } from '../../context/ClientsContext';
import { useSettings } from '../../context/SettingsContext';
import { useToast } from '../../context/ToastContext';
import { X } from 'lucide-react';

type CaseFormData = Omit<Case, 'id' | 'lastUpdate' | 'tasks' | 'aiSummary' | 'documents' | 'legalDocuments' | 'startDate'>;

interface CaseFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (caseData: CaseFormData | Case) => Promise<void> | void;
  initialData: Case | null;
  preselectedClientId?: string;
}

const CaseFormModal: React.FC<CaseFormModalProps> = ({ isOpen, onClose, onSave, initialData, preselectedClientId }) => {
  const { clients } = useClients();
  const { caseStatuses, benefitTypes } = useSettings();
  const { addToast } = useToast();
  
  const getInitialFormData = (): CaseFormData => ({
    caseNumber: '',
    title: '',
    clientId: '',
    status: caseStatuses[0],
    notes: '',
    nature: 'Administrativo',
    benefitType: benefitTypes[0] || '',
  });

  const [formData, setFormData] = useState<CaseFormData>(getInitialFormData());

  useEffect(() => {
    if (isOpen) {
        if (initialData) {
            setFormData({
                caseNumber: initialData.caseNumber,
                title: initialData.title,
                clientId: initialData.clientId,
                status: initialData.status,
                notes: initialData.notes,
                nature: initialData.nature,
                benefitType: initialData.benefitType,
            });
        } else {
            setFormData({
                ...getInitialFormData(),
                clientId: preselectedClientId || '',
            });
        }
    }
  }, [initialData, isOpen, clients, caseStatuses, benefitTypes, preselectedClientId]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.clientId) {
        addToast("Por favor, selecione um cliente.", "error");
        return;
    }
    if (!formData.title.trim()) {
        addToast("Por favor, insira um título para o caso.", "error");
        return;
    }
    try {
      await onSave(initialData ? { ...initialData, ...formData } : formData);
      onClose();
    } catch (error) {
      // O componente pai lida com o feedback de erro.
      console.error('Erro ao salvar caso pelo modal.', error);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4" onClick={onClose} aria-modal="true" role="dialog">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="p-6 border-b flex justify-between items-center">
          <h2 className="text-2xl font-bold text-slate-800">{initialData ? 'Editar Caso' : 'Novo Caso'}</h2>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-slate-100">
            <X size={24} className="text-slate-600" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="flex-grow overflow-y-auto">
          <div className="p-6 space-y-4">
            <div>
              <label htmlFor="clientId" className="block text-sm font-medium text-slate-700">Cliente</label>
              <select 
                name="clientId" 
                id="clientId" 
                value={formData.clientId} 
                onChange={handleChange} 
                required 
                className="mt-1 block w-full border-slate-300 rounded-md shadow-sm sm:text-sm focus:ring-sky-500 focus:border-sky-500 disabled:bg-slate-100 disabled:cursor-not-allowed"
                disabled={!!initialData || !!preselectedClientId}
              >
                <option value="" disabled>Selecione um cliente</option>
                {clients.map(client => (
                  <option key={client.id} value={client.id}>{client.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-slate-700">Título do Caso</label>
              <input type="text" name="title" id="title" value={formData.title} onChange={handleChange} required className="mt-1 block w-full border-slate-300 rounded-md shadow-sm sm:text-sm focus:ring-sky-500 focus:border-sky-500" placeholder="Ex: Recurso Administrativo, Análise de Provas, etc."/>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label htmlFor="nature" className="block text-sm font-medium text-slate-700">Natureza da Ação</label>
                    <select name="nature" id="nature" value={formData.nature} onChange={handleChange} required className="mt-1 block w-full border-slate-300 rounded-md shadow-sm sm:text-sm">
                        <option value="Administrativo">Administrativo</option>
                        <option value="Judicial">Judicial</option>
                    </select>
                </div>
                <div>
                    <label htmlFor="benefitType" className="block text-sm font-medium text-slate-700">Tipo de Ação</label>
                    <select name="benefitType" id="benefitType" value={formData.benefitType} onChange={handleChange} required className="mt-1 block w-full border-slate-300 rounded-md shadow-sm sm:text-sm">
                        {benefitTypes.map(type => <option key={type} value={type}>{type}</option>)}
                    </select>
                </div>
            </div>
            <div>
              <label htmlFor="caseNumber" className="block text-sm font-medium text-slate-700">Número do Processo (Opcional)</label>
              <input type="text" name="caseNumber" id="caseNumber" value={formData.caseNumber} onChange={handleChange} className="mt-1 block w-full border-slate-300 rounded-md shadow-sm sm:text-sm focus:ring-sky-500 focus:border-sky-500" />
            </div>
            <div>
              <label htmlFor="status" className="block text-sm font-medium text-slate-700">Status</label>
              <select name="status" id="status" value={formData.status} onChange={handleChange} required className="mt-1 block w-full border-slate-300 rounded-md shadow-sm sm:text-sm focus:ring-sky-500 focus:border-sky-500">
                {caseStatuses.map(status => <option key={status} value={status}>{status}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="notes" className="block text-sm font-medium text-slate-700">Notas Iniciais</label>
              <textarea name="notes" id="notes" value={formData.notes} onChange={handleChange} rows={3} className="mt-1 block w-full border-slate-300 rounded-md shadow-sm sm:text-sm focus:ring-sky-500 focus:border-sky-500" />
            </div>
          </div>
          <div className="p-6 bg-slate-50 border-t flex justify-end space-x-3">
            <button type="button" onClick={onClose} className="px-4 py-2 bg-white border border-slate-300 rounded-md shadow-sm text-sm font-medium text-slate-700 hover:bg-slate-50">
              Cancelar
            </button>
            <button type="submit" className="px-4 py-2 bg-sky-600 border border-transparent rounded-md shadow-sm text-sm font-medium text-white hover:bg-sky-700">
              Salvar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CaseFormModal;
