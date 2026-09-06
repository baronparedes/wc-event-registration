import { Link } from 'react-router-dom';

import { ROUTE_PATHS } from '@/config/constants';

import { Avatar } from '../ui/Avatar';

type UserIdentityProps = {
  displayName: string;
  avatarObjectKey?: string | null;
  roleLabel?: string;
  hasProfileAccess: boolean;
  variant?: 'header' | 'drawer';
  onProfileClick?: () => void;
  contentClassName?: string;
  showNameLabel?: boolean;
};

export function UserIdentity({
  displayName,
  avatarObjectKey,
  roleLabel,
  hasProfileAccess,
  variant = 'header',
  onProfileClick,
  contentClassName,
  showNameLabel = true,
}: UserIdentityProps) {
  const isDrawer = variant === 'drawer';
  const content = (
    <>
      <Avatar name={displayName} avatarObjectKey={avatarObjectKey} size="sm" />
      {showNameLabel && (
        <div
          className={
            isDrawer
              ? 'min-w-0 flex-1 truncate text-xs'
              : `${contentClassName ?? 'max-w-[15rem]'} truncate text-xs text-muted`
          }
        >
          <span className="font-semibold text-text">{displayName}</span>
          {roleLabel && (
            <span
              className={isDrawer ? 'block truncate text-muted' : 'ml-1 font-normal text-muted'}
            >
              {roleLabel}
            </span>
          )}
        </div>
      )}
    </>
  );

  const className = isDrawer
    ? 'flex items-center gap-2.5 rounded-lg border border-border bg-background p-2 transition hover:bg-primary/10'
    : 'flex items-center gap-2 transition hover:opacity-80';

  return hasProfileAccess ? (
    <Link
      to={ROUTE_PATHS.profile}
      onClick={onProfileClick}
      className={className}
      title="View Profile"
    >
      {content}
    </Link>
  ) : (
    <div
      className={
        isDrawer
          ? className.replace(' transition hover:bg-primary/10', '')
          : 'flex items-center gap-2'
      }
    >
      {content}
    </div>
  );
}
