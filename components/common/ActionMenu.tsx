import React, { useState, useRef, useEffect } from 'react';
import { MoreVertical } from 'lucide-react';

interface ActionMenuProps {
  children: React.ReactNode;
}

const ActionMenu: React.FC<ActionMenuProps> = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={menuRef}>
      <button onClick={() => setIsOpen(!isOpen)} className="p-2 rounded-full hover:bg-slate-200">
        <MoreVertical size={18} />
      </button>
      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-10 ring-1 ring-black ring-opacity-5">
          <div className="py-1" onClick={() => setIsOpen(false)}>
            {children}
          </div>
        </div>
      )}
    </div>
  );
};

export const ActionMenuItem: React.FC<{ icon: React.ReactNode; label: string; onClick: () => void; className?: string }> = ({ icon, label, onClick, className }) => (
  <button
    onClick={onClick}
    className={`w-full text-left flex items-center px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 ${className}`}
  >
    {icon}
    <span className="ml-2">{label}</span>
  </button>
);

export default ActionMenu;
