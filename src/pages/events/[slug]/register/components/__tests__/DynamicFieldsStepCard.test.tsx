import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { useForm } from 'react-hook-form'
import { describe, expect, it, vi } from 'vitest'
import { DynamicFieldsStepCard } from '../index'
import type { DynamicFieldResponseValues, PublicEventField } from '@/lib/domain/event-fields'
import type { MemberLookupProfile } from '@/lib/domain/members'

const matchedMember: MemberLookupProfile = {
  user_id: 'user-1',
  member_id: 'member-1',
  full_name: 'Jane Doe',
  nickname: null,
  first_name: 'Jane',
  last_name: 'Doe',
}

const baseFields: PublicEventField[] = [
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
  {
    id: 'field-2',
    event_id: 'event-1',
    field_key: 'notes',
    label: 'Notes',
    field_type: 'textarea',
    is_required: false,
    is_active: true,
    placeholder: 'Add notes',
    help_text: null,
    options: [],
    validation_rules: {},
    display_order: 1,
  },
  {
    id: 'field-3',
    event_id: 'event-1',
    field_key: 'age',
    label: 'Age',
    field_type: 'number',
    is_required: false,
    is_active: true,
    placeholder: null,
    help_text: null,
    options: [],
    validation_rules: {},
    display_order: 2,
  },
  {
    id: 'field-4',
    event_id: 'event-1',
    field_key: 'email',
    label: 'Email',
    field_type: 'email',
    is_required: false,
    is_active: true,
    placeholder: 'name@example.com',
    help_text: null,
    options: [],
    validation_rules: {},
    display_order: 3,
  },
  {
    id: 'field-5',
    event_id: 'event-1',
    field_key: 'phone',
    label: 'Phone',
    field_type: 'phone',
    is_required: false,
    is_active: true,
    placeholder: '555-0100',
    help_text: null,
    options: [],
    validation_rules: {},
    display_order: 4,
  },
  {
    id: 'field-6',
    event_id: 'event-1',
    field_key: 'start_date',
    label: 'Start Date',
    field_type: 'date',
    is_required: false,
    is_active: true,
    placeholder: null,
    help_text: null,
    options: [],
    validation_rules: {},
    display_order: 5,
  },
  {
    id: 'field-7',
    event_id: 'event-1',
    field_key: 'start_time',
    label: 'Start Time',
    field_type: 'datetime',
    is_required: false,
    is_active: true,
    placeholder: null,
    help_text: null,
    options: [],
    validation_rules: {},
    display_order: 6,
  },
  {
    id: 'field-8',
    event_id: 'event-1',
    field_key: 'meal_choice',
    label: 'Meal Choice',
    field_type: 'select',
    is_required: false,
    is_active: true,
    placeholder: null,
    help_text: null,
    options: [
      { label: 'Vegan', value: 'vegan' },
      { label: 'Vegetarian', value: 'vegetarian' },
    ],
    validation_rules: {},
    display_order: 7,
  },
  {
    id: 'field-9',
    event_id: 'event-1',
    field_key: 'shirt_size',
    label: 'Shirt Size',
    field_type: 'radio',
    is_required: false,
    is_active: true,
    placeholder: null,
    help_text: null,
    options: [
      { label: 'Small', value: 's' },
      { label: 'Large', value: 'l' },
    ],
    validation_rules: {},
    display_order: 8,
  },
  {
    id: 'field-10',
    event_id: 'event-1',
    field_key: 'activities',
    label: 'Activities',
    field_type: 'multi_select',
    is_required: false,
    is_active: true,
    placeholder: null,
    help_text: null,
    options: [
      { label: 'Run', value: 'run' },
      { label: 'Swim', value: 'swim' },
    ],
    validation_rules: {},
    display_order: 9,
  },
  {
    id: 'field-11',
    event_id: 'event-1',
    field_key: 'terms',
    label: 'Terms',
    field_type: 'checkbox',
    is_required: true,
    is_active: true,
    placeholder: 'I agree to the event terms.',
    help_text: null,
    options: [],
    validation_rules: {},
    display_order: 10,
  },
  {
    id: 'field-13',
    event_id: 'event-1',
    field_key: 'meal_slots',
    label: 'Meal Slots',
    field_type: 'multi_select_toggle',
    is_required: false,
    is_active: true,
    placeholder: null,
    help_text: null,
    options: [
      { label: '9AM, with Breakfast', value: '9am' },
      { label: '12NN, with Lunch', value: '12nn' },
    ],
    validation_rules: {},
    display_order: 11,
  },
  {
    id: 'field-12',
    event_id: 'event-1',
    field_key: 'terms_duplicate',
    label: 'Terms Duplicate',
    field_type: 'boolean',
    is_required: false,
    is_active: true,
    placeholder: 'I agree again.',
    help_text: null,
    options: [],
    validation_rules: {},
    display_order: 12,
  },
]

