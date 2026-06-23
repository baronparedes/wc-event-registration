import { useState, type ReactNode } from 'react'
import { ActionButton } from './ActionLink'
import { ConfirmDialog } from './ConfirmDialog'

type ActionVariant = 'default' | 'destructive'

type ActionConfirmButtonProps = {
  children: ReactNode
  variant?: ActionVariant
  className?: string
  title: string
  description: ReactNode
  confirmLabel: string
  confirmLoadingLabel: string
  isPending: boolean
  onConfirm: () => void
}

/**
 * Inline action button that opens a confirm dialog on click.
 * Combines ActionButton styling with ConfirmDialog state management.
 */
export function ActionConfirmButton({
  children,
  variant = 'default',
  className,
  title,
  description,
  confirmLabel,
  confirmLoadingLabel,
  isPending,
  onConfirm,
}: ActionConfirmButtonProps) {
  const [isOpen, setIsOpen] = useState(false)

  async function handleConfirm() {
    await onConfirm()
    setIsOpen(false)
  }

  return (
    <>
      <ActionButton
        variant={variant}
        className={className}
        onClick={() => setIsOpen(true)}
        disabled={isPending}
        type="button"
      >
        {children}
      </ActionButton>
      <ConfirmDialog
        isOpen={isOpen}
        title={title}
        description={description}
        confirmLabel={confirmLabel}
        confirmLoadingLabel={confirmLoadingLabel}
        confirmVariant={variant}
        isPending={isPending}
        onConfirm={handleConfirm}
        onCancel={() => setIsOpen(false)}
      />
    </>
  )
}
