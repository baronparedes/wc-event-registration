---
name: edge-function-testing
description: 'Use when adding or improving tests for Supabase Edge Functions in this repository, including Deno unit tests, handler tests, fetch mocking, local Supabase integration tests, or incremental coverage work.'
---

# Supabase Edge Function Testing

## When to Use

- Add or improve tests for a Supabase Edge Function.
- Increase confidence in request validation, authorization, database behavior, or retries.
- Plan Edge Function coverage one function at a time.

## Repository Conventions

- Edge Function tests use Deno, not Vitest. Edge Functions are excluded from Vitest coverage.
- Put tests in a `__tests__/` subdirectory inside the function or shared module folder, for example `supabase/functions/member-lookup/__tests__/` and `supabase/functions/_shared/__tests__/`.
- Import the tested source module from the parent directory (for example, `../utils.ts`).
- Use the existing `@std/assert` and Deno test conventions unless the function already uses another local pattern.
- Preserve strict typing. Do not introduce `any` or use casts to silence an unresolved test seam.
- Keep `index.ts` as the deployed entry point. If importing it starts `Deno.serve` and prevents direct handler tests, extract the smallest useful handler boundary; do not broadly restructure the function just for tests.

## Test Layers

1. **Unit tests:** Test deterministic schemas, policy decisions, validation, and transforms directly. Keep them fast and independent of network, environment secrets, and a running Supabase project.
2. **Handler tests:** Exercise HTTP input and output, status codes, error mapping, and relevant Supabase interactions. Prefer mocking `globalThis.fetch` at the network boundary so the real Supabase client and query construction are exercised. Restore the fetch stub and any changed environment values after each test.
3. **Local Supabase integration tests:** Add only where correctness depends on real RLS, RPCs, database constraints, migrations, or local service behavior. Keep these distinct from unit tests and use the existing database test setup where applicable.

Do not replace useful pgTAP database coverage with mocked Edge Function tests, or duplicate every unit case in integration tests.

## Workflow

1. Work on one Edge Function per slice. Do not create tests for every function in a single pass unless the user explicitly asks for a bulk effort.
2. Read that function's entry point, shared helpers, database calls, existing tests, and relevant domain rules. Identify observable behavior and risk before editing.
3. List the important cases for the chosen function: valid request, invalid or missing input, authorization or rate-limit rejection where applicable, success behavior, database errors, and domain-specific branches such as duplicate handling or idempotency.
4. Add focused unit tests for pure behavior first. Keep helpers co-located and named for their responsibility; preserve established local names such as `utils.ts` when extending an existing function.
5. Add handler tests for externally visible behavior. Prefer the fetch boundary over hand-built mocks of Supabase's chained query API. Extract a small handler function only when needed to avoid importing a module with `Deno.serve` side effects.
6. Add local-Supabase integration coverage only for behavior that mocks cannot establish, especially RLS, RPC permissions, constraints, and migration interactions.
7. Run the focused test file first, then type-check the touched entry point. Run the complete Edge Function suite when the slice is ready or when shared behavior changed.
8. Stop after that function, summarize what is covered and what remains, and wait for the user to choose the next function.

## Validation Commands

From the repository root, run the full Edge Function test suite with:

```sh
npm run test:edge
```

For a focused test, run from `supabase/functions`:

```sh
deno test -A <function>/__tests__/
```

Type-check one function from the repository root with:

```sh
deno check --config supabase/functions/deno.json supabase/functions/<function>/index.ts
```

Use `npm run test:supabase` only when database integration coverage is part of the slice and its local Supabase prerequisites are available. Do not run `npm run ci:gate` for this focused workflow.

## Completion Report

Report the function covered, behaviors tested, commands and results, and notable untested integration risks. Do not imply that coverage added for one function covers the rest of the Edge Functions.
