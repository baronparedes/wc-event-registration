import { zodResolver } from '@hookform/resolvers/zod';
import { Save } from 'lucide-react';
import { Controller, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import { Button, FormInputField, SectionCard, Spinner } from '@/components/ui';
import { useUpdateAppSettingMutation } from '@/hooks/domain/app-settings';
import type { AppSettingsMap } from '@/lib/domain/app-settings';

interface ScoringAndLeaveTabProps {
  settings: AppSettingsMap;
}

const scoringAndLeaveSchema = z.object({
  attended: z.number().finite(),
  absence: z.number().finite(),
  excused: z.number().finite(),
  walk_in_9am_3pm: z.number().finite(),
  walk_in_5th_sunday: z.number().finite(),
  min_weeks: z.number().int().min(1).max(52),
  require_sunday_dates: z.boolean(),
});

type ScoringAndLeaveFormValues = z.infer<typeof scoringAndLeaveSchema>;

export function ScoringAndLeaveTab({ settings }: ScoringAndLeaveTabProps) {
  const updateMutation = useUpdateAppSettingMutation();

  const form = useForm<ScoringAndLeaveFormValues>({
    resolver: zodResolver(scoringAndLeaveSchema),
    defaultValues: {
      attended: settings.attendance_scoring_weights.attended,
      absence: settings.attendance_scoring_weights.absence,
      excused: settings.attendance_scoring_weights.excused,
      walk_in_9am_3pm: settings.attendance_scoring_weights.walk_in_9am_3pm,
      walk_in_5th_sunday: settings.attendance_scoring_weights.walk_in_5th_sunday,
      min_weeks: settings.long_leave_policy.min_weeks,
      require_sunday_dates: settings.long_leave_policy.require_sunday_dates,
    },
  });

  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isDirty },
  } = form;

  const onSubmit = async (values: ScoringAndLeaveFormValues) => {
    try {
      await Promise.all([
        updateMutation.mutateAsync({
          key: 'attendance_scoring_weights',
          value: {
            attended: values.attended,
            absence: values.absence,
            excused: values.excused,
            walk_in_9am_3pm: values.walk_in_9am_3pm,
            walk_in_5th_sunday: values.walk_in_5th_sunday,
          },
        }),
        updateMutation.mutateAsync({
          key: 'long_leave_policy',
          value: {
            min_weeks: values.min_weeks,
            min_days: values.min_weeks * 7,
            require_sunday_dates: values.require_sunday_dates,
          },
        }),
      ]);
      toast.success('Scoring weights and long leave policy saved');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save scoring and leave settings');
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-6">
      <SectionCard
        title="Attendance Commitment Scoring Weights"
        subtitle="Point weights applied by PostgreSQL RPCs and dashboard views to compute volunteer attendance ratings."
        headerAction={
          <Button type="submit" size="sm" disabled={!isDirty || updateMutation.isPending}>
            {updateMutation.isPending ? (
              <>
                <Spinner size="sm" className="mr-1.5" aria-hidden="true" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-1.5 h-4 w-4" aria-hidden="true" />
                Save Changes
              </>
            )}
          </Button>
        }
      >
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <FormInputField
            label="Attended Committed Slot"
            type="number"
            step="0.1"
            registration={register('attended', { valueAsNumber: true })}
            error={errors.attended?.message}
          />
          <FormInputField
            label="Unexcused Absence"
            type="number"
            step="0.1"
            registration={register('absence', { valueAsNumber: true })}
            error={errors.absence?.message}
          />
          <FormInputField
            label="Excused Absence"
            type="number"
            step="0.1"
            registration={register('excused', { valueAsNumber: true })}
            error={errors.excused?.message}
          />
          <FormInputField
            label="Walk-In (9AM / 3PM, 1st–4th Sun)"
            type="number"
            step="0.1"
            registration={register('walk_in_9am_3pm', { valueAsNumber: true })}
            error={errors.walk_in_9am_3pm?.message}
          />
          <FormInputField
            label="Walk-In (Any Slot, 5th Sunday)"
            type="number"
            step="0.1"
            registration={register('walk_in_5th_sunday', { valueAsNumber: true })}
            error={errors.walk_in_5th_sunday?.message}
          />
        </div>
      </SectionCard>

      <SectionCard
        title="Volunteer Long Leave Policy"
        subtitle="Enforced consistently on both the Long Leave Request form and backend submission validation."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <FormInputField
            id="long-leave-min-weeks"
            label="Minimum Leave Duration (Weeks)"
            type="number"
            min={1}
            max={52}
            helperText="Automatically calculates the minimum day span (weeks × 7 days)."
            registration={register('min_weeks', { valueAsNumber: true })}
            error={errors.min_weeks?.message}
          />

          <div className="flex items-center pt-6">
            <Controller
              control={control}
              name="require_sunday_dates"
              render={({ field }) => (
                <label className="flex items-center gap-3 text-sm font-medium text-text">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                    checked={field.value}
                    onChange={(event) => field.onChange(event.target.checked)}
                  />
                  <span>Require start and end dates to fall on Sundays</span>
                </label>
              )}
            />
          </div>
        </div>
      </SectionCard>
    </form>
  );
}
