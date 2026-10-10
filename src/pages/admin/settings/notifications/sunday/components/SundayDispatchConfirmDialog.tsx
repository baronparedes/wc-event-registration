import { useState } from 'react';

import { AlertTriangle, Bell, Calendar, Mail, Send, Users } from 'lucide-react';

import { Button, Dialog, Spinner } from '@/components/ui';
import type { BroadcastChannel } from '@/lib/domain/notifications';
import { formatDateOnly } from '@/lib/infrastructure/dateFormat';

interface SundayDispatchConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (force: boolean) => void;
  isPending: boolean;
  sundayDate: string;
  ordinal?: number;
  channels: BroadcastChannel[];
  totalVolunteers: number;
  pushEligibleCount: number;
  emailEligibleCount: number;
  alreadySentPush: boolean;
  alreadySentEmail: boolean;
}

export function SundayDispatchConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  isPending,
  sundayDate,
  ordinal,
  channels,
  totalVolunteers,
  pushEligibleCount,
  emailEligibleCount,
  alreadySentPush,
  alreadySentEmail,
}: SundayDispatchConfirmDialogProps) {
  const [forceConfirmed, setForceConfirmed] = useState(false);

  const isPush = channels.includes('push');
  const isEmail = channels.includes('email');
  const isAlreadyDispatched = (isPush && alreadySentPush) || (isEmail && alreadySentEmail);

  const canConfirm = !isAlreadyDispatched || forceConfirmed;

  const handleConfirm = () => {
    if (!canConfirm) return;
    onConfirm(isAlreadyDispatched);
  };

  const handleClose = () => {
    if (isPending) return;
    setForceConfirmed(false);
    onClose();
  };

  return (
    <Dialog isOpen={isOpen} onClose={handleClose} size="md">
      <Dialog.Header showCloseButton onClose={handleClose}>
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Send className="h-5 w-5" />
          </div>
          <div>
            <Dialog.Title>Confirm Sunday Schedule Dispatch</Dialog.Title>
            <Dialog.Description>
              Review target Sunday and estimated reach before dispatching reminders.
            </Dialog.Description>
          </div>
        </div>
      </Dialog.Header>

      <Dialog.Body className="space-y-4 pt-1">
        {/* Warning if already sent */}
        {isAlreadyDispatched && (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
            <div className="flex items-start gap-3">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400">
                <AlertTriangle className="h-4 w-4" />
              </div>
              <div className="space-y-1.5 text-xs">
                <p className="font-semibold text-text">Duplicate Dispatch Warning</p>
                <p className="leading-relaxed text-muted">
                  Reminders on{' '}
                  <span className="font-medium text-text">{formatDateOnly(sundayDate)}</span> have
                  already been dispatched previously. Sending again will re-deliver notifications to
                  scheduled volunteers.
                </p>
                <label className="flex cursor-pointer items-center gap-2 pt-1 font-medium text-text">
                  <input
                    type="checkbox"
                    checked={forceConfirmed}
                    onChange={(e) => setForceConfirmed(e.target.checked)}
                    className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                  />
                  <span>Yes, I want to force re-dispatch this batch</span>
                </label>
              </div>
            </div>
          </div>
        )}

        {/* Target Sunday Details */}
        <div className="rounded-xl border border-border bg-background p-3.5 space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-muted">
            <span>Target Sunday</span>
            <div className="flex items-center gap-1 text-primary font-medium">
              <Calendar className="h-3.5 w-3.5" />
              <span>
                {formatDateOnly(sundayDate)}
                {ordinal
                  ? ` (${ordinal === 1 ? '1st' : ordinal === 2 ? '2nd' : ordinal === 3 ? '3rd' : ordinal === 4 ? '4th' : '5th'} Sunday)`
                  : ''}
              </span>
            </div>
          </div>
        </div>

        {/* Selected Channels & Reach */}
        <div className="rounded-xl border border-border bg-background p-3.5 space-y-2.5">
          <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-muted">
            <span>Selected Channels & Estimated Reach</span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div
              className={`rounded-lg border p-2.5 space-y-1 ${
                isPush
                  ? 'border-primary/40 bg-primary/5 text-text'
                  : 'border-border bg-surface/50 text-muted opacity-60'
              }`}
            >
              <div className="flex items-center gap-1.5 font-medium">
                <Bell className="h-3.5 w-3.5" /> Push Notification
              </div>
              <p className="text-xs">
                {isPush ? `${pushEligibleCount} reachable devices` : 'Disabled'}
              </p>
            </div>

            <div
              className={`rounded-lg border p-2.5 space-y-1 ${
                isEmail
                  ? 'border-primary/40 bg-primary/5 text-text'
                  : 'border-border bg-surface/50 text-muted opacity-60'
              }`}
            >
              <div className="flex items-center gap-1.5 font-medium">
                <Mail className="h-3.5 w-3.5" /> Email Notification
              </div>
              <p className="text-xs">
                {isEmail ? `${emailEligibleCount} reachable emails` : 'Disabled'}
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between pt-1 border-t border-border text-xs text-muted">
            <span className="flex items-center gap-1">
              <Users className="h-3.5 w-3.5" /> Total Scheduled Volunteers
            </span>
            <span className="font-semibold text-text">{totalVolunteers}</span>
          </div>
        </div>
      </Dialog.Body>

      <Dialog.Footer className="px-6 py-4">
        <Button variant="outline" onClick={handleClose} disabled={isPending}>
          Cancel
        </Button>
        <Button
          variant="default"
          onClick={handleConfirm}
          disabled={isPending || !canConfirm || totalVolunteers === 0 || channels.length === 0}
          className="gap-1.5"
        >
          {isPending ? (
            <>
              <Spinner size="sm" aria-hidden="true" />
              <span>Dispatching...</span>
            </>
          ) : (
            <>
              <Send className="h-4 w-4" />
              <span>{isAlreadyDispatched ? 'Force Re-dispatch' : 'Dispatch Reminders'}</span>
            </>
          )}
        </Button>
      </Dialog.Footer>
    </Dialog>
  );
}
