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
  isStructurallyLocked: boolean;
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
  isStructurallyLocked,
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
        isStructurallyLocked
          ? 'Options are locked on published and archived events.'
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
        isLocked={isStructurallyLocked}
        selectedFieldType={selectedFieldType}
      />
    </SectionCard>
  );
}
