import type { EventFieldType } from '@/lib/domain/event-fields';

export type EventStatus = 'draft' | 'published' | 'archived';
export type DuplicatePolicy = 'block' | 'allow_update' | 'allow_multiple' | 'allow_multiple_update';
export type RegistrationMode = 'open' | 'closed';
export type PublicRegistrationAccess = 'members' | 'members_and_public' | 'public';

export type AdminEvent = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  location: string | null;
  starts_at: string | null;
  ends_at: string | null;
  registration_opens_at: string | null;
  registration_closes_at: string | null;
  status: EventStatus;
  duplicate_policy: DuplicatePolicy;
  require_id_lookup: boolean;
  registration_mode: RegistrationMode;
  allow_public_registrations: boolean;
  metadata: Record<string, unknown>;
  created_by_admin_id: string | null;
  created_at: string;
  updated_at: string;
};

export type EventAvailability =
  | { status: 'available'; event: AdminEvent; registration_count: number }
  | { status: 'unavailable'; reason: 'not_found_or_unpublished' }
  | { status: 'unavailable'; reason: 'not_open_yet'; event: AdminEvent }
  | { status: 'unavailable'; reason: 'registration_closed'; event: AdminEvent };

export type PublicEventListingItem = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  location: string | null;
  starts_at: string | null;
  ends_at: string | null;
  registration_opens_at: string | null;
  registration_closes_at: string | null;
  allow_public_registrations: boolean;
  listingStatus: 'open' | 'upcoming' | 'past';
};

export function derivePublicRegistrationAccess(input: {
  public_registration_access?: unknown;
  allow_public_registrations?: boolean | null;
  require_id_lookup?: boolean | null;
}): PublicRegistrationAccess {
  if (
    input.public_registration_access === 'members' ||
    input.public_registration_access === 'members_and_public' ||
    input.public_registration_access === 'public'
  ) {
    return input.public_registration_access;
  }

  if (!input.allow_public_registrations) {
    return 'members';
  }

  if (input.require_id_lookup === false) {
    return 'public';
  }

  return 'members_and_public';
}

export function mapPublicRegistrationAccessToEventFlags(access: PublicRegistrationAccess): {
  allow_public_registrations: boolean;
  require_id_lookup: boolean;
} {
  switch (access) {
    case 'members':
      return {
        allow_public_registrations: false,
        require_id_lookup: true,
      };
    case 'members_and_public':
      return {
        allow_public_registrations: true,
        require_id_lookup: true,
      };
    case 'public':
      return {
        allow_public_registrations: true,
        // Database invariant keeps ID-first enabled for members.
        require_id_lookup: true,
      };
    default:
      return {
        allow_public_registrations: false,
        require_id_lookup: true,
      };
  }
}

export type DynamicFieldAnswerPreview = {
  event_field_id: string;
  field_key: string;
  field_type: EventFieldType;
  value: unknown;
};
