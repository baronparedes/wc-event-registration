import { RATE_LIMIT_PRESETS } from '@/shared/constants.ts';
import { useEdgeHook } from '@/shared/edge.ts';
import {
  errorResponse as sharedErrorResponse,
  successResponse as sharedSuccessResponse,
} from '@/shared/http.ts';
import { tryConvertRfidInput } from '@/shared/rfid.ts';
import { parseRequestBody, z } from '@/shared/validation.ts';

const memberLookupRequestSchema = z
  .object({
    memberId: z.string().trim().min(1).optional(),
    name: z.string().trim().min(1).optional(),
    eventSlug: z.string().trim().min(1).optional(),
  })
  .refine((value) => Boolean(value.memberId || value.name), {
    message: 'Either memberId or name must be provided',
    path: ['memberId'],
  });

type MemberLookupRequest = z.infer<typeof memberLookupRequestSchema>;

interface MemberLookupProfile {
  user_id: string;
  member_id: string;
  role: string;
  category: string;
  full_name: string;
  nickname: string | null;
  first_name: string | null;
  last_name: string | null;
}

interface ExistingRegistrationState {
  exists: boolean;
  edit_allowed: boolean;
  status: 'submitted' | 'updated' | 'cancelled';
  responses: Record<string, unknown>;
}

type AnswerRow = {
  answer_text: string | null;
  answer_number: number | null;
  answer_boolean: boolean | null;
  answer_date: string | null;
  answer_json: unknown | null;
  event_fields: { field_key: string } | { field_key: string }[] | null;
};

type UserLookupRow = {
  id: string;
  member_id: string;
  role: string;
  category: string;
  full_name: string;
  nickname: string | null;
  first_name: string | null;
  last_name: string | null;
};

type EventLookupRow = {
  id: string;
  duplicate_policy: string;
  metadata: unknown;
};

type ExistingRegistrationLookupResult = {
  data: ExistingRegistrationState | null;
  error: string | null;
};

function normalizeName(value: string | null | undefined) {
  return (value ?? '').toLowerCase().replace(/\s+/g, ' ').trim();
}

function tokenizeName(value: string): string[] {
  return normalizeName(value)
    .split(' ')
    .map((token) => token.trim())
    .filter((token) => token.length > 0);
}

function escapeOrFilterValue(value: string): string {
  return value.replace(/[,%_]/g, (char) => `\\${char}`);
}

function buildNameLookupFilter(tokens: string[]): string {
  const escapedTokens = tokens.map((token) => escapeOrFilterValue(token));
  const firstToken = escapedTokens[0] ?? '';
  const lastToken = escapedTokens[escapedTokens.length - 1] ?? '';
  const aggregatePattern = `%${escapedTokens.join('%')}%`;
  const filters = new Set<string>();

  if (firstToken) {
    filters.add(`first_name.ilike.%${firstToken}%`);
    filters.add(`nickname.ilike.%${firstToken}%`);
  }

  if (lastToken && lastToken !== firstToken) {
    filters.add(`last_name.ilike.%${lastToken}%`);
  }

  filters.add(`full_name.ilike.${aggregatePattern}`);

  if (firstToken && lastToken && tokens.length >= 2) {
    filters.add(
      `and(first_name.not.is.null,last_name.not.is.null,first_name.ilike.%${firstToken}%,last_name.ilike.%${lastToken}%)`,
    );
    filters.add(
      `and(nickname.not.is.null,last_name.not.is.null,nickname.ilike.%${firstToken}%,last_name.ilike.%${lastToken}%)`,
    );
  }

  return Array.from(filters).join(',');
}

function hasOrderedTokenMatch(candidate: string, search: string): boolean {
  const candidateTokens = tokenizeName(candidate);
  const searchTokens = tokenizeName(search);

  if (searchTokens.length === 0 || candidateTokens.length === 0) {
    return false;
  }

  let candidateIndex = 0;
  for (const searchToken of searchTokens) {
    while (
      candidateIndex < candidateTokens.length &&
      candidateTokens[candidateIndex] !== searchToken
    ) {
      candidateIndex += 1;
    }

    if (candidateIndex === candidateTokens.length) {
      return false;
    }

    candidateIndex += 1;
  }

  return true;
}

function readString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function toProfile(row: UserLookupRow | null): MemberLookupProfile | null {
  if (!row) return null;
  return {
    user_id: row.id,
    member_id: row.member_id,
    role: readString(row.role),
    category: readString(row.category),
    full_name: row.full_name,
    nickname: row.nickname,
    first_name: row.first_name,
    last_name: row.last_name,
  };
}

