import { useCallback, useMemo } from 'react';

import type { Control, UseFormSetValue } from 'react-hook-form';
import { useWatch } from 'react-hook-form';

import { Switch } from '@/components/ui/Switch';
import type { UpdateMemberInput } from '@/lib/domain/members';

const SUNDAY_KEYS = [
  'first_sunday',
  'second_sunday',
  'third_sunday',
  'fourth_sunday',
  'fifth_sunday',
] as const;

const TIME_SLOTS = ['9AM', '12NN', '3PM'] as const;

type SundayKey = (typeof SUNDAY_KEYS)[number];
type TimeSlot = (typeof TIME_SLOTS)[number];

const SUNDAY_LABELS: Record<SundayKey, string> = {
  first_sunday: 'First Sunday',
  second_sunday: 'Second Sunday',
  third_sunday: 'Third Sunday',
  fourth_sunday: 'Fourth Sunday',
  fifth_sunday: 'Fifth Sunday',
};

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
    const values: Record<SundayKey, Set<TimeSlot>> = {
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
            // Check if time matches TIME_SLOTS (ignoring spaces/case, but data should be clean)
            const matchedTime = TIME_SLOTS.find(
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
    (sundayKey: SundayKey, timeSlot: TimeSlot, checked: boolean) => {
      const currentSet = new Set(currentValues[sundayKey]);
      if (checked) {
        currentSet.add(timeSlot);
      } else {
        currentSet.delete(timeSlot);
      }

      const newValue = Array.from(TIME_SLOTS)
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
    <div className="overflow-x-auto">
      <table className="w-full min-w-[400px] text-left text-sm">
        <thead>
          <tr className="border-b border-border/50 text-muted">
            <th className="pb-3 font-medium uppercase tracking-wider">Week</th>
            {TIME_SLOTS.map((time) => (
              <th key={time} className="pb-3 font-medium uppercase tracking-wider text-center">
                {time.replace('AM', ' AM').replace('NN', ' NN').replace('PM', ' PM')}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border/30">
          {SUNDAY_KEYS.map((key) => (
            <tr key={key}>
              <td className="py-4 font-medium text-text">{SUNDAY_LABELS[key]}</td>
              {TIME_SLOTS.map((time) => {
                const isChecked = currentValues[key].has(time);
                return (
                  <td key={time} className="py-4 text-center">
                    <Switch
                      checked={isChecked}
                      onCheckedChange={(c) => toggleAvailability(key, time, c)}
                      disabled={disabled}
                      ariaLabel={`Toggle ${SUNDAY_LABELS[key]} at ${time}`}
                      size="sm"
                    />
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
