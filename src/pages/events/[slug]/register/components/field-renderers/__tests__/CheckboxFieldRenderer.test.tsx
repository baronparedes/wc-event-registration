import { render, screen } from '@testing-library/react'
import { useForm } from 'react-hook-form'
import { describe, expect, it } from 'vitest'
import type { DynamicFieldResponseValues, PublicEventField } from '@/lib/domain/event-fields'
import { CheckboxFieldRenderer } from '@/pages/events/[slug]/register/components/field-renderers/CheckboxFieldRenderer'

function buildField(placeholder: string | null): PublicEventField {
  return {
    id: 'field-1',
    event_id: 'event-1',
    field_key: 'terms',
    label: 'Terms',
    field_type: 'checkbox',
    is_required: true,
    is_active: true,
    placeholder,
    help_text: null,
    options: [],
    validation_rules: {},
    display_order: 0,
  }
}

function Harness({ field }: { field: PublicEventField }) {
  const dynamicForm = useForm<DynamicFieldResponseValues>({
    defaultValues: { terms: false },
  })

  return <CheckboxFieldRenderer field={field} dynamicForm={dynamicForm} />
}

describe('CheckboxFieldRenderer', () => {
  it('uses the configured placeholder text when provided', () => {
    render(<Harness field={buildField('I agree to all rules')} />)

    expect(screen.getByLabelText('I agree to all rules')).toBeInTheDocument()
  })

  it('falls back to the default placeholder copy when placeholder is missing', () => {
    render(<Harness field={buildField(null)} />)

    expect(screen.getByLabelText('I confirm this statement.')).toBeInTheDocument()
  })
})
