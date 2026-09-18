import { describe, expect, it } from 'vitest';

import {
  computeMatrixGrid,
  getMonthSundays,
  getNonSundayAttendances,
  normalizeTimeSlot,
  parseCommittedSlots,
} from '../service-matrix';
import type { ServiceAttendance } from '../types';

describe('service-matrix domain logic', () => {
  describe('getMonthSundays', () => {
    it('returns the 4 Sundays of September 2026', () => {
      const sundays = getMonthSundays(2026, 8); // September 2026
      expect(sundays).toHaveLength(4);
      expect(sundays[0].dateStr).toBe('2026-09-06');
      expect(sundays[0].label).toBe('1st Sunday');
      expect(sundays[0].key).toBe('first_sunday');
      expect(sundays[1].dateStr).toBe('2026-09-13');
      expect(sundays[1].label).toBe('2nd Sunday');
      expect(sundays[2].dateStr).toBe('2026-09-20');
      expect(sundays[2].label).toBe('3rd Sunday');
      expect(sundays[3].dateStr).toBe('2026-09-27');
      expect(sundays[3].label).toBe('4th Sunday');
    });

    it('returns 5 Sundays for a month with 5 Sundays (e.g. August 2026)', () => {
      const sundays = getMonthSundays(2026, 7); // August 2026 has 5 Sundays (Aug 2, 9, 16, 23, 30)
      expect(sundays).toHaveLength(5);
      expect(sundays[4].key).toBe('fifth_sunday');
      expect(sundays[4].label).toBe('5th Sunday');
      expect(sundays[4].dateStr).toBe('2026-08-30');
    });
  });

  describe('normalizeTimeSlot', () => {
    it('normalizes various formats', () => {
      expect(normalizeTimeSlot('9AM')).toBe('9AM');
      expect(normalizeTimeSlot('9 AM')).toBe('9AM');
      expect(normalizeTimeSlot('12nn')).toBe('12NN');
      expect(normalizeTimeSlot('12 nn')).toBe('12NN');
      expect(normalizeTimeSlot('3pm')).toBe('3PM');
      expect(normalizeTimeSlot('3 PM')).toBe('3PM');
      expect(normalizeTimeSlot('6PM')).toBe('6PM');
    });
  });

  describe('parseCommittedSlots', () => {
    it('parses metadata correctly', () => {
      const metadata = {
        first_sunday: '9AM, 12NN',
        second_sunday: '3PM',
        third_sunday: '',
        fourth_sunday: '9 AM',
        fifth_sunday: '12 NN, 3 PM',
        random_field: 'something else',
      };

      const parsed = parseCommittedSlots(metadata);
      expect(parsed.first_sunday.has('9AM')).toBe(true);
      expect(parsed.first_sunday.has('12NN')).toBe(true);
      expect(parsed.first_sunday.has('3PM')).toBe(false);
      expect(parsed.second_sunday.has('3PM')).toBe(true);
      expect(parsed.third_sunday.size).toBe(0);
      expect(parsed.fourth_sunday.has('9AM')).toBe(true);
      expect(parsed.fifth_sunday.has('12NN')).toBe(true);
      expect(parsed.fifth_sunday.has('3PM')).toBe(true);
    });

    it('returns empty sets when metadata is undefined or empty', () => {
      const parsed = parseCommittedSlots(undefined);
      expect(parsed.first_sunday.size).toBe(0);
      expect(parsed.second_sunday.size).toBe(0);
      expect(parsed.third_sunday.size).toBe(0);
      expect(parsed.fourth_sunday.size).toBe(0);
      expect(parsed.fifth_sunday.size).toBe(0);
    });
  });

  describe('computeMatrixGrid', () => {
    const sundays = getMonthSundays(2026, 8); // Sep 6, 13, 20, 27
    const committedSlots = parseCommittedSlots({
      first_sunday: '9AM',
      second_sunday: '12NN',
      third_sunday: '9AM',
      fourth_sunday: '3PM',
    });

    const attendances: ServiceAttendance[] = [
      {
        id: 'att-1',
        user_id: 'user-1',
        rfid: 'rfid-1',
        service_date: '2026-09-06',
        time_slot: '9AM',
        checked_in_at: '2026-09-06T08:50:00Z',
        is_walk_in: false,
        is_override: false,
        is_manual_entry: false,
        service_seat_id: null,
        service_seats: null,
        metadata: {},
        created_at: '2026-09-06T08:50:00Z',
        updated_at: '2026-09-06T08:50:00Z',
        created_by: null,
        updated_by: null,
      },
      {
        id: 'att-2',
        user_id: 'user-1',
        rfid: 'rfid-1',
        service_date: '2026-09-13',
        time_slot: '9AM', // unscheduled! Committed was 12NN
        checked_in_at: '2026-09-13T08:55:00Z',
        is_walk_in: true,
        is_override: false,
        is_manual_entry: false,
        service_seat_id: null,
        service_seats: null,
        metadata: {},
        created_at: '2026-09-13T08:55:00Z',
        updated_at: '2026-09-13T08:55:00Z',
        created_by: null,
        updated_by: null,
      },
    ];

    it('classifies attended_committed when attended and scheduled', () => {
      const grid = computeMatrixGrid(sundays, attendances, committedSlots, '2026-09-20');
      const cell = grid.first_sunday['9AM'];
      expect(cell.status).toBe('attended_committed');
      expect(cell.isCommitted).toBe(true);
      expect(cell.attendance?.id).toBe('att-1');
    });

    it('classifies attended_unscheduled when attended but not committed', () => {
      const grid = computeMatrixGrid(sundays, attendances, committedSlots, '2026-09-20');
      const cell = grid.second_sunday['9AM'];
      expect(cell.status).toBe('attended_unscheduled');
      expect(cell.isCommitted).toBe(false);
      expect(cell.attendance?.id).toBe('att-2');
    });

    it('classifies missed_committed when committed in the past and not attended', () => {
      const grid = computeMatrixGrid(sundays, attendances, committedSlots, '2026-09-20');
      // Second Sunday 12NN was committed, not attended, and is before 2026-09-20
      const cell = grid.second_sunday['12NN'];
      expect(cell.status).toBe('missed_committed');
      expect(cell.isCommitted).toBe(true);
      expect(cell.attendance).toBeUndefined();
    });

    it('classifies upcoming_committed when committed in the future and not attended', () => {
      const grid = computeMatrixGrid(sundays, attendances, committedSlots, '2026-09-20');
      // Fourth Sunday 3PM is after 2026-09-20
      const cell = grid.fourth_sunday['3PM'];
      expect(cell.status).toBe('upcoming_committed');
      expect(cell.isCommitted).toBe(true);
    });

    it('classifies off_schedule when not committed and not attended', () => {
      const grid = computeMatrixGrid(sundays, attendances, committedSlots, '2026-09-20');
      const cell = grid.first_sunday['3PM'];
      expect(cell.status).toBe('off_schedule');
      expect(cell.isCommitted).toBe(false);
    });

    it('classifies not_applicable when the month has no 5th Sunday', () => {
      const grid = computeMatrixGrid(sundays, attendances, committedSlots, '2026-09-20');
      const cell = grid.fifth_sunday['9AM'];
      expect(cell.status).toBe('not_applicable');
    });
  });

  describe('getNonSundayAttendances', () => {
    it('filters out attendances that fall on non-Sundays', () => {
      const sundays = getMonthSundays(2026, 8); // Sep 6, 13, 20, 27
      const attendances: ServiceAttendance[] = [
        {
          id: 'att-sunday',
          user_id: 'user-1',
          rfid: 'rfid-1',
          service_date: '2026-09-06',
          time_slot: '9AM',
          checked_in_at: '2026-09-06T08:50:00Z',
          is_walk_in: false,
          is_override: false,
          is_manual_entry: false,
          service_seat_id: null,
          service_seats: null,
          metadata: {},
          created_at: '2026-09-06T08:50:00Z',
          updated_at: '2026-09-06T08:50:00Z',
          created_by: null,
          updated_by: null,
        },
        {
          id: 'att-friday',
          user_id: 'user-1',
          rfid: 'rfid-1',
          service_date: '2026-09-18', // Friday
          time_slot: '7PM',
          checked_in_at: '2026-09-18T18:50:00Z',
          is_walk_in: false,
          is_override: false,
          is_manual_entry: false,
          service_seat_id: null,
          service_seats: null,
          metadata: {},
          created_at: '2026-09-18T18:50:00Z',
          updated_at: '2026-09-18T18:50:00Z',
          created_by: null,
          updated_by: null,
        },
      ];

      const nonSunday = getNonSundayAttendances(attendances, sundays);
      expect(nonSunday).toHaveLength(1);
      expect(nonSunday[0].id).toBe('att-friday');
    });
  });
});
