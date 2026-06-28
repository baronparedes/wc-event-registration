import { render, screen } from '@testing-library/react'
import { useForm } from 'react-hook-form'
import { describe, expect, it } from 'vitest'
import type { DynamicFieldResponseValues, PublicEventField } from '@/lib/domain/event-fields'
import {
  EmailFieldRenderer,
  NumberFieldRenderer,
  PhoneFieldRenderer,
  TextareaFieldRenderer,
  TextFieldRenderer,
} from '@/pages/events/[slug]/register/components/field-renderers/TextFieldRenderer'

type RendererType = 'text' | 'email' | 'phone' | 'number' | 'textarea'

function buildField(fieldKey: string, placeholder: string | null): PublicEventField {
  return {
    id: `field-${fieldKey}`,
    event_id: 'event-1',
    field_key: fieldKey,
    label: fieldKey,
    field_type: 'text',
    is_required: false,
    is_active: true,
    placeholder,
    help_text: null,
    options: [],
    validation_rules: {},
    display_order: 0,
  }
}

function Harness(props: { renderer: RendererType; field: PublicEventField }) {
  const dynamicForm = useForm<DynamicFieldResponseValues>()

  if (props.renderer === 'email') {
    return <EmailFieldRenderer field={props.field} dynamicForm={dynamicForm} />
  }

  if (props.renderer === 'phone') {
    return <PhoneFieldRenderer field={props.field} dynamicForm={dynamicForm} />
  }

  if (props.renderer === 'number') {
    return <NumberFieldRenderer field={props.field} dynamicForm={dynamicForm} />
  }

  if (props.renderer === 'textarea') {
    return <TextareaFieldRenderer field={props.field} dynamicForm={dynamicForm} />
  }

  return <TextFieldRenderer field={props.field} dynamicForm={dynamicForm} />
}

describe('Text field renderers', () => {
  it('renders text/email/phone/number inputs with provided placeholders', () => {
    render(<Harness renderer="text" field={buildField('name', 'Enter name')} />)
    expect(screen.getByPlaceholderText('Enter name')).toHaveAttribute('type', 'text')

    render(<Harness renderer="email" field={buildField('email', 'Enter email')} />)
    expect(screen.getByPlaceholderText('Enter email')).toHaveAttribute('type', 'email')

    render(<Harness renderer="phone" field={buildField('phone', 'Enter phone')} />)
    expect(screen.getByPlaceholderText('Enter phone')).toHaveAttribute('type', 'tel')

    render(<Harness renderer="number" field={buildField('age', 'Enter age')} />)
    expect(screen.getByPlaceholderText('Enter age')).toHaveAttribute('type', 'number')
  })

  it('renders textarea and handles null placeholders as undefined', () => {
    const { container: textContainer } = render(
      <Harness renderer="text" field={buildField('name-no-placeholder', null)} />,
    )
    expect(textContainer.querySelector('input')).not.toHaveAttribute('placeholder')

    const { container: textareaContainer } = render(
      <Harness renderer="textarea" field={buildField('notes', null)} />,
    )
    expect(textareaContainer.querySelector('textarea')).toHaveAttribute('rows', '4')
    expect(textareaContainer.querySelector('textarea')).not.toHaveAttribute('placeholder')
  })
})
