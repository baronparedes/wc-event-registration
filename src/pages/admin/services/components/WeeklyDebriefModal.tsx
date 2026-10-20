import { useMemo, useState } from 'react';

import { format, parseISO } from 'date-fns';
import { Bell, Check, Clock, Copy, FileText, RefreshCw, TrendingUp, Users } from 'lucide-react';
import { toast } from 'sonner';

import { AiBrandIcon, Badge, Button, Dialog, EmptyState, LoadingState } from '@/components/ui';
import {
  useServiceWeeklyBriefByDateQuery,
  useTriggerWeeklyDebriefMutation,
} from '@/hooks/domain/services';

export interface WeeklyDebriefModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedSunday: string;
}

export function WeeklyDebriefModal({ isOpen, onClose, selectedSunday }: WeeklyDebriefModalProps) {
  const [copied, setCopied] = useState(false);
  const [notifyOic, setNotifyOic] = useState(true);

  const { data: brief, isLoading: isBriefLoading } =
    useServiceWeeklyBriefByDateQuery(selectedSunday);
  const { mutateAsync: triggerDebrief, isPending: isGenerating } =
    useTriggerWeeklyDebriefMutation();

  const formattedSunday = useMemo(() => {
    if (!selectedSunday) return '';
    try {
      return format(parseISO(selectedSunday), 'EEEE, MMMM d, yyyy');
    } catch {
      return selectedSunday;
    }
  }, [selectedSunday]);

  const handleCopy = async () => {
    if (!brief) return;
    try {
      const fullText = `CCF Welcome Center — Sunday Executive Debrief (${brief.sunday_date})
Turn-up Rate: ${brief.turnup_rate}% | Peak: ${brief.peak_slot}

${brief.summary}

Highlights:
${brief.key_highlights.map((h) => `• ${h}`).join('\n')}`;

      await navigator.clipboard.writeText(fullText);
      setCopied(true);
      toast.success('Executive debrief copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy to clipboard');
    }
  };

  const handleGenerate = async () => {
    try {
      await triggerDebrief({
        sunday_date: selectedSunday,
        force: true,
        notify: notifyOic,
      });
      toast.success(
        brief
          ? 'Debrief regenerated and saved successfully'
          : 'Debrief generated successfully and dispatched to OIC role',
      );
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Failed to generate Sunday debrief. Please try again.',
      );
    }
  };

  const paragraphs = brief?.summary ? brief.summary.split(/\n\s*\n/).filter(Boolean) : [];

  return (
    <Dialog isOpen={isOpen} onClose={onClose} size="3xl">
      <Dialog.Header>
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between w-full pr-6">
          <div className="flex items-center gap-2">
            <div>
              <h2 className="text-lg font-semibold text-text">Sunday Executive Debrief</h2>
              <p className="text-xs text-muted">Executive briefing powered by Hub AI</p>
            </div>
          </div>
          {formattedSunday && (
            <Badge variant="outline" className="text-xs font-medium self-start sm:self-auto">
              {formattedSunday}
            </Badge>
          )}
        </div>
      </Dialog.Header>

      <Dialog.Body className="mt-4 flex flex-col gap-4 min-w-0 max-w-full">
        {isBriefLoading ? (
          <div className="py-12">
            <LoadingState message="Loading debrief..." />
          </div>
        ) : brief ? (
          <div className="flex flex-col gap-5">
            {/* Summary Metrics Banner */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-xl border border-border bg-surface p-3.5">
                <div className="flex items-center gap-1.5 text-xs text-muted">
                  <TrendingUp className="h-3.5 w-3.5" />
                  <span>Turn-up Rate</span>
                </div>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-text">{brief.turnup_rate}%</span>
                  <Badge
                    variant={
                      brief.turnup_rate >= 90
                        ? 'accent'
                        : brief.turnup_rate >= 75
                          ? 'default'
                          : 'destructive'
                    }
                    className="text-[10px]"
                  >
                    {brief.turnup_rate >= 90
                      ? 'Optimal'
                      : brief.turnup_rate >= 75
                        ? 'Stable'
                        : 'Deficit'}
                  </Badge>
                </div>
              </div>

              <div className="rounded-xl border border-border bg-surface p-3.5">
                <div className="flex items-center gap-1.5 text-xs text-muted">
                  <Clock className="h-3.5 w-3.5" />
                  <span>Peak Slot</span>
                </div>
                <div className="mt-1 text-2xl font-bold text-text">{brief.peak_slot}</div>
              </div>

              <div className="rounded-xl border border-border bg-surface p-3.5">
                <div className="flex items-center gap-1.5 text-xs text-muted">
                  <Users className="h-3.5 w-3.5" />
                  <span>Present / Committed</span>
                </div>
                <div className="mt-1 text-2xl font-bold text-text">
                  {brief.total_present}{' '}
                  <span className="text-sm font-normal text-muted">/ {brief.total_committed}</span>
                </div>
              </div>

              <div className="rounded-xl border border-border bg-surface p-3.5">
                <div className="flex items-center gap-1.5 text-xs text-muted">
                  <FileText className="h-3.5 w-3.5" />
                  <span>Walk-ins</span>
                </div>
                <div className="mt-1 text-2xl font-bold text-text">+{brief.total_walk_ins}</div>
              </div>
            </div>

            {/* Key Highlights Tags */}
            {brief.key_highlights && brief.key_highlights.length > 0 && (
              <div className="rounded-xl border border-border bg-surface p-3.5">
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">
                  Executive Highlights
                </h3>
                <div className="flex flex-wrap gap-2">
                  {brief.key_highlights.map((highlight) => (
                    <div
                      key={highlight}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-2.5 py-1 text-xs text-text"
                    >
                      <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                      {highlight}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Debrief 3 Paragraphs */}
            <div className="rounded-xl border border-border bg-surface p-4 sm:p-5">
              <div className="flex items-center justify-between pb-3 border-b border-border">
                <span className="text-xs font-medium text-muted">
                  Sunday, {format(parseISO(brief.sunday_date), 'MMMM d, yyyy')}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopy}
                  className="h-8 gap-1.5 text-xs"
                >
                  {copied ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-emerald-600" />
                      <span>Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" />
                      <span>Copy Brief</span>
                    </>
                  )}
                </Button>
              </div>

              <div className="mt-4 space-y-4">
                {paragraphs.length > 0 ? (
                  paragraphs.map((para, idx) => (
                    <p key={idx} className="text-sm leading-relaxed text-text">
                      {para}
                    </p>
                  ))
                ) : (
                  <p className="text-sm leading-relaxed text-text whitespace-pre-line">
                    {brief.summary}
                  </p>
                )}
              </div>
            </div>

            {/* Footer Status */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs text-muted gap-2 pt-1">
              <div>
                Updated:{' '}
                {format(parseISO(brief.updated_at || brief.created_at), 'MMM d, yyyy h:mm a')}
              </div>
              <div className="flex items-center gap-1.5">
                <Bell className="h-3.5 w-3.5 text-primary" />
                <span>Automated notification broadcast delivered to role: OIC</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="py-8">
            <EmptyState
              icon={<AiBrandIcon className="h-8 w-8 text-primary" />}
              title="No Debrief Generated"
              description={`An executive debrief has not been created yet for ${formattedSunday || 'the selected Sunday'}. You can synthesize service statistics now using Hub AI.`}
              action={
                <Button
                  onClick={handleGenerate}
                  disabled={isGenerating}
                  className="mt-2 inline-flex items-center gap-2"
                >
                  {isGenerating ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      <span>Generating Debrief...</span>
                    </>
                  ) : (
                    <>
                      <AiBrandIcon className="h-4 w-4" />
                      <span>Generate with Hub AI</span>
                    </>
                  )}
                </Button>
              }
            />
          </div>
        )}
      </Dialog.Body>

      <Dialog.Footer>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between w-full gap-3">
          <label className="flex items-center gap-2 cursor-pointer text-xs text-muted select-none">
            <input
              type="checkbox"
              checked={notifyOic}
              onChange={(e) => setNotifyOic(e.target.checked)}
              className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
            />
            <span>Broadcast notification to role OIC on generation</span>
          </label>

          <div className="flex items-center gap-2 justify-end">
            {brief && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleGenerate}
                disabled={isGenerating}
                className="gap-1.5"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isGenerating ? 'animate-spin' : ''}`} />
                <span>{isGenerating ? 'Regenerating...' : 'Regenerate Debrief'}</span>
              </Button>
            )}
            <Button variant="secondary" size="sm" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </Dialog.Footer>
    </Dialog>
  );
}
