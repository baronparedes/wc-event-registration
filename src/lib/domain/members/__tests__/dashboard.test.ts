import { describe, expect, it } from 'vitest';

import type { MemberUserRow } from '../api';
import {
  calculateAge,
  computeMemberDashboardData,
  extractPrimaryRole,
  getMetadataStringValue,
  normalizeDGroupStatus,
  parseSundayTimeSlots,
} from '../dashboard';

describe('extractPrimaryRole', () => {
  it('extracts primary role from slash or comma-delimited composite roles', () => {
    expect(extractPrimaryRole('IMT Support / Usher')).toBe('IMT Support');
    expect(extractPrimaryRole('Prayer Coach, Backroom Support')).toBe('Prayer Coach');
    expect(extractPrimaryRole('Usher')).toBe('Usher');
  });

  it('returns General Volunteer for null, undefined, or empty role', () => {
    expect(extractPrimaryRole(null)).toBe('General Volunteer');
    expect(extractPrimaryRole(undefined)).toBe('General Volunteer');
    expect(extractPrimaryRole('')).toBe('General Volunteer');
    expect(extractPrimaryRole('   ')).toBe('General Volunteer');
  });
});

describe('calculateAge', () => {
  const asOf = new Date(2026, 9, 21); // Oct 21, 2026

  it('calculates correct age before birthday in same year', () => {
    expect(calculateAge('1990-11-15', asOf)).toBe(35);
  });

  it('calculates correct age after birthday in same year', () => {
    expect(calculateAge('1990-05-15', asOf)).toBe(36);
  });

  it('returns null for missing, empty, or invalid date strings', () => {
    expect(calculateAge(null, asOf)).toBeNull();
    expect(calculateAge('', asOf)).toBeNull();
    expect(calculateAge('   ', asOf)).toBeNull();
    expect(calculateAge('1990-05', asOf)).toBeNull();
    expect(calculateAge('invalid-date', asOf)).toBeNull();
    expect(calculateAge('abc-def-ghi', asOf)).toBeNull();
    expect(calculateAge('2030-01-01', asOf)).toBeNull(); // Future date
    expect(calculateAge('1800-01-01', asOf)).toBeNull(); // Too old (> 125)
  });

  it('calculates exact birthday edge conditions', () => {
    expect(calculateAge('1990-10-21', asOf)).toBe(36); // Exactly on birthday
    expect(calculateAge('1990-10-22', asOf)).toBe(35); // Birthday tomorrow
  });
});

describe('parseSundayTimeSlots', () => {
  it('parses comma-separated and space-separated timeslots', () => {
    expect(parseSundayTimeSlots('9AM, 12NN')).toEqual(['9AM', '12NN']);
    expect(parseSundayTimeSlots('9:00 AM, 3:00 PM')).toEqual(['9AM', '3PM']);
    expect(parseSundayTimeSlots('12PM / 3PM')).toEqual(['12NN', '3PM']);
  });

  it('returns empty array for invalid or non-string input', () => {
    expect(parseSundayTimeSlots(null)).toEqual([]);
    expect(parseSundayTimeSlots(undefined)).toEqual([]);
    expect(parseSundayTimeSlots('none')).toEqual([]);
  });
});

