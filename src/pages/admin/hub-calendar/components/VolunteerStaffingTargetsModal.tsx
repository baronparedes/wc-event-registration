import { useState } from 'react';

import { RotateCcw, Save } from 'lucide-react';

import { Button, Dialog, FormInputField } from '@/components/ui';

import {
  DEFAULT_VOLUNTEER_ROLE_TARGETS,
  ORDERED_STANDARD_ROLES,
  saveStoredVolunteerTargets,
} from '../utils/volunteerStaffingUtils';

export type VolunteerStaffingTargetsModalProps = {
  isOpen: boolean;
  onClose: () => void;
  targets: Record<string, number>;
  onSaveTargets: (newTargets: Record<string, number>) => void;
};

function VolunteerStaffingTargetsModalContent({
  onClose,
  targets,
  onSaveTargets,
}: Omit<VolunteerStaffingTargetsModalProps, 'isOpen'>) {
  const [formState, setFormState] = useState<Record<string, number>>(() => ({ ...targets }));

  const handleInputChange = (role: string, valStr: string) => {
    const parsed = parseInt(valStr.replace(/\D/g, ''), 10);
    const val = isNaN(parsed) ? 0 : Math.max(0, parsed);
    setFormState((prev) => ({
      ...prev,
      [role]: val,
    }));
  };

  const handleResetToDefaults = () => {
    setFormState({ ...DEFAULT_VOLUNTEER_ROLE_TARGETS });
  };

  const handleSave = () => {
    saveStoredVolunteerTargets(formState);
    onSaveTargets(formState);
    onClose();
  };

  const rolesList = Array.from(new Set([...ORDERED_STANDARD_ROLES, ...Object.keys(formState)]));

  return (
    <>
      <Dialog.Header>
        <Dialog.Title>Configure Volunteer Targets</Dialog.Title>
        <Dialog.Description>
          Set the target volunteer count needed per Sunday service slot (9AM, 12NN, 3PM).
        </Dialog.Description>
      </Dialog.Header>

      <Dialog.Body>
        <div className="space-y-4 py-2">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {rolesList.map((role) => (
              <FormInputField
                key={role}
                id={`target-input-${role}`}
                label={role}
                value={String(formState[role] ?? 0)}
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
}: VolunteerStaffingTargetsModalProps) {
  return (
    <Dialog isOpen={isOpen} onClose={onClose} size="md" closeOnBackdropClick={false}>
      {isOpen && (
        <VolunteerStaffingTargetsModalContent
          onClose={onClose}
          targets={targets}
          onSaveTargets={onSaveTargets}
        />
      )}
    </Dialog>
  );
}
