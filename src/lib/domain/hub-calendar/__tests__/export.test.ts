import { describe, expect, it } from 'vitest';

import type { MemberScheduleEntry } from '@/hooks/domain/members';
import type { AdminMember } from '@/lib/domain/members';

import {
  buildMonthMilestoneCsvExport,
  buildSundaySchedulesCsvExport,
  escapeCsvValue,
} from '../export';
import type { MilestoneEntry } from '../types';

function makeMember(overrides?: Partial<AdminMember>): AdminMember {
  return {
    id: 'm1',
    member_id: 'MEM-001',
    avatar_object_key: null,
    is_active: true,
    full_name: 'Test Member',
    first_name: 'Test',
    last_name: 'Test Member',
    nickname: 'Test Nick',
    email: 'member@example.com',
    phone: '123-456',
    date_of_birth: '1990-09-15',
    role: 'Usher',
    category: 'adult',
    extra_metadata: {
      wedding_anniversary_date: '2015-09-20',
    },
    created_at: '2025-01-01',
    updated_at: '2025-01-01',
    ...overrides,
  };
}

describe('hub-calendar export functions', () => {
  it('escapes CSV values containing special characters', () => {
    expect(escapeCsvValue('Simple Text')).toBe('Simple Text');
    expect(escapeCsvValue('Text with, comma')).toBe('"Text with, comma"');
    expect(escapeCsvValue('Text with "quotes"')).toBe('"Text with ""quotes"""');
    expect(escapeCsvValue('Text with \n newline')).toBe('"Text with \n newline"');
  });

  it('builds month milestones CSV export sorted by date, type, and full name', () => {
    const member1 = makeMember({ id: 'm1', full_name: 'Test Alpha', date_of_birth: '1990-09-10' });
    const member2 = makeMember({ id: 'm2', full_name: 'Test Bravo', date_of_birth: '1990-09-10' });

    const milestoneEntries: MilestoneEntry[] = [
      { id: 'm2-birthday', type: 'birthday', member: member2 },
      { id: 'm1-birthday', type: 'birthday', member: member1 },
    ];

    const { csvText, filename } = buildMonthMilestoneCsvExport({
      milestoneEntries,
      year: 2026,
      monthIndex: 8,
    });

    expect(filename).toBe('member-milestones-2026-09.csv');
    const lines = csvText.split('\n');
    expect(lines[0]).toBe(
      'Member ID,Full Name,Nickname,Milestone Type,Milestone Date,Email,Phone,Role,Category',
    );
    expect(lines[1]).toContain('Test Alpha');
    expect(lines[2]).toContain('Test Bravo');
  });

  it('builds Sunday schedules CSV export sorted by time slot order then full name', () => {
    const member1 = makeMember({ id: 'm1', full_name: 'Test Zulu' });
    const member2 = makeMember({ id: 'm2', full_name: 'Test Alpha' });

    const entries: MemberScheduleEntry[] = [
      {
        member: member1,
        sundayKey: 'first_sunday',
        timeSlots: ['12NN', '9AM'],
      },
      {
        member: member2,
        sundayKey: 'first_sunday',
        timeSlots: ['9AM'],
      },
    ];

    const { csvText, filename } = buildSundaySchedulesCsvExport({
      selectedEntries: entries,
      year: 2026,
      monthIndex: 8,
      dayNumber: 6,
    });

    expect(filename).toBe('service-schedules-2026-09-06.csv');
    const lines = csvText.split('\n');
    expect(lines[0]).toBe(
      'Time Slot,Member ID,Full Name,Nickname,Role,Category,Confidence Level,Turnup Rate,Email,Phone,Excused,Excused Reason',
    );
    // 9AM slot: Test Alpha first, then Test Zulu
    expect(lines[1]).toContain(
      '9:00 AM,MEM-001,Test Alpha,Test Nick,Usher,adult,Solid,80%,member@example.com,123-456,No,',
    );
    expect(lines[2]).toContain(
      '9:00 AM,MEM-001,Test Zulu,Test Nick,Usher,adult,Solid,80%,member@example.com,123-456,No,',
    );
    // 12NN slot: Test Zulu
    expect(lines[3]).toContain(
      '12:00 NN,MEM-001,Test Zulu,Test Nick,Usher,adult,Solid,80%,member@example.com,123-456,No,',
    );
  });

  it('exports excused status and reason when excusedMap is provided', () => {
    const excusedMember = makeMember({
      id: 'm-excused',
      member_id: 'MEM-EXC',
      full_name: 'Test Bravo',
    });
    const normalMember = makeMember({
      id: 'm-normal',
      member_id: 'MEM-NORM',
      full_name: 'Test Alpha',
    });

    const entries: MemberScheduleEntry[] = [
      {
        member: excusedMember,
        sundayKey: 'third_sunday',
        timeSlots: ['9AM', '12NN'],
      },
      {
        member: normalMember,
        sundayKey: 'third_sunday',
        timeSlots: ['9AM'],
      },
    ];

    const excusedMap = new Map([
      [
        '2026-09-20',
        new Map([
          [
            'm-excused',
            {
              slots: new Set(['9AM' as const]),
              reasons: new Map([['9AM' as const, 'Medical rest, doctor advise']]),
            },
          ],
        ]),
      ],
    ]);

    const statsMap = new Map([
      ['m-normal', { attendanceScore: 10, committed: 10, attended: 10, turnupRate: 1.0 }],
      ['m-excused', { attendanceScore: 5, committed: 10, attended: 5, turnupRate: 0.5 }],
    ]);

    const { csvText } = buildSundaySchedulesCsvExport({
      selectedEntries: entries,
      year: 2026,
      monthIndex: 8,
      dayNumber: 20,
      excusedMap,
      attendanceScoreMap: statsMap,
    });

    const lines = csvText.split('\n');
    // Header
    expect(lines[0]).toBe(
      'Time Slot,Member ID,Full Name,Nickname,Role,Category,Confidence Level,Turnup Rate,Email,Phone,Excused,Excused Reason',
    );
    // 9AM: Test Alpha (not excused, turnup 100%, Solid)
    expect(lines[1]).toContain('9:00 AM,MEM-NORM,Test Alpha');
    expect(lines[1]).toContain(',Solid,100%,');
    expect(lines[1]).toContain(',No,');
    // 9AM: Test Bravo (excused with reason, quoted for comma, Excused, 0%)
    expect(lines[2]).toContain('9:00 AM,MEM-EXC,Test Bravo');
    expect(lines[2]).toContain(',Excused,0%,');
    expect(lines[2]).toContain(',Yes,"Medical rest, doctor advise"');
    // 12NN: Test Bravo (not excused for 12NN, Moderate, 50%)
    expect(lines[3]).toContain('12:00 NN,MEM-EXC,Test Bravo');
    expect(lines[3]).toContain(',Moderate,50%,');
    expect(lines[3]).toContain(',No,');
  });
});
