import { assertEquals } from '@std/assert';

import { decodeJpegDataUrl } from '../image.ts';

Deno.test('decodeJpegDataUrl decodes valid JPEG base64 data URL', () => {
  // Construct minimal valid JPEG bytes: [0xff, 0xd8, 0x00, 0xff, 0xd9]
  const validBytes = new Uint8Array([0xff, 0xd8, 0x00, 0xff, 0xd9]);
  const binaryString = String.fromCharCode(...validBytes);
  const base64 = btoa(binaryString);
  const dataUrl = `data:image/jpeg;base64,${base64}`;

  const decoded = decodeJpegDataUrl(dataUrl);
  assertEquals(decoded !== null, true);
  assertEquals(decoded?.byteLength, 5);
  assertEquals(decoded?.[0], 0xff);
  assertEquals(decoded?.[1], 0xd8);
  assertEquals(decoded?.[3], 0xff);
  assertEquals(decoded?.[4], 0xd9);
});

Deno.test('decodeJpegDataUrl returns null for non-JPEG data URL or invalid format', () => {
  assertEquals(decodeJpegDataUrl('data:image/png;base64,abcd'), null);
  assertEquals(decodeJpegDataUrl('not-a-data-url'), null);
  assertEquals(decodeJpegDataUrl('data:image/jpeg;base64,invalid-base64!!!'), null);

  // Valid base64 but not JPEG magic bytes
  const nonJpeg = btoa('hello world');
  assertEquals(decodeJpegDataUrl(`data:image/jpeg;base64,${nonJpeg}`), null);
});
