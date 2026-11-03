import {
  Avatar,
  Badge,
  Button,
  ListTable,
  ListTableBody,
  ListTableCell,
  ListTableHead,
  ListTableHeaderCell,
  ListTableHeaderRow,
  ListTableRow,
} from '@/components/ui';
import type { ApprovalRequest } from '@/lib/domain/approvals';
import { formatDateOnly } from '@/lib/infrastructure';

import { getApprovalEntityTypeBadgeVariant, getApprovalEntityTypeLabel } from './helpers';

export interface ApprovalsTableProps {
  requests: ApprovalRequest[];
  onInspect: (req: ApprovalRequest) => void;
}

export function ApprovalsTable({ requests, onInspect }: ApprovalsTableProps) {
  return (
    <div className="rounded-2xl border border-border bg-surface overflow-hidden shadow-xs">
      <ListTable>
        <ListTableHead>
          <ListTableHeaderRow>
            <ListTableHeaderCell className="px-6">Request</ListTableHeaderCell>
            <ListTableHeaderCell>Type</ListTableHeaderCell>
            <ListTableHeaderCell>Requester</ListTableHeaderCell>
            <ListTableHeaderCell>Submitted</ListTableHeaderCell>
            <ListTableHeaderCell>Status</ListTableHeaderCell>
            <ListTableHeaderCell className="text-right px-6">Actions</ListTableHeaderCell>
          </ListTableHeaderRow>
        </ListTableHead>
        <ListTableBody>
          {requests.map((req) => (
            <ListTableRow key={req.id} className="cursor-pointer" onClick={() => onInspect(req)}>
              <ListTableCell className="px-6">
                <p className="font-heading font-semibold text-text">{req.title}</p>
                {req.summary && (
                  <p className="mt-0.5 text-xs text-muted line-clamp-1">{req.summary}</p>
                )}
              </ListTableCell>
              <ListTableCell>
                <Badge variant={getApprovalEntityTypeBadgeVariant(req.entity_type)}>
                  {getApprovalEntityTypeLabel(req.entity_type, false)}
                </Badge>
              </ListTableCell>
              <ListTableCell>
                <div className="flex items-center gap-3">
                  <Avatar
                    name={req.requester_name}
                    avatarObjectKey={req.requester_avatar_object_key}
                    size="sm"
                  />
                  <div className="min-w-0">
                    <p className="font-medium text-text truncate">{req.requester_name}</p>
                    {req.requester_email && (
                      <p className="text-xs text-muted truncate">{req.requester_email}</p>
                    )}
                  </div>
                </div>
              </ListTableCell>
              <ListTableCell>
                <span className="text-sm text-text">{formatDateOnly(req.created_at)}</span>
              </ListTableCell>
              <ListTableCell>
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
                {req.assigned_to_email && (
                  <p
                    className="mt-1 text-[11px] text-muted truncate max-w-[130px]"
                    title={req.assigned_to_email}
                  >
                    {req.assigned_to_email}
                  </p>
                )}
              </ListTableCell>
              <ListTableCell className="text-right px-6" onClick={(e) => e.stopPropagation()}>
                <Button
                  size="sm"
                  variant={req.status === 'pending' ? 'default' : 'outline'}
                  onClick={() => onInspect(req)}
                >
                  {req.status === 'pending' ? 'Review & Decide' : 'Details'}
                </Button>
              </ListTableCell>
            </ListTableRow>
          ))}
        </ListTableBody>
      </ListTable>
    </div>
  );
}
