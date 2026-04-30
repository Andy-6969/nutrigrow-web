'use client';

import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';
import { cn } from '@/shared/lib/utils';

/* ─── Types ─────────────────────────────────────────────────── */
export type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
}

interface ToastContextValue {
  toast: (opts: Omit<Toast, 'id'>) => void;
  success: (title: string, message?: string) => void;
  error:   (title: string, message?: string) => void;
  warning: (title: string, message?: string) => void;
  info:    (title: string, message?: string) => void;
}

/* ─── Context ───────────────────────────────────────────────── */
const ToastContext = createContext<ToastContextValue | null>(null);

/* ─── Config ────────────────────────────────────────────────── */
const ICONS: Record<ToastType, React.ElementType> = {
  success: CheckCircle,
  error:   XCircle,
  warning: AlertTriangle,
  info:    Info,
};

const STYLES: Record<ToastType, { icon: string; bar: string; bg: string; border: string }> = {
  success: { icon: 'text-emerald-500', bar: 'bg-emerald-500', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30' },
  error:   { icon: 'text-red-500',     bar: 'bg-red-500',     bg: 'bg-red-500/10',     border: 'border-red-500/30'     },
  warning: { icon: 'text-amber-500',   bar: 'bg-amber-500',   bg: 'bg-amber-500/10',   border: 'border-amber-500/30'   },
  info:    { icon: 'text-blue-500',    bar: 'bg-blue-500',    bg: 'bg-blue-500/10',    border: 'border-blue-500/30'    },
};

/* ─── Single Toast Item ─────────────────────────────────────── */
function ToastItem({ toast, onRemove }: { toast: Toast; onRemove: (id: string) => void }) {
  const [visible, setVisible] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const style = STYLES[toast.type];
  const Icon  = ICONS[toast.type];
  const dur   = toast.duration ?? 4000;

  useEffect(() => {
    // Mount animation
    const showTimer = setTimeout(() => setVisible(true), 10);
    // Auto dismiss
    const dismissTimer = setTimeout(() => {
      setLeaving(true);
      setTimeout(() => onRemove(toast.id), 300);
    }, dur);
    return () => { clearTimeout(showTimer); clearTimeout(dismissTimer); };
  }, [toast.id, dur, onRemove]);

  const handleClose = () => {
    setLeaving(true);
    setTimeout(() => onRemove(toast.id), 300);
  };

  return (
    <div
      className={cn(
        'relative w-full max-w-sm rounded-2xl border backdrop-blur-md shadow-2xl overflow-hidden transition-all duration-300',
        style.bg, style.border,
        visible && !leaving  ? 'opacity-100 translate-x-0'  : 'opacity-0 translate-x-full',
      )}
      style={{ background: 'var(--glass-bg)' }}
    >
      {/* Progress bar */}
      <div className={cn('absolute top-0 left-0 h-0.5 rounded-full', style.bar)}
        style={{ animation: `shrink ${dur}ms linear forwards` }} />

      <div className="flex items-start gap-3 p-4">
        <Icon className={cn('w-5 h-5 shrink-0 mt-0.5', style.icon)} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold" style={{ color: 'var(--surface-text)' }}>{toast.title}</p>
          {toast.message && (
            <p className="text-xs mt-0.5" style={{ color: 'var(--surface-text-muted)' }}>{toast.message}</p>
          )}
        </div>
        <button onClick={handleClose} className="p-0.5 rounded-lg hover:bg-white/20 transition-colors shrink-0">
          <X className="w-3.5 h-3.5" style={{ color: 'var(--surface-text-muted)' }} />
        </button>
      </div>

      <style>{`
        @keyframes shrink {
          from { width: 100%; }
          to   { width: 0%; }
        }
      `}</style>
    </div>
  );
}

/* ─── Provider ──────────────────────────────────────────────── */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const remove = useCallback((id: string) => {
    setToasts(p => p.filter(t => t.id !== id));
  }, []);

  const toast = useCallback((opts: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).slice(2);
    setToasts(p => [...p.slice(-4), { ...opts, id }]); // max 5 toasts
  }, []);

  const success = useCallback((title: string, message?: string) => toast({ type: 'success', title, message }), [toast]);
  const error   = useCallback((title: string, message?: string) => toast({ type: 'error',   title, message }), [toast]);
  const warning = useCallback((title: string, message?: string) => toast({ type: 'warning', title, message }), [toast]);
  const info    = useCallback((title: string, message?: string) => toast({ type: 'info',    title, message }), [toast]);

  return (
    <ToastContext.Provider value={{ toast, success, error, warning, info }}>
      {children}
      {/* Toast container */}
      <div className="fixed bottom-6 right-6 z-[999] flex flex-col gap-2 items-end pointer-events-none">
        {toasts.map(t => (
          <div key={t.id} className="pointer-events-auto">
            <ToastItem toast={t} onRemove={remove} />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

/* ─── Hook ──────────────────────────────────────────────────── */
export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>');
  return ctx;
}
