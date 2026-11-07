import { useCallback } from 'react';

export interface UseFormErrorFocusOptions {
  /** Optional root container ref or element to restrict querying within. Defaults to document. */
  container?: HTMLElement | null;
  /** Optional highlight duration in milliseconds. Defaults to 2000ms. */
  highlightDurationMs?: number;
}

function escapeSelector(value: string): string {
  if (typeof CSS !== 'undefined' && typeof CSS.escape === 'function') {
    return CSS.escape(value);
  }
  return value
    .replace(/\\/g, '\\\\')
    .replace(/([ #;?%&,.+*~':"!^$[\]()=>|/@])/g, '\\$1');
}

function isFocusable(element: HTMLElement): boolean {
  if (element.tabIndex < 0) return false;
  if ('disabled' in element && (element as HTMLInputElement).disabled) return false;
  const tagName = element.tagName.toLowerCase();
  return (
    tagName === 'input' ||
    tagName === 'select' ||
    tagName === 'textarea' ||
    tagName === 'button' ||
    element.hasAttribute('tabindex')
  );
}

function findFocusableElement(target: HTMLElement): HTMLElement {
  if (isFocusable(target)) return target;
  const focusable = target.querySelector<HTMLElement>(
    'input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), [tabindex]:not([tabindex="-1"])',
  );
  return focusable ?? target;
}

function shouldApplyHighlight(element: HTMLElement): boolean {
  if (element instanceof HTMLInputElement) {
    if (element.type === 'radio' || element.type === 'checkbox') {
      return false;
    }
  }
  if (element.querySelector('input[type="radio"], input[type="checkbox"]')) {
    return false;
  }
  return true;
}

export function useFormErrorFocus(options: UseFormErrorFocusOptions = {}) {
  const { container: defaultContainer, highlightDurationMs = 2000 } = options;

  const focusFirstError = useCallback(
    (fieldKeys?: (string | null | undefined)[], customContainer?: HTMLElement | null): boolean => {
      if (typeof document === 'undefined') return false;

      const root = customContainer ?? defaultContainer ?? document;
      let targetElement: HTMLElement | null = null;

      if (fieldKeys && fieldKeys.length > 0) {
        for (const rawKey of fieldKeys) {
          if (!rawKey) continue;
          const escaped = escapeSelector(rawKey);

          const kebabKey = rawKey.includes('_') ? rawKey.replace(/_/g, '-') : null;
          const escapedKebab = kebabKey ? escapeSelector(kebabKey) : null;

          const candidate =
            root.querySelector<HTMLElement>(`[name="${escaped}"]`) ??
            root.querySelector<HTMLElement>(`[id="${escaped}"]`) ??
            (escapedKebab ? root.querySelector<HTMLElement>(`[id="${escapedKebab}"]`) : null) ??
            root.querySelector<HTMLElement>(`[id="field-${escaped}"]`) ??
            root.querySelector<HTMLElement>(`[data-field-key="${escaped}"]`) ??
            root.querySelector<HTMLElement>(`[data-field-error="${escaped}"]`);

          if (candidate) {
            targetElement = candidate;
            break;
          }
        }
      }

      if (!targetElement) {
        targetElement =
          root.querySelector<HTMLElement>('[aria-invalid="true"]') ??
          root.querySelector<HTMLElement>('[data-field-error]');
      }

      if (!targetElement) return false;

      const prefersReducedMotion =
        typeof window !== 'undefined' &&
        typeof window.matchMedia === 'function' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      targetElement.scrollIntoView({
        behavior: prefersReducedMotion ? 'auto' : 'smooth',
        block: 'center',
      });

      const focusable = findFocusableElement(targetElement);
      try {
        focusable.focus({ preventScroll: true });
      } catch {
        focusable.focus();
      }

      if (shouldApplyHighlight(targetElement)) {
        const highlightClasses = ['ring-2', 'ring-danger', 'ring-offset-2', 'transition-all'];
        targetElement.classList.add(...highlightClasses);

        window.setTimeout(() => {
          targetElement?.classList.remove(...highlightClasses);
        }, highlightDurationMs);
      }

      return true;
    },
    [defaultContainer, highlightDurationMs],
  );

  return { focusFirstError };
}
