import type { AdminForm } from '@/lib/domain/forms';

type FormDuplicatePolicyLabelProps = {
  policy: AdminForm['duplicate_policy'];
};

const DUPLICATE_POLICY_LABELS: Record<AdminForm['duplicate_policy'], string> = {
  block: 'Block',
  allow_update: 'Allow Update',
  allow_multiple: 'Allow Multiple Submissions',
  allow_multiple_update: 'Allow Multiple + Unique-Key Updates',
};

/**
 * Displays the duplicate registration policy as a human-readable label.
 */
export function FormDuplicatePolicyLabel({ policy }: FormDuplicatePolicyLabelProps) {
  const label = DUPLICATE_POLICY_LABELS[policy];

  return <span className="text-sm text-text">{label}</span>;
}
