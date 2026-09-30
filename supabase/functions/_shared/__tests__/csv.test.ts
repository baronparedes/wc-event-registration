import { assertEquals } from '@std/assert';

import {
  buildUtcTimestampForFilename,
  escapeCsvField,
  formatHeaderFromSnakeCase,
  formatTimestampInTimeZone,
  sanitizeFilenamePart,
} from '../csv.ts';

Deno.test('escapeCsvField handles nulls and quotes CSV-special characters', () => {
  assertEquals(escapeCsvField(null), '');
  assertEquals(escapeCsvField(42), '42');
  assertEquals(escapeCsvField('plain'), 'plain');
  assertEquals(escapeCsvField('A, "B"\nC'), '"A, ""B""\nC"');
});

Deno.test('sanitizeFilenamePart normalizes punctuation and whitespace', () => {
  assertEquals(sanitizeFilenamePart('  Summer Event / 2026!  '), 'summer-event-2026');
  assertEquals(sanitizeFilenamePart('---'), '');
});

Deno.test('buildUtcTimestampForFilename uses UTC components and zero padding', () => {
  assertEquals(
    buildUtcTimestampForFilename(new Date('2026-02-03T04:05:06.000Z')),
    '20260203-040506',
  );
});

Deno.test(
  'formatTimestampInTimeZone formats the requested timezone and preserves invalid input',
  () => {
    assertEquals(
      formatTimestampInTimeZone('2026-01-01T00:00:00Z', 'Asia/Manila', 'PHT'),
      '2026-01-01 08:00:00 PHT',
    );
    assertEquals(formatTimestampInTimeZone('not-a-date', 'UTC'), 'not-a-date');
    assertEquals(formatTimestampInTimeZone('', 'UTC'), '');
  },
);

Deno.test('formatHeaderFromSnakeCase title-cases each segment', () => {
  assertEquals(formatHeaderFromSnakeCase('member_id'), 'Member Id');
  assertEquals(formatHeaderFromSnakeCase(''), '');
});
