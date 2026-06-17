import React from 'react';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'default';
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  variant = 'danger',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!isOpen) return null;

  const confirmStyle =
    variant === 'danger'
      ? 'bg-red-600 hover:bg-red-700 text-white'
      : variant === 'warning'
      ? 'bg-amber-500 hover:bg-amber-600 text-white'
      : 'bg-primary hover:bg-primary/90 text-on-primary';

  const iconName =
    variant === 'danger' ? 'delete_forever' : variant === 'warning' ? 'warning' : 'info';

  const iconColor =
    variant === 'danger' ? 'text-red-600' : variant === 'warning' ? 'text-amber-500' : 'text-primary';

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 animate-fade-in">
      <div
        className="absolute inset-0 bg-primary/30 backdrop-blur-sm"
        onClick={onCancel}
        aria-hidden="true"
      />
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        className="relative bg-white max-w-sm w-full rounded-2xl p-6 shadow-2xl border border-outline-variant/20 z-10"
      >
        <div className="flex items-start gap-4 mb-4">
          <div className={`p-2.5 rounded-xl bg-surface-container-low shrink-0 ${iconColor}`}>
            <span className="material-symbols-outlined text-2xl">{iconName}</span>
          </div>
          <div>
            <h3 id="confirm-dialog-title" className="font-serif text-lg font-bold text-primary mb-1">
              {title}
            </h3>
            <p className="text-sm text-on-surface-variant leading-relaxed">{message}</p>
          </div>
        </div>

        <div className="flex gap-3 justify-end mt-6">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm font-bold text-on-surface-variant hover:bg-surface-container-low rounded-xl transition-colors cursor-pointer"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`px-5 py-2 text-sm font-bold rounded-xl transition-colors cursor-pointer shadow-sm ${confirmStyle}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
