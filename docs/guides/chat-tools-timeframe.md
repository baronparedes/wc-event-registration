# Chat Tools — Timeframe Standardization Guide

## Overview

All chat tools that filter data by time use a standardized pattern:

- Tools accept **two optional ISO date parameters**: `targetStartDate` and `targetEndDate` (`YYYY-MM-DD`).
- **No tool does its own natural-language parsing.** The LLM resolves any user phrase into concrete dates _before_ calling a tool, using the current timestamp injected in the system prompt.
- Server-side logic in [`timeframes.ts`](../../supabase/functions/chat/tools/timeframes.ts) converts those date strings into `Date` objects and provides utilities for querying Sundays, month-day ranges, and fallbacks.

---

## Why this pattern?

### The old approach (removed)

Previously each tool normalized its own timeframe via enum mapping:

- `getUpcomingMilestones` — free-text `timeframe` string → `normalizeMilestoneTimeframe()` → `MilestoneTimeframe` enum
- `getExcusedMembers` / `getUserCommitments` — free-text `timeframe` string → `normalizeSundayTimeframe()` → `SundayTimeframe` enum (`coming_sunday | this_month | next_month`)
- `getEvents` — three-value `timeframe` enum (`upcoming | past | all`)

Problems with this:

1. **Inconsistent vocabularies** across tools (one expected `"this_month"`, another `"coming_sunday"`).
2. **Duplicate mapping logic** in every tool.
3. **Limited expressiveness** — "last 2 weeks" or "October 1–15" couldn't be expressed as a named enum.
4. `chrono-node` was imported to partially handle natural language but only inside `normalizeMilestoneTimeframe`, inconsistently.

### The new approach

The LLM is the parser. The system prompt instructs it to:

> _"BEFORE calling any tool, resolve the user's natural-language timeframe phrase into concrete `targetStartDate` and `targetEndDate` ISO strings using the injected current date as reference."_

This means:

- Tools receive **machine-readable dates**, never raw phrases.
- All parsing complexity lives in one place (the system prompt).
- Any timeframe expressible in natural language works automatically.
- `chrono-node` is no longer needed and has been removed.

---

## Tool parameter reference

| Tool                    | `targetStartDate` | `targetEndDate`   | Other timeframe params           | Fallback when both absent |
| ----------------------- | ----------------- | ----------------- | -------------------------------- | ------------------------- |
| `getUpcomingMilestones` | optional ISO date | optional ISO date | —                                | Current month             |
| `getExcusedMembers`     | optional ISO date | optional ISO date | —                                | Coming Sunday             |
| `getUserCommitments`    | optional ISO date | optional ISO date | `sunday_availability` pin        | Coming Sunday             |
| `getEvents`             | optional ISO date | optional ISO date | `timeframe: upcoming\|past\|all` | `timeframe` enum (`all`)  |

> **Note for `getEvents`:** The `timeframe` enum is kept as a lightweight directional shorthand for "upcoming" and "past" queries that don't need a precise date range. When `targetStartDate` or `targetEndDate` is provided, the enum is ignored and the DB query filters `starts_at` directly.

---

## `timeframes.ts` API

Located at [`supabase/functions/chat/tools/timeframes.ts`](../../supabase/functions/chat/tools/timeframes.ts).

### `resolveDateRange(targetStartDate?, targetEndDate?, fallback, now?): DateRange | null`

Resolves optional ISO date strings into a concrete `{ start: Date, end: Date }` range.

```typescript
type FallbackStrategy = 'this_month' | 'coming_sunday' | 'none';
type DateRange = { start: Date; end: Date };
```

| Scenario                             | Result                                     |
| ------------------------------------ | ------------------------------------------ |
| Both provided                        | `{ start, end }` from the parsed dates     |
| Only `start`                         | `{ start, end: start }` (single-day range) |
| Only `end`                           | `{ start: end, end }` (single-day range)   |
| Neither, `fallback: 'this_month'`    | First day → last day of current month      |
| Neither, `fallback: 'coming_sunday'` | The next Sunday (or today if Sunday)       |
| Neither, `fallback: 'none'`          | `null`                                     |

