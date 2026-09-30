import { assertEquals } from '@std/assert';

import { errorResponse, jsonResponse, successResponse } from '../http.ts';

const CORS_HEADERS = { 'Access-Control-Allow-Origin': 'https://app.example.com' };

Deno.test('jsonResponse serializes the body and preserves status and CORS headers', async () => {
  const response = jsonResponse(CORS_HEADERS, { value: 1 }, 202);

  assertEquals(response.status, 202);
  assertEquals(response.headers.get('Content-Type'), 'application/json');
  assertEquals(
    response.headers.get('Access-Control-Allow-Origin'),
    CORS_HEADERS['Access-Control-Allow-Origin'],
  );
  assertEquals(await response.json(), { value: 1 });
});

Deno.test('successResponse adds the success discriminator', async () => {
  const response = successResponse(CORS_HEADERS, { count: 2 });

  assertEquals(response.status, 200);
  assertEquals(await response.json(), { success: true, count: 2 });
});

Deno.test('errorResponse preserves optional detail and extra fields', async () => {
  const response = errorResponse(CORS_HEADERS, 400, 'Invalid request', 'Missing name', {
    details: ['name is required'],
  });

  assertEquals(response.status, 400);
  assertEquals(await response.json(), {
    success: false,
    error: 'Invalid request',
    detail: 'Missing name',
    details: ['name is required'],
  });
});
