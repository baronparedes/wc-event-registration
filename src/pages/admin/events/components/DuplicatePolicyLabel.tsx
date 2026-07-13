import type { AdminEvent } from '@/lib/domain/events';

type DuplicatePolicyLabelProps = {
  policy: AdminEvent['duplicate_policy'];
};

/**
 * Displays the duplicate registration policy as a human-readable label.
 * Shows "Allow Update" or "Block" based on the policy setting.
 */
export function DuplicatePolicyLabel({ policy }: DuplicatePolicyLabelProps) {
  const label =
    policy === 'allow_update'
      ? 'Allow Update'
      : policy === 'allow_multiple'
        ? 'Allow Multiple Registrations'
        : 'Block';

  return <span className="text-sm text-text">{label}</span>;
}
