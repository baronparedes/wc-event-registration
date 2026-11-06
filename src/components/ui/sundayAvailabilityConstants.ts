export const SUNDAY_KEYS = [
  'first_sunday',
  'second_sunday',
  'third_sunday',
  'fourth_sunday',
  'fifth_sunday',
] as const;

export const SUNDAY_TIME_SLOTS = ['9AM', '12NN', '3PM'] as const;

export type SundayKey = (typeof SUNDAY_KEYS)[number];
export type SundayTimeSlot = (typeof SUNDAY_TIME_SLOTS)[number];

export const SUNDAY_LABELS: Record<SundayKey, string> = {
  first_sunday: 'First Sunday',
  second_sunday: 'Second Sunday',
  third_sunday: 'Third Sunday',
  fourth_sunday: 'Fourth Sunday',
  fifth_sunday: 'Fifth Sunday',
};

export const SUNDAY_SHORT_LABELS: Record<SundayKey, string> = {
  first_sunday: '1st Sun',
  second_sunday: '2nd Sun',
  third_sunday: '3rd Sun',
  fourth_sunday: '4th Sun',
  fifth_sunday: '5th Sun',
};

export type SundayAvailabilityValue =
  | Record<SundayKey, Set<SundayTimeSlot>>
  | Record<SundayKey, SundayTimeSlot[] | string[] | readonly string[]>
  | Record<string, string[] | readonly string[] | Set<string> | undefined | null>;
