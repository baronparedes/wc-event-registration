import type { AdminEvent } from '@/lib/domain/events';

type DuplicatePolicyLabelProps = {
  policy: AdminEvent['duplicate_policy'];
};

const DUPLICATE_POLICY_LABELS: Record<AdminEvent['duplicate_policy'], string> = {
  block: 'Block',
  allow_update: 'Allow Update',
  allow_multiple: 'Allow Multiple Registrations',
  allow_multiple_update: 'Allow Multiple + Unique-Key Updates',
};

/**
 * Displays the duplicate registration policy as a human-readable label.
 * Shows "Allow Update" or "Block" based on the policy setting.
 */
export function DuplicatePolicyLabel({ policy }: DuplicatePolicyLabelProps) {
  const label = DUPLICATE_POLICY_LABELS[policy];

  return <span className="text-sm text-text">{label}</span>;
}
