import { Lock } from 'lucide-react';

import { Button } from '@/components/ui';
import { RECRUITMENT_STEPS } from '@/lib/domain/recruitment';

export function LockedStepCard({
  stepNumber,
  currentStep,
  onJump,
}: {
  stepNumber: number;
  currentStep: number;
  onJump: () => void;
}) {
  const currentStepLabel =
    RECRUITMENT_STEPS.find((s) => s.stepNumber === currentStep)?.shortLabel ??
    `Step ${currentStep}`;

  return (
    <div className="rounded-xl border border-dashed border-border bg-surface p-6 text-center space-y-2.5">
      <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-muted/15 text-muted mx-auto">
        <Lock className="h-5 w-5" />
      </div>
      <div>
        <h4 className="font-heading text-xs font-bold text-text">Step {stepNumber} is Locked</h4>
        <p className="mt-1 text-xs text-muted max-w-sm mx-auto">
          You cannot schedule sessions or advance this stage until the candidate completes{' '}
          <strong className="text-text">
            Step {currentStep} ({currentStepLabel})
          </strong>
          .
        </p>
      </div>
      <div className="pt-1">
        <Button type="button" size="xs" variant="default" onClick={onJump}>
          Go to Active Step ({currentStep})
        </Button>
      </div>
    </div>
  );
}
