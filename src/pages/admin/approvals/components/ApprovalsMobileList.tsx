import {
  Avatar,
  Badge,
  Button,
  MobileCard,
  MobileCardActions,
  MobileCardBody,
  MobileCardContent,
  MobileCardContentItem,
  MobileCardHeader,
} from '@/components/ui';
import type { ApprovalRequest } from '@/lib/domain/approvals';
import { formatDateOnly } from '@/lib/infrastructure';

import { getApprovalEntityTypeBadgeVariant, getApprovalEntityTypeLabel } from './helpers';

export interface ApprovalsMobileListProps {
  requests: ApprovalRequest[];
  onInspect: (req: ApprovalRequest) => void;
}

export function ApprovalsMobileList({ requests, onInspect }: ApprovalsMobileListProps) {
  return (
    <div className="space-y-3 pb-3">
      {requests.map((req) => (
        <MobileCard key={req.id}>
          <MobileCardBody>
            <MobileCardHeader>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <Badge
                    variant={getApprovalEntityTypeBadgeVariant(req.entity_type)}
                    className="mb-1.5"
                  >
                    {getApprovalEntityTypeLabel(req.entity_type, true)}
                  </Badge>
                  <h3 className="font-heading font-semibold text-text truncate">{req.title}</h3>
                </div>
                <Badge
                  variant={
                    req.status === 'approved'
                      ? 'default'
                      : req.status === 'rejected'
                        ? 'destructive'
                        : 'accent'
                  }
                >
                  {req.status}
                </Badge>
              </div>
            </MobileCardHeader>

            <MobileCardContent>
              <MobileCardContentItem label="Requester">
                <div className="flex items-center gap-2.5 mt-0.5">
                  <Avatar
                    name={req.requester_name}
                    avatarObjectKey={req.requester_avatar_object_key}
                    size="xs"
                  />
                  <div className="min-w-0">
                    <span className="font-medium text-text block truncate">
                      {req.requester_name}
                    </span>
                    {req.requester_email && (
                      <span className="block text-xs text-muted truncate">
                        {req.requester_email}
                      </span>
                    )}
                  </div>
                </div>
              </MobileCardContentItem>
              <MobileCardContentItem label="Date">
                <span className="text-text">{formatDateOnly(req.created_at)}</span>
              </MobileCardContentItem>
              {req.assigned_to_email && (
                <MobileCardContentItem label="Assigned">
                  <span className="text-xs text-muted truncate">{req.assigned_to_email}</span>
                </MobileCardContentItem>
              )}
              {req.summary && (
                <MobileCardContentItem label="Details">
                  <span className="text-muted line-clamp-2">{req.summary}</span>
                </MobileCardContentItem>
              )}
            </MobileCardContent>

            <MobileCardActions>
              <Button
                className="w-full"
                size="sm"
                variant={req.status === 'pending' ? 'default' : 'outline'}
                onClick={() => onInspect(req)}
              >
                {req.status === 'pending' ? 'Review & Decide' : 'View Details'}
              </Button>
            </MobileCardActions>
          </MobileCardBody>
        </MobileCard>
      ))}
    </div>
  );
}
