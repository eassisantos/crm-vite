
import React, { useState, useEffect, useRef } from 'react';
import { useCases } from '../../context/CasesContext';
import { useToast } from '../../context/ToastContext';
import { X } from 'lucide-react';
import { Task } from '../../types';
import { useModalAccessibility } from '../../hooks/useModalAccessibility';

interface TaskFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (taskData: Omit<Task, 'id' | 'completed' | 'caseId'>, caseId: string) => Promise<void> | void;
  initialDate: Date | null;
  preselectedCaseId?: string;
}

const TaskFormModal: React.FC<TaskFormModalProps> = ({ isOpen, onClose, onSave, initialDate, preselectedCaseId }) => {
  const { cases } = useCases();
  const { addToast } = useToast();
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [caseId, setCaseId] = useState(preselectedCaseId || '');
  
  const activeCases = cases.filter(c => c.status !== 'Fechado' && c.status !== 'Arquivado');
  const dialogRef = useRef<HTMLDivElement>(null);
  const descriptionInputRef = useRef<HTMLInputElement>(null);

  useModalAccessibility(isOpen, dialogRef, { onClose, initialFocusRef: descriptionInputRef });

  useEffect(() => {
    if (isOpen) {
        if (initialDate) {
            setDueDate(initialDate.toISOString().split('T')[0]);
        } else {
            setDueDate(new Date().toISOString().split('T')[0]);
        }

        if (preselectedCaseId) {
            setCaseId(preselectedCaseId);
        } else if (activeCases.length > 0) {
            setCaseId(activeCases[0].id);
        } else {
            setCaseId('');
        }
        setDescription('');
    }
  }, [isOpen, initialDate, activeCases, preselectedCaseId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim() || !dueDate || !caseId) {
        addToast("Por favor, preencha todos os campos.", "error");
        return;
    }
    try {
      await onSave({ description, dueDate }, caseId);
      onClose();
    } catch (error) {
      console.error('Erro ao salvar tarefa pelo modal.', error);
    }
  };
  
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4"
      role="presentation"
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md focus:outline-none"
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="task-form-modal-title"
        aria-describedby="task-form-modal-description"
        tabIndex={-1}
      >
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-slate-800" id="task-form-modal-title">
            Adicionar Tarefa
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-full text-slate-500 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-400"
            aria-label="Fechar modal de tarefa"
            type="button"
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4" aria-describedby="task-form-modal-description">
          <p id="task-form-modal-description" className="sr-only">
            Informe os dados da tarefa e selecione o caso relacionado.
          </p>
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-slate-700">Descrição</label>
              <input
                ref={descriptionInputRef}
                type="text"
                id="description"
                value={description}
                onChange={e => setDescription(e.target.value)}
                className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-sky-500 focus:ring-sky-500 sm:text-sm"
                required
              />
            </div>
            <div>
              <label htmlFor="dueDate" className="block text-sm font-medium text-slate-700">Data de Vencimento</label>
              <input type="date" id="dueDate" value={dueDate} onChange={e => setDueDate(e.target.value)} className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-sky-500 focus:ring-sky-500 sm:text-sm" required />
            </div>
            <div>
              <label htmlFor="caseId" className="block text-sm font-medium text-slate-700">Associar ao Caso</label>
              <select id="caseId" value={caseId} onChange={e => setCaseId(e.target.value)} className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-sky-500 focus:ring-sky-500 sm:text-sm disabled:bg-slate-100 disabled:cursor-not-allowed" required disabled={!!preselectedCaseId}>
                {activeCases.map(c => (
                  <option key={c.id} value={c.id}>{c.title} ({c.caseNumber || 'Sem número'})</option>
                ))}
              </select>
            </div>
          <div className="mt-6 flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="bg-white py-2 px-4 border border-slate-300 rounded-md shadow-sm text-sm font-medium text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-400"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-sky-600 hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500"
            >
              Salvar Tarefa
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TaskFormModal;
