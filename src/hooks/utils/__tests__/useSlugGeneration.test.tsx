import { renderHook } from '@testing-library/react';
import type { UseFormSetValue, UseFormWatch } from 'react-hook-form';
import { describe, expect, it, vi } from 'vitest';

import type { CreateEventInput } from '@/lib/domain/events';

import { useSlugGeneration } from '../useSlugGeneration';

describe('useSlugGeneration', () => {
  it('auto-generates slug in create mode and stops after manual edits', () => {
    const values: CreateEventInput = {
      title: 'My New Event',
      slug: '',
      description: '',
      location: '',
      starts_at: '2026-08-01T10:00',
      ends_at: '2026-08-01T18:00',
      registration_opens_at: '2026-07-01T10:00',
      registration_closes_at: '2026-07-31T18:00',
      status: 'draft',
      duplicate_policy: 'block',
      registration_mode: 'open',
      public_registration_access: 'members',
    };

    const watch = ((key: keyof CreateEventInput) => values[key]) as UseFormWatch<CreateEventInput>;
    const setValue = vi.fn((key: keyof CreateEventInput, value: unknown) => {
      if (key === 'slug') {
        values.slug = String(value);
      }
    }) as unknown as UseFormSetValue<CreateEventInput>;
    const onManualEdit = vi.fn();

    const { result, rerender } = renderHook(
      ({ isEditMode }) => useSlugGeneration(isEditMode, watch, setValue, onManualEdit),
      { initialProps: { isEditMode: false } },
    );

    expect(setValue).toHaveBeenCalledWith('slug', 'my-new-event', { shouldValidate: false });

    result.current.onSlugChange('custom-slug');

    expect(setValue).toHaveBeenCalledWith('slug', 'custom-slug', { shouldValidate: true });
    expect(onManualEdit).toHaveBeenCalledTimes(1);

    values.title = 'Updated Event Title';
    rerender({ isEditMode: false });

    expect(setValue).not.toHaveBeenCalledWith('slug', 'updated-event-title', {
      shouldValidate: false,
    });
  });

  it('does not auto-generate slug in edit mode', () => {
    const values: CreateEventInput = {
      title: 'Existing Event',
      slug: 'existing-event',
      description: '',
      location: '',
      starts_at: '2026-08-01T10:00',
      ends_at: '2026-08-01T18:00',
      registration_opens_at: '2026-07-01T10:00',
      registration_closes_at: '2026-07-31T18:00',
      status: 'published',
      duplicate_policy: 'block',
      registration_mode: 'open',
      public_registration_access: 'members_and_public',
    };

    const watch = ((key: keyof CreateEventInput) => values[key]) as UseFormWatch<CreateEventInput>;
    const setValue = vi.fn() as unknown as UseFormSetValue<CreateEventInput>;

    renderHook(() => useSlugGeneration(true, watch, setValue));

    expect(setValue).not.toHaveBeenCalled();
  });
});
