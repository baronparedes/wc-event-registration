import { describe, expect, it } from 'vitest';

import {
  ALL_BROADCAST_ROLES,
  BROADCAST_ROLE_CATEGORIES,
  getBroadcastRoleLabel,
} from '../constants';

describe('Broadcast Notification Constants', () => {
  it('defines Auth and Member categories in BROADCAST_ROLE_CATEGORIES', () => {
    expect(BROADCAST_ROLE_CATEGORIES).toHaveLength(2);
    expect(BROADCAST_ROLE_CATEGORIES[0].title).toBe('Auth / Admin Roles');
    expect(BROADCAST_ROLE_CATEGORIES[1].title).toBe('Member / Volunteer Roles');

    const authRoleValues = BROADCAST_ROLE_CATEGORIES[0].items.map((i) => i.value);
    expect(authRoleValues).toEqual(['super_admin', 'admin', 'slod', 'imt', 'kiosk']);
  });

  it('flattens ALL_BROADCAST_ROLES completely', () => {
    const totalItems =
      BROADCAST_ROLE_CATEGORIES[0].items.length + BROADCAST_ROLE_CATEGORIES[1].items.length;
    expect(ALL_BROADCAST_ROLES).toHaveLength(totalItems);
  });

  it('resolves correct role labels with getBroadcastRoleLabel', () => {
    expect(getBroadcastRoleLabel('super_admin')).toBe('Super Admin');
    expect(getBroadcastRoleLabel('admin')).toBe('Admin');
    expect(getBroadcastRoleLabel('Prayer Coach')).toBe('Prayer Coach');
    expect(getBroadcastRoleLabel('custom_unknown_role')).toBe('custom_unknown_role');
  });
});
