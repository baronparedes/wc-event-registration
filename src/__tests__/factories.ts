/**
 * Test data factories using @faker-js/faker.
 *
 * Each factory generates a complete, valid object by default.
 * Pass a partial override to customize specific fields:
 *
 * @example
 * const event = makeAdminEvent({ status: 'published' })
 * const field = makeAdminEventField({ event_id: event.id, field_type: 'email' })
 * const member = makeMemberLookupProfile()
 */
import { faker } from '@faker-js/faker';

import type { AdminEventField, EventFieldType, PublicEventField } from '@/lib/domain/event-fields';
import type {
  AdminEvent,
  DuplicatePolicy,
  EventStatus,
  PublicEventListingItem,
  RegistrationMode,
} from '@/lib/domain/events';
import type {
  AdminMember,
  ExistingRegistrationState,
  MemberLookupProfile,
} from '@/lib/domain/members';
import type {
  PublicRegistration,
  PublicRegistrationSummary,
} from '@/lib/domain/public-registrations';
import type {
  AdminRegistration,
  AdminRegistrationDetail,
  AdminRegistrationWithMember,
  RegistrationFieldResponse,
  RegistrationSharePayloadRow,
  RegistrationStatus,
} from '@/lib/domain/registrations';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isoTimestamp(date?: Date): string {
  return (date ?? faker.date.recent()).toISOString();
}

function pastIso(): string {
  return faker.date.past().toISOString();
}

function futureIso(): string {
  return faker.date.future().toISOString();
}

// ---------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------

export function makeAdminEvent(overrides: Partial<AdminEvent> = {}): AdminEvent {
  const createdAt = isoTimestamp();
  return {
    id: faker.string.uuid(),
    slug: faker.helpers.slugify(faker.lorem.words(3)).toLowerCase(),
    title: faker.lorem.words(4),
    description: faker.lorem.sentence(),
    location: faker.location.city(),
    starts_at: futureIso(),
    ends_at: futureIso(),
    registration_opens_at: pastIso(),
    registration_closes_at: futureIso(),
    status: 'draft' as EventStatus,
    duplicate_policy: 'block' as DuplicatePolicy,
    require_id_lookup: false,
    registration_mode: 'open' as RegistrationMode,
    allow_public_registrations: false,
    metadata: {},
    created_by_admin_id: faker.string.uuid(),
    created_at: createdAt,
    updated_at: createdAt,
    ...overrides,
  };
}

