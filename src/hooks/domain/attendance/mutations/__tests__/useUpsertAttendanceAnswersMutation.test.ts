import { faker } from '@faker-js/faker';
import { act, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { renderHookWithClient } from '@/__tests__/unit-test-utils';
import { QUERY_KEYS } from '@/config/constants';

import { useUpsertAttendanceAnswersMutation } from '../useUpsertAttendanceAnswersMutation';

const { mockDeleteAttendanceAnswers, mockUpsertAttendanceAnswers } = vi.hoisted(() => ({
  mockDeleteAttendanceAnswers: vi.fn(),
  mockUpsertAttendanceAnswers: vi.fn(),
}));

vi.mock('@/lib/domain/attendance', async () => {
  const actual =
    await vi.importActual<typeof import('@/lib/domain/attendance')>('@/lib/domain/attendance');
  return {
    ...actual,
    deleteAttendanceAnswers: mockDeleteAttendanceAnswers,
    upsertAttendanceAnswers: mockUpsertAttendanceAnswers,
  };
});

describe('useUpsertAttendanceAnswersMutation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('filters empty answers and deletes them, upserts filled ones (registered)', async () => {
    const eventId = faker.string.uuid();
    const registrationId = faker.string.uuid();
    const filledFieldId = faker.string.uuid();
    const emptyFieldId = faker.string.uuid();

    mockDeleteAttendanceAnswers.mockResolvedValueOnce(undefined);
    mockUpsertAttendanceAnswers.mockResolvedValueOnce(undefined);

    const { result, queryClient } = renderHookWithClient(() =>
      useUpsertAttendanceAnswersMutation(),
    );
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    await act(async () => {
      await result.current.mutateAsync({
        event_id: eventId,
        attendee_kind: 'registered',
        registration_id: registrationId,
        answers: [
          { attendance_field_id: filledFieldId, answer_text: 'Filled text' },
          { attendance_field_id: emptyFieldId, answer_text: '  ' }, // empty
        ],
      });
    });

    expect(mockDeleteAttendanceAnswers).toHaveBeenCalledWith(
      'attendance_answers',
      'registration_id',
      registrationId,
      [emptyFieldId],
    );

    expect(mockUpsertAttendanceAnswers).toHaveBeenCalledWith(
      'attendance_answers',
      expect.arrayContaining([
        expect.objectContaining({
          attendance_field_id: filledFieldId,
          answer_text: 'Filled text',
          registration_id: registrationId,
        }),
      ]),
      'registration_id,attendance_field_id',
    );

    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: QUERY_KEYS.adminAttendanceAnswers(eventId),
      });
    });
  });

  it('filters empty answers and deletes them, upserts filled ones (public)', async () => {
    const eventId = faker.string.uuid();
    const publicRegId = faker.string.uuid();
    const filledFieldId = faker.string.uuid();

    mockDeleteAttendanceAnswers.mockResolvedValueOnce(undefined);
    mockUpsertAttendanceAnswers.mockResolvedValueOnce(undefined);

    const { result } = renderHookWithClient(() => useUpsertAttendanceAnswersMutation());

    await act(async () => {
      await result.current.mutateAsync({
        event_id: eventId,
        attendee_kind: 'public',
        public_registration_id: publicRegId,
        answers: [{ attendance_field_id: filledFieldId, answer_number: 42 }],
      });
    });

    expect(mockDeleteAttendanceAnswers).not.toHaveBeenCalled();

    expect(mockUpsertAttendanceAnswers).toHaveBeenCalledWith(
      'public_attendance_answers',
      expect.arrayContaining([
        expect.objectContaining({
          attendance_field_id: filledFieldId,
          answer_number: 42,
          public_registration_id: publicRegId,
        }),
      ]),
      'public_registration_id,attendance_field_id',
    );
  });
});
