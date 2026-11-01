import type { DynamicFieldType } from '@/lib/domain/dynamic-fields';

export type EntityBlueprintDomain = 'event' | 'form';

export type EntityAudience = 'members' | 'public' | 'members_and_public';

export type GenerateEntityBlueprintPayload = {
  domain: EntityBlueprintDomain;
  prompt: string;
  audiencePreference?: EntityAudience;
};

export type BlueprintFieldOption = {
  label: string;
  value: string;
};

export type BlueprintVisibilityRule = {
  depends_on_field_key: string;
  equals_value: string;
};

export type BlueprintDynamicField = {
  field_key: string;
  label: string;
  field_type: DynamicFieldType;
  is_required: boolean;
  placeholder?: string | null;
  help_text?: string | null;
  options: BlueprintFieldOption[];
  validation_rules: {
    visibility_rule?: BlueprintVisibilityRule;
    min_length?: number;
    max_length?: number;
    min?: number;
    max?: number;
    [key: string]: unknown;
  };
};

export type EntityBlueprintMetadata = {
  title: string;
  slug: string;
  description: string;
  location?: string;
  starts_at?: string | null;
  ends_at?: string | null;
  registration_opens_at?: string | null;
  registration_closes_at?: string | null;
  audience: EntityAudience;
  duplicate_policy: 'block' | 'allow_update' | 'allow_multiple';
  registration_mode?: 'open' | 'closed';
  suggested_duration_hours?: number;
};

export type GenerateEntityBlueprintResponse = {
  success: boolean;
  domain: EntityBlueprintDomain;
  metadata: EntityBlueprintMetadata;
  fields: BlueprintDynamicField[];
};

export type CreateEventWithBlueprintInput = {
  metadata: EntityBlueprintMetadata;
  fields: BlueprintDynamicField[];
  startsAt?: string;
  endsAt?: string;
};

export type CreateFormWithBlueprintInput = {
  metadata: EntityBlueprintMetadata;
  fields: BlueprintDynamicField[];
};
