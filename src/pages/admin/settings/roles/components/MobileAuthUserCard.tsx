import { ShieldCheck } from 'lucide-react';

import { Avatar, Badge } from '@/components/ui';
import type { AuthUserItem } from '@/hooks/domain/auth';

type MobileAuthUserCardProps = {
  user: AuthUserItem;
  isAssigned: boolean;
  isSelected: boolean;
  onSelect: (user: AuthUserItem) => void;
};

export function MobileAuthUserCard({
  user,
  isAssigned,
  isSelected,
  onSelect,
}: MobileAuthUserCardProps) {
  return (
    <article
      tabIndex={0}
      role="option"
      aria-selected={isSelected}
      onClick={() => onSelect(user)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onSelect(user);
        }
      }}
      className={`relative rounded-xl border bg-background shadow-sm p-4 cursor-pointer transition-colors focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary/40 ${
        isSelected
          ? 'border-primary/40 bg-primary/10 ring-1 ring-inset ring-primary/40'
          : 'border-border/60 hover:bg-muted/10'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <Avatar
            name={user.name}
            avatarObjectKey={user.avatar_object_key}
            size="md"
            className="shrink-0"
          />
          <div className="min-w-0">
            <h2 className="truncate text-base font-semibold leading-snug text-text">{user.name}</h2>
            <div className="flex items-center gap-1.5 pt-1">
              <p className="truncate text-sm font-medium text-text">{user.email}</p>
              {user.has_member_profile && (
                <span title="Verified Member Profile">
                  <ShieldCheck
                    className="h-4 w-4 text-primary shrink-0"
                    aria-label="Verified Member Profile"
                  />
                </span>
              )}
            </div>
            <small className="truncate text-[0.65rem] text-muted font-mono pt-1">{user.id}</small>
          </div>
        </div>

        {isAssigned && (
          <div className="shrink-0">
            <Badge variant="outline">Assigned</Badge>
          </div>
        )}
      </div>
    </article>
  );
}
