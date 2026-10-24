import { useCallback, useMemo } from 'react';

import type { Control, UseFormSetValue } from 'react-hook-form';
import { useWatch } from 'react-hook-form';

import { ContactButtons } from '@/components/ui/ContactButtons';
import { FormInputField } from '@/components/ui/FormInputField';
import { FormSelectField, type SelectOption } from '@/components/ui/FormSelectField';
import type { DGroupMetadataKeyType, DGroupValues, UpdateMemberInput } from '@/lib/domain/members';
import { extractDGroupValues, updateMetadataWithDGroupField } from '@/lib/domain/members';

const DGROUP_STATUS_OPTIONS: SelectOption[] = [
  { value: 'member', label: 'Member' },
  { value: 'leader', label: 'Leader' },
];

type DGroupEditorProps = {
  control: Control<UpdateMemberInput>;
  setValue: UseFormSetValue<UpdateMemberInput>;
  disabled?: boolean;
};

/** Dedicated editor component for managing first-class DGroup metadata fields. */
export function DGroupEditor({ control, setValue, disabled = false }: DGroupEditorProps) {
  const metadataEntries = useWatch({ control, name: 'metadata_entries' });

  const currentValues: DGroupValues = useMemo(
    () => extractDGroupValues(metadataEntries),
    [metadataEntries],
  );

  const handleFieldChange = useCallback(
    (fieldKey: DGroupMetadataKeyType, newValue: string) => {
      const current = metadataEntries || [];
      const updated = updateMetadataWithDGroupField(current, fieldKey, newValue);
      setValue('metadata_entries', updated, { shouldDirty: true });
    },
    [metadataEntries, setValue],
  );

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <FormSelectField
        id="dgroup-status"
        label="DGroup Status"
        value={currentValues.status}
        onChange={(val) => handleFieldChange('status', val)}
        options={DGROUP_STATUS_OPTIONS}
        placeholder="None / Unassigned"
        disabled={disabled}
      />

      <FormInputField
        id="dgroup-member-since"
        label="Member Since"
        value={currentValues.memberSince}
        onChange={(e) => handleFieldChange('memberSince', e.target.value)}
        placeholder="e.g. Oct-23"
        helperText="Format: Mmm-YY (e.g. Oct-23)"
        readOnly={disabled}
      />

      <FormInputField
        id="dgroup-leader"
        label="DGroup Leader"
        value={currentValues.leader}
        onChange={(e) => handleFieldChange('leader', e.target.value)}
        placeholder="Leader name"
        readOnly={disabled}
      />

      <FormInputField
        id="dgroup-leader-contact"
        label="Leader Contact"
        type="tel"
        value={currentValues.leaderContact}
        onChange={(e) => handleFieldChange('leaderContact', e.target.value)}
        placeholder="e.g. 09171234567"
        readOnly={disabled}
        labelAdornment={
          currentValues.leaderContact ? (
            <span className="ml-1 inline-flex items-center" onClick={(e) => e.stopPropagation()}>
              <ContactButtons phone={currentValues.leaderContact} size="sm" variant="icon" />
            </span>
          ) : undefined
        }
      />

      <FormInputField
        id="dgroup-leader-email"
        label="Leader Email"
        type="email"
        value={currentValues.leaderEmail}
        onChange={(e) => handleFieldChange('leaderEmail', e.target.value)}
        placeholder="e.g. leader@example.com"
        readOnly={disabled}
      />

      <FormInputField
        id="dgroup-miner-open-schedule"
        label="Miner Open Schedule"
        value={currentValues.minerOpenSchedule}
        onChange={(e) => handleFieldChange('minerOpenSchedule', e.target.value)}
        placeholder="e.g. Saturdays 3PM"
        helperText="Meeting schedule for multiplication"
        readOnly={disabled}
      />

      <FormInputField
        id="dgroup-miner-open-slots"
        label="Miner Open Slots"
        type="number"
        min={0}
        value={currentValues.minerOpenSlots}
        onChange={(e) => handleFieldChange('minerOpenSlots', e.target.value)}
        placeholder="0"
        readOnly={disabled}
      />
    </div>
  );
}
