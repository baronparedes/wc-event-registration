import { assertEquals } from '@std/assert';

import { type ExistingMember, parseSheetRows, resolveSyncRows } from '../logic.ts';

const USER_SHEET_HEADERS = [
  'Timestamp',
  'RFID',
  'VolunteerID',
  'Role',
  'Category',
  'Surname',
  'Firstname',
  'Nickname',
  'SR_PWD',
  '1st Sunday',
  '2nd Sunday',
  '3rd Sunday',
  '4th Sunday',
  '5th Sunday',
  'IsOIC',
  'Blockage Count',
  'Manual Entry Count',
  'Pref_Tables',
  '__PowerAppsId__',
];

Deno.test(
  'parseSheetRows maps all 19 headers, ignores Timestamp/__PowerAppsId__, and tracks cleared keys',
  () => {
    const values: string[][] = [
      USER_SHEET_HEADERS,
      [
        '2026-11-22 08:00:00',
        'RFID-001',
        'VOL-101',
        'Prayer Coach',
        'Adults',
        'Dela Cruz',
        'Juan',
        'Johnny',
        '1',
        '9AM',
        '12NN',
        '',
        '3PM',
        '',
        'true',
        '0',
        '2',
        'T1, T2',
        'pa-internal-guid-123',
      ],
    ];

    const { parsedRows, skipped, totalDataRows } = parseSheetRows(values);

    assertEquals(totalDataRows, 1);
    assertEquals(skipped, []);
    assertEquals(parsedRows.length, 1);

    const row = parsedRows[0];
    assertEquals(row.row_number, 2);
    assertEquals(row.member_id, 'RFID-001');
    assertEquals(row.first_name, 'Juan');
    assertEquals(row.last_name, 'Dela Cruz');
    assertEquals(row.nickname, 'Johnny');
    assertEquals(row.role, 'Prayer Coach');
    assertEquals(row.category, 'Adults');
    assertEquals(row.metadata, {
      volunteer_id: 'VOL-101',
      sr_pwd: true,
      first_sunday: '9AM',
      second_sunday: '12NN',
      fourth_sunday: '3PM',
      is_oic: true,
      blockage_count: false,
      manual_entry_count: '2',
      pref_tables: 'T1, T2',
    });
    assertEquals(row.clear_metadata_keys, ['third_sunday', 'fifth_sunday']);
  },
);

Deno.test(
  'parseSheetRows skips completely blank rows and collects invalid rows without aborting valid ones',
  () => {
    const values: string[][] = [
      USER_SHEET_HEADERS,
      ['', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''],
      [
        '2026-11-22',
        '',
        'VOL-2',
        'Usher',
        'Adults',
        'Santos',
        'Maria',
        'Migs',
        '0',
        '9AM',
        '',
        '',
        '',
        '',
        '0',
        '',
        '',
        '',
        'pa-2',
      ],
      [
        '2026-11-22',
        'RFID-003',
        'VOL-3',
        'Usher',
        'Youth',
        'Reyes',
        'Ana',
        'Annie',
        '0',
        '9AM',
        '',
        '',
        '',
        '',
        '0',
        '',
        '',
        '',
        'pa-3',
      ],
    ];

    const { parsedRows, skipped, totalDataRows } = parseSheetRows(values);

    assertEquals(totalDataRows, 2);
    assertEquals(parsedRows.length, 1);
    assertEquals(parsedRows[0].member_id, 'RFID-003');
    assertEquals(skipped.length, 1);
    assertEquals(skipped[0].row_number, 3);
    assertEquals(skipped[0].reasons, ['RFID/Member ID is required.']);
  },
);

Deno.test(
  'resolveSyncRows updates matched members, inserts new ones, and skips duplicate/conflicting rows',
  () => {
    const existingMembers: ExistingMember[] = [
      {
        id: 'user-1',
        member_id: 'RFID-001',
        first_name: 'Juan',
        last_name: 'Dela Cruz',
        nickname: 'Johnny',
        email: 'juan@example.com',
      },
      {
        id: 'user-2',
        member_id: 'RFID-OLD',
        first_name: 'Maria',
        last_name: 'Santos',
        nickname: 'Migs',
        email: null,
      },
    ];

    const { parsedRows } = parseSheetRows([
      USER_SHEET_HEADERS,
      // 1. Existing member matched by RFID, clears 3rd Sunday
      [
        '',
        'RFID-001',
        'VOL-1',
        'Prayer Coach',
        'Adults',
        'Dela Cruz',
        'Juan',
        'Johnny',
        '0',
        '9AM',
        '',
        '',
        '',
        '',
        '0',
        '',
        '',
        '',
        '',
      ],
      // 2. Existing member matched by name triplet (updates RFID)
      [
        '',
        'RFID-NEW',
        'VOL-2',
        'Usher',
        'Adults',
        'Santos',
        'Maria',
        'Migs',
        '0',
        '12NN',
        '',
        '',
        '',
        '',
        '0',
        '',
        '',
        '',
        '',
      ],
      // 3. Brand new member
      [
        '',
        'RFID-003',
        'VOL-3',
        'Usher',
        'Youth',
        'Reyes',
        'Ana',
        'Annie',
        '0',
        '3PM',
        '',
        '',
        '',
        '',
        '0',
        '',
        '',
        '',
        '',
      ],
      // 4 & 5. Duplicate RFID in sheet (both skipped)
      [
        '',
        'RFID-DUP',
        '',
        'Usher',
        'Adults',
        'One',
        'Dup',
        'D1',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
      ],
      [
        '',
        'RFID-DUP',
        '',
        'Usher',
        'Adults',
        'Two',
        'Dup',
        'D2',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
      ],
    ]);

    const { resolvedRows, skipped } = resolveSyncRows(parsedRows, existingMembers);

    assertEquals(resolvedRows.length, 3);
    assertEquals(resolvedRows[0].operation, 'update');
    assertEquals(resolvedRows[0].target_id, 'user-1');
    assertEquals(resolvedRows[0].clear_metadata_keys.includes('third_sunday'), true);

    assertEquals(resolvedRows[1].operation, 'update');
    assertEquals(resolvedRows[1].target_id, 'user-2');
    assertEquals(resolvedRows[1].member_id, 'RFID-NEW');

    assertEquals(resolvedRows[2].operation, 'insert');
    assertEquals(resolvedRows[2].member_id, 'RFID-003');
    assertEquals(resolvedRows[2].clear_metadata_keys, []);

    assertEquals(skipped.length, 2);
    assertEquals(skipped[0].member_id, 'RFID-DUP');
    assertEquals(skipped[1].member_id, 'RFID-DUP');
  },
);
