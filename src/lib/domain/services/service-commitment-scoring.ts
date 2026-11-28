export interface AttendanceScoreWeights {
  attended: number;
  absence: number;
  excused: number;
  walk_in_9am_3pm: number;
  walk_in_5th_sunday: number;
}

export interface AttendanceScoreParams {
  attended: number;
  absences: number;
  excused: number;
  wi9or3?: number;
  wi5th?: number;
  weights?: AttendanceScoreWeights;
}

export const ATTENDANCE_SCORE_WEIGHTS = {
  ATTENDED: 1.0,
  ABSENCE: -1.0,
  EXCUSED: -0.5,
  WALK_IN_9AM_3PM: 0.5,
  WALK_IN_5TH_SUNDAY: 1.0,
} as const;

/**
 * Calculates the net attendance score according to the unified scoring rules
 * (optionally overridden by database-backed app_settings weights):
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
  weights,
}: AttendanceScoreParams): number {
  const wAttended = weights?.attended ?? ATTENDANCE_SCORE_WEIGHTS.ATTENDED;
  const wAbsence = weights?.absence ?? ATTENDANCE_SCORE_WEIGHTS.ABSENCE;
  const wExcused = weights?.excused ?? ATTENDANCE_SCORE_WEIGHTS.EXCUSED;
  const wWi9or3 = weights?.walk_in_9am_3pm ?? ATTENDANCE_SCORE_WEIGHTS.WALK_IN_9AM_3PM;
  const wWi5th = weights?.walk_in_5th_sunday ?? ATTENDANCE_SCORE_WEIGHTS.WALK_IN_5TH_SUNDAY;

  return (
    attended * wAttended +
    absences * wAbsence +
    excused * wExcused +
    wi9or3 * wWi9or3 +
    wi5th * wWi5th
  );
}
