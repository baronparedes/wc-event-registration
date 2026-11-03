import { Badge } from '@/components/ui';

import { ENDORSEMENT_GROUPS, renderEndorsementAnswerValue } from './helpers';

export interface RecruitmentEndorsementInspectSectionProps {
  attestationAnswers: Record<string, unknown>;
}

export function RecruitmentEndorsementInspectSection({
  attestationAnswers,
}: RecruitmentEndorsementInspectSectionProps) {
  const mappedKeys = new Set(ENDORSEMENT_GROUPS.flatMap((g) => g.questions.map((q) => q.key)));
  const extraEntries = Object.entries(attestationAnswers).filter(
    ([k, v]) => !mappedKeys.has(k) && v != null && v !== '',
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between border-b border-border pb-2 pt-1">
        <div>
          <h4 className="font-heading text-sm font-bold text-text">
            DGroup Leader Endorsement Questionnaire
          </h4>
          <p className="text-xs text-muted">
            Observations submitted by the DGroup Leader grouped by the endorsement sequence.
          </p>
        </div>
        <Badge variant="outline">5 Sections</Badge>
      </div>

      {ENDORSEMENT_GROUPS.map((group) => {
        const groupEntries = group.questions
          .map((q) => ({ ...q, value: attestationAnswers[q.key] }))
          .filter((q) => q.value !== undefined && q.value !== null && q.value !== '');

        if (groupEntries.length === 0) return null;

        return (
          <div
            key={group.id}
            className="rounded-xl border border-border bg-surface p-4 shadow-2xs space-y-3"
          >
            <div>
              <h5 className="font-heading text-sm font-semibold text-text">{group.title}</h5>
              {group.description && (
                <p className="mt-0.5 text-xs text-muted">{group.description}</p>
              )}
            </div>

            <div className="divide-y divide-border/60">
              {groupEntries.map((item) => (
                <div key={item.key} className="py-2.5 first:pt-0 last:pb-0">
                  {item.type === 'textarea' ? (
                    <div className="space-y-1">
                      <span className="text-xs font-medium text-muted">{item.label}</span>
                      {renderEndorsementAnswerValue(item, item.value)}
                    </div>
                  ) : (
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5">
                      <span className="text-xs font-medium text-muted sm:max-w-[65%]">
                        {item.label}
                      </span>
                      <div className="sm:text-right">
                        {renderEndorsementAnswerValue(item, item.value)}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      })}

      {/* Fallback for any unmapped answers */}
      {extraEntries.length > 0 && (
        <div className="rounded-xl border border-border bg-surface p-4 shadow-2xs space-y-3">
          <h5 className="font-heading text-sm font-semibold text-text">Additional Observations</h5>
          <div className="divide-y divide-border/60">
            {extraEntries.map(([k, v]) => (
              <div
                key={k}
                className="py-2.5 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5"
              >
                <span className="text-xs font-medium text-muted capitalize">
                  {k.replace(/_/g, ' ')}
                </span>
                <span className="text-xs font-semibold text-text sm:text-right break-words">
                  {typeof v === 'object' ? JSON.stringify(v) : String(v)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
