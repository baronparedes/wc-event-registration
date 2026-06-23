import type { ReactNode } from 'react'
import { Button } from './Button'

type ConfirmDialogProps = {
  isOpen: boolean
  title: string
  description: ReactNode
  confirmLabel: string
  confirmLoadingLabel: string
  cancelLabel?: string
  confirmVariant?: 'default' | 'destructive' | 'outline'
  isPending: boolean
  disabled?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({
  isOpen,
  title,
  description,
  confirmLabel,
  confirmLoadingLabel,
  cancelLabel = 'Cancel',
  confirmVariant = 'default',
  isPending,
  disabled,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!isOpen) return null

  const confirmDisabled = isPending || disabled

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={onCancel}
    >
      <div
        className="mx-4 w-full max-w-md rounded-2xl border border-border bg-surface p-6 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="font-heading text-lg font-semibold text-text">{title}</h2>
        <p className="mt-2 text-sm text-muted">{description}</p>
        <div className="mt-5 flex justify-end gap-3">
          <Button disabled={isPending} onClick={onCancel} size="md" type="button" variant="outline">
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
        </div>
      </div>
    </div>
  )
}
