import { useEffect, useMemo } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { CalendarRange, Send } from 'lucide-react';
import { Controller, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import { Button, Dialog, FormSelectField } from '@/components/ui';
import { useSlodUsersQuery } from '@/hooks/domain/approvals';
import { useSubmitExcuseMutation } from '@/hooks/domain/services';
import { MATRIX_TIME_SLOTS } from '@/lib/domain/services';
import { SundayCalendarPicker } from '@/pages/excuse-request/components/SundayCalendarPicker';

function isSundayDateString(val?: string): boolean {
  if (!val) return true;
  const [y, m, d] = val.split('-').map(Number);
  if (!y || !m || !d) return false;
  const date = new Date(y, m - 1, d);
  return date.getDay() === 0;
}

const longLeaveFormSchema = z
  .object({
    start_date: z
      .string()
      .trim()
      .min(1, 'Please select a start date')
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Please select a valid date in YYYY-MM-DD format')
      .refine(isSundayDateString, 'Start date must be a Sunday'),
    end_date: z
      .string()
      .trim()
      .min(1, 'Please select an end date')
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Please select a valid date in YYYY-MM-DD format')
      .refine(isSundayDateString, 'End date must be a Sunday'),
    reason: z
      .string()
      .trim()
      .min(1, 'Please provide a reason for the leave')
      .max(500, 'Reason must be 500 characters or less'),
    assigned_to_email: z
      .string()
      .trim()
      .email('Please enter a valid email address')
      .optional()
      .or(z.literal('')),
  })
  .refine(
    (data) => {
      if (!data.start_date || !data.end_date) return true;
      const [sy, sm, sd] = data.start_date.split('-').map(Number);
      const [ey, em, ed] = data.end_date.split('-').map(Number);
      if (!sy || !sm || !sd || !ey || !em || !ed) return true;
      const start = new Date(sy, sm - 1, sd);
      const end = new Date(ey, em - 1, ed);
      const diffDays = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
      return diffDays >= 28;
    },
    {
      message: 'Long leave must span at least 4 weeks (28 days) from start date',
      path: ['end_date'],
    },
  );

type LongLeaveFormValues = z.infer<typeof longLeaveFormSchema>;

function getNextSundayDate(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  const diff = (7 - day) % 7 || 7;
  d.setDate(d.getDate() + diff);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const date = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${date}`;
}

function getFourWeeksOut(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  if (!y || !m || !d) return dateStr;
  const target = new Date(y, m - 1, d);
  target.setDate(target.getDate() + 28);
  const year = target.getFullYear();
  const month = String(target.getMonth() + 1).padStart(2, '0');
  const day = String(target.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export interface RequestLongLeaveModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  memberName?: string;
  isAdminView?: boolean;
}

export function RequestLongLeaveModal({
  isOpen,
  onClose,
  userId,
  memberName,
  isAdminView = false,
}: RequestLongLeaveModalProps) {
  const submitMutation = useSubmitExcuseMutation();
  const { data: slodUsers = [], isLoading: isLoadingSlod } = useSlodUsersQuery({
    enabled: isAdminView,
  });

  const initialStartDate = getNextSundayDate();
  const initialEndDate = getFourWeeksOut(initialStartDate);

  const {
    register,
    control,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<LongLeaveFormValues>({
    resolver: zodResolver(longLeaveFormSchema),
    defaultValues: {
      start_date: initialStartDate,
      end_date: initialEndDate,
      reason: '',
      assigned_to_email: '',
    },
  });

  const startDateValue = watch('start_date');
  const endDateValue = watch('end_date');

  const minEndDate = useMemo(() => {
    if (!startDateValue) return undefined;
    const [y, m, d] = startDateValue.split('-').map(Number);
    if (!y || !m || !d) return undefined;
    const start = new Date(y, m - 1, d);
    start.setDate(start.getDate() + 28);
    return start;
  }, [startDateValue]);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      const start = getNextSundayDate();
      reset({
        start_date: start,
        end_date: getFourWeeksOut(start),
        reason: '',
        assigned_to_email: '',
      });
    }
  }, [isOpen, reset]);

  const onSubmit = async (values: LongLeaveFormValues) => {
    try {
      await submitMutation.mutateAsync({
        user_id: userId,
        start_date: values.start_date,
        end_date: values.end_date,
        is_long_leave: true,
        services: [...MATRIX_TIME_SLOTS],
        reason: values.reason.trim(),
        assigned_to_email: isAdminView ? values.assigned_to_email?.trim() || null : null,
      });

      toast.success(
        isAdminView
          ? `Long leave request filed for ${memberName || 'member'}`
          : 'Long leave request submitted for approval',
      );
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to submit long leave request';
      toast.error(message);
    }
  };

  return (
    <Dialog isOpen={isOpen} onClose={onClose} size="lg">
      <Dialog.Header>
        <div className="flex items-center gap-2">
          <CalendarRange className="h-5 w-5 text-primary" aria-hidden="true" />
          <Dialog.Title>
            {isAdminView ? `File Long Leave for ${memberName || 'Member'}` : 'Request Long Leave'}
          </Dialog.Title>
        </div>
        <Dialog.Description>
          {isAdminView
            ? 'Submit a multi-week extended leave on behalf of this volunteer. This request will enter the approval workflow to excuse all Sunday commitments during this period.'
            : 'Submit a multi-week extended leave request. Once approved, all Sunday commitments during this period will be excused automatically.'}
        </Dialog.Description>
      </Dialog.Header>

      <form onSubmit={handleSubmit(onSubmit)}>
        <Dialog.Body className="space-y-4 py-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label
                className="flex items-center gap-1.5 text-sm font-semibold text-text"
                htmlFor="leave-start-date"
              >
                Start Sunday <span className="text-danger">*</span>
              </label>
              <Controller
                control={control}
                name="start_date"
                render={({ field }) => (
                  <SundayCalendarPicker
                    id="leave-start-date"
                    value={field.value}
                    onChange={(val) => {
                      field.onChange(val);
                      const [y, m, d] = val.split('-').map(Number);
                      if (y && m && d) {
                        const newMin = new Date(y, m - 1, d);
                        newMin.setDate(newMin.getDate() + 28);
                        const [ey, em, ed] = (endDateValue || '').split('-').map(Number);
                        const currentEnd = ey && em && ed ? new Date(ey, em - 1, ed) : null;
                        if (!currentEnd || currentEnd < newMin) {
                          setValue('end_date', getFourWeeksOut(val), { shouldValidate: true });
                        }
                      }
                    }}
                    maxPastDays={0}
                    monthsInFuture={12}
                  />
                )}
              />
              <p className="text-xs text-muted">Must be a Sunday service date</p>
              {errors.start_date && (
                <p className="text-xs text-danger">{errors.start_date.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <label
                className="flex items-center gap-1.5 text-sm font-semibold text-text"
                htmlFor="leave-end-date"
              >
                End Sunday <span className="text-danger">*</span>
              </label>
              <Controller
                control={control}
                name="end_date"
                render={({ field }) => (
                  <SundayCalendarPicker
                    id="leave-end-date"
                    value={field.value}
                    onChange={(val) => field.onChange(val)}
                    minDate={minEndDate}
                    monthsInFuture={18}
                  />
                )}
              />
              <p className="text-xs text-muted">Must be at least 4 weeks from start Sunday</p>
              {errors.end_date && <p className="text-xs text-danger">{errors.end_date.message}</p>}
            </div>
          </div>

          <div>
            <label htmlFor="leave-reason" className="block text-sm font-medium text-text mb-1">
              Reason for Extended Leave <span className="text-danger">*</span>
            </label>
            <textarea
              id="leave-reason"
              rows={3}
              placeholder="e.g. Sabbatical, overseas work assignment, maternity/paternity, medical leave..."
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text placeholder:text-muted focus:border-primary focus:outline-hidden focus:ring-1 focus:ring-primary"
              {...register('reason')}
            />
            {errors.reason && <p className="mt-1 text-xs text-danger">{errors.reason.message}</p>}
          </div>

          {isAdminView && (
            <div>
              <FormSelectField
                id="admin-slod-delegate"
                label="Delegate Review to SLOD (Optional)"
                value={watch('assigned_to_email') || 'none'}
                onChange={(val) => setValue('assigned_to_email', val === 'none' ? '' : val)}
                disabled={isLoadingSlod}
                options={[
                  { value: 'none', label: 'None (Open to all Admins)' },
                  ...slodUsers.map((u) => ({
                    value: u.email,
                    label: `${u.name} (${u.email})`,
                  })),
                ]}
                helperText="If selected, an approval review email will be sent directly to this SLOD reviewer."
              />
            </div>
          )}
        </Dialog.Body>

        <Dialog.Footer className="flex items-center justify-end gap-2 border-t border-border pt-3">
          <Button type="button" variant="ghost" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" variant="default" disabled={isSubmitting} className="gap-1.5">
            <Send className="h-4 w-4" aria-hidden="true" />
            {isSubmitting
              ? 'Submitting...'
              : isAdminView
                ? 'File Leave Request'
                : 'Submit Leave Request'}
          </Button>
        </Dialog.Footer>
      </form>
    </Dialog>
  );
}
