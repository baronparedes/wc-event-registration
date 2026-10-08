import { useState } from 'react';

import { Copy, RotateCcw, Save, Settings2, SlidersHorizontal } from 'lucide-react';

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
  const [formState, setFormState] = useState<VolunteerTargetsBySlot>(() => ({
    '9AM': { ...(targets['9AM'] ?? DEFAULT_VOLUNTEER_TARGETS_BY_SLOT['9AM']) },
    '12NN': { ...(targets['12NN'] ?? DEFAULT_VOLUNTEER_TARGETS_BY_SLOT['12NN']) },
    '3PM': { ...(targets['3PM'] ?? DEFAULT_VOLUNTEER_TARGETS_BY_SLOT['3PM']) },
  }));

  const [thresholdState, setThresholdState] = useState<ConfidenceThresholds>(() => {
    return initialThresholds ?? getStoredConfidenceThresholds();
  });

  const currentSlotTargets: SlotRoleTargets =
    formState[activeSlot] ?? DEFAULT_VOLUNTEER_TARGETS_BY_SLOT[activeSlot];

  const handleInputChange = (role: string, valStr: string) => {
    const parsed = parseInt(valStr.replace(/\D/g, ''), 10);
    const val = isNaN(parsed) ? 0 : Math.max(0, parsed);
    setFormState((prev) => ({
      ...prev,
      [activeSlot]: {
        ...(prev[activeSlot] ?? DEFAULT_VOLUNTEER_TARGETS_BY_SLOT[activeSlot]),
        [role]: val,
      },
    }));
  };

  const handleThresholdChange = (key: keyof ConfidenceThresholds, valStr: string) => {
    const parsed = parseInt(valStr.replace(/\D/g, ''), 10);
    const val = isNaN(parsed) ? 0 : Math.min(100, Math.max(0, parsed));
    setThresholdState((prev) => ({
      ...prev,
      [key]: val / 100,
    }));
  };

  const handleCopyToOtherSlots = () => {
    const activeValues = { ...currentSlotTargets };
    setFormState({
      '9AM': { ...activeValues },
      '12NN': { ...activeValues },
      '3PM': { ...activeValues },
    });
  };

  const handleResetToDefaults = () => {
    if (modalTab === 'quotas') {
      setFormState({
        '9AM': { ...DEFAULT_VOLUNTEER_TARGETS_BY_SLOT['9AM'] },
        '12NN': { ...DEFAULT_VOLUNTEER_TARGETS_BY_SLOT['12NN'] },
        '3PM': { ...DEFAULT_VOLUNTEER_TARGETS_BY_SLOT['3PM'] },
      });
    } else {
      setThresholdState({ ...DEFAULT_CONFIDENCE_THRESHOLDS });
    }
  };

  const handleSave = () => {
    saveStoredVolunteerTargets(formState);
    onSaveTargets(formState);

    saveStoredConfidenceThresholds(thresholdState);
    onSaveThresholds?.(thresholdState);

    onClose();
  };

  const rolesList = Array.from(
    new Set([...ORDERED_STANDARD_ROLES, ...Object.keys(currentSlotTargets)]),
  );

  const solidPct = Math.round(thresholdState.solid * 100);
  const modPct = Math.round(thresholdState.moderate * 100);
  const baselinePct = Math.round(thresholdState.defaultTurnupRate * 100);

  return (
    <>
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
                    onChange={(e) => handleInputChange(role, e.target.value)}
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
                  onChange={(e) => handleThresholdChange('solid', e.target.value)}
                  placeholder="70"
                  helperText="Volunteers at or above this turnup rate are modeled as high confidence."
                />

                <FormInputField
                  id="threshold-input-moderate"
                  label="Moderate Tier Minimum Turnup (%)"
                  value={String(modPct)}
                  onChange={(e) => handleThresholdChange('moderate', e.target.value)}
                  placeholder="40"
                  helperText="Volunteers between this rate and the Solid threshold are modeled as moderate confidence."
                />

                <FormInputField
                  id="threshold-input-baseline"
                  label="New / Unranked Member Baseline Turnup (%)"
                  value={String(baselinePct)}
                  onChange={(e) => handleThresholdChange('defaultTurnupRate', e.target.value)}
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
          <Button type="button" size="sm" onClick={handleSave} className="w-full sm:w-auto">
            <Save className="mr-1.5 h-3.5 w-3.5" />
            Save Settings
          </Button>
        </div>
      </Dialog.Footer>
    </>
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
