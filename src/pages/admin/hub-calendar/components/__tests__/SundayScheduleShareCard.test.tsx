import { faker } from '@faker-js/faker';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { LEGAL_CONFIG } from '@/config/constants';
import type { MemberScheduleEntry } from '@/hooks/domain/members';
import type { ExcusedMemberMap } from '@/lib/domain/hub-calendar';
import type { AdminMember } from '@/lib/domain/members';

import { SundayScheduleShareCard } from '../SundayScheduleShareCard';

vi.mock('@/hooks/domain/members', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/hooks/domain/members')>();
  return {
    ...actual,
    useMemberAvatarQuery: vi.fn(() => ({ data: null })),
  };
});

const firstName1 = faker.person.firstName();
const lastName1 = faker.person.lastName();
const firstName2 = faker.person.firstName();
const lastName2 = faker.person.lastName();

describe('SundayScheduleShareCard', () => {
  const mockMember1: AdminMember = {
    id: 'm1',
    member_id: 'MEM-001',
    avatar_object_key: null,
    is_active: true,
    first_name: firstName1,
    last_name: lastName1,
    nickname: firstName1,
    full_name: `${firstName1} ${lastName1}`,
    email: faker.internet.exampleEmail({ firstName: firstName1, lastName: lastName1 }),
    phone: '123-456',
    date_of_birth: '1990-05-15',
    role: 'Usher',
    category: 'adult',
    created_at: '2025-01-01',
    updated_at: '2025-01-01',
    extra_metadata: {},
  };

  const mockMember2: AdminMember = {
    id: 'm2',
    member_id: 'MEM-002',
    avatar_object_key: null,
    is_active: true,
    first_name: firstName2,
    last_name: lastName2,
    nickname: firstName2,
    full_name: `${firstName2} ${lastName2}`,
    email: faker.internet.exampleEmail({ firstName: firstName2, lastName: lastName2 }),
    phone: '654-321',
    date_of_birth: '1992-08-20',
    role: 'IMT Support / Usher',
    category: 'adult',
    created_at: '2025-01-01',
    updated_at: '2025-01-01',
    extra_metadata: {},
  };

  const entries: MemberScheduleEntry[] = [
    { member: mockMember1, sundayKey: 'third_sunday', timeSlots: ['9AM'] },
    { member: mockMember2, sundayKey: 'third_sunday', timeSlots: ['9AM'] },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders card with date, service label, branding, and role groups', () => {
    render(
      <SundayScheduleShareCard
        slot="9AM"
        slotLabel="9:00 AM"
        formattedDate="Sunday, October 4, 2026"
        isoDateKey="2026-10-04"
        entries={entries}
      />,
    );

    expect(screen.getByText('Sunday, October 4, 2026')).toBeInTheDocument();
    expect(screen.getByText('9:00 AM Service')).toBeInTheDocument();
    expect(screen.getByText('2 volunteers')).toBeInTheDocument();
    expect(
      screen.getByText(new RegExp(`Generated via ${LEGAL_CONFIG.appName}`, 'i')),
    ).toBeInTheDocument();
    expect(screen.getByText('Usher')).toBeInTheDocument();
    expect(screen.getByText('IMT Support')).toBeInTheDocument();
    expect(screen.getByText('+ Usher')).toBeInTheDocument();
    expect(screen.getByText(mockMember1.full_name)).toBeInTheDocument();
    expect(screen.getByText(mockMember2.full_name)).toBeInTheDocument();
  });

  it('renders empty state when no volunteers are scheduled', () => {
    render(
      <SundayScheduleShareCard
        slot="9AM"
        slotLabel="9:00 AM"
        formattedDate="Sunday, October 4, 2026"
        isoDateKey="2026-10-04"
        entries={[]}
      />,
    );

    expect(screen.getByText('No volunteers scheduled for this service')).toBeInTheDocument();
    expect(screen.getByText('0 volunteers')).toBeInTheDocument();
  });

  it('renders excused tag when member is marked as excused', () => {
    const excusedMap: ExcusedMemberMap = new Map([
      ['2026-10-04', new Map([['mem-001', new Set(['9AM'])]])],
    ]);

    render(
      <SundayScheduleShareCard
        slot="9AM"
        slotLabel="9:00 AM"
        formattedDate="Sunday, October 4, 2026"
        isoDateKey="2026-10-04"
        entries={entries}
        excusedMap={excusedMap}
      />,
    );

    expect(screen.getByText('Excused')).toBeInTheDocument();
  });
});
