import React, { useState, useMemo } from 'react';
import { Case, CaseStatus } from '../../types';
import { useClients } from '../../context/ClientsContext';
import { useSettings } from '../../context/SettingsContext';
import { useCases } from '../../context/CasesContext';
import { useToast } from '../../context/ToastContext';

const getErrorMessage = (error: unknown, fallback: string) =>
  error instanceof Error && error.message ? error.message : fallback;
import { Link } from 'react-router-dom';
import { Gavel, Scale, User } from 'lucide-react';

interface KanbanCardProps {
  caseData: Case;
  onDragStart: (e: React.DragEvent<HTMLDivElement>, caseId: string) => void;
}

const KanbanCard: React.FC<KanbanCardProps> = ({ caseData, onDragStart }) => {
  const { getClientById } = useClients();
  const client = getClientById(caseData.clientId);

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, caseData.id)}
      className="mb-3 cursor-grab rounded-lg border bg-white p-4 shadow-sm transition-shadow hover:shadow-md active:cursor-grabbing"
    >
      <div className="mb-2 flex items-center justify-between">
        <Link to={`/casos/${caseData.id}`} className="font-semibold text-sky-700 hover:underline">
          {caseData.title}
        </Link>
        {caseData.nature === 'Judicial' ? (
          <Gavel size={16} className="text-purple-600" title="Judicial" />
        ) : (
          <Scale size={16} className="text-teal-600" title="Administrativo" />
        )}
      </div>
      <p className="text-sm text-slate-600">{caseData.caseNumber || 'Sem número'}</p>
      <div className="mt-3 flex items-center justify-between border-t pt-3">
        <div className="flex items-center text-sm text-slate-500">
          <User size={14} className="mr-1.5" />
          <span>{client?.name || 'N/A'}</span>
        </div>
        <span className="text-xs text-slate-400">
          {new Date(caseData.lastUpdate + 'T00:00:00').toLocaleDateString('pt-BR')}
        </span>
      </div>
    </div>
  );
};

interface KanbanColumnProps {
  status: CaseStatus;
  cases: Case[];
  onDragStart: (e: React.DragEvent<HTMLDivElement>, caseId: string) => void;
  onDrop: (e: React.DragEvent<HTMLDivElement>, status: CaseStatus) => void;
}

const KanbanColumn: React.FC<KanbanColumnProps> = ({ status, cases, onDragStart, onDrop }) => {
  const [isOver, setIsOver] = useState(false);

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsOver(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsOver(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    onDrop(e, status);
    setIsOver(false);
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`flex w-80 flex-shrink-0 flex-col rounded-xl bg-slate-100 transition-colors ${isOver ? 'bg-sky-100' : ''}`}
    >
      <div className="flex items-center justify-between rounded-t-xl bg-slate-200 p-3">
        <h3 className="font-semibold text-slate-700">{status}</h3>
        <span className="text-sm font-bold text-slate-500">{cases.length}</span>
      </div>
      <div className="h-full min-h-[200px] overflow-y-auto p-3">
        {cases.map(c => (
          <KanbanCard key={c.id} caseData={c} onDragStart={onDragStart} />
        ))}
      </div>
    </div>
  );
};

interface CaseKanbanViewProps {
  cases: Case[];
}

const CaseKanbanView: React.FC<CaseKanbanViewProps> = ({ cases }) => {
  const { caseStatuses } = useSettings();
  const { saveCase } = useCases();
  const { addToast } = useToast();

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, caseId: string) => {
    e.dataTransfer.setData('caseId', caseId);
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>, newStatus: CaseStatus) => {
    const caseId = e.dataTransfer.getData('caseId');
    const caseToUpdate = cases.find(c => c.id === caseId);
    if (caseToUpdate && caseToUpdate.status !== newStatus) {
      try {
        await saveCase({ ...caseToUpdate, status: newStatus });
        addToast('Status do caso atualizado!', 'success');
      } catch (error) {
        addToast(getErrorMessage(error, 'Não foi possível mover o caso. Tente novamente.'), 'error');
      }
    }
  };

  const casesByStatus = useMemo(() => {
    return caseStatuses.reduce((acc, status) => {
      acc[status] = cases.filter(c => c.status === status);
      return acc;
    }, {} as Record<CaseStatus, Case[]>);
  }, [caseStatuses, cases]);

  return (
    <div className="flex h-full gap-6 overflow-x-auto pb-4">
      {caseStatuses.map(status => (
        <KanbanColumn
          key={status}
          status={status}
          cases={casesByStatus[status] || []}
          onDragStart={handleDragStart}
          onDrop={handleDrop}
        />
      ))}
    </div>
  );
};

export default CaseKanbanView;
