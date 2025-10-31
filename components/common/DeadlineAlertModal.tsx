import React, { useRef } from 'react';
import { useCases } from '../../context/CasesContext';
import { useSettings } from '../../context/SettingsContext';
import { Link } from 'react-router-dom';
import { X, AlertTriangle, CalendarClock } from 'lucide-react';
import { Task } from '../../types';
import { useModalAccessibility } from '../../hooks/useModalAccessibility';

interface DeadlineAlertModalProps {
  isOpen: boolean;
  onClose: (dismiss: boolean) => void;
  urgentTasks: Task[];
}

const DeadlineAlertModal: React.FC<DeadlineAlertModalProps> = ({ isOpen, onClose, urgentTasks }) => {
  const { getCaseById } = useCases();
  const { notificationSettings } = useSettings();
  const dialogRef = useRef<HTMLDivElement>(null);

  useModalAccessibility(isOpen, dialogRef, { onClose: () => onClose(false) });

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4"
      role="presentation"
      onClick={() => onClose(false)}
    >
      <div
        ref={dialogRef}
        className="relative bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col focus:outline-none"
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="deadline-alert-modal-title"
        aria-describedby="deadline-alert-modal-description"
        tabIndex={-1}
      >
        <div className="p-6 border-b flex justify-between items-center bg-yellow-50">
          <div className="flex items-center">
            <AlertTriangle size={28} className="text-yellow-500 mr-4" aria-hidden="true" />
            <h2 className="text-2xl font-bold text-slate-800" id="deadline-alert-modal-title">
              Prazos Urgentes
            </h2>
          </div>
          <button
            onClick={() => onClose(false)}
            className="p-1 rounded-full hover:bg-slate-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500"
            aria-label="Fechar alerta de prazos"
            type="button"
          >
            <X size={24} className="text-slate-600" aria-hidden="true" />
          </button>
        </div>
        <div className="flex-1 p-6 overflow-y-auto">
          {urgentTasks.length > 0 ? (
            <>
              <p className="text-slate-600 mb-4" id="deadline-alert-modal-description">
                Você tem {urgentTasks.length} tarefa(s) vencendo nos próximos {notificationSettings.deadlineThresholdDays} dias ou em atraso.
              </p>
              <ul className="divide-y divide-slate-200">
                {urgentTasks.map(task => {
                  const caseData = getCaseById(task.caseId);
                  const dueDate = new Date(task.dueDate + 'T00:00:00');
                  const today = new Date();
                  today.setHours(0, 0, 0, 0);
                  const isOverdue = dueDate < today;

                  return (
                    <li key={task.id} className="py-4 flex items-center justify-between hover:bg-slate-50 -mx-6 px-6">
                      <Link
                        to={`/casos/${task.caseId}`}
                        onClick={() => onClose(false)}
                        className="flex-1 min-w-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-sky-500"
                      >
                        <p className={`font-medium ${isOverdue ? 'text-red-700' : 'text-sky-600'} truncate`}>{task.description}</p>
                        <p className="text-sm text-slate-500 truncate">Caso: {caseData?.title || 'N/A'}</p>
                      </Link>
                      <div className={`ml-4 text-sm font-semibold ${isOverdue ? 'text-red-600' : 'text-yellow-700'}`}>
                        <div className="flex items-center">
                          <CalendarClock size={16} className="mr-1.5" aria-hidden="true" />
                          <span>{dueDate.toLocaleDateString('pt-BR')}</span>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center text-center text-slate-500 py-10" id="deadline-alert-modal-description">
              <AlertTriangle size={48} className="text-slate-300 mb-4" aria-hidden="true" />
              <p className="text-lg font-medium">Nenhuma tarefa urgente encontrada.</p>
              <p className="text-sm">Crie uma nova tarefa com prazo próximo para receber alertas aqui.</p>
            </div>
          )}
        </div>
        <div className="p-6 bg-slate-50 border-t flex justify-end space-x-3">
          <button
            onClick={() => onClose(true)}
            className="px-4 py-2 bg-white border border-slate-300 rounded-md shadow-sm text-sm font-medium text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-400"
            type="button"
          >
            Não mostrar hoje
          </button>
          <button
            onClick={() => onClose(false)}
            className="px-4 py-2 bg-sky-600 border border-transparent rounded-md shadow-sm text-sm font-medium text-white hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500"
            type="button"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeadlineAlertModal;
