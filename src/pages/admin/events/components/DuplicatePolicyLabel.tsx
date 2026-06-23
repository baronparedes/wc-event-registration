import type { AdminEvent } from '@/lib/admin/types'

type DuplicatePolicyLabelProps = {
  policy: AdminEvent['duplicate_policy']
}

/**
 * Displays the duplicate registration policy as a human-readable label.
 * Shows "Allow Update" or "Block" based on the policy setting.
 */
export function DuplicatePolicyLabel({ policy }: DuplicatePolicyLabelProps) {
  return (
    <span className="text-sm text-text">
      {policy === 'allow_update' ? 'Allow Update' : 'Block'}
    </span>
  )
}
