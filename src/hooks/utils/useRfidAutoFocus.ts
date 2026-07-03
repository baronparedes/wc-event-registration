import { type RefObject, useCallback, useEffect, useRef } from 'react';

import { TIMING } from '@/config/constants';

/**
 * Maintains focus on a member ID input for RFID kiosk scanning.
 *
 * When `isActive` is true the hook:
 * 1. Focuses the input immediately (and on every re-activation).
 * 2. Listens for `blur` on the input and restores focus after a short delay so
 *    that legitimate button clicks (form submit) are still handled first.
 * 3. Listens for `keydown` on `document` and redirects printable keystrokes to
 *    the input if they land outside of it — covering edge cases where the RFID
 *    reader fires before the browser restores focus.
 */
export function useRfidAutoFocus(inputRef: RefObject<HTMLInputElement | null>, isActive: boolean) {
  const focusMemberIdInput = useCallback(() => {
    const focusAndSelectInput = () => {
      const input = inputRef.current;
      if (!input) {
        return;
      }

      input.focus();
      input.select();
      input.setSelectionRange(0, input.value.length);
    };

    requestAnimationFrame(() => {
      focusAndSelectInput();
    });

    setTimeout(() => {
      focusAndSelectInput();
    }, TIMING.rfidFocusRestoreDelayMs);
  }, [inputRef]);

  // Keep a stable ref so blur/keydown closures never go stale.
  const isActiveRef = useRef(isActive);
  useEffect(() => {
    isActiveRef.current = isActive;
  }, [isActive]);

  useEffect(() => {
    const input = inputRef.current;
    if (!input) {
      return;
    }

    const handleFocus = () => {
      input.select();
      input.setSelectionRange(0, input.value.length);

      requestAnimationFrame(() => {
        input.select();
        input.setSelectionRange(0, input.value.length);
      });
    };

    input.addEventListener('focus', handleFocus);

    return () => {
      input.removeEventListener('focus', handleFocus);
    };
  }, [inputRef]);

  useEffect(() => {
    if (!isActive) return;

    // Focus immediately when the step becomes active (e.g. after reset or page
    // load with cached data). The rAF covers the normal case; the 200 ms timer
    // is a fallback for browsers that restore their own focus after page refresh
    // and can fire after a single animation frame.
    requestAnimationFrame(() => {
      focusMemberIdInput();
    });
    const focusFallback = setTimeout(() => {
      focusMemberIdInput();
    }, TIMING.rfidFocusFallbackDelayMs);

    const input = inputRef.current;
    if (!input) {
      return () => clearTimeout(focusFallback);
    }

    // ── blur restore ─────────────────────────────────────────────────────────
    // When focus leaves the input, restore it unless it moved to a button/link
    // (e.g. the Submit button) — that way form submissions still fire correctly.
    const handleBlur = (e: FocusEvent) => {
      const next = e.relatedTarget;
      if (
        next instanceof HTMLButtonElement ||
        next instanceof HTMLAnchorElement ||
        next instanceof HTMLInputElement ||
        next instanceof HTMLSelectElement ||
        next instanceof HTMLTextAreaElement
      ) {
        return;
      }

      setTimeout(() => {
        if (isActiveRef.current) {
          focusMemberIdInput();
        }
      }, TIMING.rfidBlurRefocusDelayMs);
    };

    input.addEventListener('blur', handleBlur);

    // ── global keydown capture ───────────────────────────────────────────────
    // If the RFID reader fires while focus is on an unrelated element (e.g. the
    // page body or a non-input element), capture the keystroke and route it to
    // the member ID input so the scan still registers.
    const handleDocumentKeydown = (e: KeyboardEvent) => {
      if (!isActiveRef.current) return;

      // Already in the right input — nothing to do.
      if (document.activeElement === inputRef.current) return;

      // Only intercept printable characters and Backspace; ignore modifier-only
      // and special keys so we don't break browser shortcuts.
      const isTextKey =
        e.key.length === 1 || // single printable character
        e.key === 'Backspace' ||
        e.key === 'Delete';

      if (!isTextKey) return;

      // Don't intercept if focus is inside another form control.
      const tag = (document.activeElement as HTMLElement | null)?.tagName;
      if (tag && ['INPUT', 'TEXTAREA', 'SELECT'].includes(tag)) return;

      focusMemberIdInput();
      // The browser will deliver the keystroke to the now-focused input naturally.
    };

    document.addEventListener('keydown', handleDocumentKeydown);

    return () => {
      clearTimeout(focusFallback);
      input.removeEventListener('blur', handleBlur);
      document.removeEventListener('keydown', handleDocumentKeydown);
    };
  }, [focusMemberIdInput, isActive, inputRef]);

  return focusMemberIdInput;
}
