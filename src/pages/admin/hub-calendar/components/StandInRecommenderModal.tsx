import { useMemo, useState } from 'react';

import {
  Check,
  Copy,
  Mail,
  MessageSquare,
  Minus,
  Plus,
  RotateCw,
  UserCheck,
  Users,
} from 'lucide-react';
import { toast } from 'sonner';

import {
  AlertBanner,
  Badge,
  Button,
  ButtonGroup,
  type ButtonGroupOption,
  ContactButtons,
  Dialog,
  Spinner,
  ViberIcon,
} from '@/components/ui';
import { useRecommendStandInQuery } from '@/hooks/domain/hub-calendar';
import type { MemberScheduleEntry, TimeSlot } from '@/hooks/domain/members';
import { useDebounce } from '@/hooks/utils';
import {
  type ExcusedMemberMap,
  type RecommendStandInPayload,
  findStandInCandidates,
  formatRecommendationReasoning,
} from '@/lib/domain/hub-calendar';
import type { AdminMember, MemberAttendanceStats } from '@/lib/domain/members';

import {
  type ConfidenceThresholds,
  DEFAULT_CONFIDENCE_THRESHOLDS,
  getMemberConfidenceTier,
} from '../utils/hubCalendarForecastUtils';
import { ServiceScheduleAvatar } from './ServiceScheduleAvatar';

export interface StandInRecommenderModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetDate: string; // YYYY-MM-DD
  timeSlot: TimeSlot;
  role: string;
  neededCount?: number;
  excusedMember?: AdminMember | null;
  allMembers: AdminMember[];
  scheduleEntries: MemberScheduleEntry[];
  excusedMap?: ExcusedMemberMap;
  attendanceScoreMap?: Map<string, MemberAttendanceStats>;
  thresholds?: ConfidenceThresholds;
}

type ChannelTab = 'viber' | 'sms' | 'email';

const CHANNEL_OPTIONS: ButtonGroupOption<ChannelTab>[] = [
  { value: 'viber', label: 'Viber', icon: <ViberIcon className="h-3.5 w-3.5" /> },
  { value: 'sms', label: 'SMS', icon: <MessageSquare className="h-3.5 w-3.5" /> },
  { value: 'email', label: 'Email', icon: <Mail className="h-3.5 w-3.5" /> },
];

function formatServiceSlot(slot: TimeSlot): string {
  switch (slot) {
    case '9AM':
      return '9:00 AM';
    case '12NN':
      return '12:00 NN';
    case '3PM':
      return '3:00 PM';
    default:
      return slot;
  }
}

function formatDisplayDate(isoDateStr: string): string {
  try {
    const parts = isoDateStr.split('-');
    if (parts.length !== 3) return isoDateStr;
    const year = Number(parts[0]);
    const monthIndex = Number(parts[1]) - 1;
    const day = Number(parts[2]);
    const d = new Date(year, monthIndex, day);
    return d.toLocaleDateString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return isoDateStr;
  }
}

function cleanPhoneNumber(phone?: string | null): string {
  if (!phone) return '';
  let cleaned = phone.replace(/[^\d+]/g, '');
  if (cleaned.startsWith('09') && cleaned.length === 11) {
    cleaned = `63${cleaned.slice(1)}`;
  }
  return cleaned;
}

