import { describe, expect, it } from 'vitest';

import {
  ATTENDANCE_SCORE_WEIGHTS,
  calculateAttendanceScore,
} from '@/lib/domain/services/service-commitment-scoring';

describe('calculateAttendanceScore', () => {
  it('calculates score with only attended committed slots (+1.0 each)', () => {
    const score = calculateAttendanceScore({
      attended: 3,
      absences: 0,
      excused: 0,
      wi9or3: 0,
    });
    expect(score).toBe(3);
  });

  it('calculates score with unexcused absences (-1.0 each)', () => {
    const score = calculateAttendanceScore({
      attended: 2,
      absences: 2,
      excused: 0,
      wi9or3: 0,
    });
    expect(score).toBe(0);
  });

  it('calculates score with excused absences (-0.5 each)', () => {
    const score = calculateAttendanceScore({
      attended: 2,
      absences: 0,
      excused: 2,
      wi9or3: 0,
    });
    expect(score).toBe(1);
  });

  it('calculates score with 1st-4th Sunday 9AM/3PM walk-in slots (+0.5 each)', () => {
    const score = calculateAttendanceScore({
      attended: 1,
      absences: 0,
      excused: 0,
      wi9or3: 2,
    });
    expect(score).toBe(2);
  });

  it('calculates score with 5th Sunday walk-in slots (+1.0 each)', () => {
    const score = calculateAttendanceScore({
      attended: 1,
      absences: 0,
      excused: 0,
      wi9or3: 0,
      wi5th: 2,
    });
    expect(score).toBe(3);
  });

  it('correctly combines attended, absences, excused, regular walk-ins, and 5th Sunday walk-ins', () => {
    // 2 attended (+2) - 1 absence (-1) - 1 excused (-0.5) + 1 reg walk-in (+0.5) + 1 5th Sun walk-in (+1.0) = 2.0
    const score = calculateAttendanceScore({
      attended: 2,
      absences: 1,
      excused: 1,
      wi9or3: 1,
      wi5th: 1,
    });
    expect(score).toBe(2.0);
  });

  it('handles negative resultant scores', () => {
    // 0 attended - 3 absences (-3) - 1 excused (-0.5) = -3.5
    const score = calculateAttendanceScore({
      attended: 0,
      absences: 3,
      excused: 1,
      wi9or3: 0,
    });
    expect(score).toBe(-3.5);
  });

  it('exports correct standard weights', () => {
    expect(ATTENDANCE_SCORE_WEIGHTS.ATTENDED).toBe(1.0);
    expect(ATTENDANCE_SCORE_WEIGHTS.ABSENCE).toBe(-1.0);
    expect(ATTENDANCE_SCORE_WEIGHTS.EXCUSED).toBe(-0.5);
    expect(ATTENDANCE_SCORE_WEIGHTS.WALK_IN_9AM_3PM).toBe(0.5);
    expect(ATTENDANCE_SCORE_WEIGHTS.WALK_IN_5TH_SUNDAY).toBe(1.0);
  });
});
