export function MemberStatusBadge({ isActive }: { isActive: boolean }) {
  let statusClassName = 'bg-red-100 text-red-700';
  let statusLabel = 'Deleted';

  if (isActive) {
    statusClassName = 'bg-secondary/15 text-secondary';
    statusLabel = 'Active';
  }

  return (
    <span
      className={`inline-flex rounded-full px-2 py-1 text-xs font-medium shrink-0 ${statusClassName}`}
    >
      {statusLabel}
    </span>
  );
}
