import { ListTableCell, ListTableRow } from '@/components/ui/ListTable';

export interface AttendanceDateGroupHeaderProps {
  date: string;
  memberCount: number;
  totalRecords: number;
}

export function AttendanceDateGroupHeader({
  date,
  memberCount,
  totalRecords,
}: AttendanceDateGroupHeaderProps) {
  return (
    <ListTableRow>
      <ListTableCell
        colSpan={8}
        className="bg-muted/40 px-4 py-2 text-xs font-semibold uppercase tracking-widest text-muted"
      >
        {date}
        <span className="ml-2 font-normal normal-case tracking-normal">
          &mdash; {memberCount} {memberCount === 1 ? 'member' : 'members'}, {totalRecords}{' '}
          {totalRecords === 1 ? 'check-in' : 'check-ins'}
        </span>
      </ListTableCell>
    </ListTableRow>
  );
}
