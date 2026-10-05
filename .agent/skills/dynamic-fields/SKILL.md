---
name: dynamic-fields
description: >-
  Authoring, extending, and testing dynamic field types across Events, Forms, and Attendance domains.
  Covers the centralized Dynamic Field Registry (src/lib/domain/dynamic-fields/), Zod validation schema builders,
  response parsers, shared admin UI components (DynamicFieldTypeSelector, DynamicFieldValidationRulesSection),
  and modular renderers in src/components/fields/. Activate whenever adding, editing, or refactoring dynamic field types.
---

# Dynamic Fields Authoring & Maintenance Guide

**Context:** This skill governs how dynamic field types are created, configured, validated, rendered, and stored across Events, Attendance, and Forms.

**Full reference guide:** `docs/guides/dynamic-field-types.md`

---

## Architecture Overview

All dynamic fields follow a single, unified pipeline:

1. **Registry & Schema Definition**: `src/lib/domain/dynamic-fields/registry.ts` and `types.ts`
2. **Validation Builder**: `src/lib/domain/dynamic-fields/validation.ts` (`buildDynamicFieldResponseSchema`, `createFieldZodSchema`)
3. **Response Parsing & Defaults**: `src/lib/domain/dynamic-fields/parsing.ts` (`parseDynamicFieldResponseValue`, `createDynamicFieldDefaultValues`)
4. **Admin UI**: `src/components/ui/DynamicFieldTypeSelector.tsx` and `DynamicFieldValidationRulesSection.tsx`
5. **Renderers**: `src/components/fields/` (`TextFieldRenderer`, `RatingFieldRenderer`, `DateFieldRenderer`, `SelectFieldRenderer`, `CheckboxFieldRenderer`, `DynamicFieldRenderer`)

---

## 6-Step Checklist: Adding a New Field Type

Whenever a new `field_type` is introduced, complete every step below:

### 1. Database Migration (if check constraints exist)

Add a timestamped migration in `supabase/migrations/` updating the `field_type` check constraints on `event_fields`, `form_fields`, and `attendance_fields`.

### 2. TypeScript Types & Registry

- Add the type name to `DynamicFieldType` in `src/lib/domain/dynamic-fields/types.ts`.
- Register field metadata in `DYNAMIC_FIELD_DEFINITIONS` in `src/lib/domain/dynamic-fields/registry.ts`:
  - `type`: Exact string identifier
  - `label`: Human-friendly label
  - `description`: Subtext for admin selector
  - `category`: `'text' | 'choice' | 'date' | 'advanced'`
  - `iconName`: Lucide icon name
  - `defaultValue`: Initial empty value (`''`, `0`, `false`, `[]`, etc.)
  - `supportsOptions`: `true` if it uses selectable options
  - `supportsRoles`: `true` if options support role allotments
  - `validationRuleKeys`: Array of supported rule keys (e.g., `['required', 'min', 'max']`)

### 3. Zod Validation & Parsing

- In `src/lib/domain/dynamic-fields/validation.ts`, update `createFieldZodSchema` to construct the appropriate `z.ZodTypeAny` with custom error messages and boundary constraints.
- In `src/lib/domain/dynamic-fields/parsing.ts`, update `parseDynamicFieldResponseValue` to normalize submission payloads into clean, typed values.

### 4. Shared Renderers

- Create or update the field renderer in `src/components/fields/<Type>FieldRenderer.tsx` using `DynamicFieldLike` and `UseFormReturn<DynamicFieldResponseValues>`.
- Register the renderer in `renderFieldByType.tsx` and `DynamicFieldRenderer.tsx`.

### 5. Admin Validation Rules UI

- If the field type supports configurable validation settings (e.g. min/max, step, options), ensure `DynamicFieldValidationRulesSection.tsx` exposes the relevant input controls.

### 6. Tests & Verification

- Author test cases in:
  - `src/lib/domain/dynamic-fields/__tests__/registry.test.ts`
  - `src/lib/domain/dynamic-fields/__tests__/validation.test.ts`
  - `src/lib/domain/dynamic-fields/__tests__/parsing.test.ts`
- Run fast pre-commit verification:
  ```bash
  npm run precommit
  ```

---

## Core Rules & Invariants

1. **No Field Type Duplication**: Never hardcode separate field type lists in event, form, or attendance admin panels. Always consume `DYNAMIC_FIELD_DEFINITIONS` or `getFieldDefinitions()`.
2. **Strict Typing**: Never use `any` or disable ESLint rules. Use `DynamicFieldLike` for universal field compatibility.
3. **Safe Validation Fallbacks**: Coerce `field.validation_rules` safely as a dictionary and fall back to sensible defaults when rules are omitted or malformed.
