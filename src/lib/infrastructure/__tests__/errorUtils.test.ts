import { describe, expect, it } from 'vitest';

import { parseErrorToJsonOrString } from '../errorUtils';

describe('parseErrorToJsonOrString', () => {
  it('returns original string if not valid JSON', () => {
    expect(parseErrorToJsonOrString('Regular error message')).toBe('Regular error message');
  });

  it('returns object message if JSON object', () => {
    const errorString = JSON.stringify({ message: 'Error object' });
    expect(parseErrorToJsonOrString(errorString)).toBe('Error object');
  });

  it('returns original JSON string if no message property', () => {
    const errorString = JSON.stringify({ other: 'Error object' });
    expect(parseErrorToJsonOrString(errorString)).toBe(errorString);
  });

  it('formats an array of ZodError-like objects', () => {
    const errorString = JSON.stringify([
      { expected: 'string', message: 'Others - CCF Satellite is required.' },
      { expected: 'string', message: 'Another field is required.' },
    ]);
    expect(parseErrorToJsonOrString(errorString)).toBe(
      'Others - CCF Satellite is required.\nAnother field is required.',
    );
  });
});
