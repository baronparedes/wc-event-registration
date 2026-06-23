import type { UseFormRegisterReturn } from 'react-hook-form'
import { FIELD_TYPE_LABELS } from '../../../../../../lib/admin/eventFieldSchema'
import type { EventFieldTypeEnum } from '../../../../../../lib/admin/eventFieldSchema'
import { SectionCard } from '../../../../../../components/ui/SectionCard'
import { FieldTypeSelector } from './FieldTypeSelector'

type FieldTypeSectionProps = {
  isEditing: boolean
  isFullyLocked: boolean
  selectedFieldType: EventFieldTypeEnum
  onTypeSelect: (type: EventFieldTypeEnum) => void
  fieldTypeRegistration: UseFormRegisterReturn
  error?: string
}

/** Section for field type selection (create) or display (edit). */
export function FieldTypeSection({
  isEditing,
  isFullyLocked,
  selectedFieldType,
  onTypeSelect,
  error,
}: FieldTypeSectionProps) {
  if (!isEditing) {
    return (
      <SectionCard title="Field Type">
        <FieldTypeSelector
          value={selectedFieldType}
          onChange={onTypeSelect}
          disabled={isFullyLocked}
          error={error}
        />
      </SectionCard>
    )
  }

  return (
    <div className="rounded-lg border border-border bg-background px-4 py-3">
      <p className="text-xs text-gray-600">Field Type</p>
      <p className="mt-0.5 text-sm font-medium text-text">
        {FIELD_TYPE_LABELS[selectedFieldType] ?? selectedFieldType}
        <span className="ml-2 text-xs text-gray-600">(cannot be changed after creation)</span>
      </p>
    </div>
  )
}
