import type { ReactNode } from 'react';

import { Badge } from '@/components/ui';
import type { ApprovalEntityType } from '@/lib/domain/approvals';

export type EndorsementQuestionDef = {
  key: string;
  label: string;
  type?: 'rating' | 'badge' | 'text' | 'textarea' | 'list';
};

export type EndorsementGroupDef = {
  id: string;
  title: string;
  description?: string;
  questions: EndorsementQuestionDef[];
};

export const RATING_SCORE_DESCRIPTIONS: Record<number, string> = {
  1: 'Not Observed',
  2: 'Observed Some of the time',
  3: 'Observed Most of the time',
};

export const ENDORSEMENT_GROUPS: EndorsementGroupDef[] = [
  {
    id: 'dgroup_relationship',
    title: '1. Leader & DGroup Relationship',
    description: 'Disciple-maker relationship and involvement in the DGroup.',
    questions: [
      { key: 'leader_full_name', label: 'Leader Full Name', type: 'text' },
      { key: 'disciple_dgroup_since', label: 'Started in DGroup Since', type: 'text' },
      { key: 'is_disciple_dgroup_leader', label: 'Already a DGroup Leader?', type: 'badge' },
      { key: 'disciple_led_dgroup_since', label: 'Started Leading Own DGroup Since', type: 'text' },
    ],
  },
  {
    id: 'spiritual_character',
    title: '2. Spiritual Maturity & Character Evaluation',
    description:
      'Score Scale: 1 = Not Observed · 2 = Observed Some of the time · 3 = Observed Most of the time',
    questions: [
      {
        key: 'eval_prayer_and_devotion',
        label: 'Consistent prayer time, personal devotion and study of God’s word',
        type: 'rating',
      },
      {
        key: 'eval_private_life_in_order',
        label: 'Private life is in order (free from addictions, uses resources wisely)',
        type: 'rating',
      },
      {
        key: 'eval_scripture_priorities',
        label: 'Makes decisions and sets priorities based on Scripture',
        type: 'rating',
      },
      { key: 'eval_shares_gospel', label: 'Shares the gospel consistently', type: 'rating' },
      {
        key: 'eval_submits_to_authority',
        label: 'Submits to God-given authorities',
        type: 'rating',
      },
      {
        key: 'eval_listens_to_counsel',
        label: 'Listens to corrections and counsel',
        type: 'rating',
      },
      {
        key: 'eval_treats_people_with_respect',
        label: 'Treats difficult people with respect and dignity',
        type: 'rating',
      },
      {
        key: 'eval_no_gossip',
        label: 'Does not criticize, judge, badmouth, or gossip',
        type: 'rating',
      },
      {
        key: 'eval_consistent_small_group',
        label: 'Consistently leads and/or attends a small group',
        type: 'rating',
      },
      {
        key: 'eval_serves_others',
        label: 'Serves others even when inconvenient',
        type: 'rating',
      },
      {
        key: 'eval_family_relationships',
        label: 'Maintains good family relationships',
        type: 'rating',
      },
      {
        key: 'eval_quality_family_time',
        label: 'Spends quality time with family',
        type: 'rating',
      },
    ],
  },
  {
    id: 'growth_assessment',
    title: '3. Disciple Growth & Assessment',
    description: 'Observed strengths, weaknesses, and growth opportunities.',
    questions: [
      { key: 'disciple_strengths', label: 'Observed Strengths', type: 'textarea' },
      { key: 'disciple_weaknesses', label: 'Observed Weaknesses', type: 'textarea' },
      { key: 'disciple_improvements', label: 'Areas for Improvement', type: 'textarea' },
    ],
  },
  {
    id: 'credibility_concerns',
    title: '4. Ministry Credibility & Concerns',
    description: 'Potential concerns regarding ministry effectiveness and credibility.',
    questions: [
      { key: 'credibility_concerns', label: 'Disclosed Concerns', type: 'list' },
      { key: 'credibility_concerns_details', label: 'Concern Details', type: 'textarea' },
    ],
  },
  {
    id: 'recommendation_attestation',
    title: '5. Attestation & Recommendation',
    description: 'Formal ministry recommendation and leader attestation commitment.',
    questions: [
      { key: 'recommendation_decision', label: 'Ministry Recommendation', type: 'badge' },
      { key: 'recommendation_comments', label: 'Recommendation Comments', type: 'textarea' },
      {
        key: 'leader_attestation_statement',
        label: 'Leader Attestation Commitment',
        type: 'badge',
      },
      { key: 'attestation_comments', label: 'Attestation Comments', type: 'textarea' },
    ],
  },
];

