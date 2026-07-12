import { describe, expect, it } from 'vitest';

import {
  type ExistingMemberImportSnapshot,
  type MemberCsvPreparedRowInput,
  buildMemberCsvImportPreview,
  buildMemberCsvPreparedRows,
  parseMemberCsvText,
} from '@/lib/domain/members/csv-import';

function makePreparedRow(
  overrides?: Partial<MemberCsvPreparedRowInput>,
): MemberCsvPreparedRowInput {
  return {
    row_number: 2,
    member_id: 'RFID-1',
    first_name: 'John',
    last_name: 'Doe',
    nickname: 'JD',
    email: 'john@example.com',
    phone: '12345',
    date_of_birth: '1990-01-01',
    role: 'Prayer Coach',
    category: 'Adults',
    metadata: {},
    ...overrides,
  };
}

function makeExistingMember(
  overrides?: Partial<ExistingMemberImportSnapshot>,
): ExistingMemberImportSnapshot {
  return {
    id: 'member-1',
    member_id: 'RFID-1',
    first_name: 'John',
    last_name: 'Doe',
    nickname: 'JD',
    is_active: true,
    ...overrides,
  };
}

describe('parseMemberCsvText', () => {
  it('returns error for empty CSV', () => {
    const result = parseMemberCsvText('   ');
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('CSV file is empty');
    }
  });

  it('returns error for unterminated quotes', () => {
    const result = parseMemberCsvText('RFID,Firstname\n"abc,John');
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('Unterminated quoted value');
    }
  });

  it('returns error when only header exists', () => {
    const result = parseMemberCsvText('RFID,Firstname,Surname,Nickname');
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('at least one data row');
    }
  });

  it('returns error for duplicate normalized headers', () => {
    const csv = ['RFID,rfid,Firstname,Surname,Nickname', '1,1,John,Doe,JD'].join('\n');
    const result = parseMemberCsvText(csv);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('duplicate header');
    }
  });

  it('returns error when headers collide after canonicalization', () => {
    const csv = [
      'RFID,Firstname,Surname,Nickname,1st Sunday,first_sunday',
      '1,John,Doe,JD,9AM,12NN',
    ].join('\n');
    const result = parseMemberCsvText(csv);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('duplicate header');
      expect(result.error).toContain('first_sunday');
    }
  });

  it('returns error for mismatched column count', () => {
    const csv = ['RFID,Firstname,Surname,Nickname', '1,John,Doe'].join('\n');
    const result = parseMemberCsvText(csv);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('expected 4');
    }
  });

  it('parses valid csv and keeps header-based mapping', () => {
    const csv = [
      'Surname,Role,RFID,Nickname,Firstname,SR_PWD',
      'Doe,Prayer Coach,123,JD,John,1',
    ].join('\n');

    const result = parseMemberCsvText(csv);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.headers).toEqual([
        'Surname',
        'Role',
        'RFID',
        'Nickname',
        'Firstname',
        'SR_PWD',
      ]);
      expect(result.data.rows[0]).toEqual({
        Surname: 'Doe',
        Role: 'Prayer Coach',
        RFID: '123',
        Nickname: 'JD',
        Firstname: 'John',
        SR_PWD: '1',
      });
    }
  });

  it('parses escaped quotes and CRLF rows', () => {
    const csv = 'RFID,Firstname,Surname,Nickname\r\n1,"Jo""hn",Doe,JD\r\n';
    const result = parseMemberCsvText(csv);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.rows[0].Firstname).toBe('Jo"hn');
    }
  });
});

