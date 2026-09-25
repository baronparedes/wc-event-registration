export interface AttendanceDateMobileGroupHeaderProps {
  date: string;
  memberCount: number;
  totalRecords: number;
}

export function AttendanceDateMobileGroupHeader({
  date,
  memberCount,
  totalRecords,
}: AttendanceDateMobileGroupHeaderProps) {
  return (
    <div className="bg-muted/40 px-4 py-2 text-xs font-semibold uppercase tracking-widest text-muted border-y border-border mb-4 sticky top-0 z-10 backdrop-blur-sm shadow-xs">
      {date}
      <span className="ml-2 font-normal normal-case tracking-normal">
        &mdash; {memberCount} {memberCount === 1 ? 'member' : 'members'}, {totalRecords}{' '}
        {totalRecords === 1 ? 'check-in' : 'check-ins'}
      </span>
    </div>
  );
}
