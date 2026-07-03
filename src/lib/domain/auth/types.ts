import type { Session } from '@supabase/supabase-js';

export type AdminAuthState = {
  isAuthenticated: boolean;
  session: Session | null;
  adminRole: 'admin' | 'super_admin' | null;
};