export function renderEndorsementAnswerValue(
  item: EndorsementQuestionDef,
  value: unknown,
): ReactNode {
  if (value === undefined || value === null || value === '') {
    return <span className="italic text-muted">—</span>;
  }

  if (item.type === 'rating') {
    const score = Number(value);
    const desc = RATING_SCORE_DESCRIPTIONS[score];
    return (
      <div className="flex items-center gap-2">
        <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-md bg-primary/10 px-1.5 text-xs font-bold text-primary">
          {score || String(value)}
        </span>
        {desc && <span className="text-xs text-muted">({desc})</span>}
      </div>
    );
  }

  if (item.type === 'badge') {
    const strVal = String(value);
    const isAttested = strVal === 'I attest' || strVal === 'Yes';
    const isDeclined = strVal === 'I DO NOT attest' || strVal.startsWith('No');
    const isReservation = strVal.includes('reservations');
    const variant = isAttested
      ? 'default'
      : isDeclined
        ? 'destructive'
        : isReservation
          ? 'accent'
          : 'outline';
    return <Badge variant={variant}>{strVal}</Badge>;
  }

  if (item.type === 'list') {
    if (Array.isArray(value) && value.length > 0) {
      return (
        <div className="flex flex-wrap gap-1.5">
          {value.map((v, i) => (
            <Badge key={i} variant="outline" className="text-xs">
              {String(v)}
            </Badge>
          ))}
        </div>
      );
    }
    return <span className="italic text-muted">{String(value || 'None reported')}</span>;
  }

  if (item.type === 'textarea') {
    return (
      <p className="whitespace-pre-wrap rounded-lg border border-border/60 bg-background p-2.5 text-xs text-text">
        {String(value)}
      </p>
    );
  }

  return <span className="font-semibold text-text">{String(value)}</span>;
}

export function getApprovalEntityTypeLabel(
  entityType: ApprovalEntityType,
  isMobile = false,
): string {
  switch (entityType) {
    case 'form_submission':
      return isMobile ? 'Form Registration' : 'Form';
    case 'recruitment_endorsement':
      return 'Endorsement';
    case 'service_excuse':
    default:
      return 'Long Leave';
  }
}

export function getApprovalEntityTypeBadgeVariant(
  entityType: ApprovalEntityType,
): 'secondary' | 'outline' {
  switch (entityType) {
    case 'form_submission':
      return 'secondary';
    case 'recruitment_endorsement':
    case 'service_excuse':
    default:
      return 'outline';
  }
}

export function getSundayDurationInfo(
  startDateStr?: string,
  endDateStr?: string,
): { sundays: number; days: number } | null {
  if (!startDateStr || !endDateStr) return null;
  const start = new Date(startDateStr);
  const end = new Date(endDateStr);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) {
    return null;
  }
  const diffTime = Math.abs(end.getTime() - start.getTime());
  const days = Math.round(diffTime / (1000 * 60 * 60 * 24)) + 1;
  let sundays = 0;
  const cur = new Date(start);
  while (cur <= end) {
    if (cur.getUTCDay() === 0) sundays++;
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return { sundays, days };
}

export function extractServicesList(servicesVal: unknown): string[] {
  if (Array.isArray(servicesVal)) {
    return servicesVal.map(String);
  }
  if (typeof servicesVal === 'string') {
    return servicesVal
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  }
  if (typeof servicesVal === 'object' && servicesVal !== null) {
    return Object.values(servicesVal).map(String);
  }
  return [];
}

export interface FormResponseEntry {
  key: string;
  label: string;
  value: unknown;
}

