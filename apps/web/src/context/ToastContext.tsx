import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { CheckCircle2, CircleAlert, Info, TriangleAlert, X } from 'lucide-react';
import { subscribeNotify, type NotifyTone } from '../lib/notify';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: number;
  type: ToastType;
  message: string;
  title?: string;
  duration: number;
}

interface ToastCtx {
  toast: (type: ToastType, message: string, options?: { title?: string; duration?: number }) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  warning: (message: string) => void;
  info: (message: string) => void;
}

const ToastContext = createContext<ToastCtx | null>(null);

const MAX_VISIBLE = 4;
const DEFAULT_DURATION = 4500;
const ERROR_DURATION = 7000;

const ICONS: Record<ToastType, React.ReactNode> = {
  success: <CheckCircle2 size={17} />,
  error: <CircleAlert size={17} />,
  warning: <TriangleAlert size={17} />,
  info: <Info size={17} />,
};

export const useToast = (): ToastCtx => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
};

/** One toast: closes itself after `duration`, paused while hovered or focused. */
const ToastItem: React.FC<{ toast: Toast; onClose: (id: number) => void }> = ({ toast, onClose }) => {
  const [paused, setPaused] = useState(false);
  const remaining = useRef(toast.duration);
  const startedAt = useRef(Date.now());

  useEffect(() => {
    if (paused) return undefined;
    startedAt.current = Date.now();
    const timer = window.setTimeout(() => onClose(toast.id), remaining.current);
    return () => {
      window.clearTimeout(timer);
      remaining.current = Math.max(800, remaining.current - (Date.now() - startedAt.current));
    };
  }, [paused, onClose, toast.id]);

  return (
    <div
      className={`toast toast-${toast.type}`}
      role={toast.type === 'error' ? 'alert' : 'status'}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <span className="toast-icon" aria-hidden="true">{ICONS[toast.type]}</span>
      <div className="toast-content">
        {toast.title ? <div className="toast-title">{toast.title}</div> : null}
        <div className="toast-message">{toast.message}</div>
      </div>
      <button type="button" className="toast-close" onClick={() => onClose(toast.id)} aria-label="Fermer la notification" title="Fermer">
        <X size={14} aria-hidden="true" />
      </button>
    </div>
  );
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const counter = useRef(0);

  const remove = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback<ToastCtx['toast']>((type, message, options = {}) => {
    const id = ++counter.current;
    const duration = options.duration ?? (type === 'error' ? ERROR_DURATION : DEFAULT_DURATION);
    setToasts((prev) => [...prev, { id, type, message, title: options.title, duration }].slice(-MAX_VISIBLE));
  }, []);

  const success = useCallback((msg: string) => toast('success', msg), [toast]);
  const error = useCallback((msg: string) => toast('error', msg), [toast]);
  const warning = useCallback((msg: string) => toast('warning', msg), [toast]);
  const info = useCallback((msg: string) => toast('info', msg), [toast]);

  // Notifications emitted outside React (utils, services) through lib/notify.
  useEffect(() => subscribeNotify(({ tone, message, title, duration }) => {
    toast(tone as NotifyTone, message, { title, duration });
  }), [toast]);

  return (
    <ToastContext.Provider value={{ toast, success, error, warning, info }}>
      {children}
      <div className="toast-container" aria-live="polite" aria-relevant="additions">
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onClose={remove} />
        ))}
      </div>
    </ToastContext.Provider>
  );
};
