import type { ReactNode } from 'react';

import { createPortal } from 'react-dom';

type DialogProps = {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  maxWidthClass?: string;
};

export function Dialog({ isOpen, onClose, children, maxWidthClass = 'max-w-lg' }: DialogProps) {
  if (!isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 py-6"
      onClick={onClose}
    >
      <div
        className={`mx-4 w-full ${maxWidthClass} rounded-2xl border border-border bg-surface p-2 shadow-lg`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="space-y-4 p-4">{children}</div>
      </div>
    </div>,
    document.body,
  );
}
