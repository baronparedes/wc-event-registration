import { act, fireEvent, render, screen } from '@testing-library/react';
import { toast } from 'sonner';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { FormSubmission } from '@/lib/domain/forms';

import { SubmissionDetailDialog } from '../SubmissionDetailDialog';

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

const mockMemberSubmission: FormSubmission = {
  id: 'sub-1',
  form_id: 'form-123',
  source: 'member',
  status: 'submitted',
  idempotency_key: null,
  user_id: 'user-1',
  public_registrant_info: null,
  submitted_at: '2026-01-15T10:30:00Z',
  created_at: '2026-01-15T10:30:00Z',
  updated_at: '2026-01-15T10:30:00Z',
  users: {
    member_id: 'WC-001',
    full_name: 'Jane Doe',
    email: 'jane@example.com',
  },
  form_submission_answers: [
    {
      id: 'ans-1',
      submission_id: 'sub-1',
      form_field_id: 'field-1',
      answer_text: 'Morning Shift',
      answer_number: null,
      answer_boolean: null,
      answer_date: null,
      answer_json: null,
      created_at: '2026-01-15T10:30:00Z',
      updated_at: '2026-01-15T10:30:00Z',
      form_fields: {
        field_key: 'preferred_shift',
        label: 'Preferred Shift',
        field_type: 'text',
      },
    },
    {
      id: 'ans-2',
      submission_id: 'sub-1',
      form_field_id: 'field-2',
      answer_text: null,
      answer_number: 42,
      answer_boolean: null,
      answer_date: null,
      answer_json: null,
      created_at: '2026-01-15T10:30:00Z',
      updated_at: '2026-01-15T10:30:00Z',
      form_fields: {
        field_key: 'age',
        label: 'Age',
        field_type: 'number',
      },
    },
    {
      id: 'ans-3',
      submission_id: 'sub-1',
      form_field_id: 'field-3',
      answer_text: null,
      answer_number: null,
      answer_boolean: true,
      answer_date: null,
      answer_json: null,
      created_at: '2026-01-15T10:30:00Z',
      updated_at: '2026-01-15T10:30:00Z',
      form_fields: {
        field_key: 'agreed',
        label: 'Agreed',
        field_type: 'boolean',
      },
    },
    {
      id: 'ans-4',
      submission_id: 'sub-1',
      form_field_id: 'field-4',
      answer_text: null,
      answer_number: null,
      answer_boolean: false,
      answer_date: null,
      answer_json: null,
      created_at: '2026-01-15T10:30:00Z',
      updated_at: '2026-01-15T10:30:00Z',
      form_fields: {
        field_key: 'opt_in',
        label: 'Opt In',
        field_type: 'boolean',
      },
    },
    {
      id: 'ans-5',
      submission_id: 'sub-1',
      form_field_id: 'field-5',
      answer_text: null,
      answer_number: null,
      answer_boolean: null,
      answer_date: '2026-04-12',
      answer_json: null,
      created_at: '2026-01-15T10:30:00Z',
      updated_at: '2026-01-15T10:30:00Z',
      form_fields: {
        field_key: 'date_valid',
        label: 'Date Valid',
        field_type: 'date',
      },
    },
    {
      id: 'ans-6',
      submission_id: 'sub-1',
      form_field_id: 'field-6',
      answer_text: null,
      answer_number: null,
      answer_boolean: null,
      answer_date: 'invalid-date-string',
      answer_json: null,
      created_at: '2026-01-15T10:30:00Z',
      updated_at: '2026-01-15T10:30:00Z',
      form_fields: {
        field_key: 'date_invalid',
        label: 'Date Invalid',
        field_type: 'date',
      },
    },
    {
      id: 'ans-7',
      submission_id: 'sub-1',
      form_field_id: 'field-7',
      answer_text: null,
      answer_number: null,
      answer_boolean: null,
      answer_date: null,
      answer_json: ['Choice 1', 'Choice 2'],
      created_at: '2026-01-15T10:30:00Z',
      updated_at: '2026-01-15T10:30:00Z',
      form_fields: {
        field_key: 'array_ans',
        label: 'Array Answer',
        field_type: 'multi_select',
      },
    },
    {
      id: 'ans-8',
      submission_id: 'sub-1',
      form_field_id: 'field-8',
      answer_text: null,
      answer_number: null,
      answer_boolean: null,
      answer_date: null,
      answer_json: { keyA: 'valA' },
      created_at: '2026-01-15T10:30:00Z',
      updated_at: '2026-01-15T10:30:00Z',
      form_fields: {
        field_key: 'obj_ans',
        label: 'Object Answer',
        field_type: 'multi_select_toggle',
      },
    },
    {
      id: 'ans-9',
      submission_id: 'sub-1',
      form_field_id: 'field-9',
      answer_text: null,
      answer_number: null,
      answer_boolean: null,
      answer_date: null,
      answer_json: null,
      created_at: '2026-01-15T10:30:00Z',
      updated_at: '2026-01-15T10:30:00Z',
      form_fields: {
        field_key: 'empty_ans',
        label: 'Empty Answer',
        field_type: 'text',
      },
    },
    {
      id: 'ans-10',
      submission_id: 'sub-1',
      form_field_id: 'field-10',
      answer_text: null,
      answer_number: null,
      answer_boolean: null,
      answer_date: null,
      answer_json: 'scalar string' as unknown,
      created_at: '2026-01-15T10:30:00Z',
      updated_at: '2026-01-15T10:30:00Z',
      form_fields: {
        field_key: 'scalar_json',
        label: 'Scalar JSON',
        field_type: 'text',
      },
    },
  ],
};

