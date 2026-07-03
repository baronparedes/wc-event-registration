const LOCKED_TOOLTIP =
  'This field cannot be changed on published events. Archive and create a new event to change the registration form structure.';

/** Displays a lock icon with an explanatory tooltip on fields locked by event status. */
export function LockedFieldIndicator() {
  return (
    <span
      className="ml-1.5 inline-flex cursor-help items-center text-amber-500"
      title={LOCKED_TOOLTIP}
      aria-label={LOCKED_TOOLTIP}
      role="img"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 16 16"
        fill="currentColor"
        className="h-3.5 w-3.5"
        aria-hidden="true"
      >
        <path
          fillRule="evenodd"
          d="M8 1a3.5 3.5 0 0 0-3.5 3.5V7A1.5 1.5 0 0 0 3 8.5v5A1.5 1.5 0 0 0 4.5 15h7a1.5 1.5 0 0 0 1.5-1.5v-5A1.5 1.5 0 0 0 11 7V4.5A3.5 3.5 0 0 0 8 1Zm2 6V4.5a2 2 0 1 0-4 0V7h4Z"
          clipRule="evenodd"
        />
      </svg>
    </span>
  );
}
