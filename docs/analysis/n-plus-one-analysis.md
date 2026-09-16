# N+1 Analysis of Supabase Edge Functions

1. `supabase/functions/chat/tools/getEvents.ts`
   - Line 114: `Promise.all` inside a `.map()` iterates over event `data` (up to 25 items based on schema limit) and fires two RPC calls (`get_event_registration_count` and `get_public_event_registration_count`) per iteration.
   - **Optimization:** These counts can be gathered in a single query by fetching group counts from `registrations` and `public_registrations` grouped by `event_id`, or by creating a unified RPC that takes an array of event IDs and returns both member and public counts in a single payload.

2. `supabase/functions/list-attendees/index.ts`
   - Line 237: `Promise.all` grouping `registrations` and `public_registrations`. (Concurrent queries, but not N+1 per se).
   - Line 348: `Promise.all` grouping `check_ins`, `public_check_ins`, `attendance_answers`, `public_attendance_answers`, `registration_answers`, and `public_registration_answers`. (Also concurrent queries, not N+1).

3. `supabase/functions/search-attendees/index.ts`
   - Line 353: `Promise.all` grouping `registrations` and `public_registrations` searches. (Concurrent, not N+1).
   - Line 462: `Promise.all` grouping check-ins and answers for the search results. (Concurrent, not N+1).

4. `supabase/functions/submit-registration-v2/handlers/resolveEventContext.ts`
   - Line 42: `Promise.all` fetching `event` and `user`. Followed by fetching `event_fields`. (Concurrent and sequential, but not strictly N+1 in a loop).

## Loop Query Patterns

1. `supabase/functions/bulk-upsert-registrations/index.ts`
   - Line 314: In a loop grouping member IDs into chunks, it queries `users` table via `adminClient.from('users').select(...).in('member_id', chunk)`.
   - **Optimization:** While this uses chunking to avoid query limit size errors, a single RPC call that accepts an array of strings could process the entire array without loop overhead or breaking it into chunks manually, reducing network round-trips.

2. `supabase/functions/bulk-upsert-attendance-answers/index.ts`
   - Line 422: Loops over chunks of `registrationIds` making sequential calls to `registrations` table.
   - Line 438: Loops over chunks of `publicRegistrationIds` making sequential calls to `public_registrations` table.
   - **Optimization:** Similar to above, a single RPC passing an array of UUIDs can offload the set intersection/filtering to Postgres.

3. `supabase/functions/submit-registration-v2/handlers/validateSlotCapacity.ts`
   - Line 80: Note: not in a loop, but directly uses `in('id', registrationUserIds)`.

4. `supabase/functions/submit-registration/index.ts`
   - Line 793: Directly queries `users` with `.in()`.

## Sequential Query Patterns

Several files exhibit sequential `await` patterns that are executed one after the other. While they do not iterate over arrays, they cause a cascading chain of network latency and could often be bundled using `Promise.all` or a unified Postgres function/RPC.

1. `supabase/functions/submit-registration/index.ts`
   - **Issue:** Makes up to 15 sequential queries during the registration lifecycle, including lookups for `events`, `users`, `event_fields`, idempotency checks, conflict checks, updates, and inserts (`registration_answers`, etc.).
   - **Optimization:** Consolidate the pre-checks (event lookup, user lookup, fields lookup, role-based slot validation) into a single read-only RPC `get_registration_context`. Consolidate mutations (idempotency, block policy, update/insert registration, delete/insert answers) into a single write RPC `apply_registration_submission`.

2. `supabase/functions/submit-public-registration/index.ts`
   - **Issue:** Makes up to 11 sequential queries mirroring the member registration flow above.
   - **Optimization:** Like above, wrap the pre-flight checks into `get_public_registration_context` and the mutation operations into `apply_public_registration_submission`.

3. `supabase/functions/submit-registration-v2/handlers/insertRegistration.ts` & `resolveEventContext.ts`
   - **Issue:** The V2 refactor shows attempts to improve structure, but `insertRegistration.ts` still performs up to 9 sequential mutations (checking idempotency, finding conflicts, upserting, cleaning answers, inserting answers).
   - **Optimization:** Offload these strict transactional multi-step operations entirely to a Postgres stored procedure.

4. `supabase/functions/submit-form-submission/index.ts`
   - **Issue:** 9 sequential queries handling form lookups, user validation, idempotency checks, and answer cleaning/insertions.
   - **Optimization:** Wrap pre-flight form and field lookups in one RPC, and the submission transaction in another.

5. `supabase/functions/member-lookup/index.ts`
   - **Issue:** 9 sequential queries validating roles, checking submissions, etc.
   - **Optimization:** Wrap user/member validation into a consolidated RPC.

6. `supabase/functions/check-in-attendee/index.ts`
   - **Issue:** 8 sequential queries for validating attendees, updating check-ins, tracking attendance answers.
   - **Optimization:** Use an `apply_checkin` RPC that takes an array of arguments, updates timestamps, and handles logic atomically in the database.

7. `supabase/functions/export-attendance-csv/index.ts` & `download-registrations-template/index.ts`
   - **Issue:** Multiple sequential fetches for event data, roles, users, registrations, check-ins.
   - **Optimization:** Bundle read queries with `Promise.all()` where they don't explicitly rely on the output of the preceding query, or execute a single joined query inside an RPC to flatten the export payload.

---

_This document was generated as part of a codebase technical debt analysis._
