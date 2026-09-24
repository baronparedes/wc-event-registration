import { describe, expect, it } from 'vitest';

import { buildCommitmentDashboardCsvExport } from '../service-commitment-export';
import type { CommitmentDashboardStat } from '../types';

describe('service-commitment-export', () => {
  const mockStats: CommitmentDashboardStat[] = [
    {
      user_id: 'u-1',
      member_id: 'MEM-001',
      avatar_object_key: null,
      full_name: 'Doe, Jane',
      nickname: 'Jane',
      email: 'jane@example.com',
      role: 'Usher',
      category: 'Women',
      start_date: '2025-01-01',
      committed: 10,
      attended: 8,
      absences: 2,
      excused: 1,
      wi_9am_3pm: 2,
      wi_12nn: 1,
      attendance_score: 9,
    },
    {
      user_id: 'u-2',
      member_id: 'MEM-002',
      avatar_object_key: null,
      full_name: 'Smith, John',
      nickname: 'Johnny',
      email: 'john@example.com',
      role: 'Greeter',
      category: 'Men',
      start_date: '2025-02-01',
      committed: 12,
      attended: 12,
      absences: 0,
      excused: 0,
      wi_9am_3pm: 0,
      wi_12nn: 0,
      attendance_score: 12,
    },
  ];

  it('builds CSV header and formatted rows sorted by attendance score descending', () => {
    const { csvText, filename } = buildCommitmentDashboardCsvExport({
      stats: mockStats,
      startDate: '2026-01-01',
      endDate: '2026-12-31',
    });

    const lines = csvText.split('\n');
    expect(lines[0]).toBe(
      'Full Name,Nickname,Member ID,Email,Role,Category,Start Date,Attendance Score,Committed,Attended,Absences,Excused,WI 9AM/3PM,WI 12NN',
    );
    // John has score 12, should be first
    expect(lines[1]).toContain('"Smith, John"');
    expect(lines[1]).toContain('Johnny');
    expect(lines[1]).toContain('MEM-002');
    expect(lines[1]).toContain('john@example.com');
    expect(lines[1]).toContain('Greeter');
    expect(lines[1]).toContain('Men');
    expect(lines[1]).toContain('2025-02-01');
    expect(lines[1]).toContain('12');

    // Jane has score 9, should be second
    expect(lines[2]).toContain('"Doe, Jane"');
    expect(lines[2]).toContain('Jane');
    expect(lines[2]).toContain('MEM-001');
    expect(lines[2]).toContain('jane@example.com');
    expect(lines[2]).toContain('Usher');
    expect(lines[2]).toContain('Women');
    expect(lines[2]).toContain('2025-01-01');
    expect(lines[2]).toContain('9');

    expect(filename).toMatch(/^service-commitment-2026-01-01-to-2026-12-31-\d{8}-\d{6}\.csv$/);
  });

  it('uses timeframe in filename when provided and not YTD', () => {
    const { filename } = buildCommitmentDashboardCsvExport({
      stats: mockStats,
      startDate: '2026-01-01',
      endDate: '2026-03-31',
      timeframe: 'Q1',
    });

    expect(filename).toMatch(/^service-commitment-q1-\d{8}-\d{6}\.csv$/);
  });

  it('handles empty stats list gracefully', () => {
    const { csvText, filename } = buildCommitmentDashboardCsvExport({
      stats: [],
      startDate: '2026-01-01',
      endDate: '2026-01-01',
    });

    const lines = csvText.split('\n');
    expect(lines).toHaveLength(1);
    expect(lines[0]).toBe(
      'Full Name,Nickname,Member ID,Email,Role,Category,Start Date,Attendance Score,Committed,Attended,Absences,Excused,WI 9AM/3PM,WI 12NN',
    );
    expect(filename).toMatch(/^service-commitment-2026-01-01-\d{8}-\d{6}\.csv$/);
  });
});
