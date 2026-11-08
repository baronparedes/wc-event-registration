import { renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useFormErrorFocus } from '../useFormErrorFocus';

describe('useFormErrorFocus', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches: false }));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('locates and focuses element by name, smoothly scrolling and applying highlight', () => {
    const input = document.createElement('input');
    input.name = 'email';
    input.scrollIntoView = vi.fn();
    input.focus = vi.fn();
    document.body.appendChild(input);

    const { result } = renderHook(() => useFormErrorFocus());
    const focused = result.current.focusFirstError(['email']);

    expect(focused).toBe(true);
    expect(input.scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'center' });
    expect(input.focus).toHaveBeenCalledWith({ preventScroll: true });
    expect(input.classList.contains('ring-danger')).toBe(true);
  });

  it('locates element by field-id or data-field-key fallback for dynamic fields', () => {
    const container = document.createElement('div');
    container.setAttribute('data-field-key', 'doctrinal_q1');
    const radio = document.createElement('input');
    radio.type = 'radio';
    radio.focus = vi.fn();
    container.appendChild(radio);
    container.scrollIntoView = vi.fn();
    document.body.appendChild(container);

    const { result } = renderHook(() => useFormErrorFocus());
    const focused = result.current.focusFirstError(['doctrinal_q1']);

    expect(focused).toBe(true);
    expect(container.scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'center' });
    expect(radio.focus).toHaveBeenCalled();
    expect(container.classList.contains('ring-danger')).toBe(false);
    expect(radio.classList.contains('ring-danger')).toBe(false);
  });

  it('does not apply highlight ring when targeting a radio input directly', () => {
    const radio = document.createElement('input');
    radio.type = 'radio';
    radio.name = 'survey_q2';
    radio.focus = vi.fn();
    radio.scrollIntoView = vi.fn();
    document.body.appendChild(radio);

    const { result } = renderHook(() => useFormErrorFocus());
    const focused = result.current.focusFirstError(['survey_q2']);

    expect(focused).toBe(true);
    expect(radio.focus).toHaveBeenCalled();
    expect(radio.classList.contains('ring-danger')).toBe(false);
  });

  it('falls back to aria-invalid element when field key is not found', () => {
    const input = document.createElement('input');
    input.setAttribute('aria-invalid', 'true');
    input.scrollIntoView = vi.fn();
    input.focus = vi.fn();
    document.body.appendChild(input);

    const { result } = renderHook(() => useFormErrorFocus());
    const focused = result.current.focusFirstError(['nonexistent_key']);

    expect(focused).toBe(true);
    expect(input.scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'center' });
    expect(input.focus).toHaveBeenCalled();
  });

  it('respects prefers-reduced-motion', () => {
    vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches: true }));

    const input = document.createElement('input');
    input.id = 'first_name';
    input.scrollIntoView = vi.fn();
    document.body.appendChild(input);

    const { result } = renderHook(() => useFormErrorFocus());
    const focused = result.current.focusFirstError(['first_name']);

    expect(focused).toBe(true);
    expect(input.scrollIntoView).toHaveBeenCalledWith({ behavior: 'auto', block: 'center' });
  });

  it('returns false safely when no error element is found in document', () => {
    const { result } = renderHook(() => useFormErrorFocus());
    const focused = result.current.focusFirstError(['missing']);
    expect(focused).toBe(false);
  });
});