describe('buildMemberCsvPreparedRows', () => {
  it('maps aliases, promotes role/category, and normalizes booleans', () => {
    const result = buildMemberCsvPreparedRows([
      {
        Surname: 'Doe',
        Role: 'Prayer Coach',
        Category: 'Adults',
        RFID: '123',
        Nickname: 'JD',
        Firstname: 'John',
        SR_PWD: '1',
        IsOIC: 'false',
        '1st Sunday': '9AM, 12NN',
        Email: 'john@example.com',
        Phone: '0917',
        DateOfBirth: '1990-01-01',
      },
    ]);

    expect(result.errors).toEqual([]);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]).toMatchObject({
      row_number: 2,
      member_id: '123',
      first_name: 'John',
      last_name: 'Doe',
      nickname: 'JD',
      email: 'john@example.com',
      phone: '0917',
      date_of_birth: '1990-01-01',
      role: 'Prayer Coach',
      category: 'Adults',
    });
    expect(result.rows[0].metadata).toMatchObject({
      sr_pwd: true,
      is_oic: false,
      first_sunday: '9AM, 12NN',
    });
  });

  it('returns row-level required field and format errors', () => {
    const result = buildMemberCsvPreparedRows([
      {
        RFID: '',
        Firstname: '',
        Surname: '',
        Nickname: '',
        Role: '',
        Category: '',
        Email: 'not-an-email',
        DateOfBirth: '01/01/1990',
      },
    ]);

    expect(result.rows).toHaveLength(1);
    expect(result.errors).toEqual(
      expect.arrayContaining([
        'Row 2: RFID/Member ID is required.',
        'Row 2: Firstname is required.',
        'Row 2: Surname is required.',
        'Row 2: Nickname is required.',
        'Row 2: Role is required.',
        'Row 2: Category is required.',
        'Row 2: Email is invalid.',
        'Row 2: Date of birth must use YYYY-MM-DD format.',
      ]),
    );
  });

  it('keeps nullable fields as null when empty', () => {
    const result = buildMemberCsvPreparedRows([
      {
        member_id: 'A-1',
        first_name: 'Ann',
        last_name: 'Lee',
        nickname: 'Annie',
        role: 'Role A',
        category: 'Category A',
        email: '   ',
        phone: '',
        date_of_birth: '',
      },
    ]);

    expect(result.errors).toEqual([]);
    expect(result.rows[0].email).toBeNull();
    expect(result.rows[0].phone).toBeNull();
    expect(result.rows[0].date_of_birth).toBeNull();
  });

  it('ignores metadata columns whose normalized key is empty', () => {
    const result = buildMemberCsvPreparedRows([
      {
        member_id: 'A-2',
        first_name: 'Bob',
        last_name: 'Lee',
        nickname: 'BL',
        role: 'Role B',
        category: 'Category B',
        '!!!': 'some value',
      },
    ]);

    expect(result.errors).toEqual([]);
    expect(result.rows[0].metadata).toEqual({});
  });

  it('canonicalizes sunday and is_oic metadata aliases', () => {
    const result = buildMemberCsvPreparedRows([
      {
        RFID: 'A-3',
        Firstname: 'Nina',
        Surname: 'Roe',
        Nickname: 'NR',
        Role: 'Prayer Coach',
        Category: 'Women',
        IsOIC: '1',
        '2nd Sunday': '12NN',
        '3rd Sunday': '3PM',
        '4th Sunday': '9AM',
        '5th Sunday': '12NN, 3PM',
      },
      {
        RFID: 'A-4',
        Firstname: 'Jake',
        Surname: 'Poe',
        Nickname: 'JP',
        Role: 'Usher',
        Category: 'Men',
        '2ndSunday': '9AM',
        '3rdSunday': '12NN',
        '4thSunday': '3PM',
        '5thSunday': '9AM, 12NN',
      },
    ]);

    expect(result.errors).toEqual([]);
    expect(result.rows[0]).toMatchObject({ role: 'Prayer Coach', category: 'Women' });
    expect(result.rows[1]).toMatchObject({ role: 'Usher', category: 'Men' });
    expect(result.rows[0].metadata).toMatchObject({
      is_oic: true,
      second_sunday: '12NN',
      third_sunday: '3PM',
      fourth_sunday: '9AM',
      fifth_sunday: '12NN, 3PM',
    });
    expect(result.rows[1].metadata).toMatchObject({
      second_sunday: '9AM',
      third_sunday: '12NN',
      fourth_sunday: '3PM',
      fifth_sunday: '9AM, 12NN',
    });
  });
});

