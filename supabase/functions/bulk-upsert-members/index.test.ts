import { assertEquals } from 'jsr:@std/assert@1';

import { requestSchema, resolveRows } from './logic.ts';

Deno.test(
  'bulk upsert member rows preserve role and category through validation and resolution',
  () => {
    const parsed = requestSchema.parse({
      rows: [
        {
          row_number: 2,
          member_id: '1247528786',
          first_name: 'Edrienne Myenna',
          last_name: 'Magat',
          nickname: 'Yen',
          email: null,
          phone: null,
          date_of_birth: null,
          role: 'Prayer Coach',
          category: 'Ladies',
          metadata: { sr_pwd: false },
        },
      ],
    });

    const result = resolveRows(parsed.rows, []);

    assertEquals(result.errors, []);
    assertEquals(result.resolvedRows[0].role, 'Prayer Coach');
    assertEquals(result.resolvedRows[0].category, 'Ladies');
  },
);
