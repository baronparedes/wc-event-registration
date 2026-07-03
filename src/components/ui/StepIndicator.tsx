import { cx } from 'class-variance-authority';

export interface StepIndicatorProps {
  /** Current active step (1-indexed) */
  currentStep: number;
  /** Total number of steps */
  totalSteps: number;
  /** Optional labels for each step */
  labels?: string[];
}

/**
 * Visual step indicator with numbered badges, connecting lines, and color coding.
 * Reused by both member and public registration wizards.
 */
export function StepIndicator({ currentStep, totalSteps, labels }: StepIndicatorProps) {
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
    <div className="rounded-xl border border-border bg-surface px-5 py-4 shadow-xs">
      <p className="text-sm font-semibold uppercase tracking-wide text-muted">
        {labels ? 'Registration steps' : `Step ${currentStep} of ${totalSteps}`}
      </p>
      <div className="mt-3 flex items-center gap-3 text-base">
        {elements.map((element, i) => {
          if (element.type === 'line') {
            return <div key={`line-${i}`} className="h-px flex-1 bg-border" aria-hidden="true" />;
          }

          const stepNumber = element.stepNumber!;
          const index = element.index!;

          return (
            <div key={`step-${stepNumber}`} className="flex items-center gap-2">
              <span
                className={cx(
                  'inline-flex h-8 w-8 items-center justify-center rounded-full text-base font-semibold transition-colors',
                  getBadgeClassName(stepNumber),
                )}
              >
                {stepNumber}
              </span>
              {labels && (
                <span
                  className={cx(
                    'text-sm font-medium',
                    currentStep === stepNumber ? 'text-primary' : 'text-text',
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
