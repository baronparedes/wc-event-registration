import {
  type HTMLAttributes,
  type ReactNode,
  createContext,
  useContext,
  useEffect,
  useId,
} from 'react';

import { createPortal } from 'react-dom';

import { X } from 'lucide-react';

export type DialogSize =
  | 'sm'
  | 'md'
  | 'lg'
  | 'xl'
  | '2xl'
  | '3xl'
  | '4xl'
  | '5xl'
  | '6xl'
  | '7xl'
  | 'full';

const DIALOG_SIZE_CLASSES: Record<DialogSize, string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
  '3xl': 'max-w-3xl',
  '4xl': 'max-w-4xl',
  '5xl': 'max-w-5xl',
  '6xl': 'max-w-6xl',
  '7xl': 'max-w-7xl',
  full: 'max-w-[calc(100vw-2rem)]',
};

type DialogContextValue = {
  onClose: () => void;
  titleId: string;
  descriptionId: string;
};

const DialogContext = createContext<DialogContextValue | null>(null);

function useDialogContext() {
  return useContext(DialogContext);
}

export type DialogProps = {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  size?: DialogSize;
  maxWidthClass?: string;
  closeOnBackdropClick?: boolean;
  closeOnEscape?: boolean;
  lockScroll?: boolean;
  role?: 'dialog' | 'alertdialog';
  ariaLabel?: string;
  ariaLabelledBy?: string;
  ariaDescribedBy?: string;
  className?: string;
  containerClassName?: string;
};

export function Dialog({
  isOpen,
  onClose,
  children,
  size = 'lg',
  maxWidthClass,
  closeOnBackdropClick = true,
  closeOnEscape = true,
  lockScroll = true,
  role = 'dialog',
  ariaLabel,
  ariaLabelledBy,
  ariaDescribedBy,
  className = '',
  containerClassName = '',
}: DialogProps) {
  const generatedId = useId();
  const titleId = ariaLabelledBy || `dialog-title-${generatedId}`;
  const descriptionId = ariaDescribedBy || `dialog-description-${generatedId}`;

  // Escape key handler
  useEffect(() => {
    if (!isOpen || !closeOnEscape) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, closeOnEscape, onClose]);

  // Body scroll lock
  useEffect(() => {
    if (!isOpen || !lockScroll) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen, lockScroll]);

  if (!isOpen) return null;

  const resolvedMaxWidth = maxWidthClass || DIALOG_SIZE_CLASSES[size] || DIALOG_SIZE_CLASSES.lg;

  return createPortal(
    <DialogContext.Provider value={{ onClose, titleId, descriptionId }}>
      <div
        className={`fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 py-6 sm:py-8 ${containerClassName}`}
        onClick={closeOnBackdropClick ? onClose : undefined}
      >
        <div
          role={role}
          aria-modal="true"
          aria-label={ariaLabel}
          aria-labelledby={ariaLabel ? undefined : titleId}
          aria-describedby={descriptionId}
          className={`mx-4 w-full ${resolvedMaxWidth} rounded-2xl border border-border bg-surface p-6 shadow-xl transition-all ${className}`}
          onClick={(e) => e.stopPropagation()}
        >
          {children}
        </div>
      </div>
    </DialogContext.Provider>,
    document.body,
  );
}

export type DialogHeaderProps = {
  children?: ReactNode;
  className?: string;
  showCloseButton?: boolean;
  onClose?: () => void;
};

function DialogHeader({
  children,
  className = '',
  showCloseButton = false,
  onClose,
}: DialogHeaderProps) {
  const context = useDialogContext();
  const handleClose = onClose || context?.onClose;

  return (
    <div className={`flex items-start justify-between gap-4 ${className}`}>
      <div className="min-w-0 flex-1">{children}</div>
      {showCloseButton && handleClose && <DialogCloseButton onClick={handleClose} />}
    </div>
  );
}

export type DialogTitleProps = {
  children: ReactNode;
  className?: string;
  as?: 'h1' | 'h2' | 'h3' | 'h4';
  id?: string;
};

function DialogTitle({ children, className = '', as: Component = 'h2', id }: DialogTitleProps) {
  const context = useDialogContext();
  const titleId = id || context?.titleId;

  return (
    <Component id={titleId} className={`font-heading text-lg font-semibold text-text ${className}`}>
      {children}
    </Component>
  );
}

export type DialogDescriptionProps = {
  children: ReactNode;
  className?: string;
  id?: string;
};

function DialogDescription({ children, className = '', id }: DialogDescriptionProps) {
  const context = useDialogContext();
  const descriptionId = id || context?.descriptionId;

  return (
    <div id={descriptionId} className={`mt-0.5 text-xs text-muted ${className}`}>
      {children}
    </div>
  );
}

export type DialogCloseButtonProps = {
  onClick?: () => void;
  className?: string;
  ariaLabel?: string;
};

function DialogCloseButton({
  onClick,
  className = '',
  ariaLabel = 'Close dialog',
}: DialogCloseButtonProps) {
  const context = useDialogContext();
  const handleClick = onClick || context?.onClose;

  return (
    <button
      type="button"
      aria-label={ariaLabel}
      className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted transition-colors hover:text-text focus:outline-none focus:ring-2 focus:ring-primary/30 ${className}`}
      onClick={handleClick}
    >
      <X aria-hidden="true" className="h-4 w-4" />
    </button>
  );
}

export type DialogBodyProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
  className?: string;
  scrollable?: boolean;
};

function DialogBody({ children, className = '', scrollable = false, ...props }: DialogBodyProps) {
  const scrollClasses = scrollable ? 'max-h-[calc(85vh-8rem)] overflow-y-auto pr-1' : '';

  return (
    <div className={`mt-4 ${scrollClasses} ${className}`} {...props}>
      {children}
    </div>
  );
}

export type DialogFooterProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
  className?: string;
  bordered?: boolean;
};

function DialogFooter({ children, className = '', bordered = true, ...props }: DialogFooterProps) {
  const borderClasses = bordered ? 'border-t border-border pt-4' : '';

  return (
    <div
      className={`mt-6 flex items-center justify-end gap-3 ${borderClasses} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

Dialog.Header = DialogHeader;
Dialog.Title = DialogTitle;
Dialog.Description = DialogDescription;
Dialog.CloseButton = DialogCloseButton;
Dialog.Body = DialogBody;
Dialog.Footer = DialogFooter;
