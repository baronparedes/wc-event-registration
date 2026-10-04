export const CONFIDENCE_THRESHOLDS = {
  SOLID: 0.7,
  MODERATE: 0.4,
} as const;

export const DEFAULT_MEMBER_TURNUP_RATE = 0.8;

export function getConfidenceTierFromRate(turnupRate: number): 'solid' | 'moderate' | 'at_risk' {
  if (turnupRate >= CONFIDENCE_THRESHOLDS.SOLID) {
    return 'solid';
  }
  if (turnupRate >= CONFIDENCE_THRESHOLDS.MODERATE) {
    return 'moderate';
  }
  return 'at_risk';
}
