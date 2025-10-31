import React, { createContext, useContext, useState, ReactNode, useMemo } from 'react';
import { ToastMessage, ToastType } from '../types';

interface ToastContextType {
  addToast: (message: string, type: ToastType) => void;
  removeToast: (id: number) => void;
  toasts: ToastMessage[];
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const defaultMessages = useMemo<Record<ToastType, string>>(
    () => ({
      success: 'Operação realizada com sucesso!',
      error: 'Não foi possível concluir a ação. Tente novamente.',
      info: 'Ação registrada.',
      warning: 'Revise as informações e tente novamente.',
    }),
    [],
  );

  const removeToast = (id: number) => {
    // First, trigger the closing animation
    setToasts(currentToasts =>
      currentToasts.map(toast =>
        toast.id === id ? { ...toast, closing: true } : toast
      )
    );
    // Then, remove the toast from state after the animation duration
    setTimeout(() => {
      setToasts(currentToasts => currentToasts.filter(toast => toast.id !== id));
    }, 500); // Corresponds to animation duration
  };

  const addToast = (message: string, type: ToastType) => {
    const id = Date.now();
    const normalizedMessage = message.trim() || defaultMessages[type] || defaultMessages.info;
    setToasts(prev => [...prev, { id, message: normalizedMessage, type, closing: false }]);
    setTimeout(() => {
      removeToast(id);
    }, 5000); // Auto-dismiss after 5 seconds
  };

  return (
    <ToastContext.Provider value={{ addToast, removeToast, toasts }}>
      {children}
    </ToastContext.Provider>
  );
};

export const useToast = (): ToastContextType => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