export function formatFormLabel(key: string): string {
  return key
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function extractFormSubmissionResponses(metadata?: Record<string, unknown> | null): {
  targetFieldLabel?: string;
  formSlug?: string;
  responses: FormResponseEntry[];
} {
  if (!metadata) return { responses: [] };

  const targetFieldLabel =
    typeof metadata.field_label === 'string' && metadata.field_label.trim()
      ? metadata.field_label.trim()
      : undefined;
  const formSlug =
    typeof metadata.form_slug === 'string' && metadata.form_slug.trim()
      ? metadata.form_slug.trim()
      : undefined;

  const internalKeys = new Set([
    'form_slug',
    'field_key',
    'field_label',
    'form_field_id',
    'access_token',
    'token_expires_at',
    'token',
    'responses',
  ]);

  const responses: FormResponseEntry[] = [];

  // 1. If metadata.responses exists, unpack it first
  if (typeof metadata.responses === 'object' && metadata.responses !== null) {
    for (const [key, val] of Object.entries(metadata.responses as Record<string, unknown>)) {
      if (val != null && val !== '') {
        responses.push({
          key: `response_${key}`,
          label: formatFormLabel(key),
          value: val,
        });
      }
    }
  }

  // 2. Unpack other non-internal keys in metadata
  for (const [key, val] of Object.entries(metadata)) {
    if (!internalKeys.has(key) && val != null && val !== '') {
      responses.push({
        key,
        label: formatFormLabel(key),
        value: val,
      });
    }
  }

  return { targetFieldLabel, formSlug, responses };
}

export function renderFormResponseRow(entry: FormResponseEntry): ReactNode {
  const { key, label, value } = entry;

  if (Array.isArray(value)) {
    return (
      <div
        key={key}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5 py-2.5 first:pt-0 last:pb-0"
      >
        <span className="text-xs font-medium text-muted sm:max-w-[60%]">{label}:</span>
        <div className="flex flex-wrap gap-1.5 sm:justify-end">
          {value.length > 0 ? (
            value.map((item, idx) => (
              <Badge key={idx} variant="outline" className="text-xs">
                {String(item)}
              </Badge>
            ))
          ) : (
            <span className="text-xs italic text-muted">None</span>
          )}
        </div>
      </div>
    );
  }

  if (typeof value === 'object' && value !== null) {
    return (
      <div key={key} className="py-2.5 first:pt-0 last:pb-0 space-y-1.5">
        <span className="text-xs font-medium text-muted">{label}</span>
        <div className="rounded-lg border border-border bg-background p-2.5 text-xs space-y-1.5">
          {Object.entries(value as Record<string, unknown>).map(([subK, subV]) => (
            <div
              key={subK}
              className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-1 border-b border-border/50 pb-1.5 last:border-b-0 last:pb-0"
            >
              <span className="text-muted capitalize shrink-0">{formatFormLabel(subK)}:</span>
              <span className="font-semibold text-text break-words sm:text-right">
                {typeof subV === 'object' ? JSON.stringify(subV) : String(subV ?? '—')}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const strVal = String(value ?? '');
  const isStatus = ['approved', 'rejected', 'declined', 'pending'].includes(strVal.toLowerCase());
  if (isStatus) {
    const variant =
      strVal.toLowerCase() === 'approved'
        ? 'default'
        : strVal.toLowerCase() === 'pending'
          ? 'secondary'
          : 'destructive';
    return (
      <div
        key={key}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5 py-2.5 first:pt-0 last:pb-0"
      >
        <span className="text-xs font-medium text-muted sm:max-w-[60%]">{label}:</span>
        <Badge variant={variant} className="capitalize">
          {strVal}
        </Badge>
      </div>
    );
  }

  if (typeof value === 'boolean') {
    return (
      <div
        key={key}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5 py-2.5 first:pt-0 last:pb-0"
      >
        <span className="text-xs font-medium text-muted sm:max-w-[60%]">{label}:</span>
        <Badge variant={value ? 'default' : 'outline'}>{value ? 'Yes' : 'No'}</Badge>
      </div>
    );
  }

  if (strVal.length > 60 || strVal.includes('\n')) {
    return (
      <div key={key} className="py-2.5 first:pt-0 last:pb-0 space-y-1">
        <span className="text-xs font-medium text-muted">{label}</span>
        <p className="whitespace-pre-wrap rounded-lg border border-border/60 bg-background p-2.5 text-xs text-text leading-relaxed">
          {strVal}
        </p>
      </div>
    );
  }

  return (
    <div
      key={key}
      className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5 py-2.5 first:pt-0 last:pb-0"
    >
      <span className="text-xs font-medium text-muted sm:max-w-[60%]">{label}:</span>
      <span className="text-xs font-semibold text-text sm:text-right break-words">{strVal}</span>
    </div>
  );
}
