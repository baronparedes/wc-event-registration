import { useCallback, useMemo } from 'react';

import type { Control, UseFormSetValue } from 'react-hook-form';
import { useWatch } from 'react-hook-form';

import {
  ListTable,
  ListTableBody,
  ListTableCell,
  ListTableHead,
  ListTableHeaderCell,
  ListTableHeaderRow,
  ListTableRow,
} from '@/components/ui/ListTable';
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

const SUNDAY_SHORT_LABELS: Record<SundayKey, string> = {
  first_sunday: '1st Sun',
  second_sunday: '2nd Sun',
  third_sunday: '3rd Sun',
  fourth_sunday: '4th Sun',
  fifth_sunday: '5th Sun',
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
    <ListTable density="dense" className="min-w-full">
      <ListTableHead>
        <ListTableHeaderRow variant="default">
          <ListTableHeaderCell className="px-2.5 py-3 sm:px-4 text-left font-semibold">
            Week
          </ListTableHeaderCell>
          {TIME_SLOTS.map((time) => (
            <ListTableHeaderCell key={time} className="px-2 py-3 sm:px-4 text-center font-semibold">
              {time.replace('AM', ' AM').replace('NN', ' NN').replace('PM', ' PM')}
            </ListTableHeaderCell>
          ))}
        </ListTableHeaderRow>
      </ListTableHead>
      <ListTableBody divider="default">
        {SUNDAY_KEYS.map((key) => {
          const selectedCount = currentValues[key].size;
          return (
            <ListTableRow key={key} hover="muted">
              <ListTableCell className="px-2.5 py-3 sm:px-4 font-medium text-text">
                <div className="flex items-center gap-1.5">
                  <span className="hidden sm:inline">{SUNDAY_LABELS[key]}</span>
                  <span className="sm:hidden">{SUNDAY_SHORT_LABELS[key]}</span>
                  {selectedCount > 0 && (
                    <span
                      aria-label={`${selectedCount} slots selected`}
                      className="inline-flex items-center justify-center rounded-full bg-primary/15 px-1.5 py-0.5 text-[10px] font-bold text-primary sm:hidden"
                    >
                      {selectedCount}
                    </span>
                  )}
                </div>
              </ListTableCell>
              {TIME_SLOTS.map((time) => {
                const isChecked = currentValues[key].has(time);
                return (
                  <ListTableCell key={time} className="px-2 py-3 sm:px-4 text-center">
                    <div className="flex items-center justify-center">
                      <Switch
                        checked={isChecked}
                        onCheckedChange={(c) => toggleAvailability(key, time, c)}
                        disabled={disabled}
                        ariaLabel={`Toggle ${SUNDAY_LABELS[key]} at ${time}`}
                        size="sm"
                      />
                    </div>
                  </ListTableCell>
                );
              })}
            </ListTableRow>
          );
        })}
      </ListTableBody>
    </ListTable>
  );
}
