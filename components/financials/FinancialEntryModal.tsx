
import React, { useState, useEffect, useRef } from 'react';
import { useCases } from '../../context/CasesContext';
import { Fee, Expense, FeeType, FeeStatus } from '../../types';
import { X } from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { useModalAccessibility } from '../../hooks/useModalAccessibility';
import { AnimatePresence, motion } from 'framer-motion';

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
  const confirmFocusRing = isFee ? 'focus:ring-sky-500' : 'focus:ring-red-500';

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
  const dialogRef = useRef<HTMLDivElement>(null);
  const firstFieldRef = useRef<HTMLSelectElement>(null);

  useModalAccessibility(isOpen, dialogRef, { onClose, initialFocusRef: firstFieldRef });

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

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4"
          role="presentation"
          onClick={onClose}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            ref={dialogRef}
            className="bg-white rounded-lg shadow-xl w-full max-w-lg focus:outline-none"
            onClick={e => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="financial-entry-modal-title"
            aria-describedby="financial-entry-modal-description"
            tabIndex={-1}
            initial={{ y: 28, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 20, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 230, damping: 22 }}
          >
        <div className="p-6 border-b flex justify-between items-center">
          <h2 className="text-2xl font-bold text-slate-800" id="financial-entry-modal-title">{title}</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-slate-100 text-slate-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-400"
            aria-label="Fechar modal financeiro"
            type="button"
          >
            <X size={22} aria-hidden="true" />
          </button>
        </div>
        <p id="financial-entry-modal-description" className="sr-only">
          Informe os dados do lançamento financeiro antes de salvar.
        </p>
        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-4">
            <div>
              <label htmlFor="entry-caseId" className="block text-sm font-medium text-slate-700">Associar ao Caso</label>
              <select
                ref={firstFieldRef}
                name="caseId"
                id="entry-caseId"
                value={formData.caseId}
                onChange={handleChange}
                required
                className="mt-1 block w-full border-slate-300 rounded-md shadow-sm sm:text-sm"
              >
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
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-white border border-slate-300 rounded-md shadow-sm text-sm font-medium text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-400"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className={`px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${buttonColor} focus:outline-none focus:ring-2 focus:ring-offset-2 ${confirmFocusRing}`}
            >
              Salvar
            </button>
          </div>
        </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default FinancialEntryModal;
