import {
  MobileCard,
  MobileCardBody,
  MobileCardContent,
  MobileCardContentItem,
  MobileCardDivider,
  MobileCardHeader,
} from '@/components/ui';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import type { CommitmentDashboardStat } from '@/hooks/domain/services';

interface MobileVolunteerCardProps {
  stat: CommitmentDashboardStat;
  onClick?: (stat: CommitmentDashboardStat) => void;
}

export function MobileVolunteerCard({ stat, onClick }: MobileVolunteerCardProps) {
  const trimmedName = `${stat.nickname ?? ''}`.trim();
  const avatarName = trimmedName !== '' ? trimmedName : stat.full_name;

  return (
    <div
      onClick={() => onClick?.(stat)}
      className={onClick ? 'cursor-pointer' : ''}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={(e) => {
        if (onClick && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          onClick(stat);
        }
      }}
    >
      <MobileCard className={onClick ? 'transition-colors hover:bg-slate-50' : ''}>
        <MobileCardBody>
          <MobileCardHeader>
            <div className="flex min-w-0 items-center gap-3">
              <Avatar
                name={avatarName}
                avatarObjectKey={stat.avatar_object_key}
                size="md"
                className="shrink-0"
              />
              <div className="min-w-0">
                <h2 className="truncate text-[17px] font-semibold leading-snug text-[#0f172a]">
                  {stat.full_name}
                </h2>
                {stat.nickname && (
                  <p className="truncate text-sm text-slate-500">({stat.nickname})</p>
                )}
                <div className="flex flex-wrap gap-2 pt-1 pb-2 text-xs text-muted">
                  <p>
                    {stat.role || '-'} • {stat.category || '-'}
                  </p>
                </div>
              </div>
            </div>
            <div className="flex flex-col items-end gap-1">
              <Badge
                variant={stat.attendance_score < 0 ? 'destructive' : 'default'}
                className="font-bold whitespace-nowrap"
              >
                {stat.attendance_score}
              </Badge>
            </div>
          </MobileCardHeader>

          <MobileCardDivider />

          <MobileCardContent>
            <MobileCardContentItem label="Start Date" value={stat.start_date || '-'} />
            <MobileCardContentItem label="Committed" value={stat.committed} />
            <MobileCardContentItem
              label="Attended"
              value={<Badge variant="secondary">{stat.attended}</Badge>}
            />
            <MobileCardContentItem
              label="Absences"
              value={
                stat.absences > 0 ? (
                  <Badge variant="destructive">-{stat.absences}</Badge>
                ) : (
                  <span className="text-muted">0</span>
                )
              }
            />
            <MobileCardContentItem
              label="Excused"
              value={
                stat.excused > 0 ? (
                  <Badge variant="accent">{stat.excused}</Badge>
                ) : (
                  <span className="text-muted">0</span>
                )
              }
            />
            <MobileCardContentItem
              label="WI 9AM/3PM"
              value={
                stat.wi_9am_3pm > 0 ? (
                  <Badge variant="outline">+{stat.wi_9am_3pm}</Badge>
                ) : (
                  <span className="text-muted">0</span>
                )
              }
            />
            <MobileCardContentItem
              label="WI 12NN"
              value={
                stat.wi_12nn > 0 ? (
                  <Badge variant="outline">+{stat.wi_12nn}</Badge>
                ) : (
                  <span className="text-muted">0</span>
                )
              }
            />
            <MobileCardContentItem
              label="WI 5th Sun"
              value={
                stat.wi_5th_sunday > 0 ? (
                  <Badge variant="outline">+{stat.wi_5th_sunday}</Badge>
                ) : (
                  <span className="text-muted">0</span>
                )
              }
            />
          </MobileCardContent>
        </MobileCardBody>
      </MobileCard>
    </div>
  );
}
