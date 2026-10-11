import type { TimeSlot } from '@/hooks/domain/members';

export type ForecastSlot = TimeSlot | 'ALL';

export type ForecastSlotSelectorProps = {
  activeSlot: ForecastSlot;
  onChangeSlot: (slot: ForecastSlot) => void;
};

const SLOT_OPTIONS: { slot: ForecastSlot; label: string }[] = [
  { slot: 'ALL', label: 'All Sunday Slots' },
  { slot: '9AM', label: '9:00 AM' },
  { slot: '12NN', label: '12:00 NN' },
  { slot: '3PM', label: '3:00 PM' },
];

export function ForecastSlotSelector({ activeSlot, onChangeSlot }: ForecastSlotSelectorProps) {
  return (
    <div className="border-b border-border">
      <div
        className="overflow-x-auto overflow-y-hidden [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden overscroll-x-contain"
        style={{ touchAction: 'pan-x' }}
      >
        <div className="-mb-px flex gap-6 min-w-max">
          {SLOT_OPTIONS.map(({ slot, label }) => {
            const isActive = activeSlot === slot;
            return (
              <button
                key={slot}
                type="button"
                onClick={() => onChangeSlot(slot)}
                className={`whitespace-nowrap border-b-2 px-1 pb-3 text-sm font-medium transition-colors focus:outline-none flex items-center gap-1.5 shrink-0 cursor-pointer ${
                  isActive
                    ? 'border-primary text-primary font-semibold'
                    : 'border-transparent text-muted hover:border-border hover:text-text'
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
