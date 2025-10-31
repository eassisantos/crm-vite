import React from 'react';
import { useToast } from '../../context/ToastContext';
import { CheckCircle, XCircle, Info, X } from 'lucide-react';
import { ToastMessage, ToastType } from '../../types';

const icons: Record<ToastType, React.ReactNode> = {
  success: <CheckCircle className="text-emerald-500" />,
  error: <XCircle className="text-red-500" />,
  info: <Info className="text-sky-500" />,
};

const Toast: React.FC<ToastMessage & { onClose: () => void }> = ({ message, type, closing, onClose }) => {
  const animationClass = closing ? 'animate-fade-out-right' : 'animate-fade-in-right';

  return (
    <div role="alert" className={`flex items-center bg-white shadow-lg rounded-lg p-4 w-full max-w-sm ${animationClass}`}>
      <div>{icons[type]}</div>
      <p className="ml-3 text-sm font-medium text-slate-700">{message}</p>
      <button onClick={onClose} className="ml-auto -mx-1.5 -my-1.5 bg-white text-slate-400 hover:text-slate-900 rounded-lg focus:ring-2 focus:ring-slate-300 p-1.5 hover:bg-slate-100 inline-flex h-8 w-8">
        <X size={20} />
      </button>
    </div>
  );
};

const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useToast();

  const handleClose = (id: number) => {
    removeToast(id);
  };

  return (
    <div className="fixed top-5 right-5 z-[100] space-y-3">
      {toasts.map(toast => (
        <Toast key={toast.id} {...toast} onClose={() => handleClose(toast.id)} />
      ))}
    </div>
  );
};

export default ToastContainer;
