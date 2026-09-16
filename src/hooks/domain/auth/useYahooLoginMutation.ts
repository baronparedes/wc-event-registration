import type { Provider } from '@supabase/supabase-js';
import { useMutation } from '@tanstack/react-query';

import { supabase } from '@/lib/infrastructure';

export interface YahooLoginOptions {
  redirectTo?: string;
}

export function useYahooLoginMutation() {
  return useMutation({
    mutationFn: async (options?: YahooLoginOptions) => {
      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      const redirectPath = options?.redirectTo || '/login';
      const redirectTo = `${origin}${redirectPath}`;

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'yahoo' as Provider,
        options: {
          redirectTo,
        },
      });

      if (error) {
        throw error;
      }

      return data;
    },
  });
}
