import React, { createContext, useContext, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Check, AlertCircle } from 'lucide-react';
import { cn } from '../utils';

type ToastType = 'error' | 'success' | 'warning';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

const ToastContext = createContext<{
  showToast: (message: string, type?: ToastType) => void;
}>({ showToast: () => {} });

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = (message: string, type: ToastType = 'success') => {
    const id = Math.random().toString(36).substring(7);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, x: 100 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 100 }}
              className={cn(
                "p-4 rounded-xl shadow-lg border flex items-center gap-3 min-w-[250px]",
                toast.type === 'error' ? "bg-red-50 border-red-100 text-red-600" : 
                toast.type === 'warning' ? "bg-yellow-50 border-yellow-100 text-yellow-600" :
                "bg-green-50 border-green-100 text-green-600"
              )}
            >
              <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
                toast.type === 'error' ? "bg-red-500 text-white" : 
                toast.type === 'warning' ? "bg-yellow-500 text-white" :
                "bg-green-500 text-white"
              )}>
                {toast.type === 'error' ? <X className="w-4 h-4" /> : 
                 toast.type === 'warning' ? <AlertCircle className="w-4 h-4" /> :
                 <Check className="w-4 h-4" />}
              </div>
              <p className="font-medium text-sm">{toast.message}</p>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => useContext(ToastContext);
