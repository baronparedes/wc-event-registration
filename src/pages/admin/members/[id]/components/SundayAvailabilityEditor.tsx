import { useCallback, useMemo } from 'react';

import type { Control, UseFormSetValue } from 'react-hook-form';
import { useWatch } from 'react-hook-form';

import {
  SUNDAY_KEYS,
  SUNDAY_TIME_SLOTS,
  SundayAvailabilityTable,
  type SundayKey,
  type SundayTimeSlot,
} from '@/components/ui';
import type { UpdateMemberInput } from '@/lib/domain/members';

type SundayAvailabilityEditorProps = {
  control: Control<UpdateMemberInput>;
  setValue: UseFormSetValue<UpdateMemberInput>;
  disabled?: boolean;
};

export function SundayAvailabilityEditor({
  control,
  setValue,
  disabled = false,
}: SundayAvailabilityEditorProps) {
  const metadataEntries = useWatch({ control, name: 'metadata_entries' });

  const currentValues = useMemo(() => {
    const values: Record<SundayKey, Set<SundayTimeSlot>> = {
      first_sunday: new Set(),
      second_sunday: new Set(),
      third_sunday: new Set(),
      fourth_sunday: new Set(),
      fifth_sunday: new Set(),
    };

    if (metadataEntries) {
      for (const entry of metadataEntries) {
        if (SUNDAY_KEYS.includes(entry.key as SundayKey)) {
          const times = entry.value.split(',').map((t) => t.trim().toUpperCase());
          for (const time of times) {
            const matchedTime = SUNDAY_TIME_SLOTS.find(
              (t) => t === time || t.replace(' ', '') === time.replace(' ', ''),
            );
            if (matchedTime) {
              values[entry.key as SundayKey].add(matchedTime);
            }
          }
        }
      }
    }
    return values;
  }, [metadataEntries]);

  const toggleAvailability = useCallback(
    (sundayKey: SundayKey, timeSlot: SundayTimeSlot, checked: boolean) => {
      const currentSet = new Set(currentValues[sundayKey]);
      if (checked) {
        currentSet.add(timeSlot);
      } else {
        currentSet.delete(timeSlot);
      }

      const newValue = Array.from(SUNDAY_TIME_SLOTS)
        .filter((t) => currentSet.has(t))
        .join(', ');

      const entries = [...(metadataEntries || [])];
      const existingIndex = entries.findIndex((e) => e.key === sundayKey);

      if (newValue === '') {
        if (existingIndex !== -1) {
          entries.splice(existingIndex, 1);
        }
      } else {
        if (existingIndex !== -1) {
          entries[existingIndex] = { ...entries[existingIndex], value: newValue };
        } else {
          entries.push({ key: sundayKey, value: newValue });
        }
      }

      setValue('metadata_entries', entries, { shouldDirty: true });
    },
    [currentValues, metadataEntries, setValue],
  );

  return (
    <SundayAvailabilityTable
      value={currentValues}
      onChange={toggleAvailability}
      disabled={disabled}
    />
  );
}
