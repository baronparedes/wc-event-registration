import type {
  BlueprintDynamicField,
  BlueprintDynamicFieldType,
  EntityAudience,
  EntityBlueprintDomain,
  GenerateEntityBlueprintPayload,
  GenerateEntityBlueprintResponse,
} from './types.ts';

const ALLOWED_FIELD_TYPES: Set<BlueprintDynamicFieldType> = new Set([
  'text',
  'textarea',
  'number',
  'email',
  'phone',
  'select',
  'radio',
  'checkbox',
  'multi_select',
  'date',
  'rating',
  'boolean',
]);

export function getSystemPrompt(domain: EntityBlueprintDomain): string {
  const isEvent = domain === 'event';

  return `You are an expert ministry operations architect for the Welcome Center at Christ's Commission Fellowship (CCF).
Your task is to generate a comprehensive, production-ready ${isEvent ? 'Event' : 'Form'} Blueprint based on natural language requirements or rough administrative notes.

The blueprint consists of two parts:
1. "metadata": High-level configuration of the ${isEvent ? 'event' : 'form'}.
2. "fields": An array of custom registration / survey questions conforming to Welcome Hub's dynamic field specifications.

EDITORIAL EXCELLENCE & ANTI-SLOP RULES:
- Zero AI Slop & Buzzwords: Do NOT use corporate or generic filler words (e.g., "delve", "tapestry", "embark", "beacon", "foster", "elevate", "vibrant", "supercharge", "unleash", "in this journey", "vital role", "seamless").
- Direct, Human & Pastoral Voice: Write clear, authentic, and welcoming descriptions suitable for church members, ministry volunteers, and guests.
- Action-Oriented: Keep descriptions focused on logistics, purpose, schedule, and registration details. Use Markdown formatting (headings, bullet points) inside "description".

METADATA SPECIFICATIONS:
- "title": Concise, descriptive title (<= 100 characters).
- "slug": URL-friendly kebab-case slug matching the title (e.g. "couples-retreat-2026").
- "description": Markdown-formatted description explaining the event/form, schedule, what to bring/expect, and guidelines (approx 100-300 words).
${
  isEvent
    ? `- "location": Venue name or room (e.g. "Main Auditorium / Multi-Purpose Hall"). Max 100 characters.
- "starts_at": ISO 8601 string or "YYYY-MM-DDTHH:mm" for when the event starts. If dates/times are mentioned in the prompt, extract and use them. If not mentioned, propose an upcoming sensible date (e.g. a future Saturday at 09:00).
- "ends_at": ISO 8601 string or "YYYY-MM-DDTHH:mm" for when the event ends (must be after starts_at, e.g. same day at 17:00).
- "registration_opens_at": ISO 8601 string or "YYYY-MM-DDTHH:mm" for when registration begins (typically today or a few weeks prior).
- "registration_closes_at": ISO 8601 string or "YYYY-MM-DDTHH:mm" for when registration closes (must be after registration_opens_at and before or on starts_at, e.g. 1 day prior at 23:59).
- "suggested_duration_hours": Approximate event length in hours (number, e.g. 3).
- "registration_mode": "open" (standard) or "closed".`
    : ''
}
- "audience": "members", "public", or "members_and_public".
- "duplicate_policy": "block" (prevent duplicate registrations) or "allow_update".

DYNAMIC FIELDS SPECIFICATIONS:
Generate relevant, thoughtful questions for attendees. Each field object in "fields" must strictly include:
- "field_key": Lowercase snake_case identifier (e.g. "dietary_restrictions", "emergency_contact_phone"). MUST be unique across the list.
- "label": Friendly, user-facing label/question (e.g. "Do you have any dietary restrictions?").
- "field_type": Must be one of:
  - "text": Short single-line text (names, company, etc.)
  - "textarea": Multi-line text (notes, prayer requests, medical conditions)
  - "number": Integer/decimal input (age, number of guests)
  - "email": Email address
  - "phone": Contact number
  - "select": Dropdown single choice (preferred session, t-shirt size)
  - "radio": Radio buttons single choice (yes/no, attendance mode)
  - "checkbox": Single boolean toggle
  - "multi_select": Multiple choices selection (interests, ministry areas)
  - "date": Date picker (birthdate, anniversary)
  - "rating": 1-5 star scale (for feedback/surveys)
  - "boolean": Yes/No confirmation
- "is_required": boolean (true for essential information, false for optional).
- "placeholder": Short example text for the input or null.
- "help_text": Contextual helper text underneath the field or null.
- "options": For choice types ("select", "radio", "multi_select"), provide an array of objects: [{ "label": "Yes", "value": "yes" }, { "label": "No", "value": "no" }]. For other types, output empty array [].
- "validation_rules": Optional object containing:
  - "visibility_rule": For conditional branching. When a field should only appear based on a prior choice (e.g., question "Do you have dietary restrictions?" [yes/no] -> dependent text question "Please specify your dietary restrictions" only shows when "dietary_restrictions" equals "yes"):
    {
      "depends_on_field_key": "dietary_restrictions",
      "equals_value": "yes"
    }
  - "min_length", "max_length", "min", "max" if applicable.

PRIVACY & SAFETY:
- Do NOT output real personal PII (real personal telephone numbers or actual private emails).

FORMAT REQUIREMENT:
Return ONLY a valid JSON object matching the exact structure below, without Markdown code fences or external commentary:
{
  "metadata": {
    "title": "string",
    "slug": "string",
    "description": "string",
    ${
      isEvent
        ? '"location": "string",\n    "starts_at": "YYYY-MM-DDTHH:mm",\n    "ends_at": "YYYY-MM-DDTHH:mm",\n    "registration_opens_at": "YYYY-MM-DDTHH:mm",\n    "registration_closes_at": "YYYY-MM-DDTHH:mm",\n    "suggested_duration_hours": 3,\n    "registration_mode": "open",'
        : ''
    }
    "audience": "members_and_public",
    "duplicate_policy": "block"
  },
  "fields": [
    {
      "field_key": "string",
      "label": "string",
      "field_type": "text",
      "is_required": true,
      "placeholder": "string | null",
      "help_text": "string | null",
      "options": [],
      "validation_rules": {}
    }
  ]
}`;
}

