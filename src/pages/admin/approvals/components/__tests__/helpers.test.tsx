import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { ApprovalEntityType } from '@/lib/domain/approvals';

import {
  extractFormSubmissionResponses,
  extractServicesList,
  formatFormLabel,
  getApprovalEntityTypeBadgeVariant,
  getApprovalEntityTypeLabel,
  getSundayDurationInfo,
  renderEndorsementAnswerValue,
  renderFormResponseRow,
} from '../helpers';

describe('helpers.ts', () => {
  describe('getSundayDurationInfo', () => {
    it('returns null if dates are missing or invalid', () => {
      expect(getSundayDurationInfo()).toBeNull();
      expect(getSundayDurationInfo('invalid-date', '2026-11-29')).toBeNull();
      expect(getSundayDurationInfo('2026-10-25', 'invalid-date')).toBeNull();
      expect(getSundayDurationInfo('2026-11-29', '2026-10-25')).toBeNull(); // start > end
    });

    it('calculates sundays and total days correctly', () => {
      // 2026-10-25 is Sunday, 2026-11-29 is Sunday (6 Sundays, 36 days)
      const res = getSundayDurationInfo('2026-10-25', '2026-11-29');
      expect(res).not.toBeNull();
      expect(res?.sundays).toBe(6);
      expect(res?.days).toBe(36);
    });
  });

  describe('extractServicesList', () => {
    it('handles arrays of strings', () => {
      expect(extractServicesList(['9AM', '12NN'])).toEqual(['9AM', '12NN']);
    });

    it('handles comma-separated strings', () => {
      expect(extractServicesList(' 9AM , 12NN , 3PM ')).toEqual(['9AM', '12NN', '3PM']);
    });

    it('handles object maps', () => {
      expect(extractServicesList({ 0: '9AM', 1: '12NN' })).toEqual(['9AM', '12NN']);
    });

    it('handles null, undefined, or unsupported values', () => {
      expect(extractServicesList(null)).toEqual([]);
      expect(extractServicesList(undefined)).toEqual([]);
      expect(extractServicesList(123)).toEqual([]);
    });
  });

  describe('formatFormLabel', () => {
    it('converts camelCase and snake_case into capitalized words', () => {
      expect(formatFormLabel('emergencyContact')).toBe('Emergency Contact');
      expect(formatFormLabel('leader_full_name')).toBe('Leader Full Name');
      expect(formatFormLabel('status')).toBe('Status');
    });
  });

  describe('extractFormSubmissionResponses', () => {
    it('returns empty responses if metadata is missing', () => {
      expect(extractFormSubmissionResponses(null)).toEqual({ responses: [] });
      expect(extractFormSubmissionResponses(undefined)).toEqual({ responses: [] });
    });

    it('extracts targetFieldLabel, formSlug, and responses correctly', () => {
      const metadata = {
        field_label: 'Pastoral Endorsement',
        form_slug: 'youth-camp-2026',
        access_token: 'secret-token', // should be ignored
        responses: {
          t_shirt_size: 'L',
          empty_val: '',
          null_val: null,
        },
        additional_comments: 'Excited to attend',
      };

      const result = extractFormSubmissionResponses(metadata);
      expect(result.targetFieldLabel).toBe('Pastoral Endorsement');
      expect(result.formSlug).toBe('youth-camp-2026');
      expect(result.responses).toEqual([
        {
          key: 'response_t_shirt_size',
          label: 'T Shirt Size',
          value: 'L',
        },
        {
          key: 'additional_comments',
          label: 'Additional Comments',
          value: 'Excited to attend',
        },
      ]);
    });
  });

  describe('renderFormResponseRow', () => {
    it('renders array with items and empty array', () => {
      const { getByText } = render(
        <>
          {renderFormResponseRow({ key: 'roles', label: 'Roles', value: ['Usher', 'Greeter'] })}
          {renderFormResponseRow({ key: 'empty_roles', label: 'Empty Roles', value: [] })}
        </>,
      );
      expect(getByText('Roles:')).toBeInTheDocument();
      expect(getByText('Usher')).toBeInTheDocument();
      expect(getByText('Greeter')).toBeInTheDocument();
      expect(getByText('Empty Roles:')).toBeInTheDocument();
      expect(getByText('None')).toBeInTheDocument();
    });

    it('renders nested object values', () => {
      const { getByText } = render(
        <>
          {renderFormResponseRow({
            key: 'contact',
            label: 'Emergency Contact',
            value: {
              fullName: 'Test Contact',
              nestedObject: { country: 'PH' },
              nullProp: null,
            },
          })}
        </>,
      );
      expect(getByText('Emergency Contact')).toBeInTheDocument();
      expect(getByText('Test Contact')).toBeInTheDocument();
      expect(getByText('{"country":"PH"}')).toBeInTheDocument();
    });

    it('renders status badges', () => {
      const { getByText } = render(
        <>
          {renderFormResponseRow({ key: 's1', label: 'Status 1', value: 'approved' })}
          {renderFormResponseRow({ key: 's2', label: 'Status 2', value: 'pending' })}
          {renderFormResponseRow({ key: 's3', label: 'Status 3', value: 'rejected' })}
        </>,
      );
      expect(getByText('approved')).toBeInTheDocument();
      expect(getByText('pending')).toBeInTheDocument();
      expect(getByText('rejected')).toBeInTheDocument();
    });

    it('renders boolean badges', () => {
      const { getByText } = render(
        <>
          {renderFormResponseRow({ key: 'b1', label: 'Agreed', value: true })}
          {renderFormResponseRow({ key: 'b2', label: 'Has License', value: false })}
        </>,
      );
      expect(getByText('Agreed:')).toBeInTheDocument();
      expect(getByText('Yes')).toBeInTheDocument();
      expect(getByText('Has License:')).toBeInTheDocument();
      expect(getByText('No')).toBeInTheDocument();
    });

    it('renders long text or multiline text in preformatted paragraph', () => {
      const longText = 'A'.repeat(70);
      const multiline = 'Line 1\nLine 2';
      const { getByText } = render(
        <>
          {renderFormResponseRow({ key: 'long', label: 'Long Text', value: longText })}
          {renderFormResponseRow({ key: 'multi', label: 'Multi Line', value: multiline })}
        </>,
      );
      expect(getByText(longText)).toBeInTheDocument();
      expect(
        getByText((_, el) => el?.tagName === 'P' && (el?.textContent?.includes('Line 1') ?? false)),
      ).toBeInTheDocument();
    });

    it('renders default simple string', () => {
      const { getByText } = render(
        renderFormResponseRow({ key: 'simple', label: 'Simple Field', value: 'Hello World' }),
      );
      expect(getByText('Simple Field:')).toBeInTheDocument();
      expect(getByText('Hello World')).toBeInTheDocument();
    });
  });

  describe('renderEndorsementAnswerValue', () => {
    it('handles empty / null values', () => {
      const { getByText } = render(
        <>{renderEndorsementAnswerValue({ key: 'k', label: 'L' }, null)}</>,
      );
      expect(getByText('—')).toBeInTheDocument();
    });

    it('handles rating values with and without score description', () => {
      const { getByText } = render(
        <>
          {renderEndorsementAnswerValue({ key: 'k1', label: 'L1', type: 'rating' }, 3)}
          {renderEndorsementAnswerValue({ key: 'k2', label: 'L2', type: 'rating' }, 99)}
        </>,
      );
      expect(getByText('3')).toBeInTheDocument();
      expect(getByText('(Observed Most of the time)')).toBeInTheDocument();
      expect(getByText('99')).toBeInTheDocument();
    });

    it('handles badge values across all status variants', () => {
      const { getByText } = render(
        <>
          {renderEndorsementAnswerValue({ key: 'b1', label: 'L', type: 'badge' }, 'I attest')}
          {renderEndorsementAnswerValue({ key: 'b2', label: 'L', type: 'badge' }, 'Yes')}
          {renderEndorsementAnswerValue(
            { key: 'b3', label: 'L', type: 'badge' },
            'I DO NOT attest',
          )}
          {renderEndorsementAnswerValue({ key: 'b4', label: 'L', type: 'badge' }, 'No')}
          {renderEndorsementAnswerValue(
            { key: 'b5', label: 'L', type: 'badge' },
            'Endorse with reservations',
          )}
          {renderEndorsementAnswerValue({ key: 'b6', label: 'L', type: 'badge' }, 'Other')}
        </>,
      );
      expect(getByText('I attest')).toBeInTheDocument();
      expect(getByText('Yes')).toBeInTheDocument();
      expect(getByText('I DO NOT attest')).toBeInTheDocument();
      expect(getByText('No')).toBeInTheDocument();
      expect(getByText('Endorse with reservations')).toBeInTheDocument();
      expect(getByText('Other')).toBeInTheDocument();
    });

    it('handles list values (array with items and non-empty string fallback)', () => {
      const { getByText } = render(
        <>
          {renderEndorsementAnswerValue({ key: 'l1', label: 'L', type: 'list' }, [
            'Concern 1',
            'Concern 2',
          ])}
          {renderEndorsementAnswerValue(
            { key: 'l2', label: 'L', type: 'list' },
            'No concerns disclosed',
          )}
        </>,
      );
      expect(getByText('Concern 1')).toBeInTheDocument();
      expect(getByText('Concern 2')).toBeInTheDocument();
      expect(getByText('No concerns disclosed')).toBeInTheDocument();
    });

    it('handles textarea values and generic text', () => {
      const { getByText } = render(
        <>
          {renderEndorsementAnswerValue(
            { key: 't1', label: 'L', type: 'textarea' },
            'Detailed review remarks',
          )}
          {renderEndorsementAnswerValue({ key: 't2', label: 'L' }, 'Short text')}
        </>,
      );
      expect(getByText('Detailed review remarks')).toBeInTheDocument();
      expect(getByText('Short text')).toBeInTheDocument();
    });
  });

  describe('getApprovalEntityTypeLabel & getApprovalEntityTypeBadgeVariant', () => {
    it('returns labels according to entity type and viewport', () => {
      expect(getApprovalEntityTypeLabel('form_submission', false)).toBe('Form');
      expect(getApprovalEntityTypeLabel('form_submission', true)).toBe('Form Registration');
      expect(getApprovalEntityTypeLabel('recruitment_endorsement')).toBe('Endorsement');
      expect(getApprovalEntityTypeLabel('service_excuse')).toBe('Long Leave');
      expect(getApprovalEntityTypeLabel('unknown' as unknown as ApprovalEntityType)).toBe(
        'Long Leave',
      );
    });

    it('returns badge variants according to entity type', () => {
      expect(getApprovalEntityTypeBadgeVariant('form_submission')).toBe('secondary');
      expect(getApprovalEntityTypeBadgeVariant('recruitment_endorsement')).toBe('outline');
      expect(getApprovalEntityTypeBadgeVariant('service_excuse')).toBe('outline');
      expect(getApprovalEntityTypeBadgeVariant('unknown' as unknown as ApprovalEntityType)).toBe(
        'outline',
      );
    });
  });
});
