import { Badge } from '@/components/ui';

export function MemberStatusBadge({ isActive }: { isActive: boolean }) {
  const statusLabel = isActive ? 'Active' : 'Inactive';
  const statusVariant = !isActive ? 'destructive' : 'default';

  return <Badge variant={statusVariant}>{statusLabel}</Badge>;
}
