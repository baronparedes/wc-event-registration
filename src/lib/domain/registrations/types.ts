import type { EventFieldType } from '@/lib/domain/event-fields'

export type RegistrationStatus = 'submitted' | 'updated' | 'cancelled'

export type AdminRegistration = {
  id: string
  event_id: string
  user_id: string
  status: RegistrationStatus
  submitted_at: string
  updated_at: string | null
}

export type AdminRegistrationWithMember = AdminRegistration & {
  member_id: string
  full_name: string
  email: string
  phone: string | null
  role: string
  category: string
  answer_count: number
}

export type RegistrationFieldResponse = {
  field_id: string
  field_name: string
  field_label: string
  field_type: EventFieldType
  answer: string | number | boolean | string[] | null
}

export type AdminRegistrationDetail = {
  registration: AdminRegistration
  member: {
    user_id: string
    member_id: string
    full_name: string
    email: string
    phone: string | null
    nickname: string | null
    role: string
    category: string
  }
  fieldResponses: RegistrationFieldResponse[]
}
