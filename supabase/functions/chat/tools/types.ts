import type { createClient } from '@supabase/supabase-js';

import type { Database } from '@/shared/database.types.ts';

export type EdgeClient = ReturnType<typeof createClient<Database>>;

export type ToolContext = {
  client: EdgeClient;
  requestId: string;
  userId?: string | null;
};
