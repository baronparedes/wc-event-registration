import type { ReactNode } from 'react';

import { useKioskInactivityReset, useStepCountdown } from '@/hooks/utils';

import { SectionCard } from './SectionCard';

const NOOP = () => {};

export type WizardStepProps = {
  title: string;
  subtitle?: ReactNode;
  children: ReactNode;
  /**
   * Inactivity timer — resets on any user interaction (keydown/click/input).
   * Use for long idle timeouts where activity should extend the session.
   * Requires onInactivityTimeout to be set.
   */
  inactivityTimeoutMs?: number;
  /** Called when the inactivity timer expires. */
  onInactivityTimeout?: () => void;
  /** Controls whether the inactivity timer is running. Defaults to true. */
  isInactivityTimerActive?: boolean;
  /**
   * Message shown while the inactivity timer counts down.
   * Receives secondsRemaining. Defaults to "Resetting in {n}s."
   */
  inactivityTimerMessage?: (secondsRemaining: number) => string;
  /**
   * Countdown timer — fixed deadline that counts down regardless of user activity.
   * Use for "you have N seconds to confirm or we go back" step transitions.
   * Requires onCountdownTimeout to be set.
   */
  countdownMs?: number;
  /** Called when the countdown timer expires. */
  onCountdownTimeout?: () => void;
  /** Controls whether the countdown timer is running. Defaults to true. */
  isCountdownActive?: boolean;
  /**
   * Message shown while the countdown timer counts down.
   * Receives secondsRemaining. Defaults to "Resetting in {n}s."
   */
  countdownTimerMessage?: (secondsRemaining: number) => string;
};

/**
 * WizardStep — shared step card for multi-step wizard flows.
 *
 * Provides consistent styling, a title, optional subtitle, step content via
 * children, and optional built-in timers that notify the parent when they expire.
 *
 * Both timers are independent and optional:
 * - Inactivity timer: resets on user activity — use for long idle timeouts.
 * - Countdown timer: fixed deadline regardless of activity — use for step confirm windows.
 *
 * Usage:
 * ```tsx
 * <WizardStep
 *   title="Step 2: Confirm Your Details"
 *   subtitle="Please review your information before continuing."
 *   countdownMs={15_000}
 *   onCountdownTimeout={handleResetToStepOne}
 *   isCountdownActive={activeStep === 2}
 *   countdownTimerMessage={(s) => `Returning to Step 1 in ${s}s.`}
 *   inactivityTimeoutMs={180_000}
 *   onInactivityTimeout={handleFullReset}
 *   isInactivityTimerActive={activeStep === 2}
 *   inactivityTimerMessage={(s) => `Session expiring in ${s}s.`}
 * >
 *   <ProfileDetails member={member} />
 * </WizardStep>
 * ```
 */
export function WizardStep(props: WizardStepProps) {
  const {
    title,
    subtitle,
    children,
    inactivityTimeoutMs,
    onInactivityTimeout,
    isInactivityTimerActive = true,
    inactivityTimerMessage,
    countdownMs,
    onCountdownTimeout,
    isCountdownActive = true,
    countdownTimerMessage,
  } = props;

  const hasInactivityTimer = Boolean(inactivityTimeoutMs && onInactivityTimeout);
  const hasCountdown = Boolean(countdownMs && onCountdownTimeout);

  const { secondsRemaining: inactivitySeconds } = useKioskInactivityReset(
    onInactivityTimeout ?? NOOP,
    inactivityTimeoutMs ?? 0,
    hasInactivityTimer && isInactivityTimerActive,
  );

  const { secondsRemaining: countdownSeconds } = useStepCountdown(
    onCountdownTimeout ?? NOOP,
    countdownMs ?? 0,
    hasCountdown && isCountdownActive,
  );

  const resolvedInactivityMessage =
    inactivityTimerMessage ?? ((s: number) => `Resetting in ${s}s.`);
  const resolvedCountdownMessage = countdownTimerMessage ?? ((s: number) => `Resetting in ${s}s.`);

  return (
    <SectionCard
      title={title}
      subtitle={subtitle}
      wrapperClassName="wizard-step step-card rounded-2xl border border-border bg-surface p-6 shadow-sm"
      titleClassName="step-card__title font-heading text-2xl font-semibold text-text"
      subtitleClassName="step-card__subtitle mt-3 text-base text-muted"
      contentClassName="step-card__content mt-3"
    >
      {children}
      {hasCountdown && countdownSeconds !== null && (
        <p aria-live="polite" className="mt-4 text-sm text-muted">
          {resolvedCountdownMessage(countdownSeconds)}
        </p>
      )}
      {hasInactivityTimer && inactivitySeconds !== null && (
        <p aria-live="polite" className="mt-2 text-sm text-muted">
          {resolvedInactivityMessage(inactivitySeconds)}
        </p>
      )}
    </SectionCard>
  );
}
