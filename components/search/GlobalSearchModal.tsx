import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useClients } from '../../context/ClientsContext';
import { useCases } from '../../context/CasesContext';
import { useNavigate } from 'react-router-dom';
import { X, Search, User, Briefcase } from 'lucide-react';
import { useModalAccessibility } from '../../hooks/useModalAccessibility';

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({ isOpen, onClose }) => {
  const { clients } = useClients();
  const { cases } = useCases();
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();
  const dialogRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useModalAccessibility(isOpen, dialogRef, { onClose, initialFocusRef: searchInputRef });

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
        event.preventDefault();
        // This modal is controlled by App.tsx, this is just a fallback
        // The parent component should handle opening.
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const searchResults = useMemo(() => {
    if (!searchTerm.trim()) {
      return { clients: [], cases: [] };
    }
    const lowercasedTerm = searchTerm.toLowerCase();
    const foundClients = clients.filter(c =>
      c.name.toLowerCase().includes(lowercasedTerm) ||
      c.cpf.includes(lowercasedTerm)
    ).slice(0, 5);

    const foundCases = cases.filter(c =>
      c.title.toLowerCase().includes(lowercasedTerm) ||
      (c.caseNumber && c.caseNumber.toLowerCase().includes(lowercasedTerm))
    ).slice(0, 5);

    return { clients: foundClients, cases: foundCases };
  }, [searchTerm, clients, cases]);

  const handleNavigate = (path: string) => {
    navigate(path);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-60 z-[100] flex justify-center items-start pt-20 p-4"
      role="presentation"
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        className="bg-white rounded-xl shadow-2xl w-full max-w-2xl focus:outline-none"
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="global-search-modal-title"
        aria-describedby="global-search-modal-description"
        tabIndex={-1}
      >
        <div className="flex justify-between items-center px-4 pt-4">
          <h2 className="text-lg font-semibold text-slate-800" id="global-search-modal-title">
            Busca rápida
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full text-slate-500 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-400"
            aria-label="Fechar busca global"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>
        <p id="global-search-modal-description" className="sr-only">
          Digite para localizar rapidamente clientes e casos.
        </p>
        <div className="relative">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            ref={searchInputRef}
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Buscar clientes, casos, documentos..."
            className="w-full rounded-t-xl border-0 border-b border-slate-200 bg-transparent py-4 pl-12 pr-4 text-lg text-slate-800 placeholder:text-slate-400 focus:ring-0"
          />
        </div>
        <div className="max-h-[60vh] overflow-y-auto p-2">
          {searchTerm.trim() && (
            <>
              {searchResults.clients.length > 0 && (
                <div className="p-2">
                  <h3 className="px-2 text-xs font-semibold uppercase text-slate-500">Clientes</h3>
                  <ul className="mt-2 space-y-1">
                    {searchResults.clients.map(client => (
                      <li key={client.id}>
                        <button
                          type="button"
                          onClick={() => handleNavigate(`/clientes`)}
                          className="flex w-full items-center gap-3 rounded-md p-2 text-sm hover:bg-sky-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-sky-500"
                        >
                          <User className="h-5 w-5 flex-shrink-0 text-slate-500" aria-hidden="true" />
                          <div className="text-left">
                            <p className="font-medium text-slate-800">{client.name}</p>
                            <p className="text-slate-500">{client.cpf}</p>
                          </div>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {searchResults.cases.length > 0 && (
                <div className="p-2">
                  <h3 className="px-2 text-xs font-semibold uppercase text-slate-500">Casos</h3>
                  <ul className="mt-2 space-y-1">
                    {searchResults.cases.map(c => (
                      <li key={c.id}>
                        <button
                          type="button"
                          onClick={() => handleNavigate(`/casos/${c.id}`)}
                          className="flex w-full items-center gap-3 rounded-md p-2 text-sm hover:bg-sky-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-sky-500"
                        >
                          <Briefcase className="h-5 w-5 flex-shrink-0 text-slate-500" aria-hidden="true" />
                          <div className="text-left">
                            <p className="font-medium text-slate-800">{c.title}</p>
                            <p className="text-slate-500">{c.caseNumber}</p>
                          </div>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {searchResults.clients.length === 0 && searchResults.cases.length === 0 && (
                <div className="p-8 text-center text-slate-500">
                  <p>Nenhum resultado encontrado para "{searchTerm}"</p>
                </div>
              )}
            </>
          )}
          {!searchTerm.trim() && (
            <div className="p-8 text-center text-slate-500">
              <p>Comece a digitar para buscar em todo o sistema.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GlobalSearchModal;
