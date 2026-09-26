import type { createClient } from 'https://esm.sh/@supabase/supabase-js@2.108.2';

export type EdgeClient = ReturnType<typeof createClient>;

export type ToolContext = {
  client: EdgeClient;
  requestId: string;
  userId?: string;
};
