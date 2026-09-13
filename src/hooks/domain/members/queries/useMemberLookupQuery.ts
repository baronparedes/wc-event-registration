import { useMutation } from '@tanstack/react-query';

import type {
  ExistingRegistrationState,
  ExistingSubmissionState,
  MemberLookupProfile,
  MemberLookupResult,
} from '@/lib/domain/members';
import { createEdgeFunctionCaller, logger } from '@/lib/infrastructure';

export type {
  MemberLookupProfile,
  ExistingRegistrationState,
  ExistingSubmissionState,
  MemberLookupResult,
};

interface MemberLookupResponse {
  success: true;
  profile: MemberLookupProfile | null;
  existing_registration: ExistingRegistrationState | null;
  existing_submission: ExistingSubmissionState | null;
}

const callMemberLookup = createEdgeFunctionCaller<
  { memberId?: string; name?: string; eventSlug?: string; formSlug?: string },
  MemberLookupResponse
>('member-lookup');

export type MemberLookupParams = {
  memberId?: string;
  name?: string;
  eventSlug?: string;
  formSlug?: string;
};

/**
 * Hook for member lookup in public registration flow.
 * Supports both ID-first lookup and name-based lookup.
 * Calls member-lookup Edge Function for member verification and profile retrieval.
 * Edge Function infers lookup type from which field is provided.
 *
 * @returns React Query mutation for looking up member by ID or name
 */
export function useMemberLookupQuery() {
  return useMutation<MemberLookupResult, Error, MemberLookupParams>({
    mutationFn: async ({ memberId, name, eventSlug, formSlug }) => {
      const normalizedMemberId = (memberId ?? '').trim();
      const normalizedName = (name ?? '').trim();

      if (!normalizedMemberId && !normalizedName) {
        return { profile: null, existing_registration: null, existing_submission: null };
      }

      logger.debug('Looking up member:', {
        memberId: normalizedMemberId || undefined,
        name: normalizedName || undefined,
      });
      const response = await callMemberLookup({
        memberId: normalizedMemberId || undefined,
        name: normalizedName || undefined,
        eventSlug,
        formSlug,
      });
      return {
        profile: response.profile,
        existing_registration: response.existing_registration ?? null,
        existing_submission: response.existing_submission ?? null,
      };
    },
    onError: (error) => {
      logger.error('Member lookup query error:', error);
    },
  });
}
