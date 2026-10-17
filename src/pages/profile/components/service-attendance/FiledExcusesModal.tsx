import { Calendar, FileText } from 'lucide-react';
import { toast } from 'sonner';

import { Badge, Button, Dialog } from '@/components/ui';
import { useCancelExcuseMutation, useMemberServiceExcusesQuery } from '@/hooks/domain/services';
import { formatDateOnly } from '@/lib/infrastructure';

export interface FiledExcusesModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
}

function formatExcuseDate(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  if (!year || !month || !day) return dateStr;
  const d = new Date(year, month - 1, day);
  return d.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function isUpcomingOrToday(requestDate: string): boolean {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  const todayStr = `${year}-${month}-${day}`;
  return requestDate >= todayStr;
}

export function FiledExcusesModal({ isOpen, onClose, userId }: FiledExcusesModalProps) {
  const {
    data: excuses = [],
    isLoading,
    isError,
  } = useMemberServiceExcusesQuery(userId, undefined, undefined, {
    enabled: isOpen && Boolean(userId),
  });

  const cancelMutation = useCancelExcuseMutation();

  const handleCancel = async (id: string) => {
    try {
      await cancelMutation.mutateAsync(id);
      toast.success('Excuse request cancelled successfully.');
    } catch {
      toast.error('Failed to cancel excuse request.');
    }
  };

  return (
    <Dialog isOpen={isOpen} onClose={onClose} size="lg">
      <Dialog.Header>
        <Dialog.Title>Filed Excuse Requests</Dialog.Title>
        <Dialog.Description>
          Review your submitted service excuse requests and cancel upcoming requests if needed.
        </Dialog.Description>
      </Dialog.Header>

      <Dialog.Body className="max-h-[60vh] overflow-y-auto space-y-3 py-2">
        {isLoading && (
          <div className="py-8 text-center text-sm text-muted">Loading your excuse requests...</div>
        )}

        {isError && (
          <div className="py-8 text-center text-sm text-danger">
            Failed to load excuse requests. Please try again later.
          </div>
        )}

        {!isLoading && !isError && excuses.length === 0 && (
          <div className="py-8 text-center space-y-2">
            <FileText className="mx-auto h-8 w-8 text-muted/60" aria-hidden="true" />
            <p className="text-sm font-medium text-text">No filed excuse requests found</p>
            <p className="text-xs text-muted">You haven't filed any service excuse requests yet.</p>
          </div>
        )}

        {!isLoading &&
          !isError &&
          excuses.map((excuse) => {
            const isApproved = excuse.status === 'approved';
            const canCancel = isApproved && isUpcomingOrToday(excuse.request_date);

            return (
              <div
                key={excuse.id}
                className="rounded-xl border border-border bg-surface p-4 space-y-2.5 transition-colors"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-primary" aria-hidden="true" />
                    <span className="font-semibold text-text text-sm">
                      {formatExcuseDate(excuse.request_date)}
                    </span>
                  </div>

                  {isApproved ? (
                    <Badge
                      variant="outline"
                      className="border-emerald-500/30 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                    >
                      Active
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="border-muted/30 bg-muted/10 text-muted">
                      Cancelled
                    </Badge>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-xs text-muted font-medium">Excused Services:</span>
                  {excuse.services.map((service) => (
                    <span
                      key={service}
                      className="rounded-md border border-border bg-surface px-2 py-0.5 text-xs font-medium text-text"
                    >
                      {service}
                    </span>
                  ))}
                </div>

                {excuse.reason ? (
                  <p className="text-xs text-muted italic">"{excuse.reason}"</p>
                ) : (
                  <p className="text-xs text-muted/60 italic">(No reason specified)</p>
                )}

                <div className="flex items-center justify-between border-t border-border pt-2 text-xs text-muted">
                  <span>Filed on {formatDateOnly(excuse.created_at)}</span>

                  {canCancel && (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      disabled={cancelMutation.isPending}
                      onClick={() => handleCancel(excuse.id)}
                      className="h-7 text-xs font-semibold text-rose-600 hover:bg-rose-50 hover:text-rose-700 dark:hover:bg-rose-950/40"
                    >
                      Cancel Request
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
      </Dialog.Body>

      <Dialog.Footer>
        <Button type="button" variant="outline" onClick={onClose}>
          Close
        </Button>
      </Dialog.Footer>
    </Dialog>
  );
}
