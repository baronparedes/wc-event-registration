import { useCallback, useEffect } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { CalendarRange, Clock, Send } from 'lucide-react';
import { useForm, useWatch } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import { Button, Dialog, FormInputField } from '@/components/ui';
import { useSubmitExcuseMutation } from '@/hooks/domain/services';
import { MATRIX_TIME_SLOTS } from '@/lib/domain/services';

const SERVICE_OPTIONS = MATRIX_TIME_SLOTS;

const longLeaveFormSchema = z
  .object({
    start_date: z
      .string()
      .trim()
      .min(1, 'Please select a start date')
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Please select a valid date in YYYY-MM-DD format'),
    end_date: z
      .string()
      .trim()
      .min(1, 'Please select an end date')
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Please select a valid date in YYYY-MM-DD format'),
    services: z.array(z.string().trim().min(1)).min(1, 'Please select at least one service slot'),
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
      return data.end_date >= data.start_date;
    },
    {
      message: 'End date must be on or after start date',
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

  const initialStartDate = getNextSundayDate();
  const initialEndDate = getFourWeeksOut(initialStartDate);

  const {
    register,
    handleSubmit,
    setValue,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<LongLeaveFormValues>({
    resolver: zodResolver(longLeaveFormSchema),
    defaultValues: {
      start_date: initialStartDate,
      end_date: initialEndDate,
      services: [...SERVICE_OPTIONS],
      reason: '',
      assigned_to_email: '',
    },
  });

  const selectedServices = useWatch({
    control,
    name: 'services',
    defaultValue: [...SERVICE_OPTIONS],
  });

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      const start = getNextSundayDate();
      reset({
        start_date: start,
        end_date: getFourWeeksOut(start),
        services: [...SERVICE_OPTIONS],
        reason: '',
        assigned_to_email: '',
      });
    }
  }, [isOpen, reset]);

  const handleToggleService = useCallback(
    (slot: string) => {
      const current = selectedServices ?? [];
      if (current.includes(slot)) {
        if (current.length === 1) return; // keep at least one
        setValue(
          'services',
          current.filter((s) => s !== slot),
          { shouldValidate: true },
        );
      } else {
        setValue('services', [...current, slot], { shouldValidate: true });
      }
    },
    [selectedServices, setValue],
  );

  const handleSelectAllServices = useCallback(() => {
    setValue('services', [...SERVICE_OPTIONS], { shouldValidate: true });
  }, [setValue]);

  const onSubmit = async (values: LongLeaveFormValues) => {
    try {
      await submitMutation.mutateAsync({
        user_id: userId,
        start_date: values.start_date,
        end_date: values.end_date,
        is_long_leave: true,
        services: values.services,
        reason: values.reason.trim(),
        assigned_to_email: values.assigned_to_email?.trim() || null,
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
            ? 'Submit a multi-week extended leave on behalf of this volunteer. This request will enter the approval workflow to excuse upcoming Sunday commitments.'
            : 'Submit a multi-week extended leave request for upcoming Sunday commitments. Your request will enter the approval workflow.'}
        </Dialog.Description>
      </Dialog.Header>

      <form onSubmit={handleSubmit(onSubmit)}>
        <Dialog.Body className="space-y-4 py-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <FormInputField
                label="Start Date"
                type="date"
                required
                registration={register('start_date')}
                error={errors.start_date?.message}
              />
            </div>
            <div>
              <FormInputField
                label="End Date"
                type="date"
                required
                registration={register('end_date')}
                error={errors.end_date?.message}
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-sm font-medium text-text flex items-center gap-1.5">
                <Clock className="h-4 w-4 text-muted" aria-hidden="true" />
                Excused Service Slots
              </label>
              <button
                type="button"
                onClick={handleSelectAllServices}
                className="text-xs font-medium text-primary hover:underline"
              >
                Select All
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {SERVICE_OPTIONS.map((slot) => {
                const isSelected = selectedServices.includes(slot);
                return (
                  <button
                    key={slot}
                    type="button"
                    onClick={() => handleToggleService(slot)}
                    className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${
                      isSelected
                        ? 'border-primary bg-primary/10 text-primary font-bold'
                        : 'border-border bg-surface text-muted hover:bg-surface-elevated hover:text-text'
                    }`}
                  >
                    {slot}
                  </button>
                );
              })}
            </div>
            {errors.services && (
              <p className="mt-1 text-xs text-danger">{errors.services.message}</p>
            )}
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

          <div>
            <FormInputField
              label="Designated Reviewer Email (Optional)"
              type="email"
              placeholder="e.g. ministry.leader@example.com (leave blank for team review)"
              registration={register('assigned_to_email')}
              error={errors.assigned_to_email?.message}
              helperText="If specified, an approval request email will be sent directly to this reviewer."
            />
          </div>
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
