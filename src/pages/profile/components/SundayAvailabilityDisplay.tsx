import { Switch } from '@/components/ui/Switch';

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

type SundayAvailabilityDisplayProps = {
  metadata: Record<string, string>;
};

export function SundayAvailabilityDisplay({ metadata }: SundayAvailabilityDisplayProps) {
  const currentValues: Record<SundayKey, Set<TimeSlot>> = {
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
        const matchedTime = TIME_SLOTS.find(
          (t) => t === time || t.replace(' ', '') === time.replace(' ', ''),
        );
        if (matchedTime) {
          currentValues[key as SundayKey].add(matchedTime);
        }
      }
    }
  }

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
          {SUNDAY_KEYS.map((key) => {
            return (
              <tr key={key}>
                <td className="py-4 font-medium text-text">{SUNDAY_LABELS[key]}</td>
                {TIME_SLOTS.map((time) => {
                  const isChecked = currentValues[key].has(time);
                  return (
                    <td key={time} className="py-4 text-center">
                      <Switch
                        checked={isChecked}
                        onCheckedChange={() => undefined}
                        disabled
                        ariaLabel={`${SUNDAY_LABELS[key]} at ${time} availability`}
                        size="sm"
                      />
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
