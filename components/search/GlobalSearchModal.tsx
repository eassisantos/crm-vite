import React, { useState, useMemo, useEffect } from 'react';
import { useClients } from '../../context/ClientsContext';
import { useCases } from '../../context/CasesContext';
import { Link, useNavigate } from 'react-router-dom';
import { X, Search, User, Briefcase } from 'lucide-react';

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({ isOpen, onClose }) => {
  const { clients } = useClients();
  const { cases } = useCases();
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();

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
    <div className="fixed inset-0 bg-black bg-opacity-60 z-[100] flex justify-center items-start pt-20 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl" onClick={e => e.stopPropagation()}>
        <div className="relative">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            autoFocus
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
                      <li key={client.id} onClick={() => handleNavigate(`/clientes`)} className="flex items-center gap-3 rounded-md p-2 text-sm hover:bg-sky-100 cursor-pointer">
                        <User className="h-5 w-5 flex-shrink-0 text-slate-500" />
                        <div>
                          <p className="font-medium text-slate-800">{client.name}</p>
                          <p className="text-slate-500">{client.cpf}</p>
                        </div>
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
                      <li key={c.id} onClick={() => handleNavigate(`/casos/${c.id}`)} className="flex items-center gap-3 rounded-md p-2 text-sm hover:bg-sky-100 cursor-pointer">
                        <Briefcase className="h-5 w-5 flex-shrink-0 text-slate-500" />
                        <div>
                          <p className="font-medium text-slate-800">{c.title}</p>
                          <p className="text-slate-500">{c.caseNumber}</p>
                        </div>
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
