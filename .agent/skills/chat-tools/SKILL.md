---
name: chat-tools
description: >-
  Authoring and extending chat tools in supabase/functions/chat/tools/.
  Covers the standardized timeframe pattern (targetStartDate / targetEndDate),
  the timeframes.ts utility API, Zod schema conventions, system prompt rules,
  and the step-by-step checklist for adding a new tool.
  Activate when creating, modifying, or debugging any chat tool.
---

# Chat Tools Authoring Guide

**Context:** This skill governs how Supabase Edge Function chat tools are written in supabase/functions/chat/tools/. It enforces the standardized timeframe pattern and tool structure used across all existing tools.

**Full reference doc:** docs/guides/chat-tools-timeframe.md

---

## Timeframe Pattern (MANDATORY for any time-sensitive tool)

All tools that filter data by a date or time range MUST follow this pattern with no exceptions.

### Tool schema

Add two optional Zod string fields. Do NOT use enum timeframes or free-text timeframe strings.

    targetStartDate: z
      .string()
      .optional()
      .describe(
        "Start of the date range in YYYY-MM-DD format. Resolve any natural-language timeframe to a concrete date before calling this tool.",
      ),
    targetEndDate: z
      .string()
      .optional()
      .describe(
        "End of the date range in YYYY-MM-DD format. Resolve any natural-language timeframe to a concrete date before calling this tool.",
      ),

### Tool execute function

Call resolveDateRange immediately at the top of execute. Never do date math inline.

    import { resolveDateRange, getSundaysInRange, describeDateRange } from "./timeframes.ts";

    execute: async ({ targetStartDate, targetEndDate }) => {
      const now = new Date();
      const range = resolveDateRange(targetStartDate, targetEndDate, "coming_sunday", now);
      if (!range) return { error: "Could not resolve a date range." };
      const targetSundays = getSundaysInRange(range); // for Sunday-based queries
      return { timeframe: describeDateRange(range), ... };
    }

### Fallback strategy per tool type

- Volunteer schedules / excuses: coming_sunday
- Birthdays / anniversaries: this_month
- Generic / no default: none (return null, handle gracefully)

---

## timeframes.ts utility API

All helpers live in supabase/functions/chat/tools/timeframes.ts.

- resolveDateRange(start?, end?, fallback, now?) - Resolve ISO strings to DateRange or null
- getSundaysInRange(range) - All Sundays + their users.metadata key within range
- isMonthDayInRange(month, day, range) - Year-agnostic birthday/anniversary check
- getMonthDayKeysForRange(range) - Set of M-D strings for the range
- describeDateRange(range) - Returns { start_date, end_date } for tool output
- parseIsoDate(str?) - ISO string to Date at noon local, or null
- formatDate(date) - Date to YYYY-MM-DD string

---

## Tool file conventions

- One tool per file, named get<EntityName>.ts
- Export a single factory: createGet<EntityName>Tool({ client, requestId }: ToolContext)
- Return tool({ description, parameters: schema, execute }) from npm:ai@latest
- Use z from npm:zod for all schemas
- Log at entry with console.log("[chat:tool:<name>] Executing", { ...params, requestId })
- On DB error, return { error: errorMessage } and never throw

---

## Registering a new tool

1. Create supabase/functions/chat/tools/getMyThing.ts
2. Export the factory from supabase/functions/chat/tools/index.ts
3. Add it to createChatTools() in index.ts
4. Update the system prompt in supabase/functions/chat/index.ts with a numbered rule
   describing when to call the tool. The existing TIMEFRAME RESOLUTION block already
   handles natural-language date parsing; no extra prompt work needed unless the tool
   has unusual date semantics.

---

## What NOT to do

- Do NOT add a timeframe string parameter and normalize it inside the tool
- Do NOT import chrono-node - it has been removed; the LLM does the parsing
- Do NOT define MilestoneTimeframe, SundayTimeframe, or similar enums - they are gone
- Do NOT hardcode date offsets or keyword-matching logic inside a tool
- Do NOT call new Date() to build a range inline - always use resolveDateRange
