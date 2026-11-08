import {
  SUNDAY_KEYS,
  SUNDAY_TIME_SLOTS,
  SundayAvailabilityTable,
  type SundayKey,
  type SundayTimeSlot,
} from '@/components/ui';

type SundayAvailabilityDisplayProps = {
  metadata: Record<string, string>;
};

export function SundayAvailabilityDisplay({ metadata }: SundayAvailabilityDisplayProps) {
  const currentValues: Record<SundayKey, Set<SundayTimeSlot>> = {
    first_sunday: new Set(),
    second_sunday: new Set(),
    third_sunday: new Set(),
    fourth_sunday: new Set(),
    fifth_sunday: new Set(),
  };

  for (const [key, value] of Object.entries(metadata)) {
    if (SUNDAY_KEYS.includes(key as SundayKey)) {
      const times = value.split(',').map((t) => t.trim().toUpperCase());
      for (const time of times) {
        const matchedTime = SUNDAY_TIME_SLOTS.find(
          (t) => t === time || t.replace(' ', '') === time.replace(' ', ''),
        );
        if (matchedTime) {
          currentValues[key as SundayKey].add(matchedTime);
        }
      }
    }
  }

  return (
    <SundayAvailabilityTable
      value={currentValues}
      readOnly
      density="dense"
      ariaLabelFormat={(sundayLabel, timeSlot) => `${sundayLabel} at ${timeSlot} availability`}
    />
  );
}
