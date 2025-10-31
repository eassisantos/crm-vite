import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Users, Briefcase, Scale, Calendar, FileText, DollarSign, Settings, X } from 'lucide-react';
import { useSettings } from '../../context/SettingsContext';
import useBreakpoint from '../../hooks/useBreakpoint';

interface SidebarProps {
    isOpen: boolean;
    onClose: () => void;
}

const NavItem: React.FC<{ to: string; icon: React.ReactNode; label: string; onClick?: () => void }> = ({ to, icon, label, onClick }) => {
  const activeClass = 'bg-slate-900 text-white shadow-inner';
  const inactiveClass = 'text-slate-300 hover:bg-slate-700/50 hover:text-white';

  return (
    <NavLink
      to={to}
      onClick={onClick}
      className={({ isActive }) =>
        `flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors duration-200 ${isActive ? activeClass : inactiveClass}`
      }
    >
      {icon}
      <span className="ml-3">{label}</span>
    </NavLink>
  );
};

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { brandingSettings, firmInfo } = useSettings();
  const isCollapsed = useBreakpoint(1024, 'max');
  const shouldShowSidebar = !isCollapsed || isOpen;

  return (
    <>
        {/* Overlay for mobile */}
        <div
            className={`fixed inset-0 bg-black bg-opacity-50 z-20 lg:hidden transition-opacity ${shouldShowSidebar ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
            onClick={onClose}
        ></div>

        <aside className={`fixed inset-y-0 left-0 w-64 bg-slate-800 text-white flex flex-col p-4 transform transition-transform duration-300 ease-in-out z-30 ${shouldShowSidebar ? 'translate-x-0' : '-translate-x-full'} lg:relative lg:translate-x-0 lg:w-64 lg:flex-shrink-0`}>
            <div className="flex items-center justify-between mb-6 px-2 h-16 border-b border-slate-700 -m-4 p-4">
                <div className="flex items-center min-w-0">
                    {brandingSettings.logo ? (
                        <img src={brandingSettings.logo} alt="Logo do Escritório" className="h-8 w-auto" />
                    ) : (
                        <Scale className="h-8 w-8 text-sky-400 flex-shrink-0" />
                    )}
                    <h1 className="ml-3 text-lg font-bold tracking-tight truncate" title={firmInfo.name}>{firmInfo.name}</h1>
                </div>
                <button onClick={onClose} className="lg:hidden p-1 text-slate-400 hover:text-white">
                    <X size={24} />
                </button>
            </div>
            
            <nav className="flex-1 space-y-1.5 mt-4">
                <NavItem to="/" icon={<LayoutDashboard size={20} />} label="Dashboard" onClick={onClose} />
                <NavItem to="/clientes" icon={<Users size={20} />} label="Clientes" onClick={onClose} />
                <NavItem to="/casos" icon={<Briefcase size={20} />} label="Casos" onClick={onClose} />
                <NavItem to="/agenda" icon={<Calendar size={20} />} label="Agenda" onClick={onClose} />
                <NavItem to="/financeiro" icon={<DollarSign size={20} />} label="Financeiro" onClick={onClose} />
                <NavItem to="/modelos" icon={<FileText size={20} />} label="Modelos" onClick={onClose} />
            </nav>

            <div className="mt-auto">
                <hr className="my-3 border-slate-700" />
                <NavItem to="/configuracoes" icon={<Settings size={20} />} label="Configurações" onClick={onClose} />
                <div className="text-center text-xs text-slate-500 mt-6 px-2">
                    <p className="font-semibold text-slate-400">CRM Jurídico AI</p>
                    <p>&copy; {new Date().getFullYear()} &bull; v2.2.0</p>
                </div>
            </div>
        </aside>
    </>
  );
};

export default Sidebar;
