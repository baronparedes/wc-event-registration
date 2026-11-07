import { CheckCircle2 } from 'lucide-react';

export function CompletedStepCard({ stepNumber }: { stepNumber: number }) {
  return (
    <div className="flex items-center gap-2.5 rounded-xl border border-primary/20 bg-primary/5 p-3 text-xs text-muted">
      <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
      <div className="min-w-0">
        <span className="font-semibold text-text">Step {stepNumber} is Completed</span>
        <p className="text-[11px] text-muted">
          This stage was already completed. Operations are locked for completed stages to maintain
          pipeline integrity.
        </p>
      </div>
    </div>
  );
}
