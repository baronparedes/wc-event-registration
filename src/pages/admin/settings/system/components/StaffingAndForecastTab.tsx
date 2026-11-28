import { zodResolver } from '@hookform/resolvers/zod';
import { Save } from 'lucide-react';
import { useForm, useWatch } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import { Button, FormInputField, SectionCard, Spinner } from '@/components/ui';
import { useUpdateAppSettingMutation } from '@/hooks/domain/app-settings';
import type { AppSettingsMap } from '@/lib/domain/app-settings';

interface StaffingAndForecastTabProps {
  settings: AppSettingsMap;
}

const staffingForecastFormSchema = z
  .object({
    targets: z.record(z.string(), z.record(z.string(), z.number().int().min(0))),
    solidPct: z.number().min(10).max(100),
    moderatePct: z.number().min(0).max(100),
    defaultTurnupPct: z.number().min(0).max(100),
  })
  .refine((data) => data.solidPct >= data.moderatePct, {
    message: 'Solid threshold must be greater than or equal to Moderate threshold',
    path: ['solidPct'],
  });

type StaffingForecastFormValues = z.infer<typeof staffingForecastFormSchema>;

export function StaffingAndForecastTab({ settings }: StaffingAndForecastTabProps) {
  const updateMutation = useUpdateAppSettingMutation();

  const activeSlots = [...settings.service_time_slots]
    .filter((slot) => slot.is_active)
    .sort((a, b) => a.sort_order - b.sort_order);

  const targetRoles = [...settings.volunteer_roles]
    .filter((role) => role.is_active && role.is_staffing_target)
    .sort((a, b) => a.sort_order - b.sort_order);

  const initialTargets: Record<string, Record<string, number>> = {};
  for (const slot of activeSlots) {
    initialTargets[slot.key] = {};
    for (const role of targetRoles) {
      initialTargets[slot.key][role.key] =
        settings.service_staffing_targets[slot.key]?.[role.key] ?? 0;
    }
  }

  const form = useForm<StaffingForecastFormValues>({
    resolver: zodResolver(staffingForecastFormSchema),
    defaultValues: {
      targets: initialTargets,
      solidPct: Math.round(settings.forecast_confidence_thresholds.solid * 100),
      moderatePct: Math.round(settings.forecast_confidence_thresholds.moderate * 100),
      defaultTurnupPct: Math.round(
        settings.forecast_confidence_thresholds.default_turnup_rate * 100,
      ),
    },
  });

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isDirty },
  } = form;

  const watchedTargets = useWatch({ control, name: 'targets' });

  const onSubmit = async (values: StaffingForecastFormValues) => {
    try {
      await Promise.all([
        updateMutation.mutateAsync({
          key: 'service_staffing_targets',
          value: values.targets,
        }),
        updateMutation.mutateAsync({
          key: 'forecast_confidence_thresholds',
          value: {
            solid: values.solidPct / 100,
            moderate: values.moderatePct / 100,
            default_turnup_rate: values.defaultTurnupPct / 100,
          },
        }),
      ]);
      toast.success('Staffing targets and forecast thresholds saved');
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Failed to save staffing & forecast settings',
      );
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-6">
      <SectionCard
        title="Volunteer Staffing Targets by Service Slot"
        subtitle="Shared target headcounts used across Hub Calendar, Services Attendance Forecast, and AI Chat forecasts."
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
        <div className="grid gap-6 lg:grid-cols-3">
          {activeSlots.map((slot) => {
            const slotTotal = targetRoles.reduce(
              (sum, role) => sum + Number(watchedTargets?.[slot.key]?.[role.key] ?? 0),
              0,
            );
            return (
              <div
                key={slot.key}
                className="space-y-3 rounded-xl border border-border bg-surface-subtle p-4"
              >
                <div className="flex items-center justify-between border-b border-border pb-2">
                  <div>
                    <h3 className="font-heading text-sm font-semibold text-text">{slot.label}</h3>
                    <p className="text-xs text-muted">Key: {slot.key}</p>
                  </div>
                  <span className="text-xs font-semibold text-primary">Total: {slotTotal}</span>
                </div>
                <div className="space-y-2.5">
                  {targetRoles.map((role) => (
                    <FormInputField
                      key={`${slot.key}-${role.key}`}
                      label={role.label}
                      type="number"
                      min={0}
                      registration={register(`targets.${slot.key}.${role.key}`, {
                        valueAsNumber: true,
                      })}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </SectionCard>

      <SectionCard
        title="Forecast Confidence Thresholds"
        subtitle="Turnup probability cutoffs for Solid, Moderate, and At Risk tiers, plus baseline turnup rate for new volunteers."
      >
        <div className="grid gap-4 sm:grid-cols-3">
          <FormInputField
            label="Solid Tier Minimum (%)"
            type="number"
            min={10}
            max={100}
            registration={register('solidPct', { valueAsNumber: true })}
            error={errors.solidPct?.message}
          />
          <FormInputField
            label="Moderate Tier Minimum (%)"
            type="number"
            min={0}
            max={100}
            registration={register('moderatePct', { valueAsNumber: true })}
            error={errors.moderatePct?.message}
          />
          <FormInputField
            label="Default New Member Turnup (%)"
            type="number"
            min={0}
            max={100}
            registration={register('defaultTurnupPct', { valueAsNumber: true })}
            error={errors.defaultTurnupPct?.message}
          />
        </div>
      </SectionCard>
    </form>
  );
}
