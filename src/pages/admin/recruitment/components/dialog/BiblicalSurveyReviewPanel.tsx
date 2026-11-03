import { useState } from 'react';

import { CheckCircle2, HelpCircle, XCircle } from 'lucide-react';

import { Badge, Tabs, TabsList, TabsTrigger } from '@/components/ui';
import { useRecruitmentSettingsQuery } from '@/hooks/domain/recruitment';
import type { RecruitmentApplication } from '@/lib/domain/recruitment';

interface BiblicalSurveyReviewPanelProps {
  application: RecruitmentApplication;
}

type SurveyFilter = 'all' | 'incorrect';

export function BiblicalSurveyReviewPanel({ application }: BiblicalSurveyReviewPanelProps) {
  const [filter, setFilter] = useState<SurveyFilter>('incorrect');
  const { data: settings } = useRecruitmentSettingsQuery();

  const questions = settings?.survey_questions ?? [];
  const scorePercent =
    application.survey_total > 0
      ? Math.round((application.survey_score / application.survey_total) * 100)
      : 0;

  const filteredQuestions = questions.filter((q) => {
    if (filter === 'all') return true;
    const applicantAnswer = application.survey_answers[q.field_key];
    return applicantAnswer !== q.correct_answer;
  });

  return (
    <div className="space-y-4">
      {/* Score Summary Card */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border bg-surface p-5">
        <div>
          <span className="text-xs font-semibold text-muted">Doctrinal Survey Score</span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="font-heading text-2xl font-bold text-text">
              {application.survey_score} / {application.survey_total}
            </span>
            <Badge variant={scorePercent >= 80 ? 'default' : 'secondary'}>
              {scorePercent}% Accuracy
            </Badge>
          </div>
          <p className="mt-1 text-xs text-muted">
            The survey serves as an interview discussion guide and theological alignment reference.
          </p>
        </div>

        <Tabs value={filter} onValueChange={(val) => setFilter(val as SurveyFilter)}>
          <TabsList containerClassName="w-auto" className="w-auto">
            <TabsTrigger value="all" className="px-3 py-1.5 text-xs">
              All Questions
            </TabsTrigger>
            <TabsTrigger value="incorrect" className="px-3 py-1.5 text-xs">
              Incorrect Only
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Questions Breakdown List */}
      <div className="max-h-[calc(75vh-14rem)] space-y-3 overflow-y-auto pr-1">
        {filteredQuestions.length === 0 ? (
          <div className="rounded-xl border border-border bg-surface p-6 text-center text-xs text-muted">
            {filter === 'incorrect'
              ? 'Candidate answered all surveyed questions correctly!'
              : 'No survey questions available.'}
          </div>
        ) : (
          filteredQuestions.map((q, index) => {
            const applicantAnswer = application.survey_answers[q.field_key];
            const isCorrect = applicantAnswer === q.correct_answer;

            return (
              <div
                key={q.id || q.field_key}
                className={`space-y-3 rounded-2xl border p-4 transition-colors ${
                  isCorrect ? 'border-border bg-surface' : 'border-danger/30 bg-danger/5'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2">
                    <Badge variant="outline" className="shrink-0 font-mono text-[11px]">
                      Q{index + 1}
                    </Badge>
                    <p className="text-sm font-semibold text-text">{q.label}</p>
                  </div>

                  {isCorrect ? (
                    <span className="flex items-center gap-1 text-xs font-semibold text-primary shrink-0">
                      <CheckCircle2 className="h-4 w-4" />
                      Correct
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-xs font-semibold text-danger shrink-0">
                      <XCircle className="h-4 w-4" />
                      Incorrect
                    </span>
                  )}
                </div>

                <div className="grid gap-2 text-xs sm:grid-cols-2 rounded-xl bg-background/60 p-3">
                  <div>
                    <span className="text-muted">Applicant Answer: </span>
                    <span
                      className={`font-mono font-bold capitalize ${
                        isCorrect ? 'text-primary' : 'text-danger'
                      }`}
                    >
                      {applicantAnswer || 'No response'}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted">Expected Answer: </span>
                    <span className="font-mono font-bold capitalize text-text">
                      {q.correct_answer}
                    </span>
                  </div>
                </div>

                {q.explanation && (
                  <div className="flex items-start gap-2 text-xs text-muted">
                    <HelpCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                    <span>
                      <strong className="text-text">Scripture Guide:</strong> {q.explanation}
                    </span>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
