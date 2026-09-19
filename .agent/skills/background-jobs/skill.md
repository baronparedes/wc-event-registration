# Background Job Queue Architecture

**Context:** This skill covers the design and constraints around asynchronous background jobs in the database.

**Instructions:**

- **Job Queue Extension:** The background job queue architecture strictly leverages the Supabase `pgmq` extension.
- **Execution Strategy:** Use `pg_net` to execute webhooks and Edge Functions immediately.
- **Reliability:** Use `pg_cron` to schedule a 15-minute sweeper and retry fallback mechanism to ensure jobs are completed even if immediate execution fails.
- **Archiving:** Ensure failed jobs are gracefully archived using a Dead Letter Queue (DLQ) mechanism.
