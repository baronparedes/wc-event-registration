import { describe, expect, it } from 'vitest';

import { createMemberSchema, updateMemberSchema } from '@/lib/domain/members';

describe('members schemas', () => {
  it('accepts valid create member input', () => {
    const parsed = createMemberSchema.parse({
      member_id: 'WC-001',
      first_name: 'Jane',
      last_name: 'Doe',
      nickname: 'J',
      email: 'jane.doe@example.com',
      phone: '+15551234567',
      date_of_birth: '1995-10-12',
      role: 'player',
      category: 'adult',
    });

    expect(parsed.member_id).toBe('WC-001');
    expect(parsed.email).toBe('jane.doe@example.com');
  });

  it('rejects create member input when required fields are missing', () => {
    const parsed = createMemberSchema.safeParse({
      member_id: '',
      first_name: '',
      last_name: '',
      role: '',
      category: '',
      nickname: '',
      email: '',
      phone: '',
      date_of_birth: '',
    });

    expect(parsed.success).toBe(false);
  });

  it('rejects create member input with invalid email', () => {
    const parsed = createMemberSchema.safeParse({
      member_id: 'WC-002',
      first_name: 'John',
      last_name: 'Smith',
      nickname: '',
      email: 'not-an-email',
      phone: '',
      date_of_birth: '',
      role: 'staff',
      category: 'adult',
    });

    expect(parsed.success).toBe(false);
  });

  it('accepts valid update member input with optional blank values', () => {
    const parsed = updateMemberSchema.parse({
      full_name: '',
      first_name: 'Jane',
      last_name: 'Doe',
      nickname: 'Janie',
      email: '',
      phone: '',
      date_of_birth: '',
      role: 'player',
      category: 'adult',
      metadata_entries: [],
    });

    expect(parsed.full_name).toBe('Jane Doe');
  });

  it('rejects update member input when required fields are missing', () => {
    const parsed = updateMemberSchema.safeParse({
      full_name: '',
      first_name: '',
      last_name: '',
      nickname: '',
      email: '',
      phone: '',
      date_of_birth: '',
      role: '',
      category: '',
    });

    expect(parsed.success).toBe(false);
  });

  it('rejects update member input with invalid date format', () => {
    const parsed = updateMemberSchema.safeParse({
      full_name: '',
      first_name: 'Jane',
      last_name: 'Doe',
      nickname: 'Janie',
      email: 'jane.doe@example.com',
      phone: '',
      date_of_birth: '12/10/1995',
      role: 'player',
      category: 'adult',
    });

    expect(parsed.success).toBe(false);
  });
});
