export type AttendanceFieldType =
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

export type AttendanceFieldOption = {
  label: string
  value: string
  toggle_label?: string
  toggle_default?: boolean
}

export type AttendanceFieldValidationRules = {
  min_length?: number
  max_length?: number
  pattern?: string
  min?: number
  max?: number
  min_selections?: number
  max_selections?: number
  min_date?: string
  max_date?: string
}

export type AttendanceField = {
  id: string
  event_id: string
  field_key: string
  label: string
  field_type: AttendanceFieldType
  is_required: boolean
  display_order: number
  options: AttendanceFieldOption[]
  validation_rules: AttendanceFieldValidationRules
  created_at: string
  updated_at: string
}

export type AttendanceFieldRow = Omit<AttendanceField, 'options' | 'validation_rules'> & {
  options: unknown
  validation_rules: unknown
}

export type DynamicAttendanceResponseValues = Record<string, unknown>
