import { useState } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { Copy, RotateCcw, Save, Settings2, SlidersHorizontal } from 'lucide-react';
import { FormProvider, useForm } from 'react-hook-form';
import { z } from 'zod';

import { Button, Dialog, FormInputField, Tabs, TabsList, TabsTrigger } from '@/components/ui';
import type { TimeSlot } from '@/hooks/domain/members';

import {
  type ConfidenceThresholds,
  DEFAULT_CONFIDENCE_THRESHOLDS,
  getStoredConfidenceThresholds,
  saveStoredConfidenceThresholds,
} from '../utils/hubCalendarForecastUtils';
import {
  DEFAULT_VOLUNTEER_TARGETS_BY_SLOT,
  ORDERED_STANDARD_ROLES,
  type SlotRoleTargets,
  type VolunteerTargetsBySlot,
  saveStoredVolunteerTargets,
} from '../utils/volunteerStaffingUtils';

export type VolunteerStaffingTargetsModalProps = {
  isOpen: boolean;
  onClose: () => void;
  targets: VolunteerTargetsBySlot;
  onSaveTargets: (newTargets: VolunteerTargetsBySlot) => void;
  thresholds?: ConfidenceThresholds;
  onSaveThresholds?: (newThresholds: ConfidenceThresholds) => void;
  initialSlot?: TimeSlot;
};

const TIME_SLOTS: { slot: TimeSlot; label: string }[] = [
  { slot: '9AM', label: '9:00 AM' },
  { slot: '12NN', label: '12:00 NN' },
  { slot: '3PM', label: '3:00 PM' },
];

const RoleTargetsSchema = z.record(z.string(), z.coerce.number().min(0));

const StaffingTargetsSchema = z.object({
  quotas: z.object({
    '9AM': RoleTargetsSchema,
    '12NN': RoleTargetsSchema,
    '3PM': RoleTargetsSchema,
  }),
  thresholds: z.object({
    solid: z.coerce.number().min(0).max(100),
    moderate: z.coerce.number().min(0).max(100),
    defaultTurnupRate: z.coerce.number().min(0).max(100),
  }),
});

// Since z.coerce.number() coupled with z.record() can result in TS getting confused
// about the resolver's compatibility, we export an explicit type for react-hook-form
type StaffingTargetsFormData = {
  quotas: {
    '9AM': Record<string, number>;
    '12NN': Record<string, number>;
    '3PM': Record<string, number>;
  };
  thresholds: {
    solid: number;
    moderate: number;
    defaultTurnupRate: number;
  };
};

