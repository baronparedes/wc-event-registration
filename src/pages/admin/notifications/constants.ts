import { SERVICE_ROLES } from '@/pages/admin/services/constants';

export interface RoleGroupItem {
  value: string;
  label: string;
}

export interface RoleCategory {
  title: string;
  items: RoleGroupItem[];
}

export const BROADCAST_ROLE_CATEGORIES: RoleCategory[] = [
  {
    title: 'Auth / Admin Roles',
    items: [
      { value: 'super_admin', label: 'Super Admin' },
      { value: 'admin', label: 'Admin' },
      { value: 'slod', label: 'SLOD' },
      { value: 'imt', label: 'IMT' },
      { value: 'kiosk', label: 'Kiosk' },
    ],
  },
  {
    title: 'Member / Volunteer Roles',
    items: SERVICE_ROLES.map((role) => ({
      value: role,
      label: role,
    })),
  },
];

export const ALL_BROADCAST_ROLES = BROADCAST_ROLE_CATEGORIES.flatMap((cat) => cat.items);

export function getBroadcastRoleLabel(value: string): string {
  return ALL_BROADCAST_ROLES.find((r) => r.value === value)?.label ?? value;
}
