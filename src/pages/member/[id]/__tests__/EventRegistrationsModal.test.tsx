import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { makeMemberEventHistoryItem } from '@/__tests__/factories';
import type { MemberEventGroup } from '@/pages/member/[id]/components/EventHistoryCard';
import {
  EventRegistrationsModal,
  type FormatDateTime,
  RegistrationDetail,
} from '@/pages/member/[id]/components/EventRegistrationsModal';

const formatDateTime: FormatDateTime = (value, fallback = '—') =>
  value === null ? fallback : `formatted:${value}`;

function makeGroup(registrations = [makeMemberEventHistoryItem()]): MemberEventGroup {
  return {
    event_id: 'event-1',
    event_title: 'Excuse Request 2026',
    event_slug: 'excuse-request-2026',
    starts_at: '2026-01-01T00:00:00.000Z',
    ends_at: '2026-12-31T23:59:00.000Z',
    location: 'CCF WC Main',
    registrations,
  };
}

describe('RegistrationDetail', () => {
  it('renders nothing when there is no check-in, slots, or answers', () => {
    const item = makeMemberEventHistoryItem({
      check_in_status: 'not_checked_in',
      attendance_enabled: false,
      official_check_in_time: null,
      registration_answers: [],
      attendance_answers: [],
      slot_records: [],
    });

    const { container } = render(
      <RegistrationDetail item={item} formatDateTime={formatDateTime} />,
    );

    expect(container.firstChild).toBeNull();
  });

  it('renders check-in badge and all detail sections when data exists', () => {
    const item = makeMemberEventHistoryItem({
      check_in_status: 'checked_in',
      attendance_enabled: true,
      official_check_in_time: '2026-08-12T01:30:00.000Z',
      registration_answers: [
        {
          event_field_id: 'field-1',
          field_type: 'text',
          field_key: 'reason',
          label: 'Reason',
          answer_text: 'Family event',
          answer_number: null,
        },
      ],
      slot_records: [{ slot: '9AM', recorded_at: '2026-08-12T01:35:00.000Z' }],
      attendance_answers: [
        {
          attendance_field_id: 'att-1',
          field_type: 'text',
          field_key: 'area',
          label: 'Area',
          answer_text: '2F',
          answer_number: null,
        },
      ],
    });

    render(<RegistrationDetail item={item} formatDateTime={formatDateTime} />);

    expect(screen.getByText('Checked In')).toBeInTheDocument();
    expect(screen.getByText('at formatted:2026-08-12T01:30:00.000Z')).toBeInTheDocument();
    expect(screen.getByText('Registration data:')).toBeInTheDocument();
    expect(screen.getByText('Timeslots:')).toBeInTheDocument();
    expect(screen.getByText('Attendance data:')).toBeInTheDocument();
    expect(screen.getByText('Family event')).toBeInTheDocument();
    expect(screen.getByText('9AM')).toBeInTheDocument();
    expect(screen.getByText('formatted:2026-08-12T01:35:00.000Z')).toBeInTheDocument();
    expect(screen.getByText('2F')).toBeInTheDocument();
  });
});

describe('EventRegistrationsModal', () => {
  it('does not render when group is null or when modal is closed', () => {
    const { rerender } = render(
      <EventRegistrationsModal
        group={null}
        isOpen={true}
        onClose={vi.fn()}
        formatDateTime={formatDateTime}
      />,
    );

    expect(screen.queryByText('Excuse Request 2026')).not.toBeInTheDocument();

    rerender(
      <EventRegistrationsModal
        group={makeGroup()}
        isOpen={false}
        onClose={vi.fn()}
        formatDateTime={formatDateTime}
      />,
    );

    expect(screen.queryByText('Excuse Request 2026')).not.toBeInTheDocument();
  });

  it('renders event header details and formats date range', () => {
    render(
      <EventRegistrationsModal
        group={makeGroup()}
        isOpen={true}
        onClose={vi.fn()}
        formatDateTime={formatDateTime}
      />,
    );

    expect(screen.getByRole('heading', { name: 'Excuse Request 2026' })).toBeInTheDocument();
    expect(
      screen.getByText('formatted:2026-01-01T00:00:00.000Z - formatted:2026-12-31T23:59:00.000Z'),
    ).toBeInTheDocument();
    expect(screen.getByText('CCF WC Main')).toBeInTheDocument();
  });

  it('sorts registrations by submitted_at descending before rendering', () => {
    const registrations = [
      makeMemberEventHistoryItem({
        registration_id: 'r-older',
        submitted_at: '2026-01-10T00:00:00.000Z',
        registration_answers: [
          {
            event_field_id: 'field-1',
            field_type: 'text',
            field_key: 'reason',
            label: 'Reason',
            answer_text: 'Older reason',
            answer_number: null,
          },
        ],
      }),
      makeMemberEventHistoryItem({
        registration_id: 'r-newest',
        submitted_at: '2026-08-10T00:00:00.000Z',
        registration_answers: [
          {
            event_field_id: 'field-2',
            field_type: 'text',
            field_key: 'reason',
            label: 'Reason',
            answer_text: 'Newest reason',
            answer_number: null,
          },
        ],
      }),
      makeMemberEventHistoryItem({
        registration_id: 'r-no-date',
        submitted_at: null,
        registration_answers: [
          {
            event_field_id: 'field-3',
            field_type: 'text',
            field_key: 'reason',
            label: 'Reason',
            answer_text: 'No date reason',
            answer_number: null,
          },
        ],
      }),
    ];

    render(
      <EventRegistrationsModal
        group={makeGroup(registrations)}
        isOpen={true}
        onClose={vi.fn()}
        formatDateTime={formatDateTime}
      />,
    );

    const renderedText = document.body.textContent ?? '';
    expect(renderedText.indexOf('Newest reason')).toBeLessThan(
      renderedText.indexOf('Older reason'),
    );
    expect(renderedText.indexOf('Older reason')).toBeLessThan(
      renderedText.indexOf('No date reason'),
    );
  });

  it('calls onClose for both top close icon and bottom close button', () => {
    const onClose = vi.fn();

    render(
      <EventRegistrationsModal
        group={makeGroup()}
        isOpen={true}
        onClose={onClose}
        formatDateTime={formatDateTime}
      />,
    );

    const closeButtons = screen.getAllByRole('button', { name: 'Close' });
    expect(closeButtons).toHaveLength(2);

    fireEvent.click(closeButtons[0]);
    fireEvent.click(closeButtons[1]);

    expect(onClose).toHaveBeenCalledTimes(2);
  });
});