export function getUserPrompt(payload: GenerateEntityBlueprintPayload): string {
  const { domain, prompt, audiencePreference } = payload;

  let audienceInstruction = '';
  if (audiencePreference) {
    audienceInstruction = `Target Audience Preference: ${audiencePreference}\n`;
  }

  return `Entity Domain: ${domain.toUpperCase()}
${audienceInstruction}
Input Prompt / Event Requirements:
"""
${prompt.trim()}
"""

Generate the complete JSON blueprint for this ${domain}. Include both the metadata and the dynamic fields list with appropriate types, options, and conditional visibility rules where logical. Output ONLY the JSON object.`;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

function sanitizeFieldKey(key: string, index: number): string {
  const sanitized = key
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, '_')
    .replace(/^_+|_+$/g, '');
  return sanitized || `field_${index + 1}`;
}

function sanitizeDatetimeLocal(raw: unknown): string | null {
  if (typeof raw !== 'string' || !raw.trim()) return null;
  const str = raw.trim();
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(str)) {
    return str;
  }
  const date = new Date(str);
  if (Number.isNaN(date.getTime())) return null;
  try {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Manila',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).formatToParts(date);

    const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '00';
    return `${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}`;
  } catch {
    return date.toISOString().slice(0, 16);
  }
}

function generateFallbackEventDates(durationHours = 3): {
  starts_at: string;
  ends_at: string;
  registration_opens_at: string;
  registration_closes_at: string;
} {
  const now = new Date();
  const eventDate = new Date(now.getTime() + 21 * 24 * 60 * 60 * 1000);
  const day = eventDate.getDay();
  const diffToSaturday = (6 - day + 7) % 7;
  eventDate.setDate(eventDate.getDate() + diffToSaturday);
  eventDate.setHours(9, 0, 0, 0);

  const endDate = new Date(eventDate.getTime() + durationHours * 60 * 60 * 1000);

  const regOpenDate = new Date(now.getTime());
  regOpenDate.setHours(8, 0, 0, 0);

  const regCloseDate = new Date(eventDate.getTime() - 24 * 60 * 60 * 1000);
  regCloseDate.setHours(23, 59, 0, 0);

  const pad = (n: number) => String(n).padStart(2, '0');
  const format = (d: Date) =>
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;

  return {
    starts_at: format(eventDate),
    ends_at: format(endDate),
    registration_opens_at: format(regOpenDate),
    registration_closes_at: format(regCloseDate),
  };
}

