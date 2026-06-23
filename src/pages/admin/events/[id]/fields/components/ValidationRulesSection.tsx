import type { UseFormRegister } from 'react-hook-form'
import type { EventFieldFormValues } from '@/lib/admin/eventFieldSchema'
import { SectionCard } from '@/components/ui/SectionCard'
import { RuleInput } from './RuleInput'

type ValidationRulesSectionProps = {
  isStructurallyLocked: boolean
  showTextValidation: boolean
  showNumberValidation: boolean
  showMultiSelectValidation: boolean
  showDateValidation: boolean
  register: UseFormRegister<EventFieldFormValues>
}

/** Section for all validation rule inputs (text, number, date, multi-select). */
export function ValidationRulesSection({
  isStructurallyLocked,
  showTextValidation,
  showNumberValidation,
  showMultiSelectValidation,
  showDateValidation,
  register,
}: ValidationRulesSectionProps) {
  return (
    <SectionCard
      title="Validation Rules"
      subtitle={
        isStructurallyLocked
          ? 'Validation rules are locked on published and archived events.'
          : 'Optional constraints applied when the form is submitted.'
      }
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {showTextValidation && (
          <>
            <RuleInput
              id="val_min_length"
              label="Minimum Length"
              type="number"
              registration={register('val_min_length')}
              disabled={isStructurallyLocked}
              placeholder="e.g., 3"
              helperText="Minimum number of characters required."
            />
            <RuleInput
              id="val_max_length"
              label="Maximum Length"
              type="number"
              registration={register('val_max_length')}
              disabled={isStructurallyLocked}
              placeholder="e.g., 100"
              helperText="Maximum number of characters allowed."
            />
            <div className="sm:col-span-2">
              <RuleInput
                id="val_pattern"
                label="Pattern (Regex)"
                type="text"
                registration={register('val_pattern')}
                disabled={isStructurallyLocked}
                placeholder="e.g., ^[A-Za-z\s]+$"
                helperText="Optional regular expression the value must match."
              />
            </div>
          </>
        )}
        {showNumberValidation && (
          <>
            <RuleInput
              id="val_min"
              label="Minimum Value"
              type="number"
              registration={register('val_min')}
              disabled={isStructurallyLocked}
              placeholder="e.g., 0"
            />
            <RuleInput
              id="val_max"
              label="Maximum Value"
              type="number"
              registration={register('val_max')}
              disabled={isStructurallyLocked}
              placeholder="e.g., 10"
            />
          </>
        )}
        {showMultiSelectValidation && (
          <>
            <RuleInput
              id="val_min_selections"
              label="Minimum Selections"
              type="number"
              registration={register('val_min_selections')}
              disabled={isStructurallyLocked}
              placeholder="e.g., 1"
              helperText="Minimum number of options the registrant must select."
            />
            <RuleInput
              id="val_max_selections"
              label="Maximum Selections"
              type="number"
              registration={register('val_max_selections')}
              disabled={isStructurallyLocked}
              placeholder="e.g., 3"
              helperText="Maximum number of options allowed."
            />
          </>
        )}
        {showDateValidation && (
          <>
            <RuleInput
              id="val_min_date"
              label="Earliest Allowed Date"
              type="date"
              registration={register('val_min_date')}
              disabled={isStructurallyLocked}
            />
            <RuleInput
              id="val_max_date"
              label="Latest Allowed Date"
              type="date"
              registration={register('val_max_date')}
              disabled={isStructurallyLocked}
            />
          </>
        )}
      </div>
    </SectionCard>
  )
}
