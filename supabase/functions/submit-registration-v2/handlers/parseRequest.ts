import type { HandlerResult } from '@/shared/handler.ts';
import { decodeMemberLookupToken } from '@/shared/memberLookupToken.ts';
import { parseRequestBody, z } from '@/shared/validation.ts';

const submitRegistrationRequestSchema = z.object({
  event_slug: z.string().trim().min(1, 'event_slug is required'),
  member_token: z.string().trim().min(1, 'member_token is required'),
  responses: z.record(z.string(), z.unknown()),
  idempotency_key: z.string().trim().min(1, 'idempotency_key is required'),
});

export interface ParsedRequest {
  event_slug: string;
  member_id: string;
  responses: Record<string, unknown>;
  idempotency_key: string;
}

export async function parseRequest(req: Request): Promise<HandlerResult<ParsedRequest>> {
  const result = await parseRequestBody(req, submitRegistrationRequestSchema);
  if (!result.success) {
    return { ok: false, errorCode: 'INVALID_REQUEST', message: result.error, httpStatus: 400 };
  }

  const decodedToken = await decodeMemberLookupToken(result.data.member_token.trim());
  if (!decodedToken) {
    return {
      ok: false,
      errorCode: 'INVALID_REQUEST',
      message: 'Invalid request payload',
      httpStatus: 400,
    };
  }

  if (decodedToken.eventSlug && decodedToken.eventSlug !== result.data.event_slug) {
    return {
      ok: false,
      errorCode: 'INVALID_REQUEST',
      message: 'Invalid request payload',
      httpStatus: 400,
    };
  }

  return {
    ok: true,
    data: {
      event_slug: result.data.event_slug,
      member_id: decodedToken.memberId,
      responses: result.data.responses,
      idempotency_key: result.data.idempotency_key,
    },
  };
}
