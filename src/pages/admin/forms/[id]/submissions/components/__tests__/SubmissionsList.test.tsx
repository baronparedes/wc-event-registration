import { faker } from '@faker-js/faker';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { FormSubmission } from '@/lib/domain/forms';

import { SubmissionsList } from '../SubmissionsList';

const memberFullName = faker.person.fullName();
const guestFirstName = faker.person.firstName();
const guestLastName = faker.person.lastName();

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
      full_name: memberFullName,
      email: faker.internet.exampleEmail(),
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
      first_name: guestFirstName,
      last_name: guestLastName,
      email: faker.internet.exampleEmail(),
      phone: '09123456789',
    },
    form_submission_answers: [],
  },
  {
    id: 'sub-3',
    form_id: 'form-123',
    source: 'member',
    status: 'submitted',
    idempotency_key: null,
    user_id: 'user-3',
    public_registrant_info: null,
    submitted_at: '2026-01-17T10:00:00Z',
    created_at: '2026-01-17T10:00:00Z',
    updated_at: '2026-01-17T10:00:00Z',
    users: {
      member_id: '',
      full_name: 'Test Member Email Only',
      email: 'member.email@example.com',
    },
    form_submission_answers: [],
  },
  {
    id: 'sub-4',
    form_id: 'form-123',
    source: 'member',
    status: 'submitted',
    idempotency_key: null,
    user_id: 'user-4',
    public_registrant_info: null,
    submitted_at: '2026-01-17T11:00:00Z',
    created_at: '2026-01-17T11:00:00Z',
    updated_at: '2026-01-17T11:00:00Z',
    users: {
      member_id: '',
      full_name: 'Test Member No Identifier',
      email: null,
    },
    form_submission_answers: [],
  },
  {
    id: 'sub-5',
    form_id: 'form-123',
    source: 'guest',
    status: 'submitted',
    idempotency_key: null,
    user_id: null,
    submitted_at: '2026-01-17T12:00:00Z',
    created_at: '2026-01-17T12:00:00Z',
    updated_at: '2026-01-17T12:00:00Z',
    public_registrant_info: {
      first_name: 'Test Guest',
      last_name: 'Test Phone Only',
      email: undefined,
      phone: '09998887777',
    },
    form_submission_answers: [],
  },
  {
    id: 'sub-6',
    form_id: 'form-123',
    source: 'guest',
    status: 'submitted',
    idempotency_key: null,
    user_id: null,
    submitted_at: '2026-01-17T13:00:00Z',
    created_at: '2026-01-17T13:00:00Z',
    updated_at: '2026-01-17T13:00:00Z',
    public_registrant_info: null,
    form_submission_answers: [],
  },
];

describe('SubmissionsList', () => {
  const onSelectSubmission = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state when isLoading is true', () => {
    render(
      <SubmissionsList submissions={[]} isLoading={true} onSelectSubmission={onSelectSubmission} />,
    );
    expect(screen.getByText('Loading submissions...')).toBeInTheDocument();
  });

  it('renders empty state when no submissions are present', () => {
    const { rerender } = render(
      <SubmissionsList
        submissions={[]}
        isLoading={false}
        onSelectSubmission={onSelectSubmission}
      />,
    );
    expect(screen.getByText('No submissions yet')).toBeInTheDocument();
    expect(
      screen.getByText('Submissions will appear here once members or guests submit this form'),
    ).toBeInTheDocument();

    rerender(
      <SubmissionsList
        submissions={[]}
        isLoading={false}
        searchTerm="non-matching"
        onSelectSubmission={onSelectSubmission}
      />,
    );
    expect(screen.getByText('No matches found')).toBeInTheDocument();
    expect(
      screen.getByText('Try adjusting your search query or source filter'),
    ).toBeInTheDocument();
  });

  it('renders desktop and mobile submissions and handles clicks', () => {
    render(
      <SubmissionsList
        submissions={mockSubmissions}
        isLoading={false}
        onSelectSubmission={onSelectSubmission}
      />,
    );

    // Desktop & mobile elements
    expect(screen.getAllByText(memberFullName).length).toBeGreaterThan(0);
    expect(screen.getAllByText(`${guestFirstName} ${guestLastName}`).length).toBeGreaterThan(0);

    // Click desktop row
    const desktopRows = screen.getAllByText(memberFullName);
    fireEvent.click(desktopRows[0]);
    expect(onSelectSubmission).toHaveBeenCalledWith(mockSubmissions[0]);

    // Click all View Answers buttons (desktop & mobile)
    const viewButtons = screen.getAllByRole('button', { name: /View Answers/i });
    expect(viewButtons.length).toBeGreaterThanOrEqual(2);
    viewButtons.forEach((btn) => {
      fireEvent.click(btn);
    });
    expect(onSelectSubmission).toHaveBeenCalled();

    // Click on mobile card container
    const mobileCards = screen.getAllByText('Test Member Email Only');
    const mobileCardContainer = mobileCards[mobileCards.length - 1].closest('.cursor-pointer');
    expect(mobileCardContainer).not.toBeNull();
    fireEvent.click(mobileCardContainer!);
    expect(onSelectSubmission).toHaveBeenCalledWith(mockSubmissions[2]);
  });
});
