import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { MemberScheduleEntry } from '@/hooks/domain/members';
import type { AdminMember, MemberAttendanceStats } from '@/lib/domain/members';

import { VolunteerStaffingModeler } from '../VolunteerStaffingModeler';

function createMockMember(id: string, name: string, role: string): AdminMember {
  return {
    id,
    member_id: `MEM-${id}`,
    avatar_object_key: null,
    is_active: true,
    first_name: name,
    last_name: 'Test',
    nickname: name,
    full_name: `${name} Test`,
    email: `${name.toLowerCase()}@test.com`,
    phone: null,
    date_of_birth: '1990-01-01',
    role,
    category: 'adult',
    created_at: '2025-01-01',
    updated_at: '2025-01-01',
    extra_metadata: {},
  };
}

function createScheduleEntry(member: AdminMember, timeSlots = ['9AM']): MemberScheduleEntry {
  return {
    member,
    sundayKey: 'first_sunday',
    timeSlots: timeSlots as ('9AM' | '12NN' | '3PM')[],
  };
}

describe('VolunteerStaffingModeler', () => {
  const defaultTargets = {
    '9AM': {
      Usher: 25,
      'Backroom Support': 10,
      'Prayer Coach': 50,
      'IMT Support': 4,
      'VMT Support': 2,
    },
    '12NN': {
      Usher: 25,
      'Backroom Support': 10,
      'Prayer Coach': 50,
      'IMT Support': 4,
      'VMT Support': 2,
    },
    '3PM': {
      Usher: 25,
      'Backroom Support': 10,
      'Prayer Coach': 50,
      'IMT Support': 4,
      'VMT Support': 2,
    },
  };

  const onSaveTargetsMock = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders overall staffing summary and role breakdown', () => {
    const m1 = createMockMember('1', 'Alice', 'Usher');
    const m2 = createMockMember('2', 'Bob', 'Prayer Coach');

    const entriesBySlot = {
      '9AM': [createScheduleEntry(m1, ['9AM']), createScheduleEntry(m2, ['9AM'])],
      '12NN': [],
      '3PM': [],
    };

    const statsMap = new Map<string, MemberAttendanceStats>([
      ['1', { attendanceScore: 10, committed: 10, attended: 10, turnupRate: 1.0 }],
      ['2', { attendanceScore: 10, committed: 10, attended: 10, turnupRate: 1.0 }],
    ]);

    render(
      <VolunteerStaffingModeler
        entriesByTimeSlot={entriesBySlot}
        activeSlot="9AM"
        isoDateKey="2026-10-04"
        targets={defaultTargets}
        onSaveTargets={onSaveTargetsMock}
        attendanceScoreMap={statsMap}
      />,
    );

    expect(screen.getByText('Volunteer Staffing Forecast')).toBeInTheDocument();
    expect(screen.getByText(/Total Target:/i)).toBeInTheDocument();
    expect(screen.getByText('91')).toBeInTheDocument();

    // 2 turnup vs 91 target -> 89 needed
    expect(screen.getByText('89 Still Needed')).toBeInTheDocument();

    // Check role cards
    expect(screen.getByText('Need 24')).toBeInTheDocument(); // Usher (25 - 1)
    expect(screen.getByText('Need 49')).toBeInTheDocument(); // Prayer Coach (50 - 1)
  });

  it('allows switching between active slot and all Sunday slots', () => {
    const m1 = createMockMember('1', 'Alice', 'Usher');
    const m2 = createMockMember('2', 'Bob', 'Usher');

    const entriesBySlot = {
      '9AM': [createScheduleEntry(m1, ['9AM'])],
      '12NN': [createScheduleEntry(m2, ['12NN'])],
      '3PM': [],
    };

    render(
      <VolunteerStaffingModeler
        entriesByTimeSlot={entriesBySlot}
        activeSlot="9AM"
        isoDateKey="2026-10-04"
        targets={defaultTargets}
        onSaveTargets={onSaveTargetsMock}
      />,
    );

    const allDayBtn = screen.getByRole('tab', { name: /All Sunday Slots/i });
    fireEvent.click(allDayBtn);

    // Target across all 3 slots is 91 * 3 = 273
    expect(screen.getByText('273')).toBeInTheDocument();
  });

  it('allows collapsing and expanding the details', () => {
    render(
      <VolunteerStaffingModeler
        entriesByTimeSlot={{ '9AM': [], '12NN': [], '3PM': [] }}
        activeSlot="9AM"
        isoDateKey="2026-10-04"
        targets={defaultTargets}
        onSaveTargets={onSaveTargetsMock}
      />,
    );

    expect(screen.getByText(/Total Target:/i)).toBeInTheDocument();

    const collapseBtn = screen.getByLabelText(/Collapse staffing model/i);
    fireEvent.click(collapseBtn);

    expect(screen.queryByText(/Total Target:/i)).not.toBeInTheDocument();

    const expandBtn = screen.getByLabelText(/Expand staffing model/i);
    fireEvent.click(expandBtn);

    expect(screen.getByText(/Total Target:/i)).toBeInTheDocument();
  });

  it('opens target configuration modal from the summary bar', () => {
    render(
      <VolunteerStaffingModeler
        entriesByTimeSlot={{ '9AM': [], '12NN': [], '3PM': [] }}
        activeSlot="9AM"
        isoDateKey="2026-10-04"
        targets={defaultTargets}
        onSaveTargets={onSaveTargetsMock}
      />,
    );

    const editTargetsBtn = screen.getByRole('button', { name: /Edit Targets/i });
    fireEvent.click(editTargetsBtn);

    expect(
      screen.getByRole('heading', { name: /Configure Volunteer Targets/i }),
    ).toBeInTheDocument();
  });
});