### `getSundaysInRange(range: DateRange): { date: Date; key: string }[]`

Returns all Sundays within a date range. The `key` is the occurrence-based metadata key used in `users.metadata` (e.g. `"first_sunday"`, `"second_sunday"`).

Used by `getExcusedMembers` and `getUserCommitments` to derive which Sundays to query.

```typescript
// Example: range spanning all of October 2026
getSundaysInRange({ start: new Date('2026-10-01'), end: new Date('2026-10-31') });
// → [
//     { date: Date('2026-10-04'), key: 'first_sunday' },
//     { date: Date('2026-10-11'), key: 'second_sunday' },
//     { date: Date('2026-10-18'), key: 'third_sunday' },
//     { date: Date('2026-10-25'), key: 'fourth_sunday' },
//   ]
```

### `isMonthDayInRange(month, day, range): boolean`

Year-agnostic birthday/anniversary check. Returns `true` if the month-day (e.g. March 15) falls on any day within the range, regardless of year.

Used by `getUpcomingMilestones` to match user birthdays and wedding anniversaries.

### `describeDateRange(range): { start_date: string; end_date: string }`

Formats a `DateRange` into a `YYYY-MM-DD` string pair for inclusion in tool responses. The LLM echoes these back to the user as the resolved timeframe.

### `parseIsoDate(value?): Date | null`

Parses an ISO string (`YYYY-MM-DD` or full ISO-8601) into a `Date` at noon local time. Returns `null` if the input is absent or unparseable.

### `formatDate(date): string`

Formats a `Date` as `YYYY-MM-DD`.

---

## System prompt — timeframe resolution rules

The relevant section in `getSystemPrompt()` in [`index.ts`](../../supabase/functions/chat/index.ts):

```
TIMEFRAME RESOLUTION (CRITICAL — follow this every time a tool call involves a date or time):
- All tools that filter by time accept optional targetStartDate and targetEndDate (ISO YYYY-MM-DD).
- BEFORE calling any such tool, resolve the user's natural-language phrase into concrete dates.
- Examples:
    "this Sunday"    → targetStartDate = targetEndDate = date of next Sunday
    "next month"     → targetStartDate = first day of next month, targetEndDate = last day
    "last 2 weeks"   → targetStartDate = 14 days ago, targetEndDate = today
    "October"        → targetStartDate = YYYY-10-01, targetEndDate = YYYY-10-31
    "upcoming"       → for getEvents, use timeframe: "upcoming" (no date params needed)
- NEVER pass a raw English phrase as a date value.
```

---

## Adding a new time-sensitive tool

1. Add `targetStartDate` and `targetEndDate` as optional Zod string fields to the tool's schema with descriptions telling the LLM to resolve natural language to ISO dates before calling.
2. Call `resolveDateRange(targetStartDate, targetEndDate, fallback)` at the top of `execute`.
3. Use the appropriate helper based on query type:
   - **Sunday-based** (volunteer schedules, excuses): `getSundaysInRange(range)`
   - **Anniversary/birthday**: `isMonthDayInRange(month, day, range)` or `getMonthDayKeysForRange(range)`
   - **Generic date filtering**: use `range.start` / `range.end` directly as ISO strings
4. Include `describeDateRange(range)` in the tool's return value so the LLM can relay the resolved period back to the user.
5. Update the system prompt's `TIMEFRAME RESOLUTION` section if the new tool needs special handling.

---

## What happened to `chrono-node`?

`chrono-node` (`npm:chrono-node@2.8.0`) was previously imported in `timeframes.ts` to partially handle natural-language parsing inside `normalizeMilestoneTimeframe`. It is **no longer used** — the import has been removed. The LLM now handles all natural-language-to-date resolution before tool invocation.
