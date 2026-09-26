export function ServiceAttendanceLegend() {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-surface px-3.5 py-2.5 text-sm shadow-xs">
      <span className="font-bold text-text">Schedule Alignment:</span>
      <div className="flex items-center gap-1.5">
        <span className="h-2.5 w-2.5 rounded-full bg-primary" />
        <span className="font-medium text-text">Attended (Committed)</span>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="h-2.5 w-2.5 rounded-full bg-secondary" />
        <span className="font-medium text-text">Attended (Unscheduled)</span>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="h-2.5 w-2.5 rounded-full bg-danger" />
        <span className="font-medium text-text">No Check-In (Committed)</span>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="h-2.5 w-2.5 rounded-full bg-accent" />
        <span className="font-medium text-text">Excused</span>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="h-2.5 w-2.5 rounded-full border border-border bg-surface-alt" />
        <span className="font-medium text-text">Service Exception</span>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="h-2.5 w-2.5 rounded-full border-2 border-dashed border-primary" />
        <span className="font-medium text-text">Upcoming Committed</span>
      </div>
    </div>
  );
}
