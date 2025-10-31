import React from 'react';
import { Moon, Sun } from 'lucide-react';
import classNames from 'classnames';
import { useSettings } from '../../context/SettingsContext';

const ThemeToggle: React.FC = () => {
  const { theme, toggleTheme } = useSettings();

  const isDark = theme === 'dark';

  return (
    <button
      type="button"
      className={classNames('toggle-button', { 'toggle-button--active': isDark })}
      onClick={toggleTheme}
      aria-pressed={isDark}
      aria-label={isDark ? 'Ativar tema claro' : 'Ativar tema escuro'}
    >
      {isDark ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
      <span className="hidden lg:inline text-xs font-semibold">
        {isDark ? 'Escuro' : 'Claro'}
      </span>
    </button>
  );
};

export default ThemeToggle;
