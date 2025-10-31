
import React, { useState } from 'react';
import { useCases } from '../context/CasesContext';
import { Task } from '../types';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, PlusCircle } from 'lucide-react';
import TaskFormModal from '../components/tasks/TaskFormModal';
import { useToast } from '../context/ToastContext';

const getErrorMessage = (error: unknown, fallback: string) =>
  error instanceof Error && error.message ? error.message : fallback;

const Agenda: React.FC = () => {
  const { cases, addTaskToCase } = useCases();
  const { addToast } = useToast();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const allTasks = cases.flatMap(c => c.tasks);

  const changeMonth = (amount: number) => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(newDate.getMonth() + amount);
      return newDate;
    });
  };

  const handleDayClick = (day: Date) => {
    setSelectedDate(day);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedDate(null);
  };

  const handleSaveTask = async (taskData: Omit<Task, 'id' | 'completed' | 'caseId'>, caseId: string) => {
    try {
      await addTaskToCase(caseId, { ...taskData, completed: false });
      addToast('Tarefa adicionada com sucesso!', 'success');
    } catch (error) {
      addToast(getErrorMessage(error, 'Não foi possível adicionar a tarefa. Tente novamente.'), 'error');
      throw error instanceof Error ? error : new Error('Não foi possível adicionar a tarefa. Tente novamente.');
    }
  };

  const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
  const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
  const startDate = new Date(startOfMonth);
  startDate.setDate(startDate.getDate() - startDate.getDay());
  const endDate = new Date(endOfMonth);
  endDate.setDate(endDate.getDate() + (6 - endDate.getDay()));

  const days = [];
  let day = new Date(startDate);
  while (day <= endDate) {
    days.push(new Date(day));
    day.setDate(day.getDate() + 1);
  }

  const tasksByDate: { [key: string]: Task[] } = {};
  allTasks.forEach(task => {
    const dueDate = new Date(task.dueDate + 'T00:00:00').toDateString();
    if (!tasksByDate[dueDate]) {
      tasksByDate[dueDate] = [];
    }
    tasksByDate[dueDate].push(task);
  });

  const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  return (
    <>
      <TaskFormModal 
        isOpen={isModalOpen} 
        onClose={handleCloseModal} 
        initialDate={selectedDate}
        onSave={handleSaveTask}
      />
      <div className="space-y-6">
        <header>
          <h1 className="text-3xl font-bold text-slate-800">Agenda e Prazos</h1>
          <p className="text-slate-600 mt-1">Visualize e adicione tarefas e prazos do escritório.</p>
        </header>

        <div className="bg-white p-4 sm:p-6 rounded-xl shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <button onClick={() => changeMonth(-1)} className="p-2 rounded-full hover:bg-slate-100"><ChevronLeft /></button>
            <h2 className="text-xl font-bold text-slate-800">
              {currentDate.toLocaleString('pt-BR', { month: 'long', year: 'numeric' }).replace(/^\w/, c => c.toUpperCase())}
            </h2>
            <button onClick={() => changeMonth(1)} className="p-2 rounded-full hover:bg-slate-100"><ChevronRight /></button>
          </div>

          <div className="grid grid-cols-7 border-t border-l border-slate-200">
            {weekDays.map(wd => (
              <div key={wd} className="text-center font-semibold text-sm py-2 bg-slate-50 border-b border-r border-slate-200 text-slate-600">{wd}</div>
            ))}
            {days.map((d, i) => {
              const tasksForDay = tasksByDate[d.toDateString()] || [];
              const isCurrentMonth = d.getMonth() === currentDate.getMonth();
              const isToday = d.toDateString() === new Date().toDateString();

              return (
                <div key={i} className={`relative min-h-[120px] p-2 bg-white group border-b border-r border-slate-200 ${isCurrentMonth ? '' : 'bg-slate-50'}`}>
                  <time dateTime={d.toISOString()} className={`text-sm font-semibold ${isToday ? 'flex items-center justify-center h-6 w-6 rounded-full bg-sky-600 text-white' : ''} ${isCurrentMonth ? 'text-slate-800' : 'text-slate-400'}`}>
                    {d.getDate()}
                  </time>
                  <button onClick={() => handleDayClick(d)} className="absolute top-1 right-1 p-1 rounded-full text-slate-400 opacity-0 group-hover:opacity-100 hover:bg-slate-100 hover:text-sky-600 transition-opacity" aria-label="Adicionar tarefa">
                    <PlusCircle size={18} />
                  </button>
                  <ul className="mt-2 space-y-1 overflow-y-auto max-h-24">
                    {tasksForDay.slice(0, 3).map(task => (
                      <li key={task.id}>
                        <Link to={`/casos/${task.caseId}`} className={`block p-1 rounded text-xs truncate ${task.completed ? 'bg-emerald-100 text-emerald-800' : 'bg-sky-100 text-sky-800'} hover:opacity-80`}>
                          <p className="font-medium truncate">{task.description}</p>
                        </Link>
                      </li>
                    ))}
                    {tasksForDay.length > 3 && (
                        <li className="text-xs text-slate-500 mt-1">+ {tasksForDay.length - 3} mais</li>
                    )}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
};

export default Agenda;
