import React, { useState, useEffect, useCallback } from 'react';
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastMessage {
  id: string;
  title: string;
  message?: string;
  type?: ToastType;
  duration?: number;
}

export interface ToastOptions {
  title: string;
  message?: string;
  type?: ToastType;
  duration?: number;
}

export const showToast = (options: ToastOptions) => {
  const event = new CustomEvent<ToastMessage>('brandimp-toast', {
    detail: {
      id: Math.random().toString(36).substring(2, 9),
      type: 'info',
      duration: 4000,
      ...options,
    },
  });
  window.dispatchEvent(event);
};

export function ToastContainer() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  useEffect(() => {
    const handleAddToast = (event: Event) => {
      const customEvent = event as CustomEvent<ToastMessage>;
      setToasts((prev) => [...prev, customEvent.detail]);
    };

    window.addEventListener('brandimp-toast', handleAddToast);
    return () => window.removeEventListener('brandimp-toast', handleAddToast);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <div className="fixed top-5 right-5 z-50 flex flex-col gap-3 max-w-sm w-full px-4 sm:px-0 pointer-events-none">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onClose={() => removeToast(toast.id)} />
      ))}
    </div>
  );
}

function ToastItem({ toast, onClose }: { toast: ToastMessage; onClose: () => void }) {
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsExiting(true);
      setTimeout(onClose, 200);
    }, toast.duration || 4000);

    return () => clearTimeout(timer);
  }, [toast.duration, onClose]);

  const handleManualClose = () => {
    setIsExiting(true);
    setTimeout(onClose, 200);
  };

  const typeStyles = {
    success: {
      bg: 'bg-[var(--bg-surface)] border-emerald-500/40 text-emerald-600 dark:text-emerald-400',
      icon: <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />,
      bar: 'bg-emerald-500',
    },
    error: {
      bg: 'bg-[var(--bg-surface)] border-red-500/40 text-red-600 dark:text-red-400',
      icon: <XCircle className="w-5 h-5 text-red-500 shrink-0" />,
      bar: 'bg-red-500',
    },
    warning: {
      bg: 'bg-[var(--bg-surface)] border-amber-500/40 text-amber-600 dark:text-amber-400',
      icon: <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />,
      bar: 'bg-amber-500',
    },
    info: {
      bg: 'bg-[var(--bg-surface)] border-[#59BFCB]/40 text-[#59BFCB]',
      icon: <Info className="w-5 h-5 text-[#59BFCB] shrink-0" />,
      bar: 'bg-[#59BFCB]',
    },
  };

  const style = typeStyles[toast.type || 'info'];

  return (
    <div
      className={`pointer-events-auto flex items-start gap-3 p-4 rounded-2xl border shadow-lg transition-all duration-300 ${
        style.bg
      } ${
        isExiting
          ? 'opacity-0 translate-x-12 scale-95'
          : 'opacity-100 translate-x-0 scale-100 animate-slide-up'
      }`}
    >
      {style.icon}
      <div className="flex-1 min-w-0">
        <h4 className="font-bold text-sm text-[var(--text-primary)]">{toast.title}</h4>
        {toast.message && (
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">{toast.message}</p>
        )}
      </div>
      <button
        onClick={handleManualClose}
        className="text-[var(--text-muted)] hover:text-[var(--text-primary)] p-1 rounded-lg transition-colors cursor-pointer"
        aria-label="Cerrar notificación"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
