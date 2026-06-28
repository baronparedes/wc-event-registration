import { useForm } from 'react-hook-form'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { FormTextareaField } from '@/components/ui/FormTextareaField'

type TestFormValues = {
  description: string
}

function Harness(props: {
  error?: string
  disabled?: boolean
  helperText?: string
  rows?: number
  textareaClassName?: string
}) {
  const { register } = useForm<TestFormValues>()

  return (
    <FormTextareaField
      id="description"
      label="Description"
      required
      labelAdornment={<span data-testid="description-adornment">adornment</span>}
      registration={register('description')}
      placeholder="Describe your event"
      rows={props.rows}
      error={props.error}
      disabled={props.disabled}
      helperText={props.helperText}
      textareaClassName={props.textareaClassName}
    />
  )
}

describe('FormTextareaField', () => {
  it('renders helper text and default styling without errors', () => {
    render(<Harness helperText="Optional details" textareaClassName="custom-textarea" />)

    const textarea = screen.getByLabelText(/^Description/)

    expect(textarea).toHaveAttribute('placeholder', 'Describe your event')
    expect(textarea).toHaveAttribute('rows', '4')
    expect(textarea.className).toContain('border-border')
    expect(textarea.className).toContain('custom-textarea')
    expect(screen.getByText('Optional details')).toBeInTheDocument()
    expect(screen.getByTestId('description-adornment')).toBeInTheDocument()
  })

  it('renders error styling, custom rows, and disabled state', () => {
    render(<Harness error="Description is required" disabled rows={6} />)

    const textarea = screen.getByLabelText(/^Description/)

    expect(textarea).toBeDisabled()
    expect(textarea).toHaveAttribute('rows', '6')
    expect(textarea.className).toContain('border-red-400')
    expect(screen.getByText('Description is required')).toBeInTheDocument()
  })
})
