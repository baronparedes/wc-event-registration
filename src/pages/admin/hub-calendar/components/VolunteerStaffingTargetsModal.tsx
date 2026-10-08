import { useState } from 'react';

import { Copy, RotateCcw, Save } from 'lucide-react';

import { Button, Dialog, FormInputField, Tabs, TabsList, TabsTrigger } from '@/components/ui';
import type { TimeSlot } from '@/hooks/domain/members';

import {
  DEFAULT_VOLUNTEER_ROLE_TARGETS,
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
  initialSlot = '9AM',
}: Omit<VolunteerStaffingTargetsModalProps, 'isOpen'>) {
  const [activeSlot, setActiveSlot] = useState<TimeSlot>(initialSlot);
  const [formState, setFormState] = useState<VolunteerTargetsBySlot>(() => ({
    '9AM': { ...(targets['9AM'] ?? DEFAULT_VOLUNTEER_ROLE_TARGETS) },
    '12NN': { ...(targets['12NN'] ?? DEFAULT_VOLUNTEER_ROLE_TARGETS) },
    '3PM': { ...(targets['3PM'] ?? DEFAULT_VOLUNTEER_ROLE_TARGETS) },
  }));

  const currentSlotTargets: SlotRoleTargets =
    formState[activeSlot] ?? DEFAULT_VOLUNTEER_ROLE_TARGETS;

  const handleInputChange = (role: string, valStr: string) => {
    const parsed = parseInt(valStr.replace(/\D/g, ''), 10);
    const val = isNaN(parsed) ? 0 : Math.max(0, parsed);
    setFormState((prev) => ({
      ...prev,
      [activeSlot]: {
        ...(prev[activeSlot] ?? DEFAULT_VOLUNTEER_ROLE_TARGETS),
        [role]: val,
      },
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
    setFormState({
      '9AM': { ...DEFAULT_VOLUNTEER_ROLE_TARGETS },
      '12NN': { ...DEFAULT_VOLUNTEER_ROLE_TARGETS },
      '3PM': { ...DEFAULT_VOLUNTEER_ROLE_TARGETS },
    });
  };

  const handleSave = () => {
    saveStoredVolunteerTargets(formState);
    onSaveTargets(formState);
    onClose();
  };

  const rolesList = Array.from(
    new Set([...ORDERED_STANDARD_ROLES, ...Object.keys(currentSlotTargets)]),
  );

  return (
    <>
      <Dialog.Header>
        <Dialog.Title>Configure Volunteer Targets</Dialog.Title>
        <Dialog.Description>
          Set target volunteer quotas individually per Sunday service slot (9AM, 12NN, 3PM).
        </Dialog.Description>
      </Dialog.Header>

      <Dialog.Body>
        <div className="space-y-4 py-2">
          {/* Slot Tabs */}
          <Tabs value={activeSlot} onValueChange={(val) => setActiveSlot(val as TimeSlot)}>
            <TabsList>
              {TIME_SLOTS.map(({ slot, label }) => (
                <TabsTrigger key={slot} value={slot} className="text-xs py-1.5 px-4">
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
      </Dialog.Body>

      <Dialog.Footer className="flex items-center justify-between sm:justify-between w-full">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleResetToDefaults}
          className="text-xs"
        >
          <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
          Reset Defaults
        </Button>

        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" size="sm" onClick={handleSave}>
            <Save className="mr-1.5 h-3.5 w-3.5" />
            Save Targets
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
  initialSlot,
}: VolunteerStaffingTargetsModalProps) {
  return (
    <Dialog isOpen={isOpen} onClose={onClose} size="md" closeOnBackdropClick={false}>
      {isOpen && (
        <VolunteerStaffingTargetsModalContent
          onClose={onClose}
          targets={targets}
          onSaveTargets={onSaveTargets}
          initialSlot={initialSlot}
        />
      )}
    </Dialog>
  );
}
