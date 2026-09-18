import type {
  MatrixCellData,
  MatrixTimeSlot,
  MonthSunday,
  ServiceSundayKey,
} from '@/lib/domain/services';
import {
  MATRIX_TIME_SLOTS,
  SERVICE_SUNDAY_KEYS,
  SERVICE_SUNDAY_LABELS,
} from '@/lib/domain/services';

import { ServiceMatrixCell } from './ServiceMatrixCell';

interface ServiceAttendanceMobileCardsProps {
  sundays: MonthSunday[];
  matrixGrid: Record<ServiceSundayKey, Record<MatrixTimeSlot, MatrixCellData>>;
}

export function ServiceAttendanceMobileCards({
  sundays,
  matrixGrid,
}: ServiceAttendanceMobileCardsProps) {
  return (
    <div className="space-y-3 sm:hidden">
      {SERVICE_SUNDAY_KEYS.map((key) => {
        const sundayInfo = sundays.find((s) => s.key === key);
        const isNA = !sundayInfo;

        if (isNA) {
          return (
            <div
              key={key}
              className="rounded-xl border border-border/40 bg-surface/30 p-3 text-xs text-muted/50"
            >
              {SERVICE_SUNDAY_LABELS[key].label} • N/A (No 5th Sunday this month)
            </div>
          );
        }

        return (
          <div
            key={key}
            className="overflow-hidden rounded-xl border border-border bg-surface shadow-xs"
          >
            <div className="border-b border-border bg-surface/70 px-3.5 py-2.5">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-sm text-text">{sundayInfo.label}</span>
                <span className="text-xs text-muted">{sundayInfo.dateStr}</span>
              </div>
            </div>
            <div className="space-y-2 p-3">
              {MATRIX_TIME_SLOTS.map((timeSlot) => (
                <div key={timeSlot} className="space-y-1">
                  <div className="text-[11px] font-semibold text-muted uppercase tracking-wider">
                    {timeSlot}
                  </div>
                  <ServiceMatrixCell cell={matrixGrid[key][timeSlot]} />
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
