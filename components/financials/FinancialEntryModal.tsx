
import React, { useState, useEffect } from 'react';
import { useCases } from '../../context/CasesContext';
import { Fee, Expense, FeeType, FeeStatus } from '../../types';
import { X } from 'lucide-react';
import { useToast } from '../../context/ToastContext';

type EntryType = 'fee' | 'expense';

interface FinancialEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Omit<Fee, 'id'> | Omit<Expense, 'id'> | Fee | Expense) => Promise<void> | void;
  initialData: Fee | Expense | null;
  entryType: EntryType;
  preselectedCaseId?: string;
}

const FinancialEntryModal: React.FC<FinancialEntryModalProps> = ({ isOpen, onClose, onSave, initialData, entryType, preselectedCaseId }) => {
  const { cases } = useCases();
  const { addToast } = useToast();
  
  const isFee = entryType === 'fee';
  const isEditing = !!initialData;
  const title = `${isEditing ? 'Editar' : 'Novo'} ${isFee ? 'Honorário' : 'Despesa'}`;
  const buttonColor = isFee ? 'bg-sky-600 hover:bg-sky-700' : 'bg-red-600 hover:bg-red-700';

  const getInitialState = () => {
    if (isEditing && initialData) {
      const dateField = 'dueDate' in initialData ? initialData.dueDate : initialData.date;
      return {
        caseId: initialData.caseId,
        description: initialData.description,
        amount: String(initialData.amount),
        date: dateField,
        type: 'type' in initialData ? initialData.type : FeeType.INICIAL,
      };
    }
    return {
      caseId: preselectedCaseId || (cases.length > 0 ? cases[0].id : ''),
      description: '',
      amount: '',
      date: new Date().toISOString().split('T')[0],
      type: FeeType.INICIAL,
    };
  };

  const [formData, setFormData] = useState(getInitialState());

  useEffect(() => {
    if (isOpen) {
      setFormData(getInitialState());
    }
  }, [isOpen, initialData, preselectedCaseId]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.caseId || !formData.description || !formData.amount || !formData.date) {
      addToast("Por favor, preencha todos os campos.", "error");
      return;
    }
    
    const baseData = {
      caseId: formData.caseId,
      description: formData.description,
      amount: parseFloat(formData.amount),
    };

    let saveData: Omit<Fee, 'id'> | Omit<Expense, 'id'> | Fee | Expense;

    if (isFee) {
      saveData = {
        ...baseData,
        dueDate: formData.date,
        type: formData.type,
        status: (initialData as Fee)?.status || FeeStatus.PENDENTE,
        installments: (initialData as Fee)?.installments,
      };
    } else {
      saveData = {
        ...baseData,
        date: formData.date,
      };
    }

    if (isEditing) {
      (saveData as Fee | Expense).id = initialData!.id;
    }

    try {
      await onSave(saveData);
      onClose();
    } catch (error) {
      console.error('Erro ao salvar lançamento financeiro pelo modal.', error);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4" aria-modal="true" role="dialog" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
        <div className="p-6 border-b flex justify-between items-center">
          <h2 className="text-2xl font-bold text-slate-800">{title}</h2>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-slate-100"><X size={24} className="text-slate-600" /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-4">
            <div>
              <label htmlFor="entry-caseId" className="block text-sm font-medium text-slate-700">Associar ao Caso</label>
              <select name="caseId" id="entry-caseId" value={formData.caseId} onChange={handleChange} required className="mt-1 block w-full border-slate-300 rounded-md shadow-sm sm:text-sm">
                <option value="" disabled>Selecione um caso</option>
                {cases.map(c => <option key={c.id} value={c.id}>{c.title} ({c.caseNumber || 'Sem número'})</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="entry-description" className="block text-sm font-medium text-slate-700">Descrição</label>
              <input type="text" name="description" id="entry-description" value={formData.description} onChange={handleChange} required className="mt-1 block w-full border-slate-300 rounded-md shadow-sm sm:text-sm" />
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label htmlFor="entry-amount" className="block text-sm font-medium text-slate-700">Valor (R$)</label>
                    <input type="number" step="0.01" name="amount" id="entry-amount" value={formData.amount} onChange={handleChange} required className="mt-1 block w-full border-slate-300 rounded-md shadow-sm sm:text-sm" />
                </div>
                <div>
                    <label htmlFor="entry-date" className="block text-sm font-medium text-slate-700">{isFee ? 'Data de Vencimento' : 'Data da Despesa'}</label>
                    <input type="date" name="date" id="entry-date" value={formData.date} onChange={handleChange} required className="mt-1 block w-full border-slate-300 rounded-md shadow-sm sm:text-sm" />
                </div>
            </div>
            {isFee && (
              <div>
                <label htmlFor="fee-type" className="block text-sm font-medium text-slate-700">Tipo de Honorário</label>
                <select name="type" id="fee-type" value={formData.type} onChange={handleChange} required className="mt-1 block w-full border-slate-300 rounded-md shadow-sm sm:text-sm">
                  {Object.values(FeeType).map(type => <option key={type} value={type}>{type}</option>)}
                </select>
              </div>
            )}
          </div>
          <div className="p-6 bg-slate-50 border-t flex justify-end space-x-3">
            <button type="button" onClick={onClose} className="px-4 py-2 bg-white border border-slate-300 rounded-md shadow-sm text-sm font-medium text-slate-700 hover:bg-slate-50">Cancelar</button>
            <button type="submit" className={`px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${buttonColor}`}>Salvar</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default FinancialEntryModal;