function getAnswerValue(row: AnswerRow): unknown {
  if (row.answer_json !== null) return row.answer_json;
  if (row.answer_boolean !== null) return row.answer_boolean;
  if (row.answer_number !== null) return row.answer_number;
  if (row.answer_date !== null) return row.answer_date;
  if (row.answer_text !== null) {
    try {
      return JSON.parse(row.answer_text);
    } catch {
      return row.answer_text;
    }
  }
  return null;
}

function getFieldKey(eventFields: AnswerRow['event_fields']): string | null {
  if (!eventFields) return null;
  if (Array.isArray(eventFields)) {
    return eventFields[0]?.field_key ?? null;
  }
  return eventFields.field_key ?? null;
}

function mapAnswerRowsToResponses(rows: AnswerRow[] | null | undefined): Record<string, unknown> {
  const responses: Record<string, unknown> = {};
  for (const row of rows ?? []) {
    const fieldKey = getFieldKey(row.event_fields);
    if (!fieldKey) continue;

    const value = getAnswerValue(row);
    if (value !== null) {
      responses[fieldKey] = value;
    }
  }
  return responses;
}

async function findUserByNameOrNickname(
  supabase: ReturnType<typeof createClient>,
  normalizedSearchValue: string,
) {
  const searchTokens = tokenizeName(normalizedSearchValue);
  if (searchTokens.length === 0) {
    return { data: null as UserLookupRow | null, error: null };
  }

  const nameFilter = buildNameLookupFilter(searchTokens);

  const { data: users, error } = await supabase
    .from('users')
    .select('id, member_id, role, category, full_name, nickname, first_name, last_name')
    .eq('is_active', true)
    .not('last_name', 'is', null)
    .or(nameFilter)
    .limit(200);

  if (error) {
    return { data: null as UserLookupRow | null, error: error.message };
  }

  const matches = (users ?? []).filter((user) => {
    const firstNameWithLastName = normalizeName(`${user.first_name ?? ''} ${user.last_name ?? ''}`);
    const nicknameWithLastName = normalizeName(`${user.nickname ?? ''} ${user.last_name ?? ''}`);

    return (
      firstNameWithLastName.includes(normalizedSearchValue) ||
      nicknameWithLastName.includes(normalizedSearchValue) ||
      hasOrderedTokenMatch(firstNameWithLastName, normalizedSearchValue) ||
      hasOrderedTokenMatch(nicknameWithLastName, normalizedSearchValue)
    );
  });

  return {
    data: matches.length === 1 ? (matches[0] as UserLookupRow) : null,
    error: null,
  };
}

async function getEventBySlug(
  supabase: ReturnType<typeof createClient>,
  slug: string,
): Promise<{ data: EventLookupRow | null; error: string | null }> {
  const { data, error } = await supabase
    .from('events')
    .select('id, duplicate_policy, metadata')
    .eq('slug', slug)
    .maybeSingle();

  if (error) {
    return { data: null, error: error.message };
  }

  return { data: data as EventLookupRow | null, error: null };
}

async function getExistingRegistrationState(
  supabase: ReturnType<typeof createClient>,
  eventId: string,
  userId: string,
  duplicatePolicy: string,
): Promise<ExistingRegistrationLookupResult> {
  if (duplicatePolicy === 'allow_multiple' || duplicatePolicy === 'allow_multiple_update') {
    return { data: null, error: null };
  }

  let registrationQuery = supabase
    .from('registrations')
    .select('id, status')
    .eq('event_id', eventId)
    .eq('user_id', userId)
    .order('submitted_at', { ascending: false })
    .limit(1);

  if (duplicatePolicy !== 'block') {
    registrationQuery = registrationQuery.eq('registration_scope_key', 'primary');
  }

  const { data: existingRegistration, error: registrationError } =
    await registrationQuery.maybeSingle();

  if (registrationError) {
    return { data: null, error: `registration_lookup:${registrationError.message}` };
  }

  if (!existingRegistration) {
    return { data: null, error: null };
  }

  const { data: answerRows, error: answersError } = await supabase
    .from('registration_answers')
    .select(
      'answer_text, answer_number, answer_boolean, answer_date, answer_json, event_fields!inner(field_key)',
    )
    .eq('registration_id', existingRegistration.id);

  if (answersError) {
    return { data: null, error: `answers_lookup:${answersError.message}` };
  }

  const responses = mapAnswerRowsToResponses((answerRows as AnswerRow[] | null) ?? null);

  return {
    data: {
      exists: true,
      edit_allowed: duplicatePolicy === 'allow_update',
      status: existingRegistration.status,
      responses,
    },
    error: null,
  };
}

