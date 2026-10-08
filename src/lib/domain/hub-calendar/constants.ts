export const CONFIDENCE_THRESHOLDS = {
  SOLID: 0.7,
  MODERATE: 0.4,
} as const;

export const DEFAULT_MEMBER_TURNUP_RATE = 0.8;

export function getConfidenceTierFromRate(
  turnupRate: number,
  thresholds?: { solid?: number; moderate?: number; SOLID?: number; MODERATE?: number },
): 'solid' | 'moderate' | 'at_risk' {
  const solidThreshold = thresholds?.solid ?? thresholds?.SOLID ?? CONFIDENCE_THRESHOLDS.SOLID;
  const moderateThreshold =
    thresholds?.moderate ?? thresholds?.MODERATE ?? CONFIDENCE_THRESHOLDS.MODERATE;

  if (turnupRate >= solidThreshold) {
    return 'solid';
  }
  if (turnupRate >= moderateThreshold) {
    return 'moderate';
  }
  return 'at_risk';
}
