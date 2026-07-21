import type { Session } from '@supabase/supabase-js';

export type AdminRole = 'admin' | 'super_admin' | 'slod';

export type AdminAuthState = {
  isAuthenticated: boolean;
  session: Session | null;
  adminRole: AdminRole | null;
};
