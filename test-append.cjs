const fs = require('fs');

const path = 'src/lib/domain/members/__tests__/csv-import.test.ts';
let content = fs.readFileSync(path, 'utf8');

const newTest = `
  it('converts M/D/YY and M/D/YYYY date formats to YYYY-MM-DD', () => {
    const result = buildMemberCsvPreparedRows([
      {
        member_id: 'D-1',
        first_name: 'D',
        last_name: 'D',
        nickname: 'D',
        role: 'Role',
        category: 'Cat',
        date_of_birth: '1/2/2023',
      },
      {
        member_id: 'D-2',
        first_name: 'D',
        last_name: 'D',
        nickname: 'D',
        role: 'Role',
        category: 'Cat',
        date_of_birth: '12/31/99',
      },
      {
        member_id: 'D-3',
        first_name: 'D',
        last_name: 'D',
        nickname: 'D',
        role: 'Role',
        category: 'Cat',
        date_of_birth: '05/06/05',
      },
      {
        member_id: 'D-4',
        first_name: 'D',
        last_name: 'D',
        nickname: 'D',
        role: 'Role',
        category: 'Cat',
        date_of_birth: '  2/3/80  ',
      }
    ]);

    expect(result.errors).toEqual([]);
    expect(result.rows[0].date_of_birth).toBe('2023-01-02');
    expect(result.rows[1].date_of_birth).toBe('1999-12-31');
    expect(result.rows[2].date_of_birth).toBe('2005-05-06');
    expect(result.rows[3].date_of_birth).toBe('1980-02-03');
  });

  it('skips metadata columns with empty string values', () => {
    const result = buildMemberCsvPreparedRows([
      {
        member_id: 'M-1',
        first_name: 'M',
        last_name: 'M',
        nickname: 'M',
        role: 'Role',
        category: 'Cat',
        'Some Meta': '  ',
        'Another Meta': '',
        'Valid Meta': 'value',
      },
    ]);

    expect(result.errors).toEqual([]);
    expect(result.rows[0].metadata).toEqual({
      valid_meta: 'value'
    });
  });
`;

// Insert before the last `});` of `describe('buildMemberCsvPreparedRows', ...)`
const targetString = "});\n\ndescribe('buildMemberCsvImportPreview', () => {";
content = content.replace(targetString, newTest + '\n' + targetString);

fs.writeFileSync(path, content);
