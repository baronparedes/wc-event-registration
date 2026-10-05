export type DynamicFieldType =
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
  | 'boolean'
  | 'color_picker'
  | 'rating';

export type DynamicFieldDomain = 'events' | 'forms' | 'attendance';

export type DynamicFieldCategory = 'text' | 'choice' | 'numeric' | 'datetime' | 'special';

export type DynamicFieldValidationKind =
  | 'text'
  | 'number'
  | 'rating'
  | 'multi_select'
  | 'date'
  | 'none';

export interface DynamicFieldOptionItem {
  label: string;
  value: string;
  toggle_label?: string;
  toggle_default?: boolean;
}

export interface FormatValueContext {
  rules?: Record<string, unknown>;
  options?: DynamicFieldOptionItem[];
}

export interface DynamicFieldTypeDefinition {
  type: DynamicFieldType;
  label: string;
  description: string;
  category: DynamicFieldCategory;
  colorClass: string;
  domains: readonly DynamicFieldDomain[];
  hasOptions: boolean;
  hasValidation: boolean;
  validationKind: DynamicFieldValidationKind;
  formatValue: (value: unknown, context?: FormatValueContext) => string;
}

export interface DynamicAnswerLike {
  id?: string;
  answer_text?: string | null;
  answer_number?: number | null;
  answer_boolean?: boolean | null;
  answer_date?: string | null;
  answer_json?: unknown | null;
}

export interface DynamicFieldValidationRules {
  min_length?: number;
  max_length?: number;
  pattern?: string;
  min?: number;
  max?: number;
  min_selections?: number;
  max_selections?: number;
  min_date?: string;
  max_date?: string;
  max_past_days?: number;
  allowed_weekdays?: number[];
  unique_key_component?: boolean;
  visibility_rule?: unknown;
  [key: string]: unknown;
}

export interface DynamicFieldLike {
  id?: string;
  field_key: string;
  label: string;
  field_type: DynamicFieldType;
  is_required: boolean;
  is_active?: boolean;
  placeholder?: string | null;
  help_text?: string | null;
  options?: DynamicFieldOptionItem[];
  validation_rules?: DynamicFieldValidationRules | Record<string, unknown>;
  display_order?: number;
}
