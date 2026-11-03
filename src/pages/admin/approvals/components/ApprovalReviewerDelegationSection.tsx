import { UserPlus } from 'lucide-react';

import { Badge, Button, FormSelectField } from '@/components/ui';
import type { ApprovalRequest, SlodUserItem } from '@/lib/domain/approvals';

export interface ApprovalReviewerDelegationSectionProps {
  request: ApprovalRequest;
  slodUsers: SlodUserItem[];
  delegatedEmail: string;
  onDelegatedEmailChange: (val: string) => void;
  onDelegate: () => void;
  isDelegating: boolean;
  isLoadingSlod: boolean;
}

export function ApprovalReviewerDelegationSection({
  request,
  slodUsers,
  delegatedEmail,
  onDelegatedEmailChange,
  onDelegate,
  isDelegating,
  isLoadingSlod,
}: ApprovalReviewerDelegationSectionProps) {
  return (
    <div className="rounded-2xl border border-border bg-background p-4 shadow-xs space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted block">
            Reviewer Assignment
          </span>
          <p className="text-sm font-medium text-text mt-0.5">
            {request.assigned_to_email ? (
              <>
                Assigned to{' '}
                <span className="font-semibold text-primary">
                  {slodUsers.find(
                    (u) => u.email.toLowerCase() === request.assigned_to_email?.toLowerCase(),
                  )?.name || request.assigned_to_email}
                </span>{' '}
                ({request.assigned_to_email})
              </>
            ) : (
              'Unassigned (Open to all Admins)'
            )}
          </p>
        </div>
        <Badge variant={request.assigned_to_email ? 'secondary' : 'outline'}>
          {request.assigned_to_email ? 'Delegated' : 'Unassigned'}
        </Badge>
      </div>

      {/* Delegation Controls */}
      <div className="pt-2 border-t border-border">
        <div className="text-xs font-semibold text-text mb-1.5 flex items-center gap-1.5">
          <UserPlus className="h-3.5 w-3.5 text-primary" />
          Delegate Review to SLOD
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="flex-1">
            <FormSelectField
              id="delegate-slod-select"
              ariaLabel="Select SLOD Reviewer"
              value={delegatedEmail}
              onChange={onDelegatedEmailChange}
              disabled={isDelegating || isLoadingSlod}
              options={[
                { value: '', label: 'Select SLOD reviewer...' },
                ...slodUsers.map((u) => ({
                  value: u.email,
                  label: `${u.name} (${u.email})`,
                })),
              ]}
            />
          </div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={
              !delegatedEmail || delegatedEmail === request.assigned_to_email || isDelegating
            }
            onClick={onDelegate}
            className="shrink-0"
          >
            {isDelegating ? 'Delegating...' : 'Assign & Notify'}
          </Button>
        </div>
        <p className="text-[11px] text-muted mt-1.5">
          Delegating will send an approval review link to the SLOD. You can still approve directly
          at any time.
        </p>
      </div>
    </div>
  );
}
