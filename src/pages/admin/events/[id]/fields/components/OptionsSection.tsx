import type {
  Control,
  FieldArrayWithId,
  UseFieldArrayReturn,
  UseFormRegister,
  UseFormSetValue,
} from 'react-hook-form';

import { SectionCard } from '@/components/ui/SectionCard';
import type { EventFieldFormValues, EventFieldTypeEnum } from '@/lib/domain/event-fields';

import { FieldOptionsEditor } from './FieldOptionsEditor';

type OptionsSectionProps = {
  isOptionStructureLocked: boolean;
  isCapacityLocked: boolean;
  optionFields: FieldArrayWithId<EventFieldFormValues, 'options', 'id'>[];
  register: UseFormRegister<EventFieldFormValues>;
  control: Control<EventFieldFormValues>;
  setValue: UseFormSetValue<EventFieldFormValues>;
  errors: Record<string, unknown>;
  append: UseFieldArrayReturn<EventFieldFormValues>['append'];
  remove: UseFieldArrayReturn<EventFieldFormValues>['remove'];
  selectedFieldType: EventFieldTypeEnum;
};

/** Section for choice field options (select, radio, multi-select). */
export function OptionsSection({
  isOptionStructureLocked,
  isCapacityLocked,
  optionFields,
  register,
  control,
  setValue,
  errors,
  append,
  remove,
  selectedFieldType,
}: OptionsSectionProps) {
  return (
    <SectionCard
      title="Options"
      subtitle={
        isOptionStructureLocked
          ? isCapacityLocked
            ? 'Options and capacity are locked on archived events.'
            : 'Option labels/values are locked on published events, but capacity can still be adjusted.'
          : 'Define the choices available to registrants.'
      }
    >
      <FieldOptionsEditor
        fields={optionFields}
        register={register}
        control={control}
        setValue={setValue}
        errors={errors}
        remove={remove}
        append={append}
        isOptionStructureLocked={isOptionStructureLocked}
        isCapacityLocked={isCapacityLocked}
        selectedFieldType={selectedFieldType}
      />
    </SectionCard>
  );
}
