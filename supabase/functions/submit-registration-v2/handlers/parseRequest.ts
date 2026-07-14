import type { HandlerResult } from '@/shared/handler.ts';
import { parseRequestBody, z } from '@/shared/validation.ts';

const submitRegistrationRequestSchema = z.object({
  event_slug: z.string().trim().min(1, 'event_slug is required'),
  member_id: z.string().trim().min(1, 'member_id is required'),
  responses: z.record(z.string(), z.unknown()),
  idempotency_key: z.string().trim().min(1, 'idempotency_key is required'),
});

export type ParsedRequest = z.infer<typeof submitRegistrationRequestSchema>;

export async function parseRequest(req: Request): Promise<HandlerResult<ParsedRequest>> {
  const result = await parseRequestBody(req, submitRegistrationRequestSchema);
  if (!result.success) {
    return { ok: false, errorCode: 'INVALID_REQUEST', message: result.error, httpStatus: 400 };
  }
  return { ok: true, data: result.data };
}
