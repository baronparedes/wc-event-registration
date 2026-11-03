import { cx } from 'class-variance-authority';

export interface StepIndicatorProps {
  /** Current active step (1-indexed) */
  currentStep: number;
  /** Total number of steps */
  totalSteps: number;
  /** Optional labels for each step */
  labels?: string[];
  /** Optional category label shown at the top of the indicator (defaults to 'Registration steps') */
  categoryLabel?: string;
}

/**
 * Visual step indicator with numbered badges, connecting lines, and color coding.
 * Reused by both member and public registration wizards.
 */
export function StepIndicator({
  currentStep,
  totalSteps,
  labels,
  categoryLabel,
}: StepIndicatorProps) {
  const steps = Array.from({ length: totalSteps }, (_, i) => i + 1);

  const getBadgeClassName = (stepNumber: number): string => {
    if (currentStep === stepNumber) {
      // Current step: primary blue
      return 'bg-primary text-white';
    }

    if (currentStep > stepNumber) {
      // Completed step: secondary teal
      return 'bg-secondary text-white';
    }

    // Future step: outline
    return 'bg-surface text-muted border border-border';
  };

  // Flatten steps and lines into a single array for rendering
  const elements: Array<{ type: 'step' | 'line'; stepNumber?: number; index?: number }> = [];
  steps.forEach((stepNumber, index) => {
    elements.push({ type: 'step', stepNumber, index });
    if (index < steps.length - 1) {
      elements.push({ type: 'line' });
    }
  });

  return (
    <div className="rounded-xl border border-border bg-surface px-4 py-3 shadow-xs">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted">
        {categoryLabel ?? (labels ? 'Registration steps' : `Step ${currentStep} of ${totalSteps}`)}
      </p>
      <div className="mt-2 flex min-w-0 items-start gap-1 text-sm sm:items-center sm:gap-2">
        {elements.map((element, i) => {
          if (element.type === 'line') {
            return (
              <div
                key={`line-${i}`}
                className="mt-3.5 h-px min-w-0 flex-1 bg-border sm:mt-0"
                aria-hidden="true"
              />
            );
          }

          const stepNumber = element.stepNumber!;
          const index = element.index!;

          return (
            <div
              key={`step-${stepNumber}`}
              className="flex min-w-0 flex-1 flex-col items-center gap-1 sm:flex-none sm:flex-row sm:gap-1.5"
            >
              <span
                className={cx(
                  'inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-semibold transition-colors',
                  getBadgeClassName(stepNumber),
                )}
              >
                {stepNumber}
              </span>
              {labels && (
                <span
                  className={cx(
                    'max-w-full break-words text-center text-[10px] font-medium leading-tight sm:text-left sm:text-xs',
                    currentStep === stepNumber ? 'text-primary' : 'hidden text-text sm:inline',
                  )}
                >
                  {labels[index]}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
