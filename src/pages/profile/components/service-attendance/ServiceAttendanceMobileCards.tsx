import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui';
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
    <Tabs defaultValue={SERVICE_SUNDAY_KEYS[0]} className="xl:hidden">
      <TabsList aria-label="Sunday of the month" containerClassName="pb-4">
        {SERVICE_SUNDAY_KEYS.map((key) => {
          return (
            <TabsTrigger key={key} value={key} aria-label={SERVICE_SUNDAY_LABELS[key].label}>
              {SERVICE_SUNDAY_LABELS[key].label.replace(' Sunday', '')}
            </TabsTrigger>
          );
        })}
      </TabsList>

      {SERVICE_SUNDAY_KEYS.map((key) => {
        const sundayInfo = sundays.find((sunday) => sunday.key === key);

        return (
          <TabsContent
            key={key}
            value={key}
            className="!mt-0 overflow-hidden rounded-xl border border-border bg-surface shadow-xs"
          >
            <>
              <div className="border-b border-border bg-surface/70 px-3.5 py-2.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-base text-text">
                    {sundayInfo?.label ?? SERVICE_SUNDAY_LABELS[key].label}
                  </span>
                  <span className="text-right text-sm text-muted">
                    {sundayInfo?.dateStr ?? 'No 5th Sunday this month'}
                  </span>
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
            </>
          </TabsContent>
        );
      })}
    </Tabs>
  );
}
