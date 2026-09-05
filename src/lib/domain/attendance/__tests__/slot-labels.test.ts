import { describe, expect, it } from 'vitest';

import {
  formatCompactCheckedInSlotLabels,
  formatCompactSlotLabelsFromSlotRecords,
} from '@/lib/domain/attendance';

describe('attendance slot labels', () => {
  it('formats same-day slot records with compact time labels and minute precision when needed', () => {
    expect(
      formatCompactSlotLabelsFromSlotRecords([
        { slot: '2026-08-30T14:10:00+08:00' },
        { slot: '2026-08-30T21:30:00+08:00' },
        { slot: '2026-08-30T21:00:00+08:00' },
      ]),
    ).toEqual(['2:10PM', '9PM', '9:30PM']);
  });

  it('formats multi-day slot records with month-day prefix', () => {
    expect(
      formatCompactSlotLabelsFromSlotRecords([
        { slot: '2026-08-30T09:00:00+08:00' },
        { slot: '2026-08-31T09:30:00+08:00' },
      ]),
    ).toEqual(['AUG-30 9AM', 'AUG-31 9:30AM']);
  });

  it('handles empty/null slot records, invalid slot dates, and deduplicates slots', () => {
    expect(formatCompactSlotLabelsFromSlotRecords(null)).toEqual([]);
    expect(formatCompactSlotLabelsFromSlotRecords([])).toEqual([]);
    expect(formatCompactSlotLabelsFromSlotRecords([{ slot: 'invalid-date' }])).toEqual([]);

    expect(
      formatCompactSlotLabelsFromSlotRecords([
        { slot: '2026-08-30T09:00:00+08:00' },
        { slot: '2026-08-30T09:00:00+08:00' },
      ]),
    ).toEqual(['9AM']);

    expect(
      formatCompactCheckedInSlotLabels({
        check_in_status: 'checked_in',
        slot_records: [
          { slot: '2026-08-30T09:00:00+08:00', recorded_at: '2026-08-30T09:00:00+08:00' },
        ],
      }),
    ).toEqual(['9AM']);

    expect(formatCompactCheckedInSlotLabels(null)).toEqual([]);
  });

  it('returns empty for non-checked-in attendees in checked-in helper', () => {
    expect(
      formatCompactCheckedInSlotLabels({
        check_in_status: 'not_checked_in',
        slot_records: [
          { slot: '2026-08-30T09:00:00+08:00', recorded_at: '2026-08-30T09:00:00+08:00' },
        ],
      }),
    ).toEqual([]);
  });
});
