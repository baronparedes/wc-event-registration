import type { ServiceAttendanceSeat } from '@/lib/domain/services';

export function formatAssignedSeat(seat?: ServiceAttendanceSeat | null): string {
  if (!seat || !seat.table_number || seat.table_number.toLowerCase() === 'unassigned') {
    return 'Unassigned';
  }

  const parts = [seat.table_number];
  if (seat.seat_number) {
    parts.push(`Seat ${seat.seat_number}`);
  }
  if (seat.area) {
    parts.push(`(${seat.area})`);
  }

  return parts.join(', ');
}
