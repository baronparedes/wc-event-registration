---
name: attendance-json-filter-translator
description: 'Translate plain-language attendance filter logic into the app\'s advanced JSON filter expression format (condition/group/not), including token mapping, boolean normalization, and validation checks.'
argument-hint: 'Provide the human-readable logic and (optionally) the source:field_key tokens for each field'
---

# Attendance JSON Filter Translator

Use this skill to convert natural-language boolean filter rules into the advanced JSON expression payload accepted by the attendance data view.

---

## When to Use This Skill

- You have human-readable logic and need valid JSON for Custom filter JSON.
- You need grouped `and`/`or` with nested parentheses.
- You need exclusions using `NOT`.
- You need multi-name matching (for example `Robel / Paredes`).
- You want reusable translation patterns for 9AM/12NN/3PM SLOD filters.

---

## Output Contract

Always output JSON with this root shape:

```json
{
  "expression": {
    "type": "group",
    "op": "and|or",
    "children": []
  }
}
```

Node types supported:

- `condition`: `{ "type": "condition", "filter": { "token": "source:field_key", "value": "..." } }`
- `group`: `{ "type": "group", "op": "and|or", "children": [...] }`
- `not`: `{ "type": "not", "child": <node> }`

---

## Translation Rules

1. Parentheses become `group` nodes.
2. `A AND B` becomes group with `op: "and"`.
3. `A OR B` becomes group with `op: "or"`.
4. `NOT X` becomes `{"type":"not","child":X}`.
5. `Field = A / B` becomes an `or` group of two `condition` nodes on the same field.
6. Preserve explicit user precedence exactly as written; do not simplify unless asked.
7. Keep comparisons exact-match strings (case-insensitive matching is handled by domain logic).

---

## Token Mapping

Use token format: `source:field_key`.

- Source is typically `attendance` for attendance assignment fields.
- Source is typically `registration` for registration form fields.

Example mapping:

- `9AM Area SLOD` -> `attendance:9am_area_slod`
- `12NN Area SLOD` -> `attendance:12nn_area_slod`
- `3PM Area SLOD` -> `attendance:3pm_area_slod`

If tokens are uncertain, request or infer from configured dynamic field options before finalizing.

---

## Boolean Safety Notes

For single-value fields:

- `(NOT Reserved OR NOT Not Serving)` is almost always true.
- Use `(NOT Reserved AND NOT Not Serving)` when the intent is to exclude both values.

Do not auto-correct this unless asked; call it out as a warning.

---

## Procedure

1. Parse user statement into a boolean tree.
2. Confirm field-to-token mapping.
3. Build nested `expression` JSON.
4. Validate structure:
   - Every `group` has at least one child.
   - Every `condition` has non-empty `token` and `value`.
   - `op` is only `and` or `or`.
5. Return JSON only unless user asks for explanation.
6. If useful, include a one-line warning for boolean tautologies.

---

## Reusable Patterns

### Pattern A: Per-slot include + dual exclude

Human logic:

`(SLOT = NAME AND NOT Reserved AND NOT Not Serving)`

JSON skeleton:

```json
{
  "type": "group",
  "op": "and",
  "children": [
    { "type": "condition", "filter": { "token": "<slot_token>", "value": "<name>" } },
    {
      "type": "not",
      "child": { "type": "condition", "filter": { "token": "<slot_token>", "value": "Reserved" } }
    },
    {
      "type": "not",
      "child": {
        "type": "condition",
        "filter": { "token": "<slot_token>", "value": "Not Serving" }
      }
    }
  ]
}
```

### Pattern B: Name alternatives

Human logic:

`FIELD = Robel / Paredes`

JSON skeleton:

```json
{
  "type": "group",
  "op": "or",
  "children": [
    { "type": "condition", "filter": { "token": "<field_token>", "value": "Robel" } },
    { "type": "condition", "filter": { "token": "<field_token>", "value": "Paredes" } }
  ]
}
```

### Pattern C: Slot-wide disjunction

Human logic:

`(9AM rule) OR (12NN rule) OR (3PM rule)`

JSON skeleton:

```json
{
  "expression": {
    "type": "group",
    "op": "or",
    "children": [
      { "type": "group", "op": "and", "children": [] },
      { "type": "group", "op": "and", "children": [] },
      { "type": "group", "op": "and", "children": [] }
    ]
  }
}
```

---

## Quick Prompt Template

Use this template when requesting translation:

```text
Translate to advanced JSON filter.
Fields to token map:
- 9AM Area SLOD = attendance:9am_area_slod
- 12NN Area SLOD = attendance:12nn_area_slod
- 3PM Area SLOD = attendance:3pm_area_slod
Logic:
(<put boolean logic here>)
Output:
JSON only
```

---

## Example (From Recent Use Case)

Human logic:

`(9AM = Robel / Paredes OR 12NN = Robel / Paredes OR 3PM = Robel / Paredes) AND (9AM NOT Reserved OR NOT Not Serving) AND (12NN NOT Reserved OR NOT Not Serving) AND (3PM NOT Reserved OR NOT Not Serving)`

Output shape: root `and` with 4 children:

- child 1: an `or` group containing six include conditions
- child 2: 9AM exclude `or` group
- child 3: 12NN exclude `or` group
- child 4: 3PM exclude `or` group