export function parseBlueprintResponse(
  rawText: string,
  domain: EntityBlueprintDomain,
  requestedAudience?: EntityAudience,
): GenerateEntityBlueprintResponse {
  let cleaned = rawText.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();
  }

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(cleaned);
  } catch (err) {
    throw new Error(
      `Failed to parse AI blueprint response as JSON: ${err instanceof Error ? err.message : String(err)}`,
      { cause: err },
    );
  }

  const rawMeta = (parsed?.metadata as Record<string, unknown>) ?? {};
  const rawFields = Array.isArray(parsed?.fields)
    ? (parsed.fields as Record<string, unknown>[])
    : [];

  const rawTitle =
    String(rawMeta.title || '').trim() || (domain === 'event' ? 'New Event' : 'New Form');
  const title = rawTitle.slice(0, 100);
  const slug = String(rawMeta.slug || '').trim() ? slugify(String(rawMeta.slug)) : slugify(title);
  const description =
    String(rawMeta.description || '').trim() ||
    `Welcome to ${title}. Please fill out the registration below.`;

  const validAudiences: EntityAudience[] = ['members', 'public', 'members_and_public'];
  let audience: EntityAudience = requestedAudience ?? 'members_and_public';
  if (
    typeof rawMeta.audience === 'string' &&
    validAudiences.includes(rawMeta.audience as EntityAudience)
  ) {
    audience = rawMeta.audience as EntityAudience;
  }

  const validPolicies = ['block', 'allow_update', 'allow_multiple'] as const;
  let duplicate_policy: (typeof validPolicies)[number] = 'block';
  if (
    typeof rawMeta.duplicate_policy === 'string' &&
    validPolicies.includes(rawMeta.duplicate_policy as (typeof validPolicies)[number])
  ) {
    duplicate_policy = rawMeta.duplicate_policy as (typeof validPolicies)[number];
  }

  const metadata: GenerateEntityBlueprintResponse['metadata'] = {
    title,
    slug,
    description,
    audience,
    duplicate_policy,
  };

  if (domain === 'event') {
    metadata.location = String(rawMeta.location || 'CCF Center').slice(0, 100);
    metadata.registration_mode = rawMeta.registration_mode === 'closed' ? 'closed' : 'open';
    const durationHours =
      typeof rawMeta.suggested_duration_hours === 'number' &&
      !Number.isNaN(rawMeta.suggested_duration_hours)
        ? Math.max(1, Math.min(24, rawMeta.suggested_duration_hours))
        : 3;
    metadata.suggested_duration_hours = durationHours;

    const fallbackDates = generateFallbackEventDates(durationHours);
    const startsAt = sanitizeDatetimeLocal(rawMeta.starts_at) || fallbackDates.starts_at;
    let endsAt = sanitizeDatetimeLocal(rawMeta.ends_at);
    if (!endsAt || endsAt <= startsAt) {
      const parsedStart = new Date(startsAt);
      if (!Number.isNaN(parsedStart.getTime())) {
        const computedEnd = new Date(parsedStart.getTime() + durationHours * 60 * 60 * 1000);
        const pad = (n: number) => String(n).padStart(2, '0');
        endsAt = `${computedEnd.getFullYear()}-${pad(computedEnd.getMonth() + 1)}-${pad(computedEnd.getDate())}T${pad(computedEnd.getHours())}:${pad(computedEnd.getMinutes())}`;
      } else {
        endsAt = fallbackDates.ends_at;
      }
    }

    const regOpensAt =
      sanitizeDatetimeLocal(rawMeta.registration_opens_at) || fallbackDates.registration_opens_at;
    let regClosesAt = sanitizeDatetimeLocal(rawMeta.registration_closes_at);
    if (!regClosesAt || regClosesAt <= regOpensAt) {
      regClosesAt = fallbackDates.registration_closes_at;
    }

    metadata.starts_at = startsAt;
    metadata.ends_at = endsAt;
    metadata.registration_opens_at = regOpensAt;
    metadata.registration_closes_at = regClosesAt;
  }

  // Process & sanitize fields
  const seenKeys = new Set<string>();
  const sanitizedFields: BlueprintDynamicField[] = [];

  for (let i = 0; i < rawFields.length; i++) {
    const rf = rawFields[i];
    if (!rf || typeof rf !== 'object') continue;

    let fieldKey = sanitizeFieldKey(String(rf.field_key || `field_${i + 1}`), i);
    if (seenKeys.has(fieldKey)) {
      fieldKey = `${fieldKey}_${i + 1}`;
    }
    seenKeys.add(fieldKey);

    const label = String(rf.label || `Question ${i + 1}`)
      .trim()
      .slice(0, 200);
    const rawType = String(rf.field_type || 'text').toLowerCase();
    const fieldType: BlueprintDynamicFieldType = ALLOWED_FIELD_TYPES.has(
      rawType as BlueprintDynamicFieldType,
    )
      ? (rawType as BlueprintDynamicFieldType)
      : 'text';

    const isRequired = typeof rf.is_required === 'boolean' ? rf.is_required : false;
    const placeholder =
      typeof rf.placeholder === 'string' && rf.placeholder.trim()
        ? rf.placeholder.trim().slice(0, 100)
        : null;
    const helpText =
      typeof rf.help_text === 'string' && rf.help_text.trim()
        ? rf.help_text.trim().slice(0, 300)
        : null;

    // Sanitize options
    const options: Array<{ label: string; value: string }> = [];
    if (Array.isArray(rf.options)) {
      for (const opt of rf.options) {
        if (opt && typeof opt === 'object') {
          const optLabel = String((opt as Record<string, unknown>).label || '').trim();
          const rawVal = String((opt as Record<string, unknown>).value || optLabel).trim();
          const optVal =
            rawVal.toLowerCase().replace(/[^a-z0-9_-]+/g, '_') || `opt_${options.length + 1}`;
          if (optLabel) {
            options.push({ label: optLabel.slice(0, 100), value: optVal.slice(0, 50) });
          }
        }
      }
    }

    // Sanitize validation rules
    const rawRules = (rf.validation_rules as Record<string, unknown>) ?? {};
    const validationRules: BlueprintDynamicField['validation_rules'] = {};

    if (rawRules.visibility_rule && typeof rawRules.visibility_rule === 'object') {
      const vr = rawRules.visibility_rule as Record<string, unknown>;
      const depKey = String(vr.depends_on_field_key || '')
        .trim()
        .toLowerCase();
      const eqVal = String(vr.equals_value || '').trim();
      // Only keep visibility rule if it targets an existing earlier field
      if (depKey && eqVal && seenKeys.has(depKey) && depKey !== fieldKey) {
        validationRules.visibility_rule = {
          depends_on_field_key: depKey,
          equals_value: eqVal,
        };
      }
    }

    if (typeof rawRules.min === 'number') validationRules.min = rawRules.min;
    if (typeof rawRules.max === 'number') validationRules.max = rawRules.max;
    if (typeof rawRules.min_length === 'number') validationRules.min_length = rawRules.min_length;
    if (typeof rawRules.max_length === 'number') validationRules.max_length = rawRules.max_length;

    sanitizedFields.push({
      field_key: fieldKey,
      label,
      field_type: fieldType,
      is_required: isRequired,
      placeholder,
      help_text: helpText,
      options,
      validation_rules: validationRules,
    });
  }

  return {
    success: true,
    domain,
    metadata,
    fields: sanitizedFields,
  };
}
