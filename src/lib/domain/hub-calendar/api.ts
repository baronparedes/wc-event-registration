import type { TimeSlot } from '@/hooks/domain/members';
import { createEdgeFunctionCaller } from '@/lib/infrastructure';

import type { StandInCandidateInput } from './standIn';

export type RecommendStandInPayload = {
  targetDate: string;
  timeSlot: TimeSlot;
  role: string;
  excusedMemberToken?: string;
  neededCount?: number;
  candidates: StandInCandidateInput[];
};

export type StandInRecommendation = {
  candidateToken: string;
  rank: number;
  reasoning: string;
};

export type StandInInvitations = {
  sms: string;
  viber: string;
  whatsapp?: string;
  email: {
    subject: string;
    body: string;
  };
};

export type RecommendStandInResponse = {
  recommendations: StandInRecommendation[];
  invitations: StandInInvitations;
};

const callRecommendStandIn = createEdgeFunctionCaller<
  RecommendStandInPayload,
  { success: boolean; data: RecommendStandInResponse }
>('recommend-stand-in');

export async function recommendStandIn(
  payload: RecommendStandInPayload,
): Promise<RecommendStandInResponse> {
  const result = await callRecommendStandIn(payload);
  if (!result || !result.success || !result.data) {
    throw new Error('Failed to generate stand-in recommendation');
  }
  return result.data;
}
