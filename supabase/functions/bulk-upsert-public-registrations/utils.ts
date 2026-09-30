import { z } from '@/shared/validation.ts';

const bulkRowSchema = z.object({
  first_name: z.string().trim().min(1, 'first_name is required'),
  last_name: z.string().trim().min(1, 'last_name is required'),
  nickname: z.string().trim().optional(),
  email: z.string().trim().email('email must be a valid email address'),
  phone: z.string().trim().optional(),
  public_registration_id: z.string().trim().optional(),
  answers: z.record(z.string(), z.unknown()),
});

export const requestSchema = z.object({
  event_id: z.string().uuid('event_id must be a valid UUID'),
  rows: z.array(bulkRowSchema).min(1, 'rows must include at least one item'),
  uploaded_field_keys: z.array(z.string()).optional(),
});

export type RequestPayload = z.infer<typeof requestSchema>;
export type BulkRow = RequestPayload['rows'][number];

export function findDuplicateEmailIndexes(rows: readonly Pick<BulkRow, 'email'>[]): Set<number> {
  const counts = new Map<string, number>();
  for (const row of rows) {
    const email = row.email.trim().toLowerCase();
    counts.set(email, (counts.get(email) ?? 0) + 1);
  }

  return new Set(
    rows.flatMap((row, index) =>
      (counts.get(row.email.trim().toLowerCase()) ?? 0) > 1 ? [index] : [],
    ),
  );
}

export function toPublicRegistrationRpcRow(row: BulkRow) {
  return {
    first_name: row.first_name.trim(),
    last_name: row.last_name.trim(),
    nickname: row.nickname?.trim() ? row.nickname.trim() : null,
    email: row.email.trim(),
    phone: row.phone?.trim() ? row.phone.trim() : null,
  };
}
