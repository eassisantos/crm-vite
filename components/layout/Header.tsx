import React, { useState, useRef, useEffect } from 'react';
import { Menu, User, Bell, Search } from 'lucide-react';
import NotificationsDropdown from './NotificationsDropdown';
import { useCrmData } from '../../context/CrmContext';

interface HeaderProps {
  onMenuClick: () => void;
  onSearchClick: () => void;
}

export default function Header({ onMenuClick, onSearchClick }: HeaderProps) {
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const { getUrgentTasks } = useCrmData();
  const urgentTasksCount = getUrgentTasks().length;
  const notificationsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
        setIsNotificationsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <header className="flex h-16 flex-shrink-0 items-center justify-between bg-white px-4 shadow-sm sm:px-6 lg:px-8 z-10">
      <div className="flex items-center gap-4">
        <button
          type="button"
          className="text-slate-500 hover:text-slate-700 lg:hidden"
          onClick={onMenuClick}
          aria-label="Alternar menu"
        >
          <Menu className="h-6 w-6" />
        </button>
        <button 
            onClick={onSearchClick}
            className="flex items-center gap-2 rounded-md border border-slate-300 bg-slate-50 px-3 py-1.5 text-sm text-slate-500 hover:bg-slate-100 hover:text-slate-700"
        >
            <Search size={16} />
            <span className="hidden sm:inline">Busca Rápida...</span>
            <kbd className="hidden sm:inline-block rounded border bg-white px-1.5 font-sans text-xs font-medium text-slate-400">⌘K</kbd>
        </button>
      </div>
      
      <div className="flex items-center space-x-4">
        <div className="relative" ref={notificationsRef}>
          <button 
            onClick={() => setIsNotificationsOpen(prev => !prev)}
            className="relative rounded-full p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
          >
            <Bell className="h-6 w-6" />
            {urgentTasksCount > 0 && (
              <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white">
                {urgentTasksCount}
              </span>
            )}
          </button>
          <NotificationsDropdown isOpen={isNotificationsOpen} onClose={() => setIsNotificationsOpen(false)} />
        </div>
        <div className="h-8 w-px bg-slate-200"></div>
        <div className="flex items-center space-x-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-sky-100 text-sky-600">
            <User className="h-6 w-6" />
          </div>
          <div className="hidden md:block">
            <p className="text-sm font-medium text-slate-700">Dr. Usuário</p>
            <p className="text-xs text-slate-500">Advogado</p>
          </div>
        </div>
      </div>
    </header>
  );
}
