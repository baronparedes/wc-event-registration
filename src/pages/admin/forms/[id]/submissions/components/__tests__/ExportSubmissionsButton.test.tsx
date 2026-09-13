import { fireEvent, render, screen } from '@testing-library/react';
import { toast } from 'sonner';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { FormSubmission } from '@/lib/domain/forms';

import { ExportSubmissionsButton } from '../ExportSubmissionsButton';

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

const mockSubmissions: FormSubmission[] = [
  {
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
      full_name: 'Jane, "Doe"',
      email: 'jane@example.com',
    },
    form_submission_answers: [
      {
        id: 'ans-1',
        submission_id: 'sub-1',
        form_field_id: 'field-1',
        answer_text: 'Morning, Shift\nSecond Line',
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
        answer_boolean: null,
        answer_date: '2026-05-01',
        answer_json: null,
        created_at: '2026-01-15T10:30:00Z',
        updated_at: '2026-01-15T10:30:00Z',
        form_fields: {
          field_key: 'start_date',
          label: 'Start Date',
          field_type: 'date',
        },
      },
      {
        id: 'ans-5',
        submission_id: 'sub-1',
        form_field_id: 'field-5',
        answer_text: null,
        answer_number: null,
        answer_boolean: null,
        answer_date: null,
        answer_json: ['Option A', 'Option B'],
        created_at: '2026-01-15T10:30:00Z',
        updated_at: '2026-01-15T10:30:00Z',
        form_fields: {
          field_key: 'multi_choice',
          label: 'Multi Choice',
          field_type: 'multi_select',
        },
      },
      {
        id: 'ans-empty',
        submission_id: 'sub-1',
        form_field_id: 'field-empty',
        answer_text: null,
        answer_number: null,
        answer_boolean: null,
        answer_date: null,
        answer_json: null,
        created_at: '2026-01-15T10:30:00Z',
        updated_at: '2026-01-15T10:30:00Z',
        form_fields: {
          field_key: 'empty_field',
          label: 'Empty Field',
          field_type: 'text',
        },
      },
      {
        id: 'ans-6',
        submission_id: 'sub-1',
        form_field_id: 'field-6',
        answer_text: null,
        answer_number: null,
        answer_boolean: null,
        answer_date: null,
        answer_json: { key: 'value' },
        created_at: '2026-01-15T10:30:00Z',
        updated_at: '2026-01-15T10:30:00Z',
        form_fields: {
          field_key: 'custom_json',
          label: 'Custom Json',
          field_type: 'multi_select_toggle',
        },
      },
    ],
  },
  {
    id: 'sub-2',
    form_id: 'form-123',
    source: 'guest',
    status: 'submitted',
    idempotency_key: null,
    user_id: null,
    submitted_at: '2026-01-16T14:00:00Z',
    created_at: '2026-01-16T14:00:00Z',
    updated_at: '2026-01-16T14:00:00Z',
    public_registrant_info: {
      first_name: 'John',
      last_name: 'Smith',
      email: 'john.smith@example.com',
      phone: '09123456789',
    },
    form_submission_answers: [
      {
        id: 'ans-7',
        submission_id: 'sub-2',
        form_field_id: 'field-3',
        answer_text: null,
        answer_number: null,
        answer_boolean: false,
        answer_date: null,
        answer_json: null,
        created_at: '2026-01-16T14:00:00Z',
        updated_at: '2026-01-16T14:00:00Z',
      },
    ],
  },
];

describe('ExportSubmissionsButton', () => {
  let clickSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    window.URL.createObjectURL = vi.fn(() => 'blob:mock-url');
    window.URL.revokeObjectURL = vi.fn();
    clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
  });

  it('renders disabled when disabled=true or no submissions', () => {
    const { rerender } = render(<ExportSubmissionsButton submissions={[]} formTitle="Test Form" />);
    expect(screen.getByRole('button', { name: /Export as CSV/i })).toBeDisabled();

    rerender(
      <ExportSubmissionsButton
        submissions={mockSubmissions}
        formTitle="Test Form"
        disabled={true}
      />,
    );
    expect(screen.getByRole('button', { name: /Export as CSV/i })).toBeDisabled();
  });

  it('triggers CSV generation and download on click', () => {
    render(
      <ExportSubmissionsButton
        submissions={mockSubmissions}
        formTitle="Volunteer Form!"
        formSlug="volunteer-form"
      />,
    );

    const button = screen.getByRole('button', { name: /Export as CSV/i });
    expect(button).not.toBeDisabled();

    fireEvent.click(button);

    expect(window.URL.createObjectURL).toHaveBeenCalled();
    expect(clickSpy).toHaveBeenCalled();
    expect(toast.success).toHaveBeenCalledWith('Submissions exported to CSV');
  });

  it('handles error gracefully when export fails', () => {
    window.URL.createObjectURL = vi.fn(() => {
      throw new Error('Blob creation failed');
    });

    render(<ExportSubmissionsButton submissions={mockSubmissions} formTitle="Volunteer Form" />);

    const button = screen.getByRole('button', { name: /Export as CSV/i });
    fireEvent.click(button);

    expect(toast.error).toHaveBeenCalledWith('Blob creation failed');
  });

  it('falls back to formTitle or default form filename when formSlug is omitted or empty', () => {
    const { rerender } = render(
      <ExportSubmissionsButton
        submissions={mockSubmissions}
        formSlug=""
        formTitle="Volunteer Title Only"
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /Export as CSV/i }));
    expect(toast.success).toHaveBeenCalledWith('Submissions exported to CSV');

    rerender(<ExportSubmissionsButton submissions={mockSubmissions} formSlug="" formTitle="" />);

    fireEvent.click(screen.getByRole('button', { name: /Export as CSV/i }));
    expect(toast.success).toHaveBeenCalledWith('Submissions exported to CSV');
  });

  it('handles non-Error thrown during export with default error message', () => {
    window.URL.createObjectURL = vi.fn(() => {
      throw 'string error';
    });

    render(<ExportSubmissionsButton submissions={mockSubmissions} />);

    fireEvent.click(screen.getByRole('button', { name: /Export as CSV/i }));
    expect(toast.error).toHaveBeenCalledWith('Failed to export submissions');
  });
});
