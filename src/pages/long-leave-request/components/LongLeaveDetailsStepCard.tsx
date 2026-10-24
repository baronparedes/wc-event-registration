import { Controller, type UseFormReturn, useWatch } from 'react-hook-form';

import { AlertBanner, Button, SundayCalendarPicker, WizardStep } from '@/components/ui';

import { type LongLeaveFormValues } from '../hooks/useLongLeaveRequestPageState';

export type LongLeaveDetailsStepCardProps = {
  longLeaveForm: UseFormReturn<LongLeaveFormValues>;
  onSubmit: (data: LongLeaveFormValues) => Promise<void>;
  onCancel: () => void;
  isSubmitting: boolean;
  submitErrorMessage: string | null;
};

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

export function LongLeaveDetailsStepCard({
  longLeaveForm,
  onSubmit,
  onCancel,
  isSubmitting,
  submitErrorMessage,
}: LongLeaveDetailsStepCardProps) {
  const startDateValue = useWatch({ control: longLeaveForm.control, name: 'start_date' });
  const endDateValue = useWatch({ control: longLeaveForm.control, name: 'end_date' });

  const minEndDate = startDateValue
    ? (() => {
        const [y, m, d] = startDateValue.split('-').map(Number);
        if (!y || !m || !d) return undefined;
        const start = new Date(y, m - 1, d);
        start.setDate(start.getDate() + 28);
        return start;
      })()
    : undefined;

  return (
    <WizardStep
      title="Step 3: Long Leave Details"
      subtitle="Select the start and end Sunday date for your multi-week extended leave."
    >
      <form onSubmit={longLeaveForm.handleSubmit(onSubmit)} className="space-y-6">
        {submitErrorMessage && <AlertBanner variant="error" description={submitErrorMessage} />}

        <div className="space-y-5">
          {/* Sunday Service Date */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label
                className="flex items-center gap-1.5 text-sm font-medium text-text"
                htmlFor="leave-start-date"
              >
                Start Sunday <span className="text-danger">*</span>
              </label>
              <Controller
                control={longLeaveForm.control}
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
                          longLeaveForm.setValue('end_date', getFourWeeksOut(val), {
                            shouldValidate: true,
                          });
                        }
                      }
                    }}
                    maxPastDays={0}
                    monthsInFuture={12}
                  />
                )}
              />
              <p className="text-xs text-muted">Must be a Sunday service date</p>
              {longLeaveForm.formState.errors.start_date && (
                <p className="text-xs text-danger">
                  {longLeaveForm.formState.errors.start_date.message}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <label
                className="flex items-center gap-1.5 text-sm font-medium text-text"
                htmlFor="leave-end-date"
              >
                End Sunday <span className="text-danger">*</span>
              </label>
              <Controller
                control={longLeaveForm.control}
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
              {longLeaveForm.formState.errors.end_date && (
                <p className="text-xs text-danger">
                  {longLeaveForm.formState.errors.end_date.message}
                </p>
              )}
            </div>
          </div>

          {/* Reason / Notes */}
          <div className="space-y-1.5 pt-4">
            <label className="block text-sm font-medium text-text" htmlFor="field-reason">
              Reason for Extended Leave <span className="text-danger"> *</span>
            </label>
            <p className="text-xs text-muted">
              Please provide details for your coordinators and team leaders.
            </p>
            <textarea
              id="field-reason"
              rows={3}
              placeholder="e.g. Sabbatical, overseas work assignment, maternity/paternity, medical leave..."
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-text outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              {...longLeaveForm.register('reason')}
            />
            {longLeaveForm.formState.errors.reason && (
              <p className="text-sm text-danger">{longLeaveForm.formState.errors.reason.message}</p>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-3 pt-3 sm:flex-row">
          <Button
            className="w-full"
            disabled={isSubmitting}
            size="lg"
            type="submit"
            variant="default"
          >
            {isSubmitting ? 'Submitting...' : 'Submit Long Leave Request'}
          </Button>

          <Button
            className="w-full sm:w-auto"
            disabled={isSubmitting}
            onClick={onCancel}
            size="lg"
            type="button"
            variant="outline"
          >
            Cancel
          </Button>
        </div>
      </form>
    </WizardStep>
  );
}