describe('computeMemberDashboardData', () => {
  const asOf = new Date(2026, 9, 21);

  function createMember(overrides: Partial<MemberUserRow> = {}): MemberUserRow {
    return {
      id: 'm-default',
      member_id: 'RFID-DEFAULT',
      avatar_object_key: null,
      is_active: true,
      full_name: 'Test Member',
      first_name: 'Test',
      last_name: 'Test Last',
      nickname: 'Test',
      email: 'test@example.com',
      phone: null,
      date_of_birth: null,
      role: 'Volunteer',
      category: 'Adult',
      metadata: null,
      created_at: '2025-01-01T00:00:00Z',
      updated_at: '2025-01-01T00:00:00Z',
      notes: [],
      ...overrides,
    };
  }

  const sampleMembers: MemberUserRow[] = [
    createMember({
      id: 'm-1',
      member_id: 'RFID-1',
      avatar_object_key: null,
      is_active: true,
      full_name: 'Test Alice Leader',
      first_name: 'Test Alice',
      last_name: 'Test Leader',
      nickname: 'Test Ali',
      email: 'alice@example.com',
      phone: '09171112222',
      date_of_birth: '1985-04-10', // 41 years old -> '35–44'
      role: 'DGroup Leader',
      category: 'Adult',
      metadata: {
        first_sunday: '9AM',
        second_sunday: '9AM, 12NN',
        dgroup_status: 'Active',
      },
      created_at: '2025-01-01T00:00:00Z',
      updated_at: '2025-01-01T00:00:00Z',
    }),
    createMember({
      id: 'm-2',
      member_id: 'RFID-2',
      avatar_object_key: 'avatar-2.png',
      is_active: true,
      full_name: 'Test Bob Member',
      first_name: 'Test Bob',
      last_name: 'Test Member',
      nickname: 'Test Bobby',
      email: 'bob@example.com',
      phone: '09173334444',
      date_of_birth: '2005-02-15', // 21 years old -> '18–24'
      role: 'Volunteer / Usher',
      category: 'Youth',
      metadata: {
        first_sunday: '12NN',
        dgroup_leader: 'Test Alice Leader',
        dgroup_status: 'Active',
        dgroup_member_since: '2023',
      },
      created_at: '2025-01-01T00:00:00Z',
      updated_at: '2025-01-01T00:00:00Z',
    }),
    createMember({
      id: 'm-3',
      member_id: 'RFID-3',
      avatar_object_key: null,
      is_active: true,
      full_name: 'Test Charlie Solo',
      first_name: 'Test Charlie',
      last_name: 'Test Solo',
      nickname: 'Test Chuck',
      email: 'charlie@example.com',
      phone: null,
      date_of_birth: null, // Unspecified
      role: 'Volunteer',
      category: 'Adult',
      metadata: null,
      created_at: '2025-01-01T00:00:00Z',
      updated_at: '2025-01-01T00:00:00Z',
    }),
    createMember({
      id: 'm-4',
      member_id: 'RFID-4',
      avatar_object_key: null,
      is_active: true,
      full_name: 'Test David Flagged',
      first_name: 'Test David',
      last_name: 'Test Flagged',
      nickname: 'Test Dave',
      email: 'david@example.com',
      phone: null,
      date_of_birth: '1955-08-01', // 71 years old -> '65+'
      role: 'Usher',
      category: 'Senior',
      metadata: {
        is_dgroup_leader: 'yes',
        third_sunday: '3PM',
      },
      created_at: '2025-01-01T00:00:00Z',
      updated_at: '2025-01-01T00:00:00Z',
    }),
  ];

  it('computes role distributions correctly', () => {
    const data = computeMemberDashboardData(sampleMembers, asOf);
    expect(data.totalActiveMembers).toBe(4);

    const volunteerRole = data.roleDistributions.find((r) => r.role === 'Volunteer');
    expect(volunteerRole?.count).toBe(2);
    expect(volunteerRole?.percentage).toBe(50);

    const leaderRole = data.roleDistributions.find((r) => r.role === 'DGroup Leader');
    expect(leaderRole?.count).toBe(1);
    expect(leaderRole?.percentage).toBe(25);
  });

  it('computes age demographics correctly', () => {
    const data = computeMemberDashboardData(sampleMembers, asOf);
    expect(data.ageDemographics.totalWithDob).toBe(3);
    expect(data.ageDemographics.coveragePercentage).toBe(75);

    // Ages: 41, 21, 71 -> Avg = 44.3
    expect(data.ageDemographics.averageAge).toBe(44.3);
    expect(data.ageDemographics.medianAge).toBe(41);

    const unspec = data.ageDemographics.brackets.find((b) => b.bracket === 'Unspecified');
    expect(unspec?.count).toBe(1);

    const b1824 = data.ageDemographics.brackets.find((b) => b.bracket === '18–24');
    expect(b1824?.count).toBe(1);
  });

  it('computes Sunday commitment heatmap correctly', () => {
    const data = computeMemberDashboardData(sampleMembers, asOf);
    expect(data.commitmentHeatmap.totalCommittedMembers).toBe(3); // Alice, Bob, David

    const firstSun9AM = data.commitmentHeatmap.slots.find(
      (s) => s.sundayKey === 'first_sunday' && s.timeSlot === '9AM',
    );
    expect(firstSun9AM?.count).toBe(1);
    expect(firstSun9AM?.members[0].fullName).toBe('Test Alice Leader');

    const firstSun12NN = data.commitmentHeatmap.slots.find(
      (s) => s.sundayKey === 'first_sunday' && s.timeSlot === '12NN',
    );
    expect(firstSun12NN?.count).toBe(1);
    expect(firstSun12NN?.members[0].fullName).toBe('Test Bob Member');

    const thirdSun3PM = data.commitmentHeatmap.slots.find(
      (s) => s.sundayKey === 'third_sunday' && s.timeSlot === '3PM',
    );
    expect(thirdSun3PM?.count).toBe(1);
    expect(thirdSun3PM?.members[0].fullName).toBe('Test David Flagged');
  });

  it('identifies DGroup members and leaders via hybrid detection', () => {
    const data = computeMemberDashboardData(sampleMembers, asOf);
    // Alice (role + referenced by Bob) -> leader
    // Bob (has leader + status) -> in dgroup
    // Charlie (no metadata) -> no dgroup
    // David (is_dgroup_leader: yes) -> leader + in dgroup
    expect(data.dgroupAnalytics.inDGroupCount).toBe(3);
    expect(data.dgroupAnalytics.missingDGroupCount).toBe(1);
    expect(data.dgroupAnalytics.coveragePercentage).toBe(75);
    expect(data.dgroupAnalytics.dgroupLeaderCount).toBe(2); // Alice & David
    expect(data.dgroupAnalytics.dgroupMemberCount).toBe(1); // Bob

    const aliceRow = data.dgroupAnalytics.members.find((m) => m.id === 'm-1');
    expect(aliceRow?.isDGroupLeader).toBe(true);

    const bobRow = data.dgroupAnalytics.members.find((m) => m.id === 'm-2');
    expect(bobRow?.isDGroupLeader).toBe(false);
    expect(bobRow?.dgroupLeader).toBe('Test Alice Leader');

    const charlieRow = data.dgroupAnalytics.members.find((m) => m.id === 'm-3');
    expect(charlieRow?.hasDGroup).toBe(false);

    const davidRow = data.dgroupAnalytics.members.find((m) => m.id === 'm-4');
    expect(davidRow?.isDGroupLeader).toBe(true);
  });

  it('recognizes members with metadata.dgroup_status = leader as DGroup leaders', () => {
    const leaderStatusMember = createMember({
      id: 'm-status-leader',
      member_id: 'RFID-STATUS-1',
      avatar_object_key: null,
      is_active: true,
      full_name: 'Test Status Leader',
      first_name: 'Test Status',
      last_name: 'Test Leader',
      nickname: 'Test SL',
      email: 'status.leader@example.com',
      phone: null,
      date_of_birth: '1990-01-01',
      role: 'Volunteer',
      category: 'Adult',
      metadata: {
        dgroup_status: 'leader',
      },
      created_at: '2025-01-01T00:00:00Z',
      updated_at: '2025-01-01T00:00:00Z',
    });

    const data = computeMemberDashboardData([leaderStatusMember], asOf);
    expect(data.dgroupAnalytics.inDGroupCount).toBe(1);
    expect(data.dgroupAnalytics.dgroupLeaderCount).toBe(1);
    expect(data.dgroupAnalytics.dgroupMemberCount).toBe(0);
    expect(data.dgroupAnalytics.statusBreakdown[0].status).toBe('Leader');
    expect(data.dgroupAnalytics.members[0].isDGroupLeader).toBe(true);
  });

  it('excludes inactive members with is_active = false from dashboard analytics', () => {
    const inactiveMember = createMember({
      id: 'm-inactive',
      member_id: 'RFID-INACTIVE',
      avatar_object_key: null,
      is_active: false,
      full_name: 'Test Inactive Person',
      first_name: 'Test Inactive',
      last_name: 'Test Person',
      nickname: 'Test Inact',
      email: 'inactive@example.com',
      phone: null,
      date_of_birth: '1985-05-05',
      role: 'Usher',
      category: 'Adult',
      metadata: {
        first_sunday: '9AM',
        dgroup_status: 'leader',
      },
      created_at: '2025-01-01T00:00:00Z',
      updated_at: '2025-01-01T00:00:00Z',
    });

    const data = computeMemberDashboardData([...sampleMembers, inactiveMember], asOf);
    // Should still only have 4 active members from sampleMembers
    expect(data.totalActiveMembers).toBe(4);
    expect(data.dgroupAnalytics.members.some((m) => m.id === 'm-inactive')).toBe(false);
  });

  it('strictly classifies members with metadata.dgroup_status = member as non-leaders', () => {
    // Member whose name is referenced as leader by another attendee, but has dgroup_status = 'member'
    const memberWithLeaderReference = createMember({
      id: 'm-member-ref',
      member_id: 'RFID-MEMBER-REF',
      avatar_object_key: null,
      is_active: true,
      full_name: 'Test Referenced Person',
      first_name: 'Test Referenced',
      last_name: 'Test Person',
      nickname: 'Test Ref',
      email: 'ref.member@example.com',
      phone: null,
      date_of_birth: '1995-01-01',
      role: 'Prayer Coach',
      category: 'Adult',
      metadata: {
        dgroup_status: 'member',
      },
      created_at: '2025-01-01T00:00:00Z',
      updated_at: '2025-01-01T00:00:00Z',
    });

    // Another member referencing Test Referenced Person as their leader
    const discipleMember = createMember({
      id: 'm-disciple',
      member_id: 'RFID-DISCIPLE',
      avatar_object_key: null,
      is_active: true,
      full_name: 'Test Disciple',
      first_name: 'Test Disciple',
      last_name: 'Test Student',
      nickname: 'Test Disc',
      email: 'disciple@example.com',
      phone: null,
      date_of_birth: '2000-01-01',
      role: 'Volunteer',
      category: 'Youth',
      metadata: {
        dgroup_leader: 'Test Referenced Person',
        dgroup_status: 'member',
      },
      created_at: '2025-01-01T00:00:00Z',
      updated_at: '2025-01-01T00:00:00Z',
    });

    const data = computeMemberDashboardData([memberWithLeaderReference, discipleMember], asOf);
    expect(data.dgroupAnalytics.inDGroupCount).toBe(2);
    expect(data.dgroupAnalytics.dgroupLeaderCount).toBe(0);
    expect(data.dgroupAnalytics.dgroupMemberCount).toBe(2);

    const refRow = data.dgroupAnalytics.members.find((m) => m.id === 'm-member-ref');
    expect(refRow?.isDGroupLeader).toBe(false);
    expect(refRow?.dgroupStatus).toBe('Member');
  });

  it('handles empty members array with safe zero defaults', () => {
    const data = computeMemberDashboardData([], asOf);
    expect(data.totalActiveMembers).toBe(0);
    expect(data.roleDistributions).toEqual([]);
    expect(data.ageDemographics.averageAge).toBeNull();
    expect(data.ageDemographics.medianAge).toBeNull();
    expect(data.ageDemographics.coveragePercentage).toBe(0);
    expect(data.commitmentHeatmap.totalCommittedMembers).toBe(0);
    expect(data.dgroupAnalytics.coveragePercentage).toBe(0);
    expect(data.dgroupAnalytics.inDGroupCount).toBe(0);
    expect(data.dgroupAnalytics.missingDGroupCount).toBe(0);
  });

  it('computes median age accurately when even number of members have DOB', () => {
    const member1 = createMember({ id: 'm-age-1', date_of_birth: '1996-10-21' }); // 30
    const member2 = createMember({ id: 'm-age-2', date_of_birth: '1986-10-21' }); // 40

    const data = computeMemberDashboardData([member1, member2], asOf);
    expect(data.ageDemographics.totalWithDob).toBe(2);
    expect(data.ageDemographics.medianAge).toBe(35);
  });

  it('correctly categorizes members across under 18, 45-54, and 55-64 age brackets', () => {
    const memberUnder18 = createMember({ id: 'm-u18', date_of_birth: '2012-05-15' }); // 14
    const member45to54 = createMember({ id: 'm-45', date_of_birth: '1976-05-15' }); // 50
    const member55to64 = createMember({ id: 'm-55', date_of_birth: '1966-05-15' }); // 60

    const data = computeMemberDashboardData([memberUnder18, member45to54, member55to64], asOf);
    const u18Bracket = data.ageDemographics.brackets.find((b) => b.bracket === '< 18');
    const midBracket = data.ageDemographics.brackets.find((b) => b.bracket === '45–54');
    const seniorBracket = data.ageDemographics.brackets.find((b) => b.bracket === '55–64');

    expect(u18Bracket?.count).toBe(1);
    expect(midBracket?.count).toBe(1);
    expect(seniorBracket?.count).toBe(1);
  });

  it('detects DGroup leaders via alternative statuses, flags, and sorts status breakdown by frequency', () => {
    const leaderByHead = createMember({
      id: 'm-head',
      metadata: { dgroup_status: 'head' },
    });
    const leaderByCoLeader = createMember({
      id: 'm-co-leader',
      metadata: { dgroup_status: 'co-leader' },
    });
    const leaderByFlagTrue = createMember({
      id: 'm-flag-true',
      metadata: { is_dgroup_leader: 'true', dgroup_status: 'active' },
    });
    const leaderByFlagOne = createMember({
      id: 'm-flag-1',
      metadata: { is_dgroup_leader: '1', dgroup_status: 'active' },
    });
    const memberWithNonStringRole = createMember({
      id: 'm-null-role',
      role: null as unknown as string,
      full_name: null as unknown as string,
      metadata: { dgroup_status: 'active' },
    });

    const data = computeMemberDashboardData(
      [leaderByHead, leaderByCoLeader, leaderByFlagTrue, leaderByFlagOne, memberWithNonStringRole],
      asOf,
    );

    expect(data.dgroupAnalytics.dgroupLeaderCount).toBe(4);
    // Active status has 3, Head has 1, Co-leader has 1 -> statusBreakdown sorted descending
    expect(data.dgroupAnalytics.statusBreakdown[0].status).toBe('Active');
    expect(data.dgroupAnalytics.statusBreakdown[0].count).toBe(3);
  });
});

