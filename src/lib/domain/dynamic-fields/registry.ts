import type {
  DynamicFieldDomain,
  DynamicFieldType,
  DynamicFieldTypeDefinition,
  FormatValueContext,
} from './types';

export const DYNAMIC_FIELD_TYPES: readonly DynamicFieldType[] = [
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
  'color_picker',
  'rating',
] as const;

export const FIELD_TYPE_REGISTRY: Record<DynamicFieldType, DynamicFieldTypeDefinition> = {
  text: {
    type: 'text',
    label: 'Single Line Text',
    description: 'A single-line plain text input for short answers.',
    category: 'text',
    colorClass: 'bg-blue-100 text-blue-800',
    domains: ['events', 'forms', 'attendance'],
    hasOptions: false,
    hasValidation: true,
    validationKind: 'text',
    formatValue: (value: unknown) => (value != null ? String(value) : ''),
  },
  textarea: {
    type: 'textarea',
    label: 'Multi-line Text',
    description: 'A multi-line text area for longer answers or notes.',
    category: 'text',
    colorClass: 'bg-blue-100 text-blue-800',
    domains: ['events', 'forms', 'attendance'],
    hasOptions: false,
    hasValidation: true,
    validationKind: 'text',
    formatValue: (value: unknown) => (value != null ? String(value) : ''),
  },
  number: {
    type: 'number',
    label: 'Number',
    description: 'A numeric input with optional min/max constraints.',
    category: 'numeric',
    colorClass: 'bg-purple-100 text-purple-800',
    domains: ['events', 'forms', 'attendance'],
    hasOptions: false,
    hasValidation: true,
    validationKind: 'number',
    formatValue: (value: unknown) => (value != null && value !== '' ? String(value) : ''),
  },
  email: {
    type: 'email',
    label: 'Email Address',
    description: 'An email input formatted with standard email validation.',
    category: 'text',
    colorClass: 'bg-indigo-100 text-indigo-800',
    domains: ['events', 'forms', 'attendance'],
    hasOptions: false,
    hasValidation: true,
    validationKind: 'text',
    formatValue: (value: unknown) => (value != null ? String(value) : ''),
  },
  phone: {
    type: 'phone',
    label: 'Phone Number',
    description: 'A phone number input with standard numeric/format validation.',
    category: 'text',
    colorClass: 'bg-indigo-100 text-indigo-800',
    domains: ['events', 'forms', 'attendance'],
    hasOptions: false,
    hasValidation: true,
    validationKind: 'text',
    formatValue: (value: unknown) => (value != null ? String(value) : ''),
  },
  select: {
    type: 'select',
    label: 'Dropdown List',
    description: 'A single-selection dropdown list from predefined options.',
    category: 'choice',
    colorClass: 'bg-green-100 text-green-800',
    domains: ['events', 'forms', 'attendance'],
    hasOptions: true,
    hasValidation: false,
    validationKind: 'none',
    formatValue: (value: unknown, context?: FormatValueContext) => {
      if (value == null || value === '') return '';
      const matched = context?.options?.find((o) => o.value === value);
      return matched ? matched.label : String(value);
    },
  },
  radio: {
    type: 'radio',
    label: 'Radio Buttons',
    description: 'Single-choice radio button list where all choices are visible.',
    category: 'choice',
    colorClass: 'bg-green-100 text-green-800',
    domains: ['events', 'forms', 'attendance'],
    hasOptions: true,
    hasValidation: false,
    validationKind: 'none',
    formatValue: (value: unknown, context?: FormatValueContext) => {
      if (value == null || value === '') return '';
      const matched = context?.options?.find((o) => o.value === value);
      return matched ? matched.label : String(value);
    },
  },
  checkbox: {
    type: 'checkbox',
    label: 'Checkbox',
    description: 'A standalone checkbox for binary agreements (e.g., terms).',
    category: 'choice',
    colorClass: 'bg-amber-100 text-amber-800',
    domains: ['events', 'forms', 'attendance'],
    hasOptions: false,
    hasValidation: false,
    validationKind: 'none',
    formatValue: (value: unknown) => (value === true || value === 'true' ? 'Yes' : 'No'),
  },
  multi_select: {
    type: 'multi_select',
    label: 'Checkboxes (Multiple)',
    description: 'Multi-selection checkboxes with optional min/max selections.',
    category: 'choice',
    colorClass: 'bg-green-100 text-green-800',
    domains: ['events', 'forms', 'attendance'],
    hasOptions: true,
    hasValidation: true,
    validationKind: 'multi_select',
    formatValue: (value: unknown, context?: FormatValueContext) => {
      if (!Array.isArray(value) || value.length === 0) return '';
      if (!context?.options) return value.join(', ');
      const optionMap = new Map(context.options.map((o) => [o.value, o.label]));
      return value.map((v) => optionMap.get(String(v)) ?? String(v)).join(', ');
    },
  },
  multi_select_toggle: {
    type: 'multi_select_toggle',
    label: 'Checkboxes + Yes/No',
    description: 'Multi-selection checkboxes paired with secondary toggles.',
    category: 'choice',
    colorClass: 'bg-green-100 text-green-800',
    domains: ['events', 'attendance'],
    hasOptions: true,
    hasValidation: true,
    validationKind: 'multi_select',
    formatValue: (value: unknown, context?: FormatValueContext) => {
      if (typeof value !== 'object' || value === null) return '';
      const entries = Object.entries(value as Record<string, boolean>);
      if (entries.length === 0) return '';
      const optionMap = new Map(context?.options?.map((o) => [o.value, o.label]) ?? []);
      return entries.map(([k, v]) => `${optionMap.get(k) ?? k}: ${v ? 'Yes' : 'No'}`).join(', ');
    },
  },
  date: {
    type: 'date',
    label: 'Date',
    description: 'A date picker input with optional date boundaries.',
    category: 'datetime',
    colorClass: 'bg-rose-100 text-rose-800',
    domains: ['events', 'forms', 'attendance'],
    hasOptions: false,
    hasValidation: true,
    validationKind: 'date',
    formatValue: (value: unknown) => (value != null ? String(value) : ''),
  },
  datetime: {
    type: 'datetime',
    label: 'Date & Time',
    description: 'A date and time picker input.',
    category: 'datetime',
    colorClass: 'bg-rose-100 text-rose-800',
    domains: ['events', 'forms', 'attendance'],
    hasOptions: false,
    hasValidation: true,
    validationKind: 'date',
    formatValue: (value: unknown) => (value != null ? String(value) : ''),
  },
  boolean: {
    type: 'boolean',
    label: 'Yes / No Toggle',
    description: 'A binary switch or toggle.',
    category: 'special',
    colorClass: 'bg-amber-100 text-amber-800',
    domains: ['events', 'forms', 'attendance'],
    hasOptions: false,
    hasValidation: false,
    validationKind: 'none',
    formatValue: (value: unknown) => (value === true || value === 'true' ? 'Yes' : 'No'),
  },
  color_picker: {
    type: 'color_picker',
    label: 'Color Picker',
    description: 'A color selector for customizable color values.',
    category: 'special',
    colorClass: 'bg-purple-100 text-purple-800',
    domains: ['events', 'attendance'],
    hasOptions: false,
    hasValidation: false,
    validationKind: 'none',
    formatValue: (value: unknown) => (value != null ? String(value) : ''),
  },
  rating: {
    type: 'rating',
    label: 'Rating',
    description: 'An interactive star rating selector with configurable scale.',
    category: 'numeric',
    colorClass: 'bg-amber-100 text-amber-800',
    domains: ['events', 'forms', 'attendance'],
    hasOptions: false,
    hasValidation: true,
    validationKind: 'rating',
    formatValue: (value: unknown, context?: FormatValueContext) => {
      if (value == null || value === '') return '';
      const max = typeof context?.rules?.max === 'number' ? context.rules.max : 5;
      return `${value} / ${max} ★`;
    },
  },
};

