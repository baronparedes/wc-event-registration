import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { CreateEventInput } from '@/lib/domain/events';

import { useSaveConfirmation } from '../useSaveConfirmation';

function buildEventInput(): CreateEventInput {
  return {
    title: 'Summer Camp 2026',
    slug: 'summer-camp-2026',
    description: 'Description',
    location: 'Main Hall',
    starts_at: '2026-08-01T10:00',
    ends_at: '2026-08-01T18:00',
    registration_opens_at: '2026-07-01T10:00',
    registration_closes_at: '2026-07-31T18:00',
    status: 'draft',
    duplicate_policy: 'block',
    registration_mode: 'open',
  };
}

describe('useSaveConfirmation', () => {
  it('starts closed with no pending form data', () => {
    const { result } = renderHook(() => useSaveConfirmation());

    expect(result.current.showDialog).toBe(false);
    expect(result.current.pendingFormData).toBeNull();
  });

  it('stores pending form data and opens the dialog when confirmation is requested', () => {
    const { result } = renderHook(() => useSaveConfirmation());
    const payload = buildEventInput();

    act(() => {
      result.current.requestConfirmation(payload);
    });

    expect(result.current.showDialog).toBe(true);
    expect(result.current.pendingFormData).toEqual(payload);
  });

  it('closes dialog on confirm and keeps pending data for caller to consume', () => {
    const { result } = renderHook(() => useSaveConfirmation());
    const payload = buildEventInput();

    act(() => {
      result.current.requestConfirmation(payload);
    });

    act(() => {
      result.current.confirmSave();
    });

    expect(result.current.showDialog).toBe(false);
    expect(result.current.pendingFormData).toEqual(payload);
  });

  it('closes dialog and clears pending data on cancel', () => {
    const { result } = renderHook(() => useSaveConfirmation());

    act(() => {
      result.current.requestConfirmation(buildEventInput());
    });

    act(() => {
      result.current.cancelSave();
    });

    expect(result.current.showDialog).toBe(false);
    expect(result.current.pendingFormData).toBeNull();
  });
});
