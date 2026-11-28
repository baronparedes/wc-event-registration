import { zodResolver } from '@hookform/resolvers/zod';
import { Plus, Save, Trash2 } from 'lucide-react';
import { useFieldArray, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import { AlertBanner, Button, FormInputField, SectionCard, Spinner } from '@/components/ui';
import { useUpdateAppSettingMutation } from '@/hooks/domain/app-settings';
import {
  type AppSettingsMap,
  serviceTimeSlotsSettingSchema,
  volunteerRolesSettingSchema,
} from '@/lib/domain/app-settings';

interface RolesAndSlotsTabProps {
  settings: AppSettingsMap;
}

const rolesAndSlotsFormSchema = z.object({
  service_time_slots: serviceTimeSlotsSettingSchema,
  volunteer_roles: volunteerRolesSettingSchema,
});

type RolesAndSlotsFormValues = z.infer<typeof rolesAndSlotsFormSchema>;

export function RolesAndSlotsTab({ settings }: RolesAndSlotsTabProps) {
  const updateMutation = useUpdateAppSettingMutation();

  const form = useForm<RolesAndSlotsFormValues>({
    resolver: zodResolver(rolesAndSlotsFormSchema),
    defaultValues: {
      service_time_slots: settings.service_time_slots,
      volunteer_roles: settings.volunteer_roles,
    },
  });

  const {
    control,
    register,
    handleSubmit,
    formState: { errors, isDirty },
  } = form;

  const slotsArray = useFieldArray({ control, name: 'service_time_slots' });
  const rolesArray = useFieldArray({ control, name: 'volunteer_roles' });

  const onSubmit = async (values: RolesAndSlotsFormValues) => {
    try {
      await Promise.all([
        updateMutation.mutateAsync({
          key: 'service_time_slots',
          value: values.service_time_slots,
        }),
        updateMutation.mutateAsync({
          key: 'volunteer_roles',
          value: values.volunteer_roles,
        }),
      ]);
      toast.success('Service time slots and volunteer roles saved');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save roles and time slots');
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-6">
      <AlertBanner
        variant="warning"
        title="Caution when changing or removing existing keys"
        description="Time slot keys (e.g. 9AM, 12NN, 3PM) and role keys (e.g. Prayer Coach, Usher) are referenced in existing member schedules and attendance records. Prefer toggling Active or Recruitment status rather than deleting keys in use."
      />

      <SectionCard
        title="Sunday Service Time Slots"
        subtitle="Configure time slot keys, display labels, sort order, and active status."
        headerAction={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                slotsArray.append({
                  key: '',
                  label: '',
                  sort_order: slotsArray.fields.length + 1,
                  is_active: true,
                })
              }
            >
              <Plus className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
              Add Slot
            </Button>
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
          </div>
        }
      >
        <div className="space-y-3">
          {errors.service_time_slots?.message && (
            <p className="text-xs text-danger">{errors.service_time_slots.message}</p>
          )}
          {slotsArray.fields.map((field, index) => (
            <div
              key={field.id}
              className="grid gap-3 rounded-xl border border-border bg-surface-subtle p-3 sm:grid-cols-[1fr_1fr_90px_auto_auto] sm:items-end"
            >
              <FormInputField
                label="Key"
                registration={register(`service_time_slots.${index}.key`)}
                error={errors.service_time_slots?.[index]?.key?.message}
              />
              <FormInputField
                label="Display Label"
                registration={register(`service_time_slots.${index}.label`)}
                error={errors.service_time_slots?.[index]?.label?.message}
              />
              <FormInputField
                label="Order"
                type="number"
                min={0}
                registration={register(`service_time_slots.${index}.sort_order`, {
                  valueAsNumber: true,
                })}
              />
              <label className="flex items-center gap-2 pb-2 text-sm text-text">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                  {...register(`service_time_slots.${index}.is_active`)}
                />
                <span>Active</span>
              </label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => slotsArray.remove(index)}
                disabled={slotsArray.fields.length <= 1}
                aria-label={`Remove time slot ${index + 1}`}
              >
                <Trash2 className="h-4 w-4 text-danger" aria-hidden="true" />
              </Button>
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard
        title="Volunteer Ministry Roles"
        subtitle="Configure ministry roles, recruitment intake availability, and whether each role appears in staffing targets."
        headerAction={
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              rolesArray.append({
                key: '',
                label: '',
                sort_order: rolesArray.fields.length + 1,
                is_active: true,
                is_recruitment_enabled: true,
                is_staffing_target: true,
              })
            }
          >
            <Plus className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
            Add Role
          </Button>
        }
      >
        <div className="space-y-3">
          {errors.volunteer_roles?.message && (
            <p className="text-xs text-danger">{errors.volunteer_roles.message}</p>
          )}
          {rolesArray.fields.map((field, index) => (
            <div
              key={field.id}
              className="space-y-3 rounded-xl border border-border bg-surface-subtle p-3"
            >
              <div className="grid gap-3 sm:grid-cols-[1fr_1fr_90px_auto] sm:items-end">
                <FormInputField
                  label="Role Key"
                  registration={register(`volunteer_roles.${index}.key`)}
                  error={errors.volunteer_roles?.[index]?.key?.message}
                />
                <FormInputField
                  label="Display Label"
                  registration={register(`volunteer_roles.${index}.label`)}
                  error={errors.volunteer_roles?.[index]?.label?.message}
                />
                <FormInputField
                  label="Order"
                  type="number"
                  min={0}
                  registration={register(`volunteer_roles.${index}.sort_order`, {
                    valueAsNumber: true,
                  })}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => rolesArray.remove(index)}
                  disabled={rolesArray.fields.length <= 1}
                  aria-label={`Remove role ${index + 1}`}
                >
                  <Trash2 className="h-4 w-4 text-danger" aria-hidden="true" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-5 pt-1 text-sm text-text">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                    {...register(`volunteer_roles.${index}.is_active`)}
                  />
                  <span>Active</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                    {...register(`volunteer_roles.${index}.is_recruitment_enabled`)}
                  />
                  <span>Open for Recruitment</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                    {...register(`volunteer_roles.${index}.is_staffing_target`)}
                  />
                  <span>Track Staffing Target</span>
                </label>
              </div>
            </div>
          ))}
        </div>
      </SectionCard>
    </form>
  );
}