/** Get the definition for a dynamic field type. */
export function getFieldDefinition(type: DynamicFieldType): DynamicFieldTypeDefinition {
  return FIELD_TYPE_REGISTRY[type];
}

/** Get all field types supported in a specific domain (events, forms, or attendance). */
export function getFieldTypesForDomain(domain: DynamicFieldDomain): DynamicFieldType[] {
  return DYNAMIC_FIELD_TYPES.filter((type) => FIELD_TYPE_REGISTRY[type].domains.includes(domain));
}

/** Check if a field type uses an options list (select, radio, multi_select, etc.). */
export function dynamicFieldHasOptions(type: DynamicFieldType): boolean {
  return FIELD_TYPE_REGISTRY[type]?.hasOptions ?? false;
}

/** Check if a field type has any configurable validation rules. */
export function dynamicFieldHasValidation(type: DynamicFieldType): boolean {
  return FIELD_TYPE_REGISTRY[type]?.hasValidation ?? false;
}

/** Check if a field type has text validation rules. */
export function dynamicFieldHasTextValidation(type: DynamicFieldType): boolean {
  return FIELD_TYPE_REGISTRY[type]?.validationKind === 'text';
}

/** Check if a field type has number validation rules. */
export function dynamicFieldHasNumberValidation(type: DynamicFieldType): boolean {
  return FIELD_TYPE_REGISTRY[type]?.validationKind === 'number';
}

/** Check if a field type has rating scale validation rules. */
export function dynamicFieldHasRatingValidation(type: DynamicFieldType): boolean {
  return FIELD_TYPE_REGISTRY[type]?.validationKind === 'rating';
}

/** Check if a field type has multi-select validation rules. */
export function dynamicFieldHasMultiSelectValidation(type: DynamicFieldType): boolean {
  return FIELD_TYPE_REGISTRY[type]?.validationKind === 'multi_select';
}

/** Check if a field type has date validation rules. */
export function dynamicFieldHasDateValidation(type: DynamicFieldType): boolean {
  return FIELD_TYPE_REGISTRY[type]?.validationKind === 'date';
}

/** Centralized mapping of field types to their badge color classes. */
export const DYNAMIC_FIELD_TYPE_COLORS: Record<DynamicFieldType, string> = Object.fromEntries(
  DYNAMIC_FIELD_TYPES.map((type) => [type, FIELD_TYPE_REGISTRY[type].colorClass]),
) as Record<DynamicFieldType, string>;

/** Centralized mapping of field types to their human-readable labels. */
export const DYNAMIC_FIELD_TYPE_LABELS: Record<DynamicFieldType, string> = Object.fromEntries(
  DYNAMIC_FIELD_TYPES.map((type) => [type, FIELD_TYPE_REGISTRY[type].label]),
) as Record<DynamicFieldType, string>;