function renderCard(props?: Partial<React.ComponentProps<typeof DynamicFieldsStepCard>>) {
  function Harness() {
    const dynamicForm = useForm<DynamicFieldResponseValues>({
      defaultValues: {
        team_name: '',
        notes: '',
        age: '',
        email: '',
        phone: '',
        start_date: '',
        start_time: '',
        meal_choice: '',
        shirt_size: '',
        activities: [],
        meal_slots: {},
        terms: false,
        terms_duplicate: false,
      },
    })

    return (
      <DynamicFieldsStepCard
        matchedMember={matchedMember}
        isLoadingFields={false}
        isFieldsError={false}
        fieldConfigIssues={[]}
        activeFields={props?.activeFields ?? baseFields}
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
  it('renders the loading, error, no-fields note, and locked branches', () => {
    const loading = renderCard({ isLoadingFields: true })

    expect(loading.container.querySelector('[aria-hidden="true"]')).toBeTruthy()
    loading.unmount()

    const issues = renderCard({
      isLoadingFields: false,
      isFieldsError: true,
      fieldConfigIssues: ['Bad field config'],
      activeFields: [],
    })

    expect(
      screen.getByText('We could not load your form right now. Please try Step 1 again.'),
    ).toBeInTheDocument()
    expect(screen.getByText('Some questions could not be shown right now.')).toBeInTheDocument()
    expect(screen.getByText('Bad field config')).toBeInTheDocument()
    issues.unmount()

    const empty = renderCard({ activeFields: [], isLoadingFields: false })
    expect(
      screen.getByText('Tap "Submit Registration" to confirm your attendance for this event.'),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Submit Registration' })).toBeInTheDocument()
    empty.unmount()

    renderCard({
      isLocked: true,
      lockedMessage: 'Already registered',
      activeFields: [],
    })

    expect(screen.getByText('Already registered')).toBeInTheDocument()
    expect(screen.getByText('Please complete Step 1 to continue.')).toBeInTheDocument()
  })

  it('submits entered dynamic field values for a matched member', async () => {
    const onSubmit = vi.fn()

    renderCard({ onSubmit })

    act(() => {
      fireEvent.change(screen.getByLabelText('Team Name *'), {
        target: { value: 'A-Team' },
      })
      fireEvent.change(screen.getByLabelText('Notes'), {
        target: { value: 'Bring snacks' },
      })
      fireEvent.change(screen.getByLabelText('Age'), {
        target: { value: '42' },
      })
      fireEvent.change(screen.getByLabelText('Email'), {
        target: { value: 'team@example.com' },
      })
      fireEvent.change(screen.getByLabelText('Phone'), {
        target: { value: '555-0100' },
      })
      fireEvent.change(screen.getByLabelText('Start Date'), {
        target: { value: '2026-06-23' },
      })
      fireEvent.change(screen.getByLabelText('Start Time'), {
        target: { value: '2026-06-23T10:00' },
      })
      fireEvent.change(screen.getByLabelText('Meal Choice'), {
        target: { value: 'vegetarian' },
      })
      fireEvent.click(screen.getByLabelText('Small'))
      fireEvent.click(screen.getByLabelText('Run'))
      fireEvent.click(screen.getByLabelText('9AM, with Breakfast'))
      fireEvent.click(screen.getByRole('button', { name: '9AM, with Breakfast - Yes' }))
      fireEvent.click(screen.getByLabelText('I agree to the event terms.'))
      fireEvent.click(screen.getByLabelText('I agree again.'))
    })

    act(() => {
      fireEvent.click(screen.getByRole('button', { name: 'Submit Registration' }))
    })

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalled()
    })
    expect(screen.getByLabelText('Notes')).toHaveValue('Bring snacks')
    expect(screen.getByLabelText('Age')).toHaveValue(42)
    expect(screen.getByLabelText('Email')).toHaveValue('team@example.com')
    expect(screen.getByLabelText('Phone')).toHaveValue('555-0100')
    expect(screen.getByLabelText('Meal Choice')).toHaveValue('vegetarian')
    expect(screen.getByLabelText('Small')).toBeChecked()
    expect(screen.getByLabelText('Run')).toBeChecked()
    expect(screen.getByLabelText('9AM, with Breakfast')).toBeChecked()
    expect(screen.getByLabelText('I agree to the event terms.')).toBeChecked()
    expect(screen.getByLabelText('I agree again.')).toBeChecked()
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

  it('allows submission when there are no dynamic fields', async () => {
    const onSubmit = vi.fn()

    renderCard({
      activeFields: [],
      isLoadingFields: false,
      onSubmit,
    })

    expect(
      screen.getByText('Tap "Submit Registration" to confirm your attendance for this event.'),
    ).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Submit Registration' }))

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalled()
    })
  })
})
