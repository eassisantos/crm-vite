import React from 'react';
import { useCrmData } from '../../context/CrmContext';
import { Link } from 'react-router-dom';
import { X, AlertTriangle, CalendarClock } from 'lucide-react';

interface DeadlineAlertModalProps {
  isOpen: boolean;
  onClose: (dismiss: boolean) => void;
}

const DeadlineAlertModal: React.FC<DeadlineAlertModalProps> = ({ isOpen, onClose }) => {
  const { getUrgentTasks, getCaseById, notificationSettings } = useCrmData();
  const urgentTasks = getUrgentTasks();

  if (!isOpen || urgentTasks.length === 0) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4" aria-modal="true" role="dialog">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="p-6 border-b flex justify-between items-center bg-yellow-50">
          <div className="flex items-center">
            <AlertTriangle size={28} className="text-yellow-500 mr-4" />
            <h2 className="text-2xl font-bold text-slate-800">Prazos Urgentes</h2>
          </div>
          <button onClick={() => onClose(false)} className="p-1 rounded-full hover:bg-slate-200">
            <X size={24} className="text-slate-600" />
          </button>
        </div>
        <div className="flex-1 p-6 overflow-y-auto">
          <p className="text-slate-600 mb-4">Você tem {urgentTasks.length} tarefa(s) vencendo nos próximos {notificationSettings.deadlineThresholdDays} dias ou em atraso.</p>
          <ul className="divide-y divide-slate-200">
            {urgentTasks.map(task => {
              const caseData = getCaseById(task.caseId);
              const dueDate = new Date(task.dueDate + 'T00:00:00');
              const today = new Date();
              today.setHours(0, 0, 0, 0);
              const isOverdue = dueDate < today;

              return (
                <li key={task.id} className="py-4 flex items-center justify-between hover:bg-slate-50 -mx-6 px-6">
                  <Link to={`/casos/${task.caseId}`} onClick={() => onClose(false)} className="flex-1 min-w-0">
                    <p className={`font-medium ${isOverdue ? 'text-red-700' : 'text-sky-600'} truncate`}>{task.description}</p>
                    <p className="text-sm text-slate-500 truncate">Caso: {caseData?.title || 'N/A'}</p>
                  </Link>
                  <div className={`ml-4 text-sm font-semibold ${isOverdue ? 'text-red-600' : 'text-yellow-700'}`}>
                    <div className="flex items-center">
                      <CalendarClock size={16} className="mr-1.5" />
                      <span>{dueDate.toLocaleDateString('pt-BR')}</span>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
        <div className="p-6 bg-slate-50 border-t flex justify-end space-x-3">
          <button onClick={() => onClose(true)} className="px-4 py-2 bg-white border border-slate-300 rounded-md shadow-sm text-sm font-medium text-slate-700 hover:bg-slate-50">
            Não mostrar hoje
          </button>
          <button onClick={() => onClose(false)} className="px-4 py-2 bg-sky-600 border border-transparent rounded-md shadow-sm text-sm font-medium text-white hover:bg-sky-700">
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeadlineAlertModal;