function VolunteerStaffingTargetsModalContent({
  onClose,
  targets,
  onSaveTargets,
  thresholds: initialThresholds,
  onSaveThresholds,
  initialSlot = '9AM',
}: Omit<VolunteerStaffingTargetsModalProps, 'isOpen'>) {
  const [modalTab, setModalTab] = useState<'quotas' | 'thresholds'>('quotas');
  const [activeSlot, setActiveSlot] = useState<TimeSlot>(initialSlot);

  const startingThresholds = initialThresholds ?? getStoredConfidenceThresholds();

  const methods = useForm<StaffingTargetsFormData>({
    // @ts-expect-error - zodResolver types can mismatch with complex nested records and coerce
    resolver: zodResolver(StaffingTargetsSchema),
    defaultValues: {
      quotas: {
        '9AM': { ...(targets['9AM'] ?? DEFAULT_VOLUNTEER_TARGETS_BY_SLOT['9AM']) },
        '12NN': { ...(targets['12NN'] ?? DEFAULT_VOLUNTEER_TARGETS_BY_SLOT['12NN']) },
        '3PM': { ...(targets['3PM'] ?? DEFAULT_VOLUNTEER_TARGETS_BY_SLOT['3PM']) },
      },
      thresholds: {
        solid: Math.round(startingThresholds.solid * 100),
        moderate: Math.round(startingThresholds.moderate * 100),
        defaultTurnupRate: Math.round(startingThresholds.defaultTurnupRate * 100),
      },
    },
  });

  const formQuotas = methods.watch('quotas');
  const formThresholds = methods.watch('thresholds');

  const { register, handleSubmit, setValue } = methods;

  const currentSlotTargets: SlotRoleTargets =
    formQuotas?.[activeSlot] ?? DEFAULT_VOLUNTEER_TARGETS_BY_SLOT[activeSlot];

  const handleCopyToOtherSlots = () => {
    const activeValues = { ...currentSlotTargets };
    setValue('quotas.9AM', { ...activeValues });
    setValue('quotas.12NN', { ...activeValues });
    setValue('quotas.3PM', { ...activeValues });
  };

  const handleResetToDefaults = () => {
    if (modalTab === 'quotas') {
      setValue('quotas.9AM', { ...DEFAULT_VOLUNTEER_TARGETS_BY_SLOT['9AM'] });
      setValue('quotas.12NN', { ...DEFAULT_VOLUNTEER_TARGETS_BY_SLOT['12NN'] });
      setValue('quotas.3PM', { ...DEFAULT_VOLUNTEER_TARGETS_BY_SLOT['3PM'] });
    } else {
      setValue('thresholds.solid', Math.round(DEFAULT_CONFIDENCE_THRESHOLDS.solid * 100));
      setValue('thresholds.moderate', Math.round(DEFAULT_CONFIDENCE_THRESHOLDS.moderate * 100));
      setValue(
        'thresholds.defaultTurnupRate',
        Math.round(DEFAULT_CONFIDENCE_THRESHOLDS.defaultTurnupRate * 100),
      );
    }
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSubmit((data) => {
      const typedData = data as unknown as StaffingTargetsFormData;
      const newTargets = typedData.quotas as VolunteerTargetsBySlot;
      saveStoredVolunteerTargets(newTargets);
      onSaveTargets(newTargets);

      const newThresholds: ConfidenceThresholds = {
        solid: typedData.thresholds.solid / 100,
        moderate: typedData.thresholds.moderate / 100,
        defaultTurnupRate: typedData.thresholds.defaultTurnupRate / 100,
      };
      saveStoredConfidenceThresholds(newThresholds);
      if (onSaveThresholds) {
        onSaveThresholds(newThresholds);
      }

      onClose();
    })();
  };

  const rolesList = Array.from(
    new Set([...ORDERED_STANDARD_ROLES, ...Object.keys(currentSlotTargets)]),
  );

  const solidPct = formThresholds?.solid ?? Math.round(startingThresholds.solid * 100);
  const modPct = formThresholds?.moderate ?? Math.round(startingThresholds.moderate * 100);
  const baselinePct =
    formThresholds?.defaultTurnupRate ?? Math.round(startingThresholds.defaultTurnupRate * 100);

  return (
    <FormProvider {...methods}>
      <Dialog.Header>
        <Dialog.Title>Configure Volunteer Targets &amp; Thresholds</Dialog.Title>
        <Dialog.Description>
          Adjust role quotas per service slot and customize volunteer turnup reliability thresholds.
        </Dialog.Description>
      </Dialog.Header>

      <Dialog.Body>
        <div className="space-y-4 py-1">
          {/* Main Mode Tabs */}
          <Tabs
            value={modalTab}
            onValueChange={(val) => setModalTab(val as 'quotas' | 'thresholds')}
          >
            <TabsList className="w-full">
              <TabsTrigger value="quotas" className="flex-1 text-xs py-1.5 px-3">
                <SlidersHorizontal className="mr-1.5 h-3.5 w-3.5 inline" />
                Role Quotas
              </TabsTrigger>
              <TabsTrigger value="thresholds" className="flex-1 text-xs py-1.5 px-3">
                <Settings2 className="mr-1.5 h-3.5 w-3.5 inline" />
                Turnup Thresholds
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {modalTab === 'quotas' ? (
            <div className="space-y-4 pt-1">
              {/* Slot Tabs */}
              <Tabs value={activeSlot} onValueChange={(val) => setActiveSlot(val as TimeSlot)}>
                <TabsList className="w-full">
                  {TIME_SLOTS.map(({ slot, label }) => (
                    <TabsTrigger key={slot} value={slot} className="flex-1 text-xs py-1.5 px-3">
                      {label}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>

              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-text">
                  {TIME_SLOTS.find((s) => s.slot === activeSlot)?.label} Quotas
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleCopyToOtherSlots}
                  className="h-7 text-xs text-muted hover:text-text px-2"
                  title="Copy current slot target values to all other slots"
                >
                  <Copy className="mr-1 h-3 w-3" />
                  Copy to all slots
                </Button>
              </div>

              {/* Role Inputs for Active Slot */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {rolesList.map((role) => (
                  <FormInputField
                    key={role}
                    id={`target-input-${activeSlot}-${role}`}
                    label={role}
                    value={String(currentSlotTargets[role] ?? 0)}
                    {...register(`quotas.${activeSlot}.${role}`)}
                    onChange={(e) => {
                      setValue(`quotas.${activeSlot}`, {
                        ...currentSlotTargets,
                        [role]: Number(e.target.value) || 0,
                      });
                    }}
                    placeholder="0"
                  />
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-4 pt-1">
              {/* Live Preview Summary */}
              <div className="rounded-xl border border-border/70 bg-surface-hover/30 p-3.5 text-xs space-y-2">
                <p className="font-semibold text-text">Live Reliability Tier Thresholds</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                  <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-2 text-center">
                    <span className="block font-semibold text-emerald-700 dark:text-emerald-300">
                      Solid
                    </span>
                    <span className="text-[11px] text-muted">≥ {solidPct}%</span>
                  </div>
                  <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 p-2 text-center">
                    <span className="block font-semibold text-amber-700 dark:text-amber-300">
                      Moderate
                    </span>
                    <span className="text-[11px] text-muted">
                      {modPct}%–{solidPct - 1}%
                    </span>
                  </div>
                  <div className="rounded-lg border border-rose-500/20 bg-rose-500/10 p-2 text-center">
                    <span className="block font-semibold text-rose-700 dark:text-rose-300">
                      At Risk
                    </span>
                    <span className="text-[11px] text-muted">&lt; {modPct}%</span>
                  </div>
                  <div className="rounded-lg border border-primary/20 bg-primary/10 p-2 text-center">
                    <span className="block font-semibold text-primary">New Member</span>
                    <span className="text-[11px] text-muted">{baselinePct}% turnup</span>
                  </div>
                </div>
              </div>

              {/* Threshold inputs */}
              <div className="space-y-3">
                <FormInputField
                  id="threshold-input-solid"
                  label="Solid Tier Minimum Turnup (%)"
                  value={String(solidPct)}
                  {...register('thresholds.solid')}
                  onChange={(e) => {
                    setValue('thresholds.solid', Number(e.target.value) || 0);
                  }}
                  placeholder="70"
                  helperText="Volunteers at or above this turnup rate are modeled as high confidence."
                />

                <FormInputField
                  id="threshold-input-moderate"
                  label="Moderate Tier Minimum Turnup (%)"
                  value={String(modPct)}
                  {...register('thresholds.moderate')}
                  onChange={(e) => {
                    setValue('thresholds.moderate', Number(e.target.value) || 0);
                  }}
                  placeholder="40"
                  helperText="Volunteers between this rate and the Solid threshold are modeled as moderate confidence."
                />

                <FormInputField
                  id="threshold-input-baseline"
                  label="New / Unranked Member Baseline Turnup (%)"
                  value={String(baselinePct)}
                  {...register('thresholds.defaultTurnupRate')}
                  onChange={(e) => {
                    setValue('thresholds.defaultTurnupRate', Number(e.target.value) || 0);
                  }}
                  placeholder="80"
                  helperText="Baseline expected probability used for volunteers without past attendance data."
                />
              </div>
            </div>
          )}
        </div>
      </Dialog.Body>

      <Dialog.Footer className="flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-2.5 w-full">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleResetToDefaults}
          className="w-full sm:w-auto text-xs"
        >
          <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
          Reset {modalTab === 'quotas' ? 'Quotas' : 'Thresholds'}
        </Button>

        <div className="flex flex-col-reverse sm:flex-row items-center gap-2 w-full sm:w-auto">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            className="w-full sm:w-auto"
          >
            Cancel
          </Button>
          <Button type="button" size="sm" onClick={onSubmit} className="w-full sm:w-auto">
            <Save className="mr-1.5 h-3.5 w-3.5" />
            Save Settings
          </Button>
        </div>
      </Dialog.Footer>
    </FormProvider>
  );
}

export function VolunteerStaffingTargetsModal({
  isOpen,
  onClose,
  targets,
  onSaveTargets,
  thresholds,
  onSaveThresholds,
  initialSlot,
}: VolunteerStaffingTargetsModalProps) {
  return (
    <Dialog isOpen={isOpen} onClose={onClose} size="md" closeOnBackdropClick={false}>
      {isOpen && (
        <VolunteerStaffingTargetsModalContent
          onClose={onClose}
          targets={targets}
          onSaveTargets={onSaveTargets}
          thresholds={thresholds}
          onSaveThresholds={onSaveThresholds}
          initialSlot={initialSlot}
        />
      )}
    </Dialog>
  );
}
