import { useCallback, useMemo } from 'react';

import type { Control, UseFormSetValue } from 'react-hook-form';
import { useWatch } from 'react-hook-form';

import { FormInputField } from '@/components/ui/FormInputField';
import { FormSelectField } from '@/components/ui/FormSelectField';
import type {
  CivilStatusMetadataKeyType,
  CivilStatusValues,
  UpdateMemberInput,
} from '@/lib/domain/members';
import {
  CIVIL_STATUS_OPTIONS,
  extractCivilStatusValues,
  updateMetadataWithCivilStatusField,
} from '@/lib/domain/members';

type CivilStatusEditorProps = {
  control: Control<UpdateMemberInput>;
  setValue: UseFormSetValue<UpdateMemberInput>;
  disabled?: boolean;
};

/** Dedicated editor component for managing Civil Status and Wedding Anniversary Date metadata fields. */
export function CivilStatusEditor({ control, setValue, disabled = false }: CivilStatusEditorProps) {
  const metadataEntries = useWatch({ control, name: 'metadata_entries' });

  const currentValues: CivilStatusValues = useMemo(
    () => extractCivilStatusValues(metadataEntries),
    [metadataEntries],
  );

  const handleFieldChange = useCallback(
    (fieldKey: CivilStatusMetadataKeyType, newValue: string) => {
      const current = metadataEntries || [];
      const updated = updateMetadataWithCivilStatusField(current, fieldKey, newValue);
      setValue('metadata_entries', updated, { shouldDirty: true });
    },
    [metadataEntries, setValue],
  );

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <FormSelectField
        id="civil-status"
        label="Civil Status"
        value={currentValues.civilStatus}
        onChange={(val) => handleFieldChange('civilStatus', val)}
        options={CIVIL_STATUS_OPTIONS}
        placeholder="None / Unspecified"
        disabled={disabled}
      />

      <FormInputField
        id="wedding-anniversary-date"
        label="Wedding Anniversary Date"
        type="date"
        value={currentValues.weddingAnniversaryDate}
        onChange={(e) => handleFieldChange('weddingAnniversaryDate', e.target.value)}
        readOnly={disabled}
      />
    </div>
  );
}
