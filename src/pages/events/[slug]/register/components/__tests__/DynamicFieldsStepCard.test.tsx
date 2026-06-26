import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { useForm } from 'react-hook-form'
import { describe, expect, it, vi } from 'vitest'
import { DynamicFieldsStepCard } from '@/pages/events/[slug]/register/components'
import type { DynamicFieldResponseValues, PublicEventField } from '@/lib/domain/event-fields'
import type { MemberLookupProfile } from '@/lib/domain/members'

const matchedMember: MemberLookupProfile = {
  user_id: 'user-1',
  full_name: 'Jane Doe',
  nickname: null,
  first_name: 'Jane',
  last_name: 'Doe',
}

const activeFields: PublicEventField[] = [
  {
    id: 'field-1',
    event_id: 'event-1',
    field_key: 'team_name',
    label: 'Team Name',
    field_type: 'text',
    is_required: true,
    is_active: true,
    placeholder: null,
    help_text: 'Use your official team name.',
    options: [],
    validation_rules: {},
    display_order: 0,
  },
]

function renderCard(props?: Partial<React.ComponentProps<typeof DynamicFieldsStepCard>>) {
  function Harness() {
    const dynamicForm = useForm<DynamicFieldResponseValues>({
      defaultValues: { team_name: '' },
    })

    return (
      <DynamicFieldsStepCard
        matchedMember={matchedMember}
        isLoadingFields={false}
        isFieldsError={false}
        fieldConfigIssues={[]}
        activeFields={activeFields}
        dynamicForm={dynamicForm}
        onSubmit={props?.onSubmit ?? vi.fn()}
        fieldErrorMessage={(fieldKey) => {
          const maybeError = dynamicForm.formState.errors[fieldKey]
          return typeof maybeError?.message === 'string' ? maybeError.message : undefined
        }}
        isSubmitPending={false}
        submitErrorMessage={null}
        submitSuccessMessage={null}
        {...props}
      />
    )
  }

  return render(<Harness />)
}

describe('DynamicFieldsStepCard', () => {
  it('submits entered dynamic field values for a matched member', () => {
    const onSubmit = vi.fn()

    renderCard({ onSubmit })

    act(() => {
      fireEvent.change(screen.getByLabelText('Team Name *'), {
        target: { value: 'A-Team' },
      })
    })

    act(() => {
      fireEvent.click(screen.getByRole('button', { name: 'Submit Registration' }))
    })

    return waitFor(() => {
      expect(onSubmit).toHaveBeenCalled()
    })
  })

  it('renders pending state and surfaced submit messages', () => {
    renderCard({
      isSubmitPending: true,
      submitErrorMessage: 'Server error',
      submitSuccessMessage: 'Registration submitted successfully.',
      submitButtonLabel: 'Update Registration',
    })

    expect(screen.getByRole('button', { name: 'Update Registration...' })).toBeDisabled()
    expect(screen.getByText('We could not submit your registration')).toBeInTheDocument()
    expect(screen.getByText('Server error')).toBeInTheDocument()
    expect(screen.getByText('You are all set!')).toBeInTheDocument()
    expect(screen.getByText('Registration submitted successfully.')).toBeInTheDocument()
  })
})
