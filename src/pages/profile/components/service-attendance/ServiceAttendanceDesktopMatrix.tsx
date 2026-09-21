import {
  ListTable,
  ListTableBody,
  ListTableCell,
  ListTableHead,
  ListTableHeaderCell,
  ListTableHeaderRow,
  ListTableRow,
} from '@/components/ui/ListTable';
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

interface ServiceAttendanceDesktopMatrixProps {
  sundays: MonthSunday[];
  matrixGrid: Record<ServiceSundayKey, Record<MatrixTimeSlot, MatrixCellData>>;
}

export function ServiceAttendanceDesktopMatrix({
  sundays,
  matrixGrid,
}: ServiceAttendanceDesktopMatrixProps) {
  return (
    <div className="hidden sm:block overflow-x-auto rounded-xl border border-border bg-surface shadow-xs">
      <ListTable density="default" className="min-w-[720px] table-fixed">
        <ListTableHead>
          <ListTableHeaderRow variant="default">
            <ListTableHeaderCell className="w-[160px] px-4 py-3 text-left font-semibold">
              Sunday
            </ListTableHeaderCell>
            {MATRIX_TIME_SLOTS.map((slot) => (
              <ListTableHeaderCell key={slot} className="w-1/3 px-3 py-3 text-left font-semibold">
                <span className="font-bold">{slot}</span>
                <span className="ml-1 text-sm text-muted font-normal">
                  ({slot === '9AM' ? '9:00 AM' : slot === '12NN' ? '12:00 NN' : '3:00 PM'})
                </span>
              </ListTableHeaderCell>
            ))}
          </ListTableHeaderRow>
        </ListTableHead>
        <ListTableBody divider="default">
          {SERVICE_SUNDAY_KEYS.map((key) => {
            const sundayInfo = sundays.find((s) => s.key === key);

            return (
              <ListTableRow
                key={key}
                hover="none"
                className="bg-surface hover:bg-background/60 transition-colors"
              >
                <ListTableCell className="w-[160px] px-4 py-3.5 align-top">
                  <div className="flex flex-col">
                    <span className="font-semibold text-base text-text">
                      {SERVICE_SUNDAY_LABELS[key].label}
                    </span>
                    {sundayInfo ? (
                      <span className="text-sm text-muted font-mono">{sundayInfo.dateStr}</span>
                    ) : (
                      <span className="text-sm text-muted/60">No 5th Sunday</span>
                    )}
                  </div>
                </ListTableCell>
                {MATRIX_TIME_SLOTS.map((slot) => (
                  <ListTableCell key={slot} className="w-1/3 px-3 py-2.5 align-top">
                    <ServiceMatrixCell cell={matrixGrid[key][slot]} />
                  </ListTableCell>
                ))}
              </ListTableRow>
            );
          })}
        </ListTableBody>
      </ListTable>
    </div>
  );
}
