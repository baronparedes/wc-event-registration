import { CheckCircle2 } from 'lucide-react';
import { Controller, type UseFormReturn } from 'react-hook-form';

import { AlertBanner, Button, SundayCalendarPicker, WizardStep } from '@/components/ui';

import { type ExcuseFormValues } from '../hooks/useExcuseRequestPageState';
import { EXCUSE_SERVICE_SLOTS } from '../utils';

export type ExcuseDetailsStepCardProps = {
  excuseForm: UseFormReturn<ExcuseFormValues>;
  selectedServices: string[];
  onToggleService: (serviceValue: string) => void;
  onSubmit: (data: ExcuseFormValues) => Promise<void>;
  onCancel: () => void;
  isSubmitting: boolean;
  submitErrorMessage: string | null;
};

export function ExcuseDetailsStepCard({
  excuseForm,
  selectedServices,
  onToggleService,
  onSubmit,
  onCancel,
  isSubmitting,
  submitErrorMessage,
}: ExcuseDetailsStepCardProps) {
  return (
    <WizardStep
      title="Step 3: Excuse Details"
      subtitle="Select the Sunday date and specific service slot(s) you need to be excused from."
    >
      <form onSubmit={excuseForm.handleSubmit(onSubmit)} className="space-y-6">
        {submitErrorMessage && <AlertBanner variant="error" description={submitErrorMessage} />}

        <div className="space-y-5">
          {/* Sunday Service Date */}
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-text" htmlFor="field-request-date">
              Sunday Service Date <span className="text-danger"> *</span>
            </label>
            <p className="text-xs text-muted">Select the upcoming Sunday you will be absent.</p>
            <Controller
              control={excuseForm.control}
              name="request_date"
              render={({ field }) => (
                <SundayCalendarPicker
                  id="field-request-date"
                  value={field.value}
                  onChange={(val) => field.onChange(val)}
                  maxPastDays={3}
                  monthsInFuture={6}
                  allowedWeekdays={[0]}
                />
              )}
            />
            {excuseForm.formState.errors.request_date && (
              <p className="text-sm text-danger">
                {excuseForm.formState.errors.request_date.message}
              </p>
            )}
          </div>

          {/* Service Slots Multi-Select Checkboxes */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block text-sm font-medium text-text">
                Service Slots <span className="text-danger"> *</span>
              </label>
              <span className="text-xs text-muted">Select all that apply</span>
            </div>
            <p className="text-xs text-muted">
              Select all service times you are excusing yourself from.
            </p>

            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3 pt-1">
              {EXCUSE_SERVICE_SLOTS.map((slot) => {
                const isChecked = selectedServices.includes(slot.value);
                return (
                  <button
                    key={slot.value}
                    type="button"
                    role="checkbox"
                    aria-checked={isChecked}
                    onClick={() => onToggleService(slot.value)}
                    className={`flex items-center justify-between rounded-xl border p-3.5 text-left transition ${
                      isChecked
                        ? 'border-primary bg-primary/10 text-primary font-semibold ring-1 ring-primary'
                        : 'border-border bg-background text-text hover:border-muted'
                    }`}
                  >
                    <span className="text-sm">{slot.label}</span>
                    <div
                      className={`h-5 w-5 rounded-md border flex items-center justify-center transition ${
                        isChecked
                          ? 'border-primary bg-primary text-white'
                          : 'border-border bg-surface'
                      }`}
                    >
                      {isChecked && <CheckCircle2 className="h-3.5 w-3.5" />}
                    </div>
                  </button>
                );
              })}
            </div>

            {excuseForm.formState.errors.services && (
              <p className="text-sm text-danger">{excuseForm.formState.errors.services.message}</p>
            )}
          </div>

          {/* Reason / Notes */}
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-text" htmlFor="field-reason">
              Reason for Absence <span className="text-danger"> *</span>
            </label>
            <p className="text-xs text-muted">
              Please provide details for your coordinators and team leaders.
            </p>
            <textarea
              id="field-reason"
              rows={3}
              placeholder="e.g., Out of town, family event, medical reason..."
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-text outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              {...excuseForm.register('reason')}
            />
            {excuseForm.formState.errors.reason && (
              <p className="text-sm text-danger">{excuseForm.formState.errors.reason.message}</p>
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
            {isSubmitting ? 'Submitting...' : 'Submit Excuse Request'}
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
