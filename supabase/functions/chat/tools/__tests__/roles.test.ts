import { assertEquals } from '@std/assert';

import { getPrimaryRole, isSpecificRole, matchesPrimaryRole } from '../roles.ts';

Deno.test('isSpecificRole', () => {
  // Negative cases
  assertEquals(isSpecificRole(), false);
  assertEquals(isSpecificRole(''), false);
  assertEquals(isSpecificRole('   '), false);
  assertEquals(isSpecificRole('volunteer'), false);
  assertEquals(isSpecificRole('Volunteers'), false);
  assertEquals(isSpecificRole('all'), false);
  assertEquals(isSpecificRole('Any'), false);
  assertEquals(isSpecificRole('member'), false);
  assertEquals(isSpecificRole('MEMBERS'), false);

  // Positive cases
  assertEquals(isSpecificRole('Greeter'), true);
  assertEquals(isSpecificRole('Usher / Security'), true);
  assertEquals(isSpecificRole('Usher'), true);
  assertEquals(isSpecificRole('usher'), true);
});

Deno.test('getPrimaryRole', () => {
  assertEquals(getPrimaryRole(), 'Unspecified');
  assertEquals(getPrimaryRole(null), 'Unspecified');
  assertEquals(getPrimaryRole(''), 'Unspecified');
  assertEquals(getPrimaryRole('Greeter'), 'Greeter');
  assertEquals(getPrimaryRole('Greeter / Usher'), 'Greeter');
  assertEquals(getPrimaryRole('Usher/Security'), 'Usher');
  assertEquals(getPrimaryRole('   Usher   /  Security '), 'Usher');
});

Deno.test('matchesPrimaryRole', () => {
  // When targetRole is not specific, any userRole matches
  assertEquals(matchesPrimaryRole('Greeter', 'all'), true);
  assertEquals(matchesPrimaryRole('Greeter', 'volunteer'), true);
  assertEquals(matchesPrimaryRole(null, 'all'), true);

  // Specific role matching
  assertEquals(matchesPrimaryRole('Greeter', 'Greeter'), true);
  assertEquals(matchesPrimaryRole('Greeter', 'greeter'), true);
  assertEquals(matchesPrimaryRole('Greeter / Usher', 'Greeter'), true);

  // Mismatch
  assertEquals(matchesPrimaryRole('Greeter', 'Usher'), false);
  assertEquals(matchesPrimaryRole('Usher / Security', 'Security'), false);
  assertEquals(matchesPrimaryRole(null, 'Usher'), false);

  // Partial matches
  assertEquals(matchesPrimaryRole('Super Usher', 'Usher'), true);
  assertEquals(matchesPrimaryRole('Usher', 'Super Usher'), false);
});
