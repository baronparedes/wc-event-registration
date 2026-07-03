import { useEffect, useRef, useState } from 'react';

import { TIMING } from '@/config/constants';

type MemberLookupErrorAlertProps = {
  message: string | null;
  suppress?: boolean;
  onDismiss?: () => void;
};

export function MemberLookupErrorAlert({
  message,
  suppress = false,
  onDismiss,
}: MemberLookupErrorAlertProps) {
  const alertRef = useRef<HTMLDivElement | null>(null);
  const [shouldFade, setShouldFade] = useState(false);
  const [errorCountdown, setErrorCountdown] = useState(0);

  // Auto-scroll into view when message appears
  useEffect(() => {
    if (!message || suppress) {
      return;
    }

    const behavior = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      ? 'auto'
      : 'smooth';

    alertRef.current?.scrollIntoView({
      behavior,
      block: 'center',
    });
  }, [message, suppress]);

  // Countdown timer with auto-dismiss
  useEffect(() => {
    if (!message || suppress || shouldFade) {
      return;
    }

    let remaining = TIMING.errorClearDelayMs / 1000;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setErrorCountdown(remaining);

    const interval = setInterval(() => {
      remaining -= 1;
      setErrorCountdown(remaining);

      if (remaining <= 0) {
        clearInterval(interval);
        setShouldFade(true);
        onDismiss?.();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [message, suppress, shouldFade, onDismiss]);

  if (!message || suppress) {
    return null;
  }

  const handleDismiss = () => {
    setShouldFade(true);
    onDismiss?.();
  };

  return (
    <div
      ref={alertRef}
      className={`overflow-hidden transition-all duration-500 ${
        shouldFade
          ? 'mt-0 max-h-0 opacity-0 -translate-y-1'
          : 'mt-4 max-h-40 opacity-100 translate-y-0'
      }`}
    >
      <div
        role="alert"
        aria-live="polite"
        className="flex items-start gap-3 rounded-lg border-2 border-orange-700 bg-orange-200 px-4 py-3 text-orange-950 shadow-sm"
      >
        <span
          aria-hidden="true"
          className="mt-0.5 inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-orange-700 text-sm font-bold text-white ring-1 ring-orange-900/30"
        >
          !
        </span>
        <div className="flex w-full items-start justify-between gap-3">
          <div className="space-y-1">
            <p className="registration-alert-title text-sm font-semibold text-orange-950">
              Please check your entry
            </p>
            <p className="registration-alert-message text-sm text-orange-900">{message}</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {errorCountdown > 0 && (
              <span className="text-xs font-medium text-orange-700" aria-live="polite">
                ({errorCountdown}s)
              </span>
            )}
            <button
              type="button"
              onClick={handleDismiss}
              className="rounded-md border border-orange-700/40 px-2 py-1 text-xs font-medium text-orange-950 transition hover:bg-orange-300/60 focus:outline-none focus:ring-2 focus:ring-orange-700/60"
              aria-label="Dismiss member lookup warning"
            >
              Dismiss
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
