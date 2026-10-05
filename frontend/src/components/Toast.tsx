import React, { useEffect } from 'react';
import { CheckCircle2, AlertTriangle, AlertOctagon, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'warning' | 'error' | 'info';

export interface ToastProps {
  id?: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
  onClose?: () => void;
  className?: string;
}

export const Toast: React.FC<ToastProps> = ({
  type,
  title,
  message,
  duration = 4000,
  onClose,
  className = '',
}) => {
  useEffect(() => {
    if (!duration || !onClose) return;
    const timer = setTimeout(() => {
      onClose();
    }, duration);
    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircle2 className="w-5 h-5 text-[var(--color-success)] shrink-0" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-[var(--color-warning)] shrink-0" />;
      case 'error':
        return <AlertOctagon className="w-5 h-5 text-[var(--color-danger)] shrink-0" />;
      case 'info':
      default:
        return <Info className="w-5 h-5 text-[var(--color-info)] shrink-0" />;
    }
  };

  const getBorderColor = () => {
    switch (type) {
      case 'success':
        return 'border-[var(--color-success)]/40 bg-[var(--color-surface)]';
      case 'warning':
        return 'border-[var(--color-warning)]/40 bg-[var(--color-surface)]';
      case 'error':
        return 'border-[var(--color-danger)]/40 bg-[var(--color-surface)]';
      case 'info':
      default:
        return 'border-[var(--color-accent)]/40 bg-[var(--color-surface)]';
    }
  };

  return (
    <div
      role={type === 'error' ? 'alert' : 'status'}
      aria-live="polite"
      className={`fixed bottom-6 right-6 z-50 max-w-sm w-full p-4 rounded-2xl border shadow-2xl backdrop-blur-md flex items-start gap-3 transition-all ${getBorderColor()} ${className}`}
      data-testid="toast"
    >
      <div className="mt-0.5">{getIcon()}</div>
      <div className="flex-1 pr-2">
        <h4 className="text-sm font-bold text-[var(--color-text-primary)]">{title}</h4>
        {message && (
          <p className="text-xs text-[var(--color-text-secondary)] mt-0.5 leading-relaxed">
            {message}
          </p>
        )}
      </div>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          className="p-1 rounded-lg hover:bg-[var(--color-bg-secondary)] text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] transition-colors min-h-[32px] min-w-[32px] flex items-center justify-center"
          aria-label="Dismiss notification"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};