const mockGuestSubmission: FormSubmission = {
  id: 'sub-2',
  form_id: 'form-123',
  source: 'guest',
  status: 'submitted',
  idempotency_key: null,
  user_id: null,
  public_registrant_info: {
    first_name: 'Bob',
    last_name: 'Guest',
    email: 'bob@example.com',
    phone: '09991234567',
  },
  submitted_at: '2026-01-16T14:00:00Z',
  created_at: '2026-01-16T14:00:00Z',
  updated_at: '2026-01-16T14:00:00Z',
  form_submission_answers: [],
};

describe('SubmissionDetailDialog', () => {
  const onClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does not render when isOpen is false or submission is null', () => {
    const { rerender } = render(
      <SubmissionDetailDialog submission={mockMemberSubmission} isOpen={false} onClose={onClose} />,
    );
    expect(screen.queryByRole('heading', { name: 'Submission Details' })).not.toBeInTheDocument();

    rerender(<SubmissionDetailDialog submission={null} isOpen={true} onClose={onClose} />);
    expect(screen.queryByRole('heading', { name: 'Submission Details' })).not.toBeInTheDocument();
  });

  it('renders member submission details and all formatted answer types', () => {
    render(
      <SubmissionDetailDialog submission={mockMemberSubmission} isOpen={true} onClose={onClose} />,
    );

    expect(screen.getByRole('heading', { name: 'Submission Details' })).toBeInTheDocument();
    expect(screen.getAllByText(/Jane Doe/).length).toBeGreaterThan(0);
    expect(screen.getByText('WC-001')).toBeInTheDocument();
    expect(screen.getByText('jane@example.com')).toBeInTheDocument();
    expect(screen.getByText('sub-1')).toBeInTheDocument();

    // Check answers
    expect(screen.getByText('Preferred Shift')).toBeInTheDocument();
    expect(screen.getByText('Morning Shift')).toBeInTheDocument();
    expect(screen.getByText('42')).toBeInTheDocument();
    expect(screen.getByText('Yes')).toBeInTheDocument();
    expect(screen.getByText('No')).toBeInTheDocument();
    expect(screen.getByText('Choice 1, Choice 2')).toBeInTheDocument();
    expect(screen.getByText('keyA: valA')).toBeInTheDocument();
    expect(screen.getByText('invalid-date-string')).toBeInTheDocument();
    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('renders guest submission details and empty answers message', () => {
    render(
      <SubmissionDetailDialog submission={mockGuestSubmission} isOpen={true} onClose={onClose} />,
    );

    expect(screen.getAllByText(/Bob Guest/).length).toBeGreaterThan(0);
    expect(screen.getByText('bob@example.com')).toBeInTheDocument();
    expect(screen.getByText('09991234567')).toBeInTheDocument();
    expect(screen.getByText('No answers captured for this submission.')).toBeInTheDocument();
  });

  it('copies answers to clipboard successfully', async () => {
    vi.useFakeTimers();
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: writeTextMock },
      configurable: true,
      writable: true,
    });

    render(
      <SubmissionDetailDialog submission={mockMemberSubmission} isOpen={true} onClose={onClose} />,
    );

    const copyButton = screen.getByRole('button', { name: /Copy Answers/i });
    fireEvent.click(copyButton);

    await act(async () => {
      await Promise.resolve();
    });

    expect(writeTextMock).toHaveBeenCalled();
    expect(toast.success).toHaveBeenCalledWith('Answers copied to clipboard');
    expect(screen.getByText('Copied')).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(2100);
    });

    expect(screen.queryByText('Copied')).not.toBeInTheDocument();
    vi.useRealTimers();
  });

  it('handles clipboard failure gracefully', async () => {
    const writeTextMock = vi.fn().mockRejectedValue(new Error('Clipboard error'));
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: writeTextMock },
      configurable: true,
      writable: true,
    });

    render(
      <SubmissionDetailDialog submission={mockMemberSubmission} isOpen={true} onClose={onClose} />,
    );

    const copyButton = screen.getByRole('button', { name: /Copy Answers/i });
    fireEvent.click(copyButton);

    await act(async () => {
      await Promise.resolve();
    });

    expect(toast.error).toHaveBeenCalledWith('Failed to copy answers');
  });

  it('calls onClose when close buttons or backdrop are clicked', () => {
    render(
      <SubmissionDetailDialog submission={mockMemberSubmission} isOpen={true} onClose={onClose} />,
    );

    const closeDialogButton = screen.getByRole('button', { name: 'Close dialog' });
    fireEvent.click(closeDialogButton);
    expect(onClose).toHaveBeenCalledTimes(1);

    const closeButton = screen.getByRole('button', { name: 'Close' });
    fireEvent.click(closeButton);
    expect(onClose).toHaveBeenCalledTimes(2);

    // Backdrop click
    const backdrop = document.body.querySelector('.fixed.inset-0') as HTMLElement;
    fireEvent.click(backdrop);
    expect(onClose).toHaveBeenCalledTimes(3);
  });

  it('renders anonymous respondent and handles field label and type fallbacks', async () => {
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: writeTextMock },
      configurable: true,
      writable: true,
    });

    const anonymousSubmission: FormSubmission = {
      id: 'sub-anon',
      form_id: 'form-123',
      source: 'guest',
      status: 'submitted',
      idempotency_key: null,
      user_id: null,
      public_registrant_info: null,
      submitted_at: '2026-01-18T12:00:00Z',
      created_at: '2026-01-18T12:00:00Z',
      updated_at: '2026-01-18T12:00:00Z',
      form_submission_answers: [
        {
          id: 'ans-key-only',
          submission_id: 'sub-anon',
          form_field_id: 'field-k',
          answer_text: 'Value K',
          answer_number: null,
          answer_boolean: null,
          answer_date: null,
          answer_json: null,
          created_at: '2026-01-18T12:00:00Z',
          updated_at: '2026-01-18T12:00:00Z',
          form_fields: {
            field_key: 'custom_key',
            label: '',
            field_type: 'multi_choice' as unknown,
          } as never,
        },
        {
          id: 'ans-no-fields',
          submission_id: 'sub-anon',
          form_field_id: 'field-none',
          answer_text: 'Value None',
          answer_number: null,
          answer_boolean: null,
          answer_date: null,
          answer_json: null,
          created_at: '2026-01-18T12:00:00Z',
          updated_at: '2026-01-18T12:00:00Z',
          form_fields: null as never,
        },
      ],
    };

    render(
      <SubmissionDetailDialog submission={anonymousSubmission} isOpen={true} onClose={onClose} />,
    );

    expect(screen.getByText('Anonymous')).toBeInTheDocument();
    expect(screen.getByText('custom_key')).toBeInTheDocument();
    expect(screen.getByText('Question')).toBeInTheDocument();

    const copyButton = screen.getByRole('button', { name: /Copy Answers/i });
    fireEvent.click(copyButton);

    await act(async () => {
      await Promise.resolve();
    });

    expect(writeTextMock).toHaveBeenCalled();
  });
});
