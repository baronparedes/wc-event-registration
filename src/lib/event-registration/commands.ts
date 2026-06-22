import { supabase } from '../supabase'
import type { DynamicFieldResponseValues } from './types'

export interface SubmitRegistrationRequest {
  event_slug: string
  member_id: string
  responses: DynamicFieldResponseValues
  idempotency_key: string
}

export interface SubmitRegistrationSuccess {
  success: true
  registration_id: string
  status: 'submitted' | 'updated'
  is_new: boolean
  message: string
}

export interface SubmitRegistrationError {
  success: false
  error: string
  error_code?: string
  error_detail?: string
}

export type SubmitRegistrationResult = SubmitRegistrationSuccess | SubmitRegistrationError

/**
 * Submit registration response through secure SECURITY DEFINER RPC.
 * Handles duplicate policy logic, persistence, and idempotency.
 *
 * @param request - Contains event slug, member ID, form responses, and idempotency key
 * @returns Result object with success/error status and registration details
 */
export async function submitRegistrationResponse(
  request: SubmitRegistrationRequest,
): Promise<SubmitRegistrationResult> {
  const { event_slug, member_id, responses, idempotency_key } = request

  const { data, error } = await supabase.rpc('submit_registration_response', {
    p_event_slug: event_slug,
    p_member_id: member_id,
    p_responses: responses,
    p_idempotency_key: idempotency_key,
  })

  if (error) {
    return {
      success: false,
      error: 'Failed to submit registration',
      error_detail: error.message,
    }
  }

  // RPC returns JSONB with success/error structure
  const result = data as SubmitRegistrationSuccess | SubmitRegistrationError

  if (!result.success) {
    return result as SubmitRegistrationError
  }

  return result as SubmitRegistrationSuccess
}
