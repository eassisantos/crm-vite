
import React from 'react';
import { useCrmData } from '../../context/CrmContext';
import { Fee } from '../../types';
import { X, Check, Circle } from 'lucide-react';
import { useToast } from '../../context/ToastContext';

interface InstallmentManagerModalProps {
  fee: Fee;
  onClose: () => void;
}

const InstallmentManagerModal: React.FC<InstallmentManagerModalProps> = ({ fee, onClose }) => {
  const { updateInstallmentStatus } = useCrmData();
  const { addToast } = useToast();

  if (!fee.installments) return null;

  const handleStatusChange = (installmentId: string, newStatus: 'Pago' | 'Pendente') => {
    updateInstallmentStatus(fee.id, installmentId, newStatus);
    addToast('Status da parcela atualizado!', 'success');
  };

  const paidAmount = fee.installments.filter(i => i.status === 'Pago').reduce((sum, i) => sum + i.amount, 0);
  const remainingAmount = fee.amount - paidAmount;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4" aria-modal="true" role="dialog">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="p-6 border-b flex justify-between items-center">
          <h2 className="text-2xl font-bold text-slate-800">Gerenciar Parcelas</h2>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-slate-100"><X size={24} className="text-slate-600" /></button>
        </div>
        <div className="p-6 border-b grid grid-cols-3 gap-4 text-center">
            <div><p className="text-sm text-slate-500">Valor Total</p><p className="font-bold text-lg text-slate-800">R$ {fee.amount.toFixed(2)}</p></div>
            <div><p className="text-sm text-slate-500">Valor Pago</p><p className="font-bold text-lg text-emerald-600">R$ {paidAmount.toFixed(2)}</p></div>
            <div><p className="text-sm text-slate-500">Valor Restante</p><p className="font-bold text-lg text-red-600">R$ {remainingAmount.toFixed(2)}</p></div>
        </div>
        <div className="flex-1 p-6 overflow-y-auto">
          <h3 className="font-semibold mb-4">Parcelas de: {fee.description}</h3>
          <ul className="space-y-2">
            {fee.installments.map((inst, index) => (
              <li key={inst.id} className="flex items-center justify-between p-3 rounded-lg bg-slate-50">
                <div>
                  <p className="font-medium text-slate-800">{index + 1}ª Parcela - R$ {inst.amount.toFixed(2)}</p>
                  <p className="text-sm text-slate-500">Vencimento: {new Date(inst.dueDate + 'T00:00:00').toLocaleDateString('pt-BR')}</p>
                </div>
                <div className="flex items-center">
                  <span className={`mr-4 text-sm font-semibold ${inst.status === 'Pago' ? 'text-emerald-600' : 'text-yellow-600'}`}>{inst.status}</span>
                  <button 
                    onClick={() => handleStatusChange(inst.id, inst.status === 'Pendente' ? 'Pago' : 'Pendente')}
                    className={`p-2 rounded-full transition-colors ${inst.status === 'Pago' ? 'bg-emerald-500 text-white hover:bg-emerald-600' : 'bg-slate-200 text-slate-600 hover:bg-slate-300'}`}
                  >
                    {inst.status === 'Pago' ? <Check size={16} /> : <Circle size={16} />}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
        <div className="p-6 bg-slate-100 border-t flex justify-end">
          <button onClick={onClose} className="px-4 py-2 bg-sky-600 border border-transparent rounded-md shadow-sm text-sm font-medium text-white hover:bg-sky-700">Fechar</button>
        </div>
      </div>
    </div>
  );
};

export default InstallmentManagerModal;
