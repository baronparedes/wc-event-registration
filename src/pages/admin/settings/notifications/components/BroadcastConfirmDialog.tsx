import { AlertTriangle, Bell, ExternalLink, Send, Users } from 'lucide-react';

import { Avatar, Badge, Button, Dialog } from '@/components/ui';
import type { AuthUserItem } from '@/hooks/domain/auth';

import { getBroadcastRoleLabel } from '../constants';

export interface BroadcastPreviewValues {
  title: string;
  message: string;
  targetType: 'all' | 'role' | 'user';
  targetRoles?: string[];
  targetUserId?: string;
  destinationUrl?: string;
}

export interface BroadcastConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isPending: boolean;
  values: BroadcastPreviewValues | null;
  targetUser?: AuthUserItem | null;
}

export function BroadcastConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  isPending,
  values,
  targetUser,
}: BroadcastConfirmDialogProps) {
  if (!values) return null;

  return (
    <Dialog isOpen={isOpen} onClose={onClose} size="md">
      <Dialog.Header showCloseButton onClose={onClose}>
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Bell className="h-5 w-5" />
          </div>
          <div>
            <Dialog.Title>Confirm Broadcast</Dialog.Title>
            <Dialog.Description>
              Review your target audience and message details before sending.
            </Dialog.Description>
          </div>
        </div>
      </Dialog.Header>

      <Dialog.Body className="space-y-4 pt-1">
        {/* Audience Target Card */}
        <div className="rounded-xl border border-border bg-background p-3.5 space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-muted">
            <span>Target Audience</span>
            {values.targetType === 'all' && (
              <span className="text-amber-500 font-medium">Mass Broadcast</span>
            )}
          </div>

          {values.targetType === 'all' && (
            <div className="flex items-start gap-2.5 rounded-lg border border-amber-500/20 bg-amber-500/5 p-2.5 text-xs text-amber-700 dark:text-amber-300">
              <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500 mt-0.5" />
              <div>
                <p className="font-semibold text-text">Registered Members</p>
                <p className="text-muted mt-0.5">
                  This creates an in-app alert for members with a matching account email. Push
                  delivery requires an active browser subscription.
                </p>
              </div>
            </div>
          )}

          {values.targetType === 'role' && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs text-muted">
                <Users className="h-3.5 w-3.5 text-primary shrink-0" />
                <span>Selected Roles ({values.targetRoles?.length ?? 0}):</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {(values.targetRoles ?? []).map((role) => (
                  <Badge key={role} variant="primaryOutline" className="text-xs px-2.5 py-0.5">
                    {getBroadcastRoleLabel(role)}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {values.targetType === 'user' && (
            <div className="flex items-center gap-3 rounded-lg border border-primary/20 bg-primary/[0.03] p-2.5">
              <Avatar
                name={targetUser?.name || targetUser?.email || values.targetUserId || 'User'}
                avatarObjectKey={targetUser?.avatar_object_key}
                size="sm"
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-text truncate">
                    {targetUser?.name || 'Target User'}
                  </p>
                  {targetUser?.has_member_profile && (
                    <Badge variant="primaryOutline" className="text-[10px] px-1.5 py-0.5">
                      Member
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted truncate">
                  {targetUser?.email || values.targetUserId}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Message Preview */}
        <div className="rounded-xl border border-border bg-background p-3.5 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted">
            Notification Preview
          </p>
          <div className="rounded-lg border border-border/80 bg-surface p-3 space-y-1.5 shadow-xs">
            <p className="text-sm font-semibold text-text">{values.title}</p>
            <p className="text-xs text-muted whitespace-pre-wrap">{values.message}</p>
            {values.destinationUrl && (
              <div className="flex items-center gap-1.5 pt-1 text-[11px] text-primary">
                <ExternalLink className="h-3 w-3 shrink-0" />
                <span className="truncate">{values.destinationUrl}</span>
              </div>
            )}
          </div>
        </div>
      </Dialog.Body>

      <Dialog.Footer>
        <Button variant="outline" onClick={onClose} disabled={isPending}>
          Back to Edit
        </Button>
        <Button onClick={onConfirm} disabled={isPending} className="gap-2">
          <Send className="h-4 w-4" />
          <span>{isPending ? 'Broadcasting...' : 'Confirm & Send'}</span>
        </Button>
      </Dialog.Footer>
    </Dialog>
  );
}
