import { zodResolver } from '@hookform/resolvers/zod';
import { Save } from 'lucide-react';
import { useForm, useWatch } from 'react-hook-form';
import { toast } from 'sonner';

import { Button, SectionCard, Spinner } from '@/components/ui';
import { useUpdateAppSettingMutation } from '@/hooks/domain/app-settings';
import {
  type AppSettingsMap,
  type WeeklyDebriefConfigSetting,
  weeklyDebriefConfigSchema,
} from '@/lib/domain/app-settings';
import { BROADCAST_ROLE_CATEGORIES } from '@/pages/admin/settings/notifications/constants';

interface AutomatedJobsTabProps {
  settings: AppSettingsMap;
}

export function AutomatedJobsTab({ settings }: AutomatedJobsTabProps) {
  const updateMutation = useUpdateAppSettingMutation();

  const form = useForm<WeeklyDebriefConfigSetting>({
    resolver: zodResolver(weeklyDebriefConfigSchema),
    defaultValues: {
      recipient_roles: settings.weekly_debrief_config.recipient_roles,
    },
  });

  const {
    control,
    setValue,
    handleSubmit,
    formState: { errors, isDirty },
  } = form;

  const selectedRoles = useWatch({ control, name: 'recipient_roles' }) ?? [];

  const toggleRole = (roleValue: string) => {
    const exists = selectedRoles.includes(roleValue);
    const next = exists
      ? selectedRoles.filter((role) => role !== roleValue)
      : [...selectedRoles, roleValue];
    setValue('recipient_roles', next, { shouldDirty: true, shouldValidate: true });
  };

  const onSubmit = async (values: WeeklyDebriefConfigSetting) => {
    try {
      await updateMutation.mutateAsync({
        key: 'weekly_debrief_config',
        value: values,
      });
      toast.success('Weekly Sunday debrief recipients saved');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save automated job settings');
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <SectionCard
        title="Weekly Sunday Executive Debrief Recipients"
        subtitle="Choose which admin or ministry roles receive automated Monday morning Sunday Executive Debrief notifications and emails."
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
        <div className="space-y-5">
          {errors.recipient_roles?.message && (
            <p className="text-xs text-danger">{errors.recipient_roles.message}</p>
          )}
          {BROADCAST_ROLE_CATEGORIES.map((category) => (
            <div key={category.title} className="space-y-2.5">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">
                {category.title}
              </h3>
              <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                {category.items.map((item) => {
                  const isChecked = selectedRoles.includes(item.value);
                  return (
                    <label
                      key={item.value}
                      className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-border bg-surface-subtle px-3 py-2 text-sm text-text transition-colors hover:bg-surface-hover"
                    >
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                        checked={isChecked}
                        onChange={() => toggleRole(item.value)}
                      />
                      <span>{item.label}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </SectionCard>
    </form>
  );
}
