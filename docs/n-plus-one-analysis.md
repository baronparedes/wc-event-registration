# N+1 Analysis of Supabase Edge Functions

## Completed Optimizations

### Event Registration Counts

`supabase/functions/chat/tools/getEvents.ts` previously made two count RPC calls per event. It now calls `get_event_registration_counts` once with the event ID array and maps the returned member/public counts locally.

Implemented by:

- `supabase/migrations/20260915120000_add_event_registration_counts_rpc.sql`
- `supabase/migrations/20260915180000_omit_unknown_event_registration_counts.sql`
- `supabase/tests/event_registration_counts.test.sql`

The RPC groups both registration tables in PostgreSQL, deduplicates requested IDs, excludes cancelled rows, returns zero counts for known events without registrations, and omits unknown event IDs.

### Member Registration V2

The V2 member registration path no longer performs the previously documented event/user/field and mutation query chains.

- `resolveEventContext.ts` calls `get_registration_submission_context` for event metadata, member metadata, and active member fields.
- `insertRegistration.ts` calls `apply_registration_submission` for idempotency, duplicate-policy handling, insert/update behavior, and conflict recovery.
- `persistAnswers.ts` calls `persist_registration_answers` for answer replacement/insertion.

Implemented by:

- `supabase/migrations/20260915130000_add_registration_submission_context_rpc.sql`
- `supabase/migrations/20260915140000_add_apply_registration_submission_rpc.sql`
- `supabase/migrations/20260915150000_add_persist_registration_answers_rpc.sql`

### Public Registration Context and Mutation

The public registration path now uses:

- `get_public_registration_submission_context` for the published event and active guest fields.
- `apply_public_registration_submission` for insert, idempotency replay, duplicate blocking, compound-scope conflicts, and updates.

Implemented by:

- `supabase/migrations/20260915160000_add_public_registration_context_rpc.sql`
- `supabase/migrations/20260915170000_add_apply_public_registration_submission_rpc.sql`
- `supabase/functions/submit-public-registration/index.ts`
- `supabase/tests/public_registration_context.test.sql`
- `supabase/tests/apply_public_registration_submission.test.sql`

The public capacity checks and answer persistence still execute in the Edge Function. The old public mutation branch remains as a guarded compatibility fallback and should be removed after runtime verification of the RPC path.

## Not N+1

These grouped queries run concurrently and do not issue one query per result item:

- `supabase/functions/list-attendees/index.ts`
  - Registration and public-registration reads.
  - Check-ins and answer reads.
- `supabase/functions/search-attendees/index.ts`
  - Registration and public-registration searches.
  - Check-ins and answer reads.

The `Promise.all` calls in these functions are latency optimizations, not N+1 defects.

## Remaining Loop Query Patterns

### Bulk Member Resolution

`supabase/functions/bulk-upsert-registrations/index.ts` resolves member IDs in chunks of 200 with `.in('member_id', chunk)`.

This is intentional defensive behavior. Large PostgREST `.in(...)` filters can fail with a raw `URI too long` error, so replacing the chunks with one large request is not recommended. A future RPC could accept the complete CSV payload or a bounded array, but it should be benchmarked and preserve the current validation/error reporting behavior.

### Bulk Attendance Registration Validation

`supabase/functions/bulk-upsert-attendance-answers/index.ts` validates registered and public registration IDs in separate chunks of 200.

The two independent chunk loops could be executed concurrently with `Promise.all` to reduce latency. This would not remove the database work and should remain a lower-priority optimization. Keep chunking unless a database-side RPC is introduced with equivalent URI-safety and event-boundary validation.

## Remaining Sequential Query Patterns

### Public Capacity Queries: Highest Priority

`supabase/functions/submit-public-registration/index.ts` queries `public_registration_answers` once for each capacity-constrained field. An event with several constrained fields therefore creates several sequential reads.

Recommended next step:

1. Add one RPC that accepts the event field IDs, selected option values, and the current registration ID when updating.
2. Return usage counts grouped by field and option.
3. Keep option-capacity validation and user-facing error construction in the Edge Function.

This is the remaining clear per-field query loop in the public registration path.

### Legacy Member Registration Endpoint

`supabase/functions/submit-registration/index.ts` still contains the older sequential registration flow. The V2 flow has already replaced this behavior for current callers.

Before optimizing it, confirm whether the endpoint is still reachable from the frontend or retained for compatibility. If it is unused, prefer deprecation/removal over duplicating the V2 RPC work.

### Form Submission

`supabase/functions/submit-form-submission/index.ts` still performs sequential form lookup, validation, idempotency, answer deletion, and answer insertion work.

Potential follow-up:

- Add a read-only form submission context RPC for the form and active fields.
- Add a mutation RPC for idempotency and answer replacement.

This should follow the proven member/public registration pattern and include tests for new submission, replay, and update behavior.

### Member Lookup

`supabase/functions/member-lookup/index.ts` has several sequential validation and lookup operations. Profile the endpoint before consolidating them because lookup ambiguity and safety rules are user-visible. A context RPC is reasonable if the endpoint remains latency-sensitive.

### Check-In

`supabase/functions/check-in-attendee/index.ts` performs multiple dependent reads and writes. An `apply_checkin` RPC could make the operation atomic, but this has higher behavioral risk than the registration changes because it combines attendee resolution, first-check-in semantics, walk-in handling, and attendance answers. Treat it as a separate design task with concurrency tests.

### Export and Template Downloads

Review `supabase/functions/export-attendance-csv/index.ts` and `supabase/functions/download-registrations-template/index.ts` for independent reads that can safely use `Promise.all`. Prefer this small change before introducing export-specific RPCs, unless profiling shows the joined database query is materially faster.

## Recommended Order

1. Remove the guarded legacy mutation branch from `submit-public-registration/index.ts` after deployed/runtime verification.
2. Consolidate public capacity usage into one bounded RPC.
3. Profile and optimize form submission.
4. Confirm whether the legacy member endpoint is still used.
5. Evaluate check-in atomicity separately from general query-count cleanup.
6. Apply small `Promise.all` improvements to export/template reads where dependencies permit.

## Validation Status

The current database suite passes with 75 pgTAP assertions across 10 files. The frontend unit suite passes with 1,916 tests across 271 files, and `npm run ci:gate` passes.

The remaining items above are optimization candidates, not confirmed correctness defects. Measure request latency and query volume before expanding the RPC surface.
