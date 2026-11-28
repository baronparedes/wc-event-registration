import { useState } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { Archive, ChevronDown, ChevronUp, Plus, RotateCcw, Save, Trash2 } from 'lucide-react';
import { useFieldArray, useForm, useWatch } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import { AlertBanner, Badge, Button, FormInputField, SectionCard, Spinner } from '@/components/ui';
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
  const [showArchivedSlots, setShowArchivedSlots] = useState(false);
  const [showArchivedRoles, setShowArchivedRoles] = useState(false);

  const persistedSlotKeys = new Set(settings.service_time_slots.map((s) => s.key));
  const persistedRoleKeys = new Set(settings.volunteer_roles.map((r) => r.key));

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
    setValue,
    handleSubmit,
    formState: { errors, isDirty },
  } = form;

  const slotsArray = useFieldArray({ control, name: 'service_time_slots' });
  const rolesArray = useFieldArray({ control, name: 'volunteer_roles' });

  const watchedSlots = useWatch({ control, name: 'service_time_slots' }) ?? [];
  const watchedRoles = useWatch({ control, name: 'volunteer_roles' }) ?? [];

  const activeSlotEntries = slotsArray.fields
    .map((field, index) => ({ field, index, item: watchedSlots[index] }))
    .filter(({ item }) => !item?.deleted_at);

  const archivedSlotEntries = slotsArray.fields
    .map((field, index) => ({ field, index, item: watchedSlots[index] }))
    .filter(({ item }) => Boolean(item?.deleted_at));

  const activeRoleEntries = rolesArray.fields
    .map((field, index) => ({ field, index, item: watchedRoles[index] }))
    .filter(({ item }) => !item?.deleted_at);

  const archivedRoleEntries = rolesArray.fields
    .map((field, index) => ({ field, index, item: watchedRoles[index] }))
    .filter(({ item }) => Boolean(item?.deleted_at));

  const handleArchiveSlot = (index: number) => {
    setValue(`service_time_slots.${index}.deleted_at`, new Date().toISOString(), {
      shouldDirty: true,
      shouldValidate: true,
    });
    setValue(`service_time_slots.${index}.is_active`, false, {
      shouldDirty: true,
      shouldValidate: true,
    });
  };

  const handleRestoreSlot = (index: number) => {
    setValue(`service_time_slots.${index}.deleted_at`, null, {
      shouldDirty: true,
      shouldValidate: true,
    });
    setValue(`service_time_slots.${index}.is_active`, true, {
      shouldDirty: true,
      shouldValidate: true,
    });
  };

  const handleArchiveRole = (index: number) => {
    setValue(`volunteer_roles.${index}.deleted_at`, new Date().toISOString(), {
      shouldDirty: true,
      shouldValidate: true,
    });
    setValue(`volunteer_roles.${index}.is_active`, false, {
      shouldDirty: true,
      shouldValidate: true,
    });
    setValue(`volunteer_roles.${index}.is_recruitment_enabled`, false, {
      shouldDirty: true,
      shouldValidate: true,
    });
  };

  const handleRestoreRole = (index: number) => {
    setValue(`volunteer_roles.${index}.deleted_at`, null, {
      shouldDirty: true,
      shouldValidate: true,
    });
    setValue(`volunteer_roles.${index}.is_active`, true, {
      shouldDirty: true,
      shouldValidate: true,
    });
  };

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
        variant="info"
        title="Soft-delete protection enabled"
        description="Persisted time slot and role keys are locked against hard deletion to protect historical member schedules and attendance records. Use Archive to retire an item and Restore to bring it back at any time."
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
                  deleted_at: null,
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
        <div className="space-y-4">
          {errors.service_time_slots?.message && (
            <p className="text-xs text-danger">{errors.service_time_slots.message}</p>
          )}
          <div className="space-y-3">
            {activeSlotEntries.map(({ field, index, item }) => {
              const isPersisted = Boolean(item?.key && persistedSlotKeys.has(item.key));
              const canArchive = activeSlotEntries.length > 1;
              return (
                <div
                  key={field.id}
                  className="grid gap-3 rounded-xl border border-border bg-surface-subtle p-3 sm:grid-cols-[1fr_1fr_90px_auto_auto] sm:items-end"
                >
                  <FormInputField
                    label="Key"
                    readOnly={isPersisted}
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
                  {isPersisted ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleArchiveSlot(index)}
                      disabled={!canArchive}
                      aria-label={`Archive time slot ${item?.key || index + 1}`}
                    >
                      <Archive className="mr-1.5 h-3.5 w-3.5 text-muted" aria-hidden="true" />
                      Archive
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => slotsArray.remove(index)}
                      aria-label={`Remove unsaved time slot ${index + 1}`}
                    >
                      <Trash2 className="h-4 w-4 text-danger" aria-hidden="true" />
                    </Button>
                  )}
                </div>
              );
            })}
          </div>

          {archivedSlotEntries.length > 0 && (
            <div className="border-t border-border pt-3">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowArchivedSlots((prev) => !prev)}
                className="text-muted"
              >
                {showArchivedSlots ? (
                  <ChevronUp className="mr-1.5 h-4 w-4" aria-hidden="true" />
                ) : (
                  <ChevronDown className="mr-1.5 h-4 w-4" aria-hidden="true" />
                )}
                Archived Time Slots ({archivedSlotEntries.length})
              </Button>
              {showArchivedSlots && (
                <div className="mt-2.5 space-y-2">
                  {archivedSlotEntries.map(({ field, index, item }) => (
                    <div
                      key={field.id}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-background px-3.5 py-2.5 opacity-80"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="text-sm font-medium text-text">
                          {item?.label || item?.key}
                        </span>
                        <span className="text-xs text-muted">({item?.key})</span>
                        <Badge variant="outline">Archived</Badge>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleRestoreSlot(index)}
                        aria-label={`Restore time slot ${item?.key}`}
                      >
                        <RotateCcw className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
                        Restore
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
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
                deleted_at: null,
              })
            }
          >
            <Plus className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
            Add Role
          </Button>
        }
      >
        <div className="space-y-4">
          {errors.volunteer_roles?.message && (
            <p className="text-xs text-danger">{errors.volunteer_roles.message}</p>
          )}
          <div className="space-y-3">
            {activeRoleEntries.map(({ field, index, item }) => {
              const isPersisted = Boolean(item?.key && persistedRoleKeys.has(item.key));
              const canArchive = activeRoleEntries.length > 1;
              return (
                <div
                  key={field.id}
                  className="space-y-3 rounded-xl border border-border bg-surface-subtle p-3"
                >
                  <div className="grid gap-3 sm:grid-cols-[1fr_1fr_90px_auto] sm:items-end">
                    <FormInputField
                      label="Role Key"
                      readOnly={isPersisted}
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
                    {isPersisted ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleArchiveRole(index)}
                        disabled={!canArchive}
                        aria-label={`Archive role ${item?.key || index + 1}`}
                      >
                        <Archive className="mr-1.5 h-3.5 w-3.5 text-muted" aria-hidden="true" />
                        Archive
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => rolesArray.remove(index)}
                        aria-label={`Remove unsaved role ${index + 1}`}
                      >
                        <Trash2 className="h-4 w-4 text-danger" aria-hidden="true" />
                      </Button>
                    )}
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
              );
            })}
          </div>

          {archivedRoleEntries.length > 0 && (
            <div className="border-t border-border pt-3">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowArchivedRoles((prev) => !prev)}
                className="text-muted"
              >
                {showArchivedRoles ? (
                  <ChevronUp className="mr-1.5 h-4 w-4" aria-hidden="true" />
                ) : (
                  <ChevronDown className="mr-1.5 h-4 w-4" aria-hidden="true" />
                )}
                Archived Roles ({archivedRoleEntries.length})
              </Button>
              {showArchivedRoles && (
                <div className="mt-2.5 space-y-2">
                  {archivedRoleEntries.map(({ field, index, item }) => (
                    <div
                      key={field.id}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-background px-3.5 py-2.5 opacity-80"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="text-sm font-medium text-text">
                          {item?.label || item?.key}
                        </span>
                        <span className="text-xs text-muted">({item?.key})</span>
                        <Badge variant="outline">Archived</Badge>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleRestoreRole(index)}
                        aria-label={`Restore role ${item?.key}`}
                      >
                        <RotateCcw className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
                        Restore
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </SectionCard>
    </form>
  );
}