describe('buildMemberCsvImportPreview', () => {
  it('classifies insert, update, and update_member_id', () => {
    const existing = [
      makeExistingMember(),
      makeExistingMember({
        id: 'member-2',
        member_id: 'RFID-2',
        first_name: 'Jane',
        last_name: 'Roe',
        nickname: 'JR',
      }),
    ];

    const rows = [
      makePreparedRow({ row_number: 2, member_id: 'RFID-1' }),
      makePreparedRow({
        row_number: 3,
        member_id: 'NEW-RFID',
        first_name: 'Jane',
        last_name: 'Roe',
        nickname: 'JR',
      }),
      makePreparedRow({
        row_number: 4,
        member_id: 'RFID-3',
        first_name: 'Carl',
        last_name: 'Kent',
        nickname: 'CK',
      }),
    ];

    const preview = buildMemberCsvImportPreview(rows, existing);

    expect(preview.rows[0].operation).toBe('update');
    expect(preview.rows[1].operation).toBe('update_member_id');
    expect(preview.rows[2].operation).toBe('insert');
    expect(preview.summary).toMatchObject({
      total_rows: 3,
      update_count: 1,
      update_member_id_count: 1,
      insert_count: 1,
      error_count: 0,
    });
  });

  it('marks duplicate member IDs in csv as errors', () => {
    const rows = [
      makePreparedRow({ row_number: 2, member_id: 'DUP' }),
      makePreparedRow({ row_number: 3, member_id: 'DUP', first_name: 'Ann', nickname: 'A' }),
    ];

    const preview = buildMemberCsvImportPreview(rows, []);
    expect(preview.rows[0].operation).toBe('error');
    expect(preview.rows[1].operation).toBe('error');
    expect(preview.rows[0].errors.join(' ')).toContain('Member ID appears multiple times');
    expect(preview.summary.error_count).toBe(2);
  });

  it('marks duplicate triplets in csv as errors', () => {
    const rows = [
      makePreparedRow({ row_number: 2, member_id: 'A1' }),
      makePreparedRow({ row_number: 3, member_id: 'A2' }),
    ];

    const preview = buildMemberCsvImportPreview(rows, []);
    expect(preview.rows[0].operation).toBe('error');
    expect(preview.rows[1].operation).toBe('error');
    expect(preview.rows[0].errors.join(' ')).toContain('Firstname + Surname + Nickname appears');
  });

  it('marks multiple existing triplet matches as error', () => {
    const existing = [
      makeExistingMember({ id: 'm1', member_id: 'RFID-1' }),
      makeExistingMember({ id: 'm2', member_id: 'RFID-2' }),
    ];

    const preview = buildMemberCsvImportPreview(
      [makePreparedRow({ member_id: 'NEW-1' })],
      existing,
    );
    expect(preview.rows[0].operation).toBe('error');
    expect(preview.rows[0].errors.join(' ')).toContain('Multiple existing members match');
  });

  it('marks conflicting RFID match vs triplet match as error', () => {
    const existing = [
      makeExistingMember({ id: 'rfid-match', member_id: 'RFID-1', first_name: 'John' }),
      makeExistingMember({
        id: 'triplet-match',
        member_id: 'RFID-2',
        first_name: 'Jane',
        last_name: 'Roe',
        nickname: 'JR',
      }),
    ];

    const row = makePreparedRow({
      member_id: 'RFID-1',
      first_name: 'Jane',
      last_name: 'Roe',
      nickname: 'JR',
    });

    const preview = buildMemberCsvImportPreview([row], existing);
    expect(preview.rows[0].operation).toBe('error');
    expect(preview.rows[0].errors.join(' ')).toContain('matches a different member');
  });

  it('marks second row as error when two rows target same member', () => {
    const previewConflict = buildMemberCsvImportPreview(
      [
        makePreparedRow({
          row_number: 2,
          member_id: 'RFID-1',
          first_name: 'Other',
          last_name: 'Person',
          nickname: 'OP',
        }),
        makePreparedRow({ row_number: 3, member_id: 'NEW-1' }),
      ],
      [makeExistingMember({ id: 'm1', member_id: 'RFID-1' })],
    );

    expect(previewConflict.rows[1].operation).toBe('error');
    expect(previewConflict.rows[1].errors.join(' ')).toContain('already targets this same member');
  });
});
