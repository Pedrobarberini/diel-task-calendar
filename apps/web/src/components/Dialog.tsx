import { useEffect, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';

interface DialogProps {
  title: string;
  subtitle?: string;
  onClose: () => void;
  busy?: boolean;
  children: ReactNode;
  className?: string;
}

export function Dialog({
  title,
  subtitle,
  onClose,
  busy = false,
  children,
  className = '',
}: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    dialog
      ?.querySelector<HTMLElement>('input:not([type=checkbox]):not([type=radio]), textarea')
      ?.focus();
    return () => dialog?.close();
  }, []);
  return (
    <dialog
      ref={ref}
      className={'dialog ' + className}
      aria-labelledby="dialog-title"
      onCancel={(event) => {
        event.preventDefault();
        if (!busy) onClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget && !busy) onClose();
      }}
    >
      <div className="dialog-content">
        <header className="dialog-header">
          <div>
            <h2 id="dialog-title">{title}</h2>
            {subtitle && <p>{subtitle}</p>}
          </div>
          <button
            type="button"
            className="icon-button"
            onClick={onClose}
            disabled={busy}
            aria-label="Fechar janela"
          >
            <X size={20} />
          </button>
        </header>
        {children}
      </div>
    </dialog>
  );
}
