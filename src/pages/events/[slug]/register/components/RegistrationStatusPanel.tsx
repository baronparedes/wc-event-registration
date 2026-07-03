import type { RefObject } from 'react';

type RegistrationStatusPanelProps = {
  isRegistrationBlocked: boolean;
  isUpdateMode: boolean;
  registrationStatusRef: RefObject<HTMLDivElement | null>;
};

export function RegistrationStatusPanel(props: RegistrationStatusPanelProps) {
  const { isRegistrationBlocked, isUpdateMode, registrationStatusRef } = props;

  const panelVariant = isRegistrationBlocked ? 'blocked' : isUpdateMode ? 'update' : 'new';

  const panelClassNameByVariant = {
    blocked: 'border-green-600 bg-green-100 text-green-950',
    update: 'border-green-600 bg-green-100 text-green-950',
    new: 'border-blue-600 bg-blue-100 text-green-950',
  } as const;

  const iconClassNameByVariant = {
    blocked: 'bg-green-700 text-white ring-green-800/30',
    update: 'bg-green-700 text-white ring-green-800/30',
    new: 'bg-primary text-white ring-primary/30',
  } as const;

  const titleByVariant = {
    blocked: 'You are already registered. No further actions are needed at the moment.',
    update: 'Review your details below.',
    new: 'Review your details below.',
  } as const;

  const messageByVariant = {
    blocked: 'Your registration is already complete for this event.',
    update: 'Tap "Yes, I confirm" to continue to Step 3 and update your registration.',
    new: 'Tap "Yes, I confirm" to continue to Step 3.',
  } as const;

  const messageClassNameByVariant = {
    blocked: 'text-green-900',
    update: 'text-green-900',
    new: 'text-text',
  } as const;

  return (
    <div
      ref={registrationStatusRef}
      aria-live="polite"
      className={`mt-2 flex items-start gap-3 rounded-lg border-2 px-4 py-3 shadow-md ${panelClassNameByVariant[panelVariant]}`}
    >
      <span
        aria-hidden="true"
        className={`mt-0.5 inline-flex h-6 min-w-6 items-center justify-center rounded-full text-sm font-bold ring-1 ${iconClassNameByVariant[panelVariant]}`}
      >
        !
      </span>
      <div className="space-y-1">
        <p className="registration-status-title text-base font-semibold leading-6">
          {titleByVariant[panelVariant]}
        </p>
        <p
          className={`registration-status-message text-sm font-medium ${messageClassNameByVariant[panelVariant]}`}
        >
          {messageByVariant[panelVariant]}
        </p>
      </div>
    </div>
  );
}
