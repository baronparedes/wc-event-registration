import { Badge } from '@/components/ui';
import type { ServiceAttendance } from '@/lib/domain/services';

interface ServiceAttendanceStatusBadgeProps {
  record: ServiceAttendance;
}

export function ServiceAttendanceStatusBadge({ record }: ServiceAttendanceStatusBadgeProps) {
  if (record.is_walk_in) {
    return <Badge variant="secondary">Walk-in</Badge>;
  }
  if (record.is_override) {
    return <Badge variant="outline">Override</Badge>;
  }
  if (record.is_manual_entry) {
    return <Badge variant="outline">Manual</Badge>;
  }
  return null;
}
