import { useEffect, useState } from 'react';

import { TIMING } from '@/config/constants';

/**
 * Hook for managing error alert auto-dismiss behavior with countdown.
 * Resets fade state when a new message arrives and provides countdown timer.
 *
 * @param message - The error message to display (null hides the alert)
 * @param suppress - Whether to suppress the alert display
 * @param onDismiss - Callback when auto-dismiss completes
 * @returns Object with shouldFade and errorCountdown state
 */
export function useErrorAutoDismiss(
  message: string | null,
  suppress: boolean = false,
  onDismiss?: () => void,
) {
  const [shouldFade, setShouldFade] = useState(false);
  const [errorCountdown, setErrorCountdown] = useState(0);

  // Reset fade state when a new message arrives
  useEffect(() => {
    if (message && !suppress) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setShouldFade(false);
      setErrorCountdown(0);
    }
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

  return { shouldFade, errorCountdown };
}
