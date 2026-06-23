import type { FieldArrayWithId, UseFieldArrayReturn, UseFormRegister } from 'react-hook-form'
import type { EventFieldFormValues } from '../../../../../../lib/admin/eventFieldSchema'
import { SectionCard } from '../../../../../../components/ui/SectionCard'
import { FieldOptionsEditor } from './FieldOptionsEditor'

type OptionsSectionProps = {
  isStructurallyLocked: boolean
  optionFields: FieldArrayWithId<EventFieldFormValues, 'options', 'id'>[]
  register: UseFormRegister<EventFieldFormValues>
  errors: Record<string, unknown>
  append: UseFieldArrayReturn<EventFieldFormValues>['append']
  remove: UseFieldArrayReturn<EventFieldFormValues>['remove']
}

/** Section for choice field options (select, radio, multi-select). */
export function OptionsSection({
  isStructurallyLocked,
  optionFields,
  register,
  errors,
  append,
  remove,
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
        errors={errors}
        remove={remove}
        append={append}
        isLocked={isStructurallyLocked}
      />
    </SectionCard>
  )
}
