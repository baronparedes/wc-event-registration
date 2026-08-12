import type { ReactNode } from 'react';

import { createPortal } from 'react-dom';

import { X } from 'lucide-react';

import { Button } from './Button';

type DialogProps = {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  title?: ReactNode;
  description?: ReactNode;
  maxWidthClass?: string;
  closeOnBackdropClick?: boolean;
  showCloseIcon?: boolean;
  showCloseButton?: boolean;
  closeButtonLabel?: string;
};

export function Dialog({
  isOpen,
  onClose,
  children,
  title,
  description,
  maxWidthClass = 'max-w-lg',
  closeOnBackdropClick = true,
  showCloseIcon = false,
  showCloseButton = false,
  closeButtonLabel = 'Close',
}: DialogProps) {
  if (!isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 py-6"
      onClick={closeOnBackdropClick ? onClose : undefined}
    >
      <div
        className={`mx-4 w-full ${maxWidthClass} rounded-2xl border border-border bg-surface p-2 shadow-lg`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="space-y-4 p-4">
          {(title || description || showCloseIcon) && (
            <div className="flex items-start justify-between gap-4">
              <div>
                {title && <h2 className="font-heading text-lg font-semibold text-text">{title}</h2>}
                {description && <p className="mt-0.5 text-xs text-muted">{description}</p>}
              </div>

              {showCloseIcon && (
                <button
                  type="button"
                  aria-label="Close dialog"
                  className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted transition-colors hover:text-text focus:outline-none focus:ring-2 focus:ring-primary/30"
                  onClick={onClose}
                >
                  <X aria-hidden="true" className="h-4 w-4" />
                </button>
              )}
            </div>
          )}

          <div>{children}</div>

          {showCloseButton && (
            <div className="flex justify-end border-t border-border pt-3">
              <Button type="button" variant="outline" size="sm" onClick={onClose}>
                {closeButtonLabel}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
