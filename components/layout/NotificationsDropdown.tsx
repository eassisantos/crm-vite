import React from 'react';
import { useCrmData } from '../../context/CrmContext';
import { Link } from 'react-router-dom';
import { Bell, CalendarClock, CheckCircle } from 'lucide-react';

interface NotificationsDropdownProps {
  isOpen: boolean;
  onClose: () => void;
}

const NotificationsDropdown: React.FC<NotificationsDropdownProps> = ({ isOpen, onClose }) => {
  const { getUrgentTasks, getCaseById } = useCrmData();
  const urgentTasks = getUrgentTasks();

  if (!isOpen) return null;

  return (
    <div className="absolute right-0 mt-2 w-80 origin-top-right rounded-xl bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none animate-fade-in-down">
      <div className="p-4 border-b border-slate-200">
        <h3 className="text-md font-semibold text-slate-800 flex items-center">
          <Bell size={18} className="mr-2 text-slate-500" />
          Notificações
        </h3>
      </div>
      <div className="py-1 max-h-80 overflow-y-auto">
        {urgentTasks.length > 0 ? (
          urgentTasks.map(task => {
            const caseData = getCaseById(task.caseId);
            const dueDate = new Date(task.dueDate + 'T00:00:00');
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const isOverdue = dueDate < today;

            return (
              <Link
                key={task.id}
                to={`/casos/${task.caseId}`}
                onClick={onClose}
                className="block px-4 py-3 text-sm text-slate-700 hover:bg-slate-100"
              >
                <p className={`font-medium truncate ${isOverdue ? 'text-red-600' : 'text-slate-800'}`}>{task.description}</p>
                <p className="text-xs text-slate-500 truncate">Caso: {caseData?.title || 'N/A'}</p>
                <div className={`mt-1 flex items-center text-xs font-semibold ${isOverdue ? 'text-red-500' : 'text-yellow-600'}`}>
                  <CalendarClock size={14} className="mr-1" />
                  Vence em: {dueDate.toLocaleDateString('pt-BR')}
                </div>
              </Link>
            );
          })
        ) : (
          <div className="text-center py-8 px-4">
            <CheckCircle className="mx-auto h-10 w-10 text-emerald-400" />
            <p className="mt-2 text-sm font-medium text-slate-700">Tudo em dia!</p>
            <p className="text-xs text-slate-500">Nenhuma notificação ou prazo urgente.</p>
          </div>
        )}
      </div>
      <div className="p-2 bg-slate-50 border-t border-slate-200">
        <Link to="/agenda" onClick={onClose} className="block w-full text-center text-sm font-medium text-sky-600 hover:text-sky-800 py-1">
          Ver todos os prazos
        </Link>
      </div>
    </div>
  );
};

export default NotificationsDropdown;
