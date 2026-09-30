import { assertEquals } from '@std/assert';

import { convertHexToDecimal, tryConvertRfidInput } from '../rfid.ts';

Deno.test('convertHexToDecimal accepts supported separators and an optional prefix', () => {
  assertEquals(convertHexToDecimal('0x46 6C:21-69'), 1181491561);
});

Deno.test('convertHexToDecimal reverses byte order when requested', () => {
  assertEquals(convertHexToDecimal('466C2169', true), 1763798086);
});

Deno.test('convertHexToDecimal returns the original input when the value is invalid', () => {
  assertEquals(convertHexToDecimal(' 1234 '), ' 1234 ');
  assertEquals(convertHexToDecimal('GGGGGGGG'), 'GGGGGGGG');
  assertEquals(convertHexToDecimal(''), '');
});

Deno.test('tryConvertRfidInput converts only eight-digit hexadecimal input', () => {
  assertEquals(tryConvertRfidInput('46 6C 21 69'), '1763798086');
  assertEquals(tryConvertRfidInput('member-1234'), 'member-1234');
  assertEquals(tryConvertRfidInput('12345678'), '2018915346');
  assertEquals(tryConvertRfidInput(''), '');
});
