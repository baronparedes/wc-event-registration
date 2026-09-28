import { useQuery } from '@tanstack/react-query';

import { supabase } from '@/lib/infrastructure/supabase';

export function useEmailTemplatesQuery() {
  return useQuery({
    queryKey: ['email_templates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('email_templates')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
  });
}
