import { useEffect } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useWatch } from 'react-hook-form';
import { toast } from 'sonner';

import { Button, Dialog } from '@/components/ui';
import { useSubmitExcuseMutation } from '@/hooks/domain/services';
import { type SubmitServiceExcuseInput, submitServiceExcuseSchema } from '@/lib/domain/services';

export interface SubmitExcuseModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  memberId: string;
}

const SERVICE_SLOT_OPTIONS = [
  { label: 'All Services', value: 'All Services' },
  { label: '9:00 AM', value: '9AM' },
  { label: '12:00 NN', value: '12NN' },
  { label: '3:00 PM', value: '3PM' },
];

function getNearestUpcomingSundayString(): string {
  const d = new Date();
  const day = d.getDay();
  const diff = (7 - day) % 7;
  const sunday = new Date(d.getFullYear(), d.getMonth(), d.getDate() + (diff === 0 ? 0 : diff));
  const year = sunday.getFullYear();
  const month = String(sunday.getMonth() + 1).padStart(2, '0');
  const date = String(sunday.getDate()).padStart(2, '0');
  return `${year}-${month}-${date}`;
}

export function SubmitExcuseModal({ isOpen, onClose, userId, memberId }: SubmitExcuseModalProps) {
  const submitMutation = useSubmitExcuseMutation();

  const {
    register,
    handleSubmit,
    setValue,
    control,
    reset,
    formState: { errors },
  } = useForm<SubmitServiceExcuseInput>({
    resolver: zodResolver(submitServiceExcuseSchema),
    defaultValues: {
      user_id: userId,
      member_id: memberId,
      request_date: getNearestUpcomingSundayString(),
      services: ['All Services'],
      reason: '',
    },
  });

  const selectedServices = useWatch({ control, name: 'services' }) || [];

  useEffect(() => {
    register('services');
  }, [register]);

  useEffect(() => {
    if (isOpen) {
      reset({
        user_id: userId,
        member_id: memberId,
        request_date: getNearestUpcomingSundayString(),
        services: ['All Services'],
        reason: '',
      });
    }
  }, [isOpen, userId, memberId, reset]);

  const handleToggleService = (val: string) => {
    if (val === 'All Services') {
      setValue('services', ['All Services'], { shouldValidate: true });
      return;
    }

    const withoutAll = selectedServices.filter((s) => s !== 'All Services');
    let next: string[];
    if (withoutAll.includes(val)) {
      next = withoutAll.filter((s) => s !== val);
    } else {
      next = [...withoutAll, val];
    }

    if (next.length === 0) {
      next = ['All Services'];
    }
    setValue('services', next, { shouldValidate: true });
  };

  const onSubmit = async (values: SubmitServiceExcuseInput) => {
    try {
      await submitMutation.mutateAsync(values);
      toast.success('Excuse request submitted successfully.');
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to submit excuse request';
      toast.error(message);
    }
  };

  return (
    <Dialog isOpen={isOpen} onClose={onClose} size="md">
      <Dialog.Header>
        <Dialog.Title>Request Excuse</Dialog.Title>
        <Dialog.Description>
          Submit an advance notice of absence for your scheduled service commitment.
        </Dialog.Description>
      </Dialog.Header>

      <form onSubmit={handleSubmit(onSubmit)}>
        <input type="hidden" {...register('user_id')} />
        <input type="hidden" {...register('member_id')} />
        <Dialog.Body className="space-y-4">
          <div>
            <label
              htmlFor="excuse-request-date"
              className="block text-sm font-medium text-text mb-1"
            >
              Service Date (Sunday)
            </label>
            <input
              id="excuse-request-date"
              type="date"
              {...register('request_date')}
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
            {errors.request_date && (
              <p className="mt-1 text-xs text-danger">{errors.request_date.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-text mb-1">Services to Excuse</label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {SERVICE_SLOT_OPTIONS.map((slot) => {
                const isSelected = selectedServices.includes(slot.value);
                return (
                  <button
                    key={slot.value}
                    type="button"
                    onClick={() => handleToggleService(slot.value)}
                    className={`rounded-lg border px-3 py-2 text-center text-xs font-medium transition-colors ${
                      isSelected
                        ? 'border-primary bg-primary/10 text-primary font-semibold'
                        : 'border-border bg-surface text-muted hover:border-text-secondary hover:text-text'
                    }`}
                  >
                    {slot.label}
                  </button>
                );
              })}
            </div>
            {errors.services && (
              <p className="mt-1 text-xs text-danger">{errors.services.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="excuse-reason" className="block text-sm font-medium text-text mb-1">
              Reason (Optional)
            </label>
            <textarea
              id="excuse-reason"
              rows={3}
              placeholder="e.g. Out of town, family event, work commitment"
              {...register('reason')}
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text placeholder:text-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
            {errors.reason && <p className="mt-1 text-xs text-danger">{errors.reason.message}</p>}
          </div>
        </Dialog.Body>

        <Dialog.Footer>
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            disabled={submitMutation.isPending}
          >
            Cancel
          </Button>
          <Button type="submit" variant="default" disabled={submitMutation.isPending}>
            {submitMutation.isPending ? 'Submitting...' : 'Submit Excuse'}
          </Button>
        </Dialog.Footer>
      </form>
    </Dialog>
  );
}