export function makePublicEventListingItem(
  overrides: Partial<PublicEventListingItem> = {},
): PublicEventListingItem {
  return {
    id: faker.string.uuid(),
    slug: faker.helpers.slugify(faker.lorem.words(3)).toLowerCase(),
    title: faker.lorem.words(4),
    description: faker.lorem.sentence(),
    location: faker.location.city(),
    starts_at: futureIso(),
    ends_at: futureIso(),
    registration_opens_at: pastIso(),
    registration_closes_at: futureIso(),
    allow_public_registrations: true,
    listingStatus: 'open',
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Event Fields
// ---------------------------------------------------------------------------

const FIELD_TYPES: EventFieldType[] = [
  'text',
  'textarea',
  'number',
  'email',
  'phone',
  'select',
  'radio',
  'checkbox',
  'multi_select',
  'multi_select_toggle',
  'date',
  'datetime',
  'boolean',
];

export function makeAdminEventField(overrides: Partial<AdminEventField> = {}): AdminEventField {
  const createdAt = isoTimestamp();
  return {
    id: faker.string.uuid(),
    event_id: faker.string.uuid(),
    field_key: faker.helpers.slugify(faker.lorem.words(2)).toLowerCase(),
    label: faker.lorem.words(3),
    field_type: faker.helpers.arrayElement(FIELD_TYPES),
    is_required: faker.datatype.boolean(),
    is_active: true,
    placeholder: null,
    help_text: null,
    options: [],
    validation_rules: {},
    display_order: faker.number.int({ min: 0, max: 20 }),
    created_at: createdAt,
    updated_at: createdAt,
    ...overrides,
  };
}

export function makePublicEventField(overrides: Partial<PublicEventField> = {}): PublicEventField {
  return {
    id: faker.string.uuid(),
    event_id: faker.string.uuid(),
    field_key: faker.helpers.slugify(faker.lorem.words(2)).toLowerCase(),
    label: faker.lorem.words(3),
    field_type: faker.helpers.arrayElement(FIELD_TYPES),
    is_required: faker.datatype.boolean(),
    is_active: true,
    placeholder: null,
    help_text: null,
    options: [],
    validation_rules: {},
    display_order: faker.number.int({ min: 0, max: 20 }),
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Members
// ---------------------------------------------------------------------------

export function makeMemberLookupProfile(
  overrides: Partial<MemberLookupProfile> = {},
): MemberLookupProfile {
  const firstName = faker.person.firstName();
  const lastName = faker.person.lastName();
  return {
    user_id: faker.string.uuid(),
    member_id: `WC-${faker.string.numeric(3)}`,
    full_name: `${firstName} ${lastName}`,
    nickname: faker.helpers.maybe(() => faker.internet.username(), { probability: 0.4 }) ?? null,
    first_name: firstName,
    last_name: lastName,
    ...overrides,
  };
}

export function makeAdminMember(overrides: Partial<AdminMember> = {}): AdminMember {
  const firstName = faker.person.firstName();
  const lastName = faker.person.lastName();
  const createdAt = isoTimestamp();
  return {
    id: faker.string.uuid(),
    member_id: `WC-${faker.string.numeric(3)}`,
    full_name: `${firstName} ${lastName}`,
    first_name: firstName,
    last_name: lastName,
    nickname: null,
    email: faker.internet.email({ firstName, lastName }),
    phone: faker.helpers.maybe(() => faker.phone.number(), { probability: 0.6 }) ?? null,
    date_of_birth: null,
    role: 'member',
    category: 'regular',
    created_at: createdAt,
    updated_at: createdAt,
    ...overrides,
  };
}

export function makeExistingRegistrationState(
  overrides: Partial<ExistingRegistrationState> = {},
): ExistingRegistrationState {
  return {
    exists: true,
    edit_allowed: false,
    status: 'submitted',
    responses: {},
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Registrations
// ---------------------------------------------------------------------------

export function makeAdminRegistration(
  overrides: Partial<AdminRegistration> = {},
): AdminRegistration {
  return {
    id: faker.string.uuid(),
    event_id: faker.string.uuid(),
    user_id: faker.string.uuid(),
    status: 'submitted' as RegistrationStatus,
    submitted_at: pastIso(),
    updated_at: null,
    ...overrides,
  };
}

export function makeAdminRegistrationWithMember(
  overrides: Partial<AdminRegistrationWithMember> = {},
): AdminRegistrationWithMember {
  const firstName = faker.person.firstName();
  const lastName = faker.person.lastName();
  return {
    ...makeAdminRegistration(),
    member_id: `WC-${faker.string.numeric(3)}`,
    full_name: `${firstName} ${lastName}`,
    email: faker.internet.email({ firstName, lastName }),
    phone: null,
    role: 'member',
    category: 'regular',
    answer_count: faker.number.int({ min: 0, max: 10 }),
    ...overrides,
  };
}

export function makeRegistrationFieldResponse(
  overrides: Partial<RegistrationFieldResponse> = {},
): RegistrationFieldResponse {
  return {
    field_id: faker.string.uuid(),
    field_name: faker.helpers.slugify(faker.lorem.words(2)).toLowerCase(),
    field_label: faker.lorem.words(3),
    field_type: 'text' as EventFieldType,
    answer: faker.lorem.words(2),
    ...overrides,
  };
}

export function makeAdminRegistrationDetail(
  overrides: Partial<AdminRegistrationDetail> = {},
): AdminRegistrationDetail {
  const firstName = faker.person.firstName();
  const lastName = faker.person.lastName();
  return {
    registration: makeAdminRegistration(),
    member: {
      user_id: faker.string.uuid(),
      member_id: `WC-${faker.string.numeric(3)}`,
      full_name: `${firstName} ${lastName}`,
      email: faker.internet.email({ firstName, lastName }),
      phone: null,
      nickname: null,
      role: 'member',
      category: 'regular',
    },
    fieldResponses: [],
    ...overrides,
  };
}

export function makeRegistrationSharePayloadRow(
  overrides: Partial<RegistrationSharePayloadRow> = {},
): RegistrationSharePayloadRow {
  const firstName = faker.person.firstName();
  const lastName = faker.person.lastName();
  const fullName = `${firstName} ${lastName}`;
  return {
    full_name: fullName,
    member_id: `WC-${faker.string.numeric(3)}`,
    email: faker.internet.email({ firstName, lastName }),
    role: faker.helpers.arrayElement(['Member', 'Volunteer', 'Coordinator']),
    category: faker.helpers.arrayElement(['Adult', 'Youth']),
    answer_values: {},
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Public Registrations
// ---------------------------------------------------------------------------

export function makePublicRegistration(
  overrides: Partial<PublicRegistration> = {},
): PublicRegistration {
  const firstName = faker.person.firstName();
  const lastName = faker.person.lastName();
  const createdAt = isoTimestamp();
  return {
    id: faker.string.uuid(),
    event_id: faker.string.uuid(),
    first_name: firstName,
    last_name: lastName,
    nickname: null,
    email: faker.internet.email({ firstName, lastName }),
    phone: null,
    status: 'submitted' as RegistrationStatus,
    idempotency_key: faker.string.uuid(),
    submitted_at: createdAt,
    created_at: createdAt,
    updated_at: createdAt,
    ...overrides,
  };
}

export function makePublicRegistrationSummary(
  overrides: Partial<PublicRegistrationSummary> = {},
): PublicRegistrationSummary {
  const firstName = faker.person.firstName();
  const lastName = faker.person.lastName();
  return {
    id: faker.string.uuid(),
    first_name: firstName,
    last_name: lastName,
    nickname: null,
    email: faker.internet.email({ firstName, lastName }),
    phone: null,
    status: 'submitted' as RegistrationStatus,
    submitted_at: isoTimestamp(),
    ...overrides,
  };
}
