import type { ReactNode } from 'react';

import { Button } from './Button';
import { Dialog, type DialogSize } from './Dialog';

export type ConfirmDialogProps = {
  isOpen: boolean;
  title: string;
  description: ReactNode;
  size?: DialogSize;
  maxWidthClass?: string;
  confirmLabel: string;
  confirmLoadingLabel: string;
  cancelLabel?: string;
  confirmVariant?: 'default' | 'destructive' | 'outline';
  isPending: boolean;
  disabled?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export function ConfirmDialog({
  isOpen,
  title,
  description,
  size = 'md',
  maxWidthClass,
  confirmLabel,
  confirmLoadingLabel,
  cancelLabel = 'Cancel',
  confirmVariant = 'default',
  isPending,
  disabled,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const confirmDisabled = isPending || disabled;

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onCancel}
      size={size}
      maxWidthClass={maxWidthClass}
      role="alertdialog"
      closeOnEscape={!isPending}
      closeOnBackdropClick={!isPending}
    >
      <Dialog.Header>
        <Dialog.Title>{title}</Dialog.Title>
        <Dialog.Description className="mt-2 text-sm text-muted">{description}</Dialog.Description>
      </Dialog.Header>

      <Dialog.Footer bordered={false} className="mt-5">
        <Button
          disabled={isPending}
          onClick={onCancel}
          size="md"
          type="button"
          variant="primaryOutline"
        >
          {cancelLabel}
        </Button>
        <Button
          disabled={confirmDisabled}
          onClick={onConfirm}
          size="md"
          type="button"
          variant={confirmVariant}
        >
          {isPending ? confirmLoadingLabel : confirmLabel}
        </Button>
      </Dialog.Footer>
    </Dialog>
  );
}
