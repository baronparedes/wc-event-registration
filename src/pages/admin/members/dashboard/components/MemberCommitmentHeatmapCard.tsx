import { useMemo, useState } from 'react';

import { Calendar, Users } from 'lucide-react';

import { SectionCard } from '@/components/ui/SectionCard';
import type {
  MemberSundayCommitmentHeatmap,
  MemberSundayCommitmentSlot,
} from '@/lib/domain/members';

import { SlotAttendeesModal } from './SlotAttendeesModal';

const SUNDAY_DOT_COLORS: Record<string, string> = {
  first_sunday: 'bg-primary',
  second_sunday: 'bg-secondary',
  third_sunday: 'bg-tertiary',
  fourth_sunday: 'bg-accent',
  fifth_sunday: 'bg-primary',
};

interface MemberCommitmentHeatmapCardProps {
  heatmap: MemberSundayCommitmentHeatmap;
}

export function MemberCommitmentHeatmapCard({ heatmap }: MemberCommitmentHeatmapCardProps) {
  const [selectedSlot, setSelectedSlot] = useState<MemberSundayCommitmentSlot | null>(null);

  const slotLookup = useMemo(() => {
    const map = new Map<string, MemberSundayCommitmentSlot>();
    for (const slot of heatmap.slots) {
      map.set(`${slot.sundayKey}_${slot.timeSlot}`, slot);
    }
    return map;
  }, [heatmap.slots]);

  return (
    <>
      <SectionCard
        title={
          <div className="flex items-center gap-2.5 font-heading text-lg font-semibold text-text">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Calendar className="h-4 w-4" />
            </div>
            <span>Sunday Commitment Heatmap</span>
          </div>
        }
        subtitle={`Schedule distribution across 5 Sundays and service timeslots. Percentages indicate share of all Sunday-committed volunteers (${heatmap.totalCommittedMembers} total).`}
        headerAction={
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted">Intensity:</span>
            <div className="flex items-center gap-2.5 text-[11px] text-muted">
              <div className="flex items-center gap-1" title="0 volunteers scheduled (unstaffed)">
                <span className="h-3 w-3 rounded-xs border border-danger bg-danger" />
                <span>0</span>
              </div>
              <div
                className="flex items-center gap-1"
                title={`Low turnout: < 55% of peak slot capacity (< ${Math.round(heatmap.maxCount * 0.55)} volunteers)`}
              >
                <span className="h-3 w-3 rounded-xs border border-accent bg-accent" />
                <span>Low (&lt;55%)</span>
              </div>
              <div
                className="flex items-center gap-1"
                title={`Moderate turnout: 55%–79% of peak slot capacity (${Math.round(heatmap.maxCount * 0.55)}–${Math.max(Math.round(heatmap.maxCount * 0.55), Math.round(heatmap.maxCount * 0.8) - 1)} volunteers)`}
              >
                <span className="h-3 w-3 rounded-xs border border-secondary bg-secondary" />
                <span>Med (55–79%)</span>
              </div>
              <div
                className="flex items-center gap-1"
                title={`Peak turnout: ≥ 80% of peak slot capacity (≥ ${Math.round(heatmap.maxCount * 0.8)} volunteers)`}
              >
                <span className="h-3 w-3 rounded-xs border border-primary bg-primary" />
                <span>High (≥80%)</span>
              </div>
            </div>
          </div>
        }
      >
        <div className="mt-4 sm:overflow-x-auto">
          <div className="w-full sm:min-w-[500px]">
            {/* Header row with time slots (Desktop only) */}
            <div className="hidden sm:grid sm:grid-cols-[130px_repeat(3,1fr)] gap-2 pb-2 text-center text-xs font-semibold uppercase tracking-wider text-muted">
              <div className="text-left">Sunday</div>
              {heatmap.timeSlots.map((ts) => (
                <div key={ts.key} className="py-1">
                  {ts.label}
                </div>
              ))}
            </div>

            {/* Grid rows */}
            <div className="flex flex-col gap-4 sm:gap-2">
              {heatmap.sundays.map((sunday) => (
                <div
                  key={sunday.key}
                  className="flex flex-col gap-2 rounded-2xl border border-border/60 bg-background/30 p-2.5 sm:border-0 sm:bg-transparent sm:p-0 sm:grid sm:grid-cols-[130px_repeat(3,1fr)] sm:items-center sm:gap-2"
                >
                  {/* Sunday label: above on mobile, left column on desktop */}
                  <div className="flex items-center gap-2 text-sm font-semibold text-text">
                    <span
                      className={`h-2.5 w-2.5 rounded-full shrink-0 ${SUNDAY_DOT_COLORS[sunday.key] || 'bg-primary'}`}
                    />
                    <span>{sunday.label}</span>
                  </div>

                  {/* Cards: 3-column grid on mobile, direct columns on desktop */}
                  <div className="grid grid-cols-3 gap-2 sm:contents">
                    {heatmap.timeSlots.map((ts) => {
                      const slot = slotLookup.get(`${sunday.key}_${ts.key}`);
                      const count = slot?.count ?? 0;
                      const max = heatmap.maxCount || 1;
                      const ratio = count / max;

                      // Compute semantic background & text styling based on ratio
                      let cellBg =
                        'bg-danger text-white border-danger shadow-xs hover:brightness-105';

                      if (count > 0) {
                        if (ratio >= 0.8) {
                          cellBg =
                            'bg-primary text-white border-primary shadow-xs hover:brightness-105';
                        } else if (ratio >= 0.55) {
                          cellBg =
                            'bg-secondary text-white border-secondary shadow-xs hover:brightness-105';
                        } else {
                          cellBg =
                            'bg-accent text-text border-accent shadow-xs hover:brightness-105';
                        }
                      }

                      return (
                        <button
                          key={ts.key}
                          type="button"
                          onClick={() => slot && setSelectedSlot(slot)}
                          className={`group relative flex flex-col items-center justify-center rounded-xl border p-2 sm:p-3 transition-all cursor-pointer ${cellBg}`}
                          title={`Click to view ${count} volunteer(s) (${slot?.percentage ?? 0}% of committed volunteers) for ${sunday.label} - ${ts.label}`}
                        >
                          <span className="text-[10px] font-semibold uppercase tracking-wider opacity-90 sm:hidden">
                            {ts.key}
                          </span>
                          <span className="font-heading text-lg sm:text-xl font-bold tracking-tight">
                            {count}
                          </span>
                          <div className="mt-0.5 sm:mt-1 flex items-center gap-1 text-[10px] sm:text-[11px] opacity-80 group-hover:opacity-100">
                            <Users className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                            <span className="hidden sm:inline">
                              {slot?.percentage ?? 0}% of committed
                            </span>
                            <span className="sm:hidden">{slot?.percentage ?? 0}%</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Heatmap Intensity Legend & Threshold Guide */}
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-border/60 pt-3 text-xs text-muted">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
            <span className="font-medium text-text">
              Intensity Tiers (relative to peak slot of {heatmap.maxCount} volunteers):
            </span>
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-xs border border-danger bg-danger" />
              <span>
                <strong>0</strong>: Unstaffed (0)
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-xs border border-accent bg-accent" />
              <span>
                <strong>Low</strong>: &lt; 55% of peak (&lt; {Math.round(heatmap.maxCount * 0.55)})
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-xs border border-secondary bg-secondary" />
              <span>
                <strong>Med</strong>: 55%–79% of peak ({Math.round(heatmap.maxCount * 0.55)}–
                {Math.max(
                  Math.round(heatmap.maxCount * 0.55),
                  Math.round(heatmap.maxCount * 0.8) - 1,
                )}
                )
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-xs border border-primary bg-primary" />
              <span>
                <strong>High</strong>: ≥ 80% of peak (≥ {Math.round(heatmap.maxCount * 0.8)})
              </span>
            </div>
          </div>
          <span className="text-[11px] text-muted italic">
            Click any slot to inspect volunteer list
          </span>
        </div>
      </SectionCard>

      <SlotAttendeesModal
        isOpen={selectedSlot !== null}
        onClose={() => setSelectedSlot(null)}
        slot={selectedSlot}
      />
    </>
  );
}
