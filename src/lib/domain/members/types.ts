export type MemberLookupProfile = {
  member_id: string;
  role: string;
  first_name: string | null;
  last_initial: string | null;
  user_id?: string;
  category?: string;
  full_name?: string;
  nickname?: string | null;
  last_name?: string | null;
};

export type ExistingRegistrationState = {
  exists: boolean;
  edit_allowed: boolean;
  status: 'submitted' | 'updated' | 'cancelled';
  responses: Record<string, unknown>;
};

export type MemberLookupResult = {
  profile: MemberLookupProfile | null;
  existing_registration: ExistingRegistrationState | null;
};

export type AdminMember = {
  id: string;
  member_id: string;
  is_active: boolean;
  full_name: string;
  first_name: string | null;
  last_name: string | null;
  nickname: string | null;
  email: string | null;
  phone: string | null;
  date_of_birth: string | null;
  role: string;
  category: string;
  extra_metadata: Record<string, string>;
  created_at: string;
  updated_at: string;
};
