import { assertEquals } from '@std/assert';

import {
  describeDateRange,
  formatDate,
  getMonthDayKeysForRange,
  getPhNow,
  getSundaysInRange,
  isMonthDayInRange,
  parseIsoDate,
  resolveDateRange,
} from '../timeframes.ts';

Deno.test('parseIsoDate parses valid YYYY-MM-DD to noon local time', () => {
  const date = parseIsoDate('2024-05-15');
  assertEquals(date instanceof Date, true);
  assertEquals(date?.getFullYear(), 2024);
  assertEquals(date?.getMonth(), 4); // 0-indexed
  assertEquals(date?.getDate(), 15);
  assertEquals(date?.getHours(), 12);
  assertEquals(date?.getMinutes(), 0);

  assertEquals(parseIsoDate(null), null);
  assertEquals(parseIsoDate(''), null);
  assertEquals(parseIsoDate('invalid-date'), null);
});

Deno.test('formatDate formats correctly', () => {
  const d = new Date(2024, 4, 15); // May 15, 2024
  assertEquals(formatDate(d), '2024-05-15');

  const singleDigit = new Date(2024, 0, 5); // Jan 5, 2024
  assertEquals(formatDate(singleDigit), '2024-01-05');
});

Deno.test('getPhNow returns date', () => {
  const now = getPhNow();
  assertEquals(now instanceof Date, true);
});

Deno.test('resolveDateRange - explicit dates provided', () => {
  const start = '2024-05-01';
  const end = '2024-05-31';
  const range = resolveDateRange(start, end, 'none');

  assertEquals(formatDate(range!.start), '2024-05-01');
  assertEquals(formatDate(range!.end), '2024-05-31');
});

Deno.test('resolveDateRange - one-sided boundary padded', () => {
  const startOnly = resolveDateRange('2024-05-15', null, 'none');
  assertEquals(formatDate(startOnly!.start), '2024-05-15');
  assertEquals(formatDate(startOnly!.end), '2024-05-15');

  const endOnly = resolveDateRange(null, '2024-05-15', 'none');
  assertEquals(formatDate(endOnly!.start), '2024-05-15');
  assertEquals(formatDate(endOnly!.end), '2024-05-15');
});

Deno.test('resolveDateRange - fallback none', () => {
  assertEquals(resolveDateRange(null, null, 'none'), null);
});

Deno.test('resolveDateRange - fallback this_month', () => {
  // Use a fixed reference date (May 15, 2024)
  const ref = new Date(2024, 4, 15, 12, 0, 0);
  const range = resolveDateRange(null, null, 'this_month', ref);

  assertEquals(formatDate(range!.start), '2024-05-01');
  assertEquals(formatDate(range!.end), '2024-05-31');
});

Deno.test('describeDateRange', () => {
  const range = {
    start: new Date(2024, 4, 1), // May 1
    end: new Date(2024, 4, 31), // May 31
  };

  const description = describeDateRange(range);
  assertEquals(description.start_date, '2024-05-01');
  assertEquals(description.end_date, '2024-05-31');
});

Deno.test('getSundaysInRange', () => {
  // May 2024 has Sundays on 5, 12, 19, 26
  const range = {
    start: new Date(2024, 4, 1), // May 1 (Wed)
    end: new Date(2024, 4, 31), // May 31 (Fri)
  };

  const sundays = getSundaysInRange(range);
  assertEquals(sundays.length, 4);
  assertEquals(sundays[0].key, 'first_sunday');
  assertEquals(sundays[1].key, 'second_sunday');
  assertEquals(sundays[2].key, 'third_sunday');
  assertEquals(sundays[3].key, 'fourth_sunday');

  assertEquals(formatDate(sundays[0].date), '2024-05-05');
  assertEquals(formatDate(sundays[3].date), '2024-05-26');
});

Deno.test('getSundaysInRange - single sunday', () => {
  const range = {
    start: new Date(2024, 4, 12), // May 12 (Sun)
    end: new Date(2024, 4, 12), // May 12 (Sun)
  };

  const sundays = getSundaysInRange(range);
  assertEquals(sundays.length, 1);
  assertEquals(sundays[0].key, 'second_sunday'); // May 12 is the second Sunday of May
});

Deno.test('getMonthDayKeysForRange and isMonthDayInRange', () => {
  const range = {
    start: new Date(2024, 4, 15), // May 15
    end: new Date(2024, 4, 16), // May 16
  };

  const keys = getMonthDayKeysForRange(range);
  assertEquals(keys.size, 2);
  assertEquals(keys.has('5-15'), true);
  assertEquals(keys.has('5-16'), true);

  assertEquals(isMonthDayInRange(5, 15, range), true);
  assertEquals(isMonthDayInRange(5, 16, range), true);
  assertEquals(isMonthDayInRange(5, 17, range), false);
  assertEquals(isMonthDayInRange(4, 15, range), false);
});