describe('getMetadataStringValue', () => {
  it('returns undefined for null or undefined metadata', () => {
    expect(getMetadataStringValue(null, ['status'])).toBeUndefined();
    expect(getMetadataStringValue(undefined, ['status'])).toBeUndefined();
  });

  it('returns value matching direct candidate key', () => {
    expect(getMetadataStringValue({ dgroup_status: 'Leader' }, ['dgroup_status'])).toBe('Leader');
  });

  it('returns value matching normalized key with spaces or underscores', () => {
    expect(getMetadataStringValue({ 'd group status': 'Active' }, ['dgroup_status'])).toBe(
      'Active',
    );
  });

  it('ignores empty strings and whitespace', () => {
    expect(getMetadataStringValue({ status: '   ' }, ['status'])).toBeUndefined();
  });
});

describe('normalizeDGroupStatus', () => {
  it('normalizes common DGroup status phrases', () => {
    expect(normalizeDGroupStatus(null)).toBeNull();
    expect(normalizeDGroupStatus('')).toBeNull();
    expect(normalizeDGroupStatus('  ')).toBeNull();
    expect(normalizeDGroupStatus('dgroup leader')).toBe('Leader');
    expect(normalizeDGroupStatus('leader')).toBe('Leader');
    expect(normalizeDGroupStatus('dgroup member')).toBe('Member');
    expect(normalizeDGroupStatus('member')).toBe('Member');
    expect(normalizeDGroupStatus('active')).toBe('Active');
    expect(normalizeDGroupStatus('inactive')).toBe('Inactive');
    expect(normalizeDGroupStatus('in-training')).toBe('In-training');
  });
});

describe('parseSundayTimeSlots variants', () => {
  it('handles various timestamp representations', () => {
    expect(parseSundayTimeSlots('9:00AM, 12:00NN, 3:00PM')).toEqual(['9AM', '12NN', '3PM']);
    expect(parseSundayTimeSlots('12:00PM')).toEqual(['12NN']);
    expect(parseSundayTimeSlots('12NN / 9AM')).toEqual(['12NN', '9AM']);
  });
});