Deno.serve(async (req) => {
  // Step 1: Validation and Gates
  // 1.1 Build request context and CORS headers.
  const guard = await useEdgeHook({
    req,
    functionName: 'member-lookup',
    method: 'POST',
    publicRateLimit: {
      scope: 'member-lookup',
      windowMs: RATE_LIMIT_PRESETS.memberLookup.windowMs,
      maxHits: RATE_LIMIT_PRESETS.memberLookup.maxHits,
    },
  });

  const corsHeaders = guard.corsHeaders;

  if (!guard.valid) {
    return guard.response;
  }

  try {
    const parsedBody = await parseRequestBody(req, memberLookupRequestSchema);
    if (!parsedBody.success) {
      return sharedErrorResponse(corsHeaders, 400, parsedBody.error, parsedBody.details);
    }

    const { memberId, name, eventSlug }: MemberLookupRequest = parsedBody.data;

    // Infer lookup type from which field is provided
    // Prefer memberId if both are provided; otherwise use name
    const isIdLookup = Boolean(memberId?.trim());
    const isNameLookup = !isIdLookup && Boolean(name?.trim());

    const normalizedEventSlug = eventSlug;

    // 1.4 Create Supabase service-role client.
    const supabase = guard.client;

    // 1.5 Preload event context when eventSlug is provided.
    let eventData: EventLookupRow | null = null;

    if (normalizedEventSlug) {
      const eventResult = await getEventBySlug(supabase, normalizedEventSlug);

      if (eventResult.error) {
        return sharedErrorResponse(corsHeaders, 500, 'Failed to lookup event', eventResult.error);
      }

      eventData = eventResult.data;
    }

    // 1.6 Enforce event name-lookup policy before running name search.
    if (isNameLookup && normalizedEventSlug) {
      if (!eventData) {
        return sharedSuccessResponse(
          corsHeaders,
          { profile: null, existing_registration: null },
          200,
        );
      }

      const eventMetadata = (eventData.metadata ?? {}) as Record<string, unknown>;
      const allowNameLookup = eventMetadata.allow_name_lookup === true;
      if (!allowNameLookup) {
        return sharedSuccessResponse(
          corsHeaders,
          { profile: null, existing_registration: null },
          200,
        );
      }
    }

    // Step 2: Member Lookup
    // 2.1 Lookup member by member_id or name/nickname.
    // For ID lookups, automatically detect and convert Big-Endian RFID hex input to decimal.
    const searchValue = isIdLookup ? tryConvertRfidInput(memberId!.trim()) : name!.trim();
    let filteredData: UserLookupRow | null = null;

    if (isIdLookup) {
      const { data } = await supabase
        .from('users')
        .select('id, member_id, role, category, full_name, nickname, first_name, last_name')
        .eq('is_active', true)
        .eq('member_id', searchValue)
        .maybeSingle();
      filteredData = data;
    } else {
      const normalizedSearchValue = normalizeName(searchValue);
      const lookupResult = await findUserByNameOrNickname(supabase, normalizedSearchValue);
      if (lookupResult.error) {
        console.error('Query error:', lookupResult.error);
        return sharedErrorResponse(corsHeaders, 500, 'Failed to lookup member', lookupResult.error);
      }
      filteredData = lookupResult.data;
    }

    // 2.2 Map DB row to API profile shape and early-return when no profile/event.
    const profile = toProfile(filteredData);

    if (!profile || !normalizedEventSlug) {
      return sharedSuccessResponse(corsHeaders, { profile, existing_registration: null }, 200);
    }

    if (!eventData) {
      return sharedSuccessResponse(corsHeaders, { profile, existing_registration: null }, 200);
    }

    // Step 3: Registration Lookup
    // 3.1 Resolve registration outcome (not registered vs already registered).
    const registrationResult = await getExistingRegistrationState(
      supabase,
      eventData.id,
      profile.user_id,
      eventData.duplicate_policy,
    );

    if (registrationResult.error) {
      if (registrationResult.error.startsWith('registration_lookup:')) {
        return sharedErrorResponse(
          corsHeaders,
          500,
          'Failed to lookup existing registration',
          registrationResult.error.replace('registration_lookup:', ''),
        );
      }

      return sharedErrorResponse(
        corsHeaders,
        500,
        'Failed to load registration answers',
        registrationResult.error.replace('answers_lookup:', ''),
      );
    }

    // 3.2 Return successful lookup with registration state (or null when not registered).
    return sharedSuccessResponse(
      corsHeaders,
      { profile, existing_registration: registrationResult.data },
      200,
    );
  } catch (error) {
    // 3.3 Return safe internal error response for unexpected failures.
    console.error('Unexpected error:', error);
    const message = error instanceof Error ? error.message : 'An unexpected error occurred';

    return sharedErrorResponse(corsHeaders, 500, 'Internal server error', message);
  }
});
