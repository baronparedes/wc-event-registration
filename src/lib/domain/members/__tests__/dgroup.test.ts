import { describe, expect, it } from 'vitest';

import {
  detectDGroupStatus,
  extractDGroupValues,
  formatDGroupMemberSince,
  isDGroupKey,
  updateMetadataWithDGroupField,
} from '../dgroup';

describe('dgroup domain helpers', () => {
  describe('isDGroupKey', () => {
    it('identifies canonical dgroup keys', () => {
      expect(isDGroupKey('dgroup_status')).toBe(true);
      expect(isDGroupKey('dgroup_member_since')).toBe(true);
      expect(isDGroupKey('dgroup_leader')).toBe(true);
      expect(isDGroupKey('dgroup_leader_contact')).toBe(true);
      expect(isDGroupKey('dgroup_leader_email')).toBe(true);
      expect(isDGroupKey('dgroup_miner_open_schedule')).toBe(true);
      expect(isDGroupKey('dgroup_miner_open_slots')).toBe(true);
    });

    it('identifies alternative or case-insensitive dgroup keys', () => {
      expect(isDGroupKey('DGroup Leader')).toBe(true);
      expect(isDGroupKey('dgroupleader')).toBe(true);
      expect(isDGroupKey('d_group_status')).toBe(true);
      expect(isDGroupKey('dgroupmember since')).toBe(true);
    });

    it('returns false for unrelated keys', () => {
      expect(isDGroupKey('first_sunday')).toBe(false);
      expect(isDGroupKey('civil_status')).toBe(false);
      expect(isDGroupKey('wedding_date')).toBe(false);
    });
  });

  describe('formatDGroupMemberSince', () => {
    it('formats ISO dates YYYY-MM and YYYY-MM-DD to Mmm-YY', () => {
      expect(formatDGroupMemberSince('2023-10-15')).toBe('Oct-23');
      expect(formatDGroupMemberSince('2024-01')).toBe('Jan-24');
      expect(formatDGroupMemberSince('2021-12-01')).toBe('Dec-21');
    });

    it('normalizes month-year strings to Mmm-YY', () => {
      expect(formatDGroupMemberSince('oct-23')).toBe('Oct-23');
      expect(formatDGroupMemberSince('OCT 23')).toBe('Oct-23');
      expect(formatDGroupMemberSince('jan-2024')).toBe('Jan-24');
    });

    it('falls back to string or empty string', () => {
      expect(formatDGroupMemberSince('')).toBe('');
      expect(formatDGroupMemberSince(null)).toBe('');
      expect(formatDGroupMemberSince(undefined)).toBe('');
      expect(formatDGroupMemberSince('Mid-2020')).toBe('Mid-2020');
    });
  });

  describe('detectDGroupStatus', () => {
    it('detects member variations', () => {
      expect(detectDGroupStatus('member')).toBe('member');
      expect(detectDGroupStatus('Member')).toBe('member');
      expect(detectDGroupStatus('dgroup member')).toBe('member');
    });

    it('detects leader variations', () => {
      expect(detectDGroupStatus('leader')).toBe('leader');
      expect(detectDGroupStatus('Leader')).toBe('leader');
      expect(detectDGroupStatus('dgroup leader')).toBe('leader');
      expect(detectDGroupStatus('head')).toBe('leader');
      expect(detectDGroupStatus('co-leader')).toBe('leader');
    });

    it('returns empty string for blank or invalid values', () => {
      expect(detectDGroupStatus('')).toBe('');
      expect(detectDGroupStatus(null)).toBe('');
      expect(detectDGroupStatus('other')).toBe('');
    });
  });

  describe('extractDGroupValues', () => {
    it('extracts all 7 fields from metadata record with blanks for missing fields', () => {
      const metadata = {
        dgroup_status: 'leader',
        dgroup_member_since: '2023-08-01',
        dgroup_leader: 'Pastor Paul',
        dgroup_leader_contact: '09171234567',
        dgroup_leader_email: 'paul@example.com',
        dgroup_miner_open_schedule: 'Thursdays 7PM',
        dgroup_miner_open_slots: '4',
      };

      const result = extractDGroupValues(metadata);

      expect(result).toEqual({
        status: 'leader',
        memberSince: 'Aug-23',
        leader: 'Pastor Paul',
        leaderContact: '09171234567',
        leaderEmail: 'paul@example.com',
        minerOpenSchedule: 'Thursdays 7PM',
        minerOpenSlots: '4',
      });
    });

    it('returns all blanks when metadata is empty or null', () => {
      expect(extractDGroupValues({})).toEqual({
        status: '',
        memberSince: '',
        leader: '',
        leaderContact: '',
        leaderEmail: '',
        minerOpenSchedule: '',
        minerOpenSlots: '',
      });
      expect(extractDGroupValues(null)).toEqual({
        status: '',
        memberSince: '',
        leader: '',
        leaderContact: '',
        leaderEmail: '',
        minerOpenSchedule: '',
        minerOpenSlots: '',
      });
    });

    it('extracts values from entries array', () => {
      const entries = [
        { key: 'dgroup_status', value: 'Member' },
        { key: 'dgroup_leader', value: 'Sister Sarah' },
      ];

      const result = extractDGroupValues(entries);

      expect(result.status).toBe('member');
      expect(result.leader).toBe('Sister Sarah');
      expect(result.memberSince).toBe('');
      expect(result.minerOpenSlots).toBe('');
    });
  });

  describe('updateMetadataWithDGroupField', () => {
    it('adds new canonical entry if missing', () => {
      const entries: { key: string; value: string }[] = [];
      const updated = updateMetadataWithDGroupField(entries, 'leader', 'John Doe');

      expect(updated).toEqual([{ key: 'dgroup_leader', value: 'John Doe' }]);
    });

    it('updates existing canonical entry', () => {
      const entries = [{ key: 'dgroup_leader', value: 'John' }];
      const updated = updateMetadataWithDGroupField(entries, 'leader', 'Jane Doe');

      expect(updated).toEqual([{ key: 'dgroup_leader', value: 'Jane Doe' }]);
    });

    it('updates legacy candidate key to canonical key', () => {
      const entries = [{ key: 'dgroupleader', value: 'John' }];
      const updated = updateMetadataWithDGroupField(entries, 'leader', 'Jane Doe');

      expect(updated).toEqual([{ key: 'dgroup_leader', value: 'Jane Doe' }]);
    });

    it('removes entry when new value is empty', () => {
      const entries = [
        { key: 'dgroup_leader', value: 'John' },
        { key: 'first_sunday', value: '9AM' },
      ];
      const updated = updateMetadataWithDGroupField(entries, 'leader', '');

      expect(updated).toEqual([{ key: 'first_sunday', value: '9AM' }]);
    });
  });
});
