import { useMutation } from '@tanstack/react-query';

import { supabase } from '@/lib/infrastructure';

export interface GoogleLoginOptions {
  redirectTo?: string;
}

export function useGoogleLoginMutation() {
  return useMutation({
    mutationFn: async (options?: GoogleLoginOptions) => {
      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      const redirectPath = options?.redirectTo || '/login';
      const redirectTo = `${origin}${redirectPath}`;

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
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
