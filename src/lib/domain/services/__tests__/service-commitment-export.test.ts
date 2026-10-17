import { describe, expect, it } from 'vitest';

import { buildCommitmentDashboardCsvExport } from '../service-commitment-export';
import type { CommitmentDashboardStat } from '../types';

describe('service-commitment-export', () => {
  const mockStats: CommitmentDashboardStat[] = [
    {
      user_id: 'u-1',
      member_id: 'MEM-001',
      avatar_object_key: null,
      full_name: 'Test Bravo, Sample',
      nickname: 'Test B',
      email: 'test.bravo@example.com',
      role: 'Usher',
      category: 'Women',
      start_date: '2025-01-01',
      committed: 10,
      attended: 8,
      absences: 2,
      excused: 1,
      wi_9am_3pm: 2,
      wi_12nn: 1,
      wi_5th_sunday: 0,
      attendance_score: 9,
    },
    {
      user_id: 'u-2',
      member_id: 'MEM-002',
      avatar_object_key: null,
      full_name: 'Test Alpha, Sample',
      nickname: 'Test A',
      email: 'test.alpha@example.com',
      role: 'Greeter',
      category: 'Men',
      start_date: '2025-02-01',
      committed: 12,
      attended: 12,
      absences: 0,
      excused: 0,
      wi_9am_3pm: 0,
      wi_12nn: 0,
      wi_5th_sunday: 0,
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
      'Full Name,Nickname,Member ID,Email,Role,Category,Start Date,Attendance Score,Committed,Attended,Absences,Excused,WI 9AM/3PM,WI 12NN,WI 5th Sun',
    );
    // Alpha has score 12, should be first
    expect(lines[1]).toContain('"Test Alpha, Sample"');
    expect(lines[1]).toContain('Test A');
    expect(lines[1]).toContain('MEM-002');
    expect(lines[1]).toContain('test.alpha@example.com');
    expect(lines[1]).toContain('Greeter');
    expect(lines[1]).toContain('Men');
    expect(lines[1]).toContain('2025-02-01');
    expect(lines[1]).toContain('12');

    // Bravo has score 9, should be second
    expect(lines[2]).toContain('"Test Bravo, Sample"');
    expect(lines[2]).toContain('Test B');
    expect(lines[2]).toContain('MEM-001');
    expect(lines[2]).toContain('test.bravo@example.com');
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
      'Full Name,Nickname,Member ID,Email,Role,Category,Start Date,Attendance Score,Committed,Attended,Absences,Excused,WI 9AM/3PM,WI 12NN,WI 5th Sun',
    );
    expect(filename).toMatch(/^service-commitment-2026-01-01-\d{8}-\d{6}\.csv$/);
  });

  it('handles tie-breaking by full_name when attendance scores are equal', () => {
    const tiedStats: CommitmentDashboardStat[] = [
      {
        ...mockStats[0],
        attendance_score: 10,
        full_name: 'Test Zeta, Sample',
      },
      {
        ...mockStats[0],
        attendance_score: 10,
        full_name: 'Test Alpha, Sample',
      },
      {
        ...mockStats[0],
        attendance_score: 10,
        full_name: '',
      },
    ];

    const { csvText } = buildCommitmentDashboardCsvExport({
      stats: tiedStats,
    });

    const lines = csvText.split('\n');
    // First should be empty name, then Alpha, then Zeta
    expect(lines[1]).toContain(',Test B');
    expect(lines[2]).toContain('"Test Alpha, Sample"');
    expect(lines[3]).toContain('"Test Zeta, Sample"');
  });

  it('handles null and undefined stat fields with default values', () => {
    const nullStats = [
      {
        user_id: 'u-null',
        member_id: null,
        avatar_object_key: null,
        full_name: null,
        nickname: null,
        email: null,
        role: null,
        category: null,
        start_date: null,
        committed: undefined as unknown as number,
        attended: undefined as unknown as number,
        absences: undefined as unknown as number,
        excused: undefined as unknown as number,
        wi_9am_3pm: undefined as unknown as number,
        wi_12nn: undefined as unknown as number,
        wi_5th_sunday: undefined as unknown as number,
        attendance_score: undefined as unknown as number,
      },
    ] as unknown as CommitmentDashboardStat[];

    const { csvText, filename } = buildCommitmentDashboardCsvExport({
      stats: nullStats,
      timeframe: 'YTD',
      startDate: '2026-01-01',
    });

    const lines = csvText.split('\n');
    expect(lines[1]).toBe(',,,,,,,0,0,0,0,0,0,0,0');
    expect(filename).toMatch(/^service-commitment-2026-01-01-\d{8}-\d{6}\.csv$/);
  });

  it('generates generic filename when no dates or timeframe are specified', () => {
    const { filename } = buildCommitmentDashboardCsvExport({
      stats: [],
    });

    expect(filename).toMatch(/^service-commitment-\d{8}-\d{6}\.csv$/);
  });
});
