import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { CheckCircle, AlertCircle, AlertTriangle, X } from 'lucide-react';

type ToastType = 'success' | 'error' | 'warning';

interface Toast {
  id: number;
  type: ToastType;
  message: string;
}

interface ToastCtx {
  toast: (type: ToastType, message: string) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  warning: (message: string) => void;
}

const ToastContext = createContext<ToastCtx | null>(null);

export const useToast = (): ToastCtx => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const counter = useRef(0);

  const remove = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback((type: ToastType, message: string) => {
    const id = ++counter.current;
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => remove(id), 4500);
  }, [remove]);

  const success = useCallback((msg: string) => toast('success', msg), [toast]);
  const error = useCallback((msg: string) => toast('error', msg), [toast]);
  const warning = useCallback((msg: string) => toast('warning', msg), [toast]);

  const iconMap = {
    success: <CheckCircle size={16} color="#16A34A" />,
    error: <AlertCircle size={16} color="#DC2626" />,
    warning: <AlertTriangle size={16} color="#D97706" />,
  };

  const borderMap = {
    success: '#16A34A',
    error: '#DC2626',
    warning: '#D97706',
  };

  return (
    <ToastContext.Provider value={{ toast, success, error, warning }}>
      {children}
      {toasts.length > 0 && (
        <div className="toast-container">
          {toasts.map((t) => (
            <div
              key={t.id}
              className="toast"
              style={{ borderLeft: `4px solid ${borderMap[t.type]}` }}
            >
              {iconMap[t.type]}
              <span style={{ flex: 1, fontSize: '0.8125rem', color: '#111827' }}>{t.message}</span>
              <button
                type="button"
                onClick={() => remove(t.id)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#9CA3AF',
                  padding: '2px',
                  display: 'flex',
                }}
                aria-label="Fermer"
              >
                <X size={13} />
              </button>
            </div>
          ))}
        </div>
      )}
    </ToastContext.Provider>
  );
};
