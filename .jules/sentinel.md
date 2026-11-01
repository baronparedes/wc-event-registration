## 2025-05-24 - Cryptographically Insecure Randomness

**Vulnerability:** Found `Math.random()` being used to generate supposedly unique `batchId` values in `supabase/functions/cron-process-email-queue/outlookBatchDispatcher.ts`.
**Learning:** `Math.random()` is not cryptographically secure and may result in predictable values or collisions, particularly in edge functions processing concurrently.
**Prevention:** Use `crypto.randomUUID()` for generating secure, unique IDs.