export function StandInRecommenderModal({
  isOpen,
  onClose,
  targetDate,
  timeSlot,
  role,
  neededCount = 1,
  excusedMember,
  allMembers,
  scheduleEntries,
  excusedMap,
  attendanceScoreMap,
  thresholds = DEFAULT_CONFIDENCE_THRESHOLDS,
}: StandInRecommenderModalProps) {
  const [activeChannel, setActiveChannel] = useState<ChannelTab>('viber');
  const [customCount, setCustomCount] = useState<number | null>(null);
  const [selectedCandidateIdsOverride, setSelectedCandidateIdsOverride] =
    useState<Set<string> | null>(null);
  const [copiedMemberId, setCopiedMemberId] = useState<string | null>(null);
  const [isCopiedTemplate, setIsCopiedTemplate] = useState(false);

  const defaultCount = Math.max(1, Math.min(15, neededCount || (excusedMember ? 1 : 3)));
  const requestedCount = customCount ?? defaultCount;
  const debouncedRequestedCount = useDebounce(requestedCount, 400);

  // 1. Evaluate candidate pool on modal open / parameter changes
  const { candidates, tokenToMemberMap } = useMemo(() => {
    if (!isOpen || !role || !targetDate) {
      return { candidates: [], tokenToMemberMap: new Map<string, AdminMember>() };
    }
    return findStandInCandidates({
      targetRole: role,
      targetDate,
      targetSlot: timeSlot,
      allMembers,
      scheduleEntries,
      excusedMap,
      attendanceScoreMap,
      excludeMemberId: excusedMember?.id,
      maxCandidates: Math.max(20, requestedCount * 2),
    });
  }, [
    isOpen,
    role,
    targetDate,
    timeSlot,
    allMembers,
    scheduleEntries,
    excusedMap,
    attendanceScoreMap,
    excusedMember?.id,
    requestedCount,
  ]);

  // 2. Build stable query payload for recommendation evaluation with debounced neededCount
  const queryPayload: RecommendStandInPayload | null = useMemo(() => {
    if (!isOpen || !role || !targetDate || candidates.length === 0) {
      return null;
    }
    return {
      targetDate,
      timeSlot,
      role,
      neededCount: debouncedRequestedCount,
      excusedMemberToken: excusedMember ? `MEM_${excusedMember.id.slice(0, 6)}` : undefined,
      candidates,
    };
  }, [isOpen, role, targetDate, candidates, timeSlot, debouncedRequestedCount, excusedMember]);

  // 3. React Query caching (10 min stale time, immediate modal reopening cache, manual refresh)
  const {
    data: recommendationData = null,
    isFetching,
    isError,
    error,
    refetch,
  } = useRecommendStandInQuery(queryPayload, {
    enabled: isOpen && candidates.length > 0,
  });

  // 3. Derived candidate selection state (defaults to top requestedCount during render without cascading setState)
  const selectedCandidateIds = useMemo(() => {
    if (selectedCandidateIdsOverride !== null) {
      return selectedCandidateIdsOverride;
    }
    if (!recommendationData || recommendationData.recommendations.length === 0) {
      return new Set<string>();
    }
    const defaultSelected = new Set<string>();
    const limit = Math.min(requestedCount, recommendationData.recommendations.length);
    for (let i = 0; i < limit; i++) {
      const token = recommendationData.recommendations[i].candidateToken;
      const mem = tokenToMemberMap.get(token);
      if (mem) defaultSelected.add(mem.id);
    }
    return defaultSelected;
  }, [selectedCandidateIdsOverride, recommendationData, requestedCount, tokenToMemberMap]);

  // Selected candidate objects in order of appearance
  const selectedMembers = useMemo(() => {
    if (!recommendationData) return [];
    const memberMap = new Map(allMembers.map((m) => [m.id, m]));
    const list: AdminMember[] = [];
    // Maintain recommendation order first
    for (const rec of recommendationData.recommendations) {
      const mem = tokenToMemberMap.get(rec.candidateToken);
      if (mem && selectedCandidateIds.has(mem.id)) {
        list.push(mem);
      }
    }
    // Any other selected members not in recommendations (fallback)
    for (const id of selectedCandidateIds) {
      if (!list.some((m) => m.id === id)) {
        const mem = memberMap.get(id);
        if (mem) list.push(mem);
      }
    }
    return list;
  }, [recommendationData, allMembers, selectedCandidateIds, tokenToMemberMap]);

  // Handlers for candidate selection
  const handleToggleCandidate = (memberId: string) => {
    const next = new Set(selectedCandidateIds);
    if (next.has(memberId)) {
      next.delete(memberId);
    } else {
      next.add(memberId);
    }
    setSelectedCandidateIdsOverride(next);
  };

  const handleSelectAll = () => {
    if (!recommendationData) return;
    const all = new Set<string>();
    recommendationData.recommendations.forEach((r) => {
      const mem = tokenToMemberMap.get(r.candidateToken);
      if (mem) all.add(mem.id);
    });
    setSelectedCandidateIdsOverride(all);
  };

  const handleSelectTopN = (n: number) => {
    if (!recommendationData) return;
    const top = new Set<string>();
    recommendationData.recommendations.slice(0, n).forEach((r) => {
      const mem = tokenToMemberMap.get(r.candidateToken);
      if (mem) top.add(mem.id);
    });
    setSelectedCandidateIdsOverride(top);
  };

  const handleDeselectAll = () => {
    setSelectedCandidateIdsOverride(new Set());
  };

  // Adjust count and evaluate (uses React Query cache if previously evaluated)
  const handleReevaluate = (count: number) => {
    setCustomCount(count);
    setSelectedCandidateIdsOverride(null);
  };

  const handleRefresh = () => {
    setSelectedCandidateIdsOverride(null);
    void refetch();
  };

  const handleClose = () => {
    setCustomCount(null);
    setSelectedCandidateIdsOverride(null);
    onClose();
  };

  // Helper to personalize message for any volunteer
  const getPersonalizedMessage = (member?: AdminMember | null) => {
    if (!recommendationData) return { text: '', subject: '' };

    const volunteerName = member?.nickname || member?.first_name || 'Volunteer';
    const formattedDate = formatDisplayDate(targetDate);
    const formattedSlot = formatServiceSlot(timeSlot);

    const replacePlaceholders = (template: string) => {
      return template
        .replaceAll('{{volunteer_name}}', volunteerName)
        .replaceAll('{{service_date}}', formattedDate)
        .replaceAll('{{service_time}}', formattedSlot)
        .replaceAll('{{role}}', role);
    };

    if (activeChannel === 'sms') {
      return {
        text: replacePlaceholders(recommendationData.invitations.sms),
        subject: '',
      };
    }

    if (activeChannel === 'email') {
      return {
        text: replacePlaceholders(recommendationData.invitations.email.body),
        subject: replacePlaceholders(recommendationData.invitations.email.subject),
      };
    }

    const viberTemplate =
      recommendationData.invitations.viber || recommendationData.invitations.whatsapp || '';
    return {
      text: replacePlaceholders(viberTemplate),
      subject: '',
    };
  };

  // Preview message using first selected volunteer (or generic fallback)
  const previewMember = selectedMembers[0] ?? null;
  const previewMessage = getPersonalizedMessage(previewMember);

  // Copy template / preview message
  const handleCopyTemplate = async () => {
    const textToCopy =
      activeChannel === 'email' && previewMessage.subject
        ? `Subject: ${previewMessage.subject}\n\n${previewMessage.text}`
        : previewMessage.text;

    try {
      await navigator.clipboard.writeText(textToCopy);
      setIsCopiedTemplate(true);
      toast.success('Invitation template copied to clipboard');
      setTimeout(() => setIsCopiedTemplate(false), 2000);
    } catch {
      toast.error('Failed to copy to clipboard');
    }
  };

  // Copy individual personalized invitation
  const handleCopyIndividualMessage = async (member: AdminMember) => {
    const { text, subject } = getPersonalizedMessage(member);
    const textToCopy =
      activeChannel === 'email' && subject ? `Subject: ${subject}\n\n${text}` : text;

    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopiedMemberId(member.id);
      toast.success(`Copied invite for ${member.nickname || member.first_name}`);
      setTimeout(() => setCopiedMemberId(null), 2000);
    } catch {
      toast.error('Failed to copy to clipboard');
    }
  };

  // Bulk copy all messages
  const handleCopyAllMessages = async () => {
    if (selectedMembers.length === 0) {
      toast.error('No volunteers selected');
      return;
    }

    const combined = selectedMembers
      .map((m) => {
        const { text, subject } = getPersonalizedMessage(m);
        const name = m.full_name;
        const phone = m.phone ? ` (${m.phone})` : '';
        const header = `--- ${name}${phone} ---`;
        return activeChannel === 'email' && subject
          ? `${header}\nSubject: ${subject}\n\n${text}`
          : `${header}\n${text}`;
      })
      .join('\n\n');

    try {
      await navigator.clipboard.writeText(combined);
      toast.success(
        `Copied personalized invites for ${selectedMembers.length} volunteer${
          selectedMembers.length === 1 ? '' : 's'
        }`,
      );
    } catch {
      toast.error('Failed to copy to clipboard');
    }
  };

  // Bulk copy phone numbers or email addresses
  const handleCopyRecipientList = async () => {
    if (selectedMembers.length === 0) {
      toast.error('No volunteers selected');
      return;
    }

    if (activeChannel === 'email') {
      const emails = selectedMembers
        .map((m) => m.email)
        .filter((e): e is string => Boolean(e))
        .join(', ');
      if (!emails) {
        toast.error('No email addresses found for selected volunteers');
        return;
      }
      try {
        await navigator.clipboard.writeText(emails);
        toast.success(`Copied ${selectedMembers.length} email addresses`);
      } catch {
        toast.error('Failed to copy to clipboard');
      }
    } else {
      const numbers = selectedMembers
        .map((m) => cleanPhoneNumber(m.phone) || m.phone)
        .filter((p): p is string => Boolean(p))
        .join(', ');
      if (!numbers) {
        toast.error('No phone numbers found for selected volunteers');
        return;
      }
      try {
        await navigator.clipboard.writeText(numbers);
        toast.success(`Copied ${selectedMembers.length} contact numbers`);
      } catch {
        toast.error('Failed to copy to clipboard');
      }
    }
  };

  return (
    <Dialog isOpen={isOpen} onClose={handleClose} size="2xl">
      {/* Header */}
      <Dialog.Header showCloseButton onClose={handleClose}>
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <Dialog.Title>Walk-in Recommendations</Dialog.Title>
            <Dialog.Description>
              Recommended substitute volunteers based on attendance reliability and schedule
              availability
            </Dialog.Description>
          </div>
        </div>
      </Dialog.Header>

      {/* Context info bar & Needed Stepper */}
      <div className="mt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 rounded-xl border border-border bg-background/50 p-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline">{formatDisplayDate(targetDate)}</Badge>
          <Badge variant="outline">{formatServiceSlot(timeSlot)}</Badge>
          <Badge variant="accent">{role}</Badge>
          {excusedMember && (
            <span className="text-xs text-muted">
              For regular volunteer:{' '}
              <strong className="font-semibold text-text">{excusedMember.full_name}</strong>
            </span>
          )}
        </div>

        {/* Stepper & Refresh */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-medium text-muted">Needed:</span>
            <div className="flex items-center rounded-lg border border-border bg-surface p-0.5">
              <Button
                type="button"
                variant="ghost"
                size="xs"
                onClick={() => handleReevaluate(Math.max(1, requestedCount - 1))}
                disabled={requestedCount <= 1}
                className="h-6 w-6 p-0 text-muted hover:text-text"
                title="Decrease needed walk-ins"
                aria-label="Decrease needed walk-ins"
              >
                <Minus className="h-3 w-3" />
              </Button>
              <span className="min-w-6 text-center text-xs font-bold tabular-nums text-text">
                {requestedCount}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="xs"
                onClick={() => handleReevaluate(Math.min(15, requestedCount + 1))}
                disabled={requestedCount >= 15}
                className="h-6 w-6 p-0 text-muted hover:text-text"
                title="Increase needed walk-ins"
                aria-label="Increase needed walk-ins"
              >
                <Plus className="h-3 w-3" />
              </Button>
            </div>
          </div>

          <Button
            type="button"
            variant="ghost"
            size="xs"
            onClick={handleRefresh}
            disabled={isFetching || candidates.length === 0}
            className="h-7 px-2 text-xs text-muted hover:text-text gap-1"
            title="Refresh recommendations"
            aria-label="Refresh recommendations"
          >
            <RotateCw
              className={`h-3 w-3 ${
                isFetching || requestedCount !== debouncedRequestedCount
                  ? 'animate-spin text-primary'
                  : ''
              }`}
            />
            <span className="hidden sm:inline">Refresh</span>
          </Button>
        </div>
      </div>

      {/* Content Area */}
      <Dialog.Body scrollable className="space-y-6">
        {candidates.length === 0 ? (
          <div className="py-8 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted/20 text-muted mb-3">
              <Users className="h-6 w-6" />
            </div>
            <h4 className="text-sm font-semibold text-text">No Eligible Walk-ins Found</h4>
            <p className="text-xs text-muted max-w-md mx-auto mt-1">
              There are currently no active volunteers with the primary role of &ldquo;{role}&rdquo;
              who have a clean schedule and solid attendance rating for this service slot.
            </p>
            <div className="mt-5">
              <Button type="button" variant="secondary" onClick={handleClose}>
                Close
              </Button>
            </div>
          </div>
        ) : isFetching && !recommendationData ? (
          <div className="py-12 flex flex-col items-center justify-center text-center space-y-3">
            <Spinner size="lg" className="text-primary" />
            <div>
              <p className="text-sm font-semibold text-text">
                Evaluating {candidates.length} candidate{candidates.length === 1 ? '' : 's'} for{' '}
                {requestedCount} walk-in spot{requestedCount === 1 ? '' : 's'}...
              </p>
              <p className="text-xs text-muted mt-0.5">
                Analyzing attendance fidelity, slot preferences, and drafting invites
              </p>
            </div>
          </div>
        ) : isError && !recommendationData ? (
          <div className="space-y-4">
            <AlertBanner
              variant="error"
              title="Evaluation Failed"
              description={
                error?.message || 'Failed to generate walk-in recommendation. Please try again.'
              }
            />
            <div className="flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={handleClose}>
                Cancel
              </Button>
              <Button type="button" onClick={() => void refetch()}>
                Retry Evaluation
              </Button>
            </div>
          </div>
        ) : recommendationData ? (
          <div className="space-y-6">
            {/* Recommended Candidates Header & Shortcuts */}
            <div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-text">
                    Recommended Walk-ins ({recommendationData.recommendations.length})
                  </span>
                  <Badge variant={selectedCandidateIds.size > 0 ? 'accent' : 'outline'}>
                    {selectedCandidateIds.size} Selected
                  </Badge>
                </div>

                <div className="flex items-center gap-2 text-xs">
                  <Button
                    type="button"
                    variant="ghost"
                    size="xs"
                    onClick={handleSelectAll}
                    className="h-auto p-0 text-primary hover:underline font-medium text-[11px]"
                  >
                    Select All
                  </Button>
                  <span className="text-border">•</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="xs"
                    onClick={() => handleSelectTopN(requestedCount)}
                    className="h-auto p-0 text-primary hover:underline font-medium text-[11px]"
                  >
                    Select Top {Math.min(requestedCount, recommendationData.recommendations.length)}
                  </Button>
                  {selectedCandidateIds.size > 0 && (
                    <>
                      <span className="text-border">•</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="xs"
                        onClick={handleDeselectAll}
                        className="h-auto p-0 text-muted hover:text-text text-[11px]"
                      >
                        Clear
                      </Button>
                    </>
                  )}
                </div>
              </div>

              {/* Candidate Cards Grid */}
              <div className="grid grid-cols-1 gap-2.5">
                {recommendationData.recommendations.map((rec) => {
                  const member = tokenToMemberMap.get(rec.candidateToken);
                  if (!member) return null;

                  const isSelected = selectedCandidateIds.has(member.id);
                  const stats = attendanceScoreMap?.get(member.id);
                  const rawTurnupRate = stats?.turnupRate;
                  const turnupPercent =
                    rawTurnupRate !== undefined
                      ? Math.round(rawTurnupRate <= 1 ? rawTurnupRate * 100 : rawTurnupRate)
                      : null;
                  const tier = getMemberConfidenceTier(
                    member,
                    targetDate,
                    timeSlot,
                    excusedMap,
                    attendanceScoreMap,
                    thresholds,
                  );
                  const formattedReasoning = formatRecommendationReasoning({
                    reasoning: rec.reasoning,
                    candidateMember: member,
                    tokenToMemberMap,
                    excusedMember,
                    excusedMemberToken: excusedMember
                      ? `MEM_${excusedMember.id.slice(0, 6)}`
                      : undefined,
                  });

                  return (
                    <div
                      key={member.id}
                      onClick={() => handleToggleCandidate(member.id)}
                      className={`w-full flex items-start justify-between gap-3 rounded-xl border p-3.5 text-left transition cursor-pointer ${
                        isSelected
                          ? 'border-primary bg-primary/5 ring-1 ring-primary/40'
                          : 'border-border bg-surface hover:bg-surface-hover/60'
                      }`}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === ' ' || e.key === 'Enter') {
                          e.preventDefault();
                          handleToggleCandidate(member.id);
                        }
                      }}
                    >
                      <div className="flex items-start gap-3 min-w-0">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleCandidate(member.id)}
                          onClick={(e) => e.stopPropagation()}
                          className="mt-1 h-4 w-4 cursor-pointer rounded border-border text-primary focus:ring-primary/30"
                          aria-label={`Select ${member.full_name}`}
                        />

                        <ServiceScheduleAvatar
                          size="md"
                          name={member.full_name}
                          avatarObjectKey={member.avatar_object_key}
                          turnupRate={stats?.turnupRate}
                          thresholds={thresholds}
                          className="shrink-0 mt-0.5"
                        />

                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-semibold text-sm text-text truncate">
                              {member.full_name}
                            </span>
                            {rec.rank === 1 && (
                              <Badge
                                variant="accent"
                                className="text-xs px-2.5 py-0.5 font-semibold"
                              >
                                Top Match
                              </Badge>
                            )}
                            <Badge
                              variant={
                                tier === 'solid'
                                  ? 'default'
                                  : tier === 'moderate'
                                    ? 'secondary'
                                    : 'outline'
                              }
                              className="text-xs px-2.5 py-0.5 font-semibold"
                            >
                              {turnupPercent !== null ? `${turnupPercent}% turnup` : 'Reliable'}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted mt-0.5">
                            {member.member_id} • {member.phone || 'No phone'}
                          </p>
                          <p className="text-xs text-primary/90 mt-1.5 italic leading-relaxed">
                            &ldquo;{formattedReasoning}&rdquo;
                          </p>
                        </div>
                      </div>

                      <div className="shrink-0 mt-0.5">
                        {isSelected ? (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-primary">
                            <UserCheck className="h-4 w-4" /> Selected
                          </span>
                        ) : (
                          <span className="text-xs text-muted hover:text-text">Select</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Outreach & Dispatch Section */}
            <div className="rounded-xl border border-border bg-background/50 p-4 space-y-4">
              {/* Channel Tabs & Bulk Header */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-border pb-3">
                <div className="flex items-center gap-2.5">
                  <span className="text-xs font-semibold uppercase tracking-wider text-text">
                    Channel
                  </span>
                  <ButtonGroup<ChannelTab>
                    value={activeChannel}
                    onChange={(val) => setActiveChannel(val)}
                    options={CHANNEL_OPTIONS}
                    size="sm"
                  />
                </div>

                <div className="text-xs text-muted">
                  Recipients:{' '}
                  <strong className="text-text font-semibold">
                    {selectedMembers.length} selected
                  </strong>
                </div>
              </div>

              {/* Message Preview (Template or 1st recipient) */}
              <div className="space-y-3">
                {activeChannel === 'email' && (
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted">Subject</label>
                    <div className="rounded-lg border border-border bg-surface px-3 py-2 text-xs font-medium text-text">
                      {previewMessage.subject}
                    </div>
                  </div>
                )}

                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium text-muted">
                      Message Preview{' '}
                      {previewMember
                        ? `(for ${previewMember.nickname || previewMember.first_name})`
                        : ''}
                    </label>
                    <span className="text-[11px] text-muted">
                      {previewMessage.text.length} chars
                    </span>
                  </div>
                  <div className="rounded-lg border border-border bg-surface p-3 text-xs leading-relaxed text-text whitespace-pre-wrap font-sans">
                    {previewMessage.text}
                  </div>
                </div>

                {/* Bulk Actions Bar */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-border">
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={handleCopyAllMessages}
                      disabled={selectedMembers.length === 0}
                      className="gap-1.5"
                    >
                      <Copy className="h-3.5 w-3.5" />
                      Copy All Messages ({selectedMembers.length})
                    </Button>

                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={handleCopyRecipientList}
                      disabled={selectedMembers.length === 0}
                      className="gap-1.5"
                    >
                      <Copy className="h-3.5 w-3.5" />
                      {activeChannel === 'email' ? 'Copy Email List' : 'Copy Numbers'}
                    </Button>
                  </div>

                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleCopyTemplate}
                    className="gap-1.5 text-xs text-muted hover:text-text"
                  >
                    {isCopiedTemplate ? (
                      <Check className="h-3.5 w-3.5 text-emerald-500" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                    {isCopiedTemplate ? 'Copied' : 'Copy Template'}
                  </Button>
                </div>
              </div>

              {/* Individual 1-Click Outreach List */}
              {selectedMembers.length > 0 && (
                <div className="pt-3 border-t border-border space-y-2.5">
                  <span className="text-xs font-semibold uppercase tracking-wider text-text block">
                    1-Click Direct Outreach ({selectedMembers.length})
                  </span>

                  <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                    {selectedMembers.map((member) => {
                      const { text, subject } = getPersonalizedMessage(member);
                      const isCopied = copiedMemberId === member.id;

                      return (
                        <div
                          key={member.id}
                          className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface px-3 py-2 text-xs"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <ServiceScheduleAvatar
                              size="sm"
                              name={member.full_name}
                              avatarObjectKey={member.avatar_object_key}
                              className="shrink-0"
                            />
                            <div className="min-w-0">
                              <span className="font-semibold text-text truncate block">
                                {member.full_name}
                              </span>
                              <span className="text-[11px] text-muted truncate block">
                                {activeChannel === 'email'
                                  ? member.email || 'No email'
                                  : member.phone || 'No phone'}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            <Button
                              type="button"
                              variant="ghost"
                              size="xs"
                              onClick={() => handleCopyIndividualMessage(member)}
                              className="h-7 w-7 p-0 text-muted hover:text-text"
                              title="Copy personalized invite"
                              aria-label={`Copy invite for ${member.full_name}`}
                            >
                              {isCopied ? (
                                <Check className="h-3.5 w-3.5 text-emerald-500" />
                              ) : (
                                <Copy className="h-3.5 w-3.5" />
                              )}
                            </Button>

                            {activeChannel === 'email'
                              ? member.email && (
                                  <Button
                                    asChild
                                    size="sm"
                                    variant="secondary"
                                    className="h-7 px-2.5 text-xs gap-1.5"
                                  >
                                    <a
                                      href={`mailto:${member.email}?subject=${encodeURIComponent(
                                        subject,
                                      )}&body=${encodeURIComponent(text)}`}
                                    >
                                      <Mail className="h-3 w-3" />
                                      Email
                                    </a>
                                  </Button>
                                )
                              : member.phone && (
                                  <ContactButtons
                                    phone={member.phone}
                                    message={text}
                                    size="sm"
                                    variant="default"
                                    showCopyFallback={false}
                                  />
                                )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : null}
      </Dialog.Body>

      {/* Footer */}
      <Dialog.Footer>
        <Button type="button" variant="secondary" onClick={handleClose}>
          Done
        </Button>
      </Dialog.Footer>
    </Dialog>
  );
}
