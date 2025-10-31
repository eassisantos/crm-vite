import React, { useState, useRef, useEffect } from 'react';
import { Menu, User, Bell, Search } from 'lucide-react';
import NotificationsDropdown from './NotificationsDropdown';
import { useCases } from '../../context/CasesContext';
import classNames from 'classnames';
import ThemeToggle from '../common/ThemeToggle';
import DensityToggle from '../common/DensityToggle';
import { useSettings } from '../../context/SettingsContext';

interface HeaderProps {
  onMenuClick: () => void;
  onSearchClick: () => void;
}

export default function Header({ onMenuClick, onSearchClick }: HeaderProps) {
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const { getUrgentTasks } = useCases();
  const urgentTasksCount = getUrgentTasks().length;
  const notificationsRef = useRef<HTMLDivElement>(null);
  const { density } = useSettings();

  const headerClassName = classNames(
    'app-header flex flex-shrink-0 items-center justify-between bg-surface shadow-soft z-10 border-b border-subtle',
    'transition-[height,padding] duration-300',
    {
      'h-14 px-4 gap-4': density === 'compact',
      'h-16 px-6 gap-6': density === 'default',
      'h-20 px-8 gap-8': density === 'spacious',
    },
  );

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
    <header className={headerClassName}>
      <div className="flex items-center gap-4">
        <button
          type="button"
          className="icon-button lg:hidden"
          onClick={onMenuClick}
          aria-label="Alternar menu"
        >
          <Menu className="h-6 w-6" />
        </button>
        <button
            onClick={onSearchClick}
            className="flex items-center gap-2 rounded-full border border-subtle bg-surface px-3 py-1.5 text-sm text-secondary shadow-soft transition-colors duration-200 hover:bg-surface-muted hover:text-primary"
        >
            <Search size={16} />
            <span className="hidden sm:inline">Busca Rápida...</span>
            <kbd className="hidden sm:inline-block rounded border bg-white px-1.5 font-sans text-xs font-medium text-slate-400">⌘K</kbd>
        </button>
      </div>

      <div className="app-actions">
        <ThemeToggle />
        <DensityToggle />
        <div className="relative" ref={notificationsRef}>
          <button
            onClick={() => setIsNotificationsOpen(prev => !prev)}
            className="relative icon-button"
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
        <div className="h-8 w-px bg-surface-muted"></div>
        <div className="flex items-center space-x-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-sky-100 text-sky-600">
            <User className="h-6 w-6" />
          </div>
          <div className="hidden md:block">
            <p className="text-sm font-medium text-primary">Dr. Usuário</p>
            <p className="text-xs text-secondary">Advogado</p>
          </div>
        </div>
      </div>
    </header>
  );
}
