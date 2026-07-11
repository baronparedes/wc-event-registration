import type { RefObject } from 'react';

import { renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { useWizardStepScroll } from '../useWizardStepScroll';

describe('useWizardStepScroll', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('scrolls active step into view with smooth behavior by default', () => {
    vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches: false }));

    const scrollIntoView = vi.fn();
    const stepRef = { current: { scrollIntoView } } as unknown as RefObject<HTMLDivElement>;

    renderHook(() => useWizardStepScroll(1, [stepRef]));

    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'start' });
  });

  it('uses auto behavior for reduced motion and skips missing refs safely', () => {
    vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches: true }));

    const scrollIntoView = vi.fn();
    const stepRef = { current: { scrollIntoView } } as unknown as RefObject<HTMLDivElement>;

    renderHook(() => useWizardStepScroll(2, [stepRef]));
    expect(scrollIntoView).not.toHaveBeenCalled();

    renderHook(() => useWizardStepScroll(1, [stepRef]));
    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: 'auto', block: 'start' });
  });
});
