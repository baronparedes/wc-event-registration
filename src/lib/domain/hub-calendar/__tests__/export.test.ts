import { describe, expect, it } from 'vitest';

import type { MemberScheduleEntry } from '@/hooks/domain/members';
import type { ExcusedMemberMap, MilestoneEntry } from '@/lib/domain/hub-calendar/types';
import { type AdminMember, MEMBER_EXTRA_METADATA_KEYS } from '@/lib/domain/members';

import {
  buildMonthMilestoneCsvExport,
  buildSundaySchedulesCsvExport,
  escapeCsvValue,
} from '../export';

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
    notes: [],
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

  it('sorts mixed milestones by month/day, type, then name without mutating input', () => {
    const makeEntry = (id: string, type: MilestoneEntry['type'], date: string): MilestoneEntry => ({
      id,
      type,
      member: makeMember({
        member_id: id,
        full_name: `Test ${id}`,
        date_of_birth: date,
        extra_metadata: { [MEMBER_EXTRA_METADATA_KEYS.weddingAnniversaryDate]: date },
      }),
    });
    const entries = [
      makeEntry('Late', 'birthday', '1990-09-20'),
      makeEntry('Anniversary', 'wedding_anniversary', '2015-09-10'),
      makeEntry('Bravo', 'birthday', '1990-09-10'),
      makeEntry('Alpha', 'birthday', '1990-09-10'),
      makeEntry('Early', 'birthday', '1990-09-01'),
    ];
    const original = entries.map((entry) => entry.id);
    for (const milestoneEntries of [entries, [...entries].reverse()]) {
      const { csvText } = buildMonthMilestoneCsvExport({
        milestoneEntries,
        year: 2026,
        monthIndex: 8,
      });
      expect(
        csvText
          .split('\n')
          .slice(1)
          .map((row) => row.split(',')[0]),
      ).toEqual(['Early', 'Alpha', 'Bravo', 'Anniversary', 'Late']);
      expect(csvText).toContain('Wedding Anniversary,2015-09-10');
    }
    expect(entries.map((entry) => entry.id)).toEqual(original);
  });

  it('exports missing or invalid milestone dates and nullable contact details safely', () => {
    const entries: MilestoneEntry[] = [
      {
        id: 'invalid',
        type: 'birthday',
        member: makeMember({ member_id: 'INVALID', date_of_birth: 'invalid' }),
      },
      {
        id: 'missing',
        type: 'birthday',
        member: makeMember({
          member_id: 'MISSING',
          full_name: 'Test Missing',
          date_of_birth: null,
          nickname: null,
          email: null,
          phone: null,
        }),
      },
      {
        id: 'anniversary',
        type: 'wedding_anniversary',
        member: makeMember({
          member_id: 'ANNIVERSARY',
          extra_metadata: {},
        }),
      },
    ];
    const { csvText, filename } = buildMonthMilestoneCsvExport({
      milestoneEntries: entries,
      year: 2026,
      monthIndex: 0,
    });
    expect(filename).toBe('member-milestones-2026-01.csv');
    expect(csvText).toContain('MISSING,Test Missing,,Birthday,,,,Usher,adult');
    expect(csvText).toContain('INVALID,Test Member,Test Nick,Birthday,invalid');
    expect(csvText).toContain('ANNIVERSARY,Test Member,Test Nick,Wedding Anniversary,,');
  });

  it('exports headers only when there are no milestones or schedule assignments', () => {
    const milestones = buildMonthMilestoneCsvExport({
      milestoneEntries: [],
      year: 2026,
      monthIndex: 0,
    });
    expect(milestones.csvText.split('\n')).toHaveLength(1);
    const schedule = buildSundaySchedulesCsvExport({
      selectedEntries: [{ member: makeMember(), sundayKey: 'first_sunday', timeSlots: [] }],
      year: 2026,
      monthIndex: 0,
      dayNumber: 4,
    });
    expect(schedule.csvText.split('\n')).toHaveLength(1);
    expect(schedule.filename).toBe('service-schedules-2026-01-04.csv');
  });

  it('exports at-risk turnup and contact fallbacks without exposing internal scores', () => {
    const member = makeMember({ id: 'risk', nickname: null, email: null, phone: null });
    const { csvText } = buildSundaySchedulesCsvExport({
      selectedEntries: [{ member, sundayKey: 'first_sunday', timeSlots: ['3PM'] }],
      year: 2026,
      monthIndex: 0,
      dayNumber: 4,
      attendanceScoreMap: new Map([
        ['risk', { attendanceScore: -999, committed: 10, attended: 2, turnupRate: 0.234 }],
      ]),
    });
    expect(csvText.split('\n')[1]).toBe(
      '3:00 PM,MEM-001,Test Member,,Usher,adult,At Risk,23%,,,No,',
    );
    expect(csvText).not.toContain('-999');
    expect(csvText).not.toContain('Attendance Score');
  });

  it('uses the default forecast for members without a database id', () => {
    const { csvText } = buildSundaySchedulesCsvExport({
      selectedEntries: [
        { member: makeMember({ id: '' }), sundayKey: 'first_sunday', timeSlots: ['9AM'] },
      ],
      year: 2026,
      monthIndex: 0,
      dayNumber: 4,
      attendanceScoreMap: new Map(),
    });
    expect(csvText.split('\n')[1]).toContain(',Solid,80%,');
  });

  it('exports legacy excused slots without requiring a reason', () => {
    const excusedMap: ExcusedMemberMap = new Map([
      ['2026-01-04', new Map([['m1', new Set(['9AM'])]])],
    ]);
    const { csvText } = buildSundaySchedulesCsvExport({
      selectedEntries: [{ member: makeMember(), sundayKey: 'first_sunday', timeSlots: ['9AM'] }],
      year: 2026,
      monthIndex: 0,
      dayNumber: 4,
      excusedMap,
    });
    expect(csvText.split('\n')[1]).toContain(',Excused,0%,member@example.com,123-456,Yes,');
  });
});
