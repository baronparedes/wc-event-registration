export type EventFieldType =
  | 'text'
  | 'textarea'
  | 'number'
  | 'email'
  | 'phone'
  | 'select'
  | 'radio'
  | 'checkbox'
  | 'multi_select'
  | 'multi_select_toggle'
  | 'date'
  | 'datetime'
  | 'boolean';

export type PublicEventFieldOption = {
  label: string;
  value: string;
  toggle_label?: string;
  toggle_default?: boolean;
};

export type AdminEventFieldOption = {
  label: string;
  value: string;
  toggle_label?: string;
  toggle_default?: boolean;
};

export type PublicEventFieldValidationRules = {
  min_length?: number;
  max_length?: number;
  pattern?: string;
  min?: number;
  max?: number;
  min_selections?: number;
  max_selections?: number;
  max_slots?: Record<string, number>;
  max_slots_role_allotments?: Record<
    string,
    Array<{
      role: string;
      alloted_slots: number;
    }>
  >;
  min_date?: string;
  max_date?: string;
  max_past_days?: number;
  allowed_weekdays?: number[];
  unique_key_component?: boolean;
};

export type AdminEventFieldValidationRules = {
  min_length?: number;
  max_length?: number;
  pattern?: string;
  min?: number;
  max?: number;
  min_selections?: number;
  max_selections?: number;
  max_slots?: Record<string, number>;
  max_slots_role_allotments?: Record<
    string,
    Array<{
      role: string;
      alloted_slots: number;
    }>
  >;
  min_date?: string;
  max_date?: string;
  max_past_days?: number;
  allowed_weekdays?: number[];
  unique_key_component?: boolean;
};

export type PublicEventField = {
  id: string;
  event_id: string;
  field_key: string;
  label: string;
  field_type: EventFieldType;
  is_required: boolean;
  is_active: boolean;
  placeholder: string | null;
  help_text: string | null;
  options: PublicEventFieldOption[];
  validation_rules: PublicEventFieldValidationRules;
  display_order: number;
};

export type AdminEventField = {
  id: string;
  event_id: string;
  field_key: string;
  label: string;
  field_type: EventFieldType;
  is_required: boolean;
  is_active: boolean;
  placeholder: string | null;
  help_text: string | null;
  options: AdminEventFieldOption[];
  validation_rules: AdminEventFieldValidationRules;
  display_order: number;
  created_at: string;
  updated_at: string;
};

export type PublicEventFieldRow = Omit<PublicEventField, 'options' | 'validation_rules'> & {
  options: unknown;
  validation_rules: unknown;
};

export type EventFieldConfigValidationResult = {
  validFields: PublicEventField[];
  issues: string[];
};

export type EventSlotAvailabilityOption = {
  value: string;
  label: string;
  allotted_slots: number;
  used_slots: number;
  remaining_slots: number;
  remaining_slots_by_role?: Record<string, number>;
};

export type EventSlotAvailabilityField = {
  field_id: string;
  field_key: string;
  field_label: string;
  options: EventSlotAvailabilityOption[];
};

export type EventSlotAvailabilityResponse = {
  success: boolean;
  event_id: string;
  fields: EventSlotAvailabilityField[];
};

export type DynamicFieldResponseValues = Record<string, unknown>;
