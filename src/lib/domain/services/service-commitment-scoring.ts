export interface AttendanceScoreParams {
  attended: number;
  absences: number;
  excused: number;
  wi9or3?: number;
  wi5th?: number;
}

export const ATTENDANCE_SCORE_WEIGHTS = {
  ATTENDED: 1.0,
  ABSENCE: -1.0,
  EXCUSED: -0.5,
  WALK_IN_9AM_3PM: 0.5,
  WALK_IN_5TH_SUNDAY: 1.0,
} as const;

/**
 * Calculates the net attendance score according to the unified scoring rules:
 * - Attended committed slot: +1.0
 * - Unexcused absence on committed slot: -1.0
 * - Excused absence on committed slot: -0.5
 * - Walk-in attendance for 9AM / 3PM slots on 1st–4th Sundays: +0.5
 * - Walk-in attendance for 12NN slot on 1st–4th Sundays: 0.0
 * - Walk-in attendance for ANY slot on 5th Sunday: +1.0
 */
export function calculateAttendanceScore({
  attended,
  absences,
  excused,
  wi9or3 = 0,
  wi5th = 0,
}: AttendanceScoreParams): number {
  return (
    attended * ATTENDANCE_SCORE_WEIGHTS.ATTENDED +
    absences * ATTENDANCE_SCORE_WEIGHTS.ABSENCE +
    excused * ATTENDANCE_SCORE_WEIGHTS.EXCUSED +
    wi9or3 * ATTENDANCE_SCORE_WEIGHTS.WALK_IN_9AM_3PM +
    wi5th * ATTENDANCE_SCORE_WEIGHTS.WALK_IN_5TH_SUNDAY
  );
}
