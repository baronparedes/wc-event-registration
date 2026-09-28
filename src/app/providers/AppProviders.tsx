import { useEffect, useState } from 'react';
import type { PropsWithChildren } from 'react';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { ADMIN_AUTH_QUERY_KEY } from '@/hooks/domain/auth';
import { CURRENT_PROFILE_QUERY_KEY } from '@/hooks/domain/members/queries/useCurrentProfileQuery';
import { useAppBadgeSync, useNotificationsQuery } from '@/hooks/domain/notifications';
import { supabase } from '@/lib/infrastructure';

function AppBadgeProvider({ children }: PropsWithChildren) {
  const { data: notifications = [] } = useNotificationsQuery();
  const unreadCount = notifications.filter((n) => !n.is_read).length;

  useAppBadgeSync(unreadCount);

  return <>{children}</>;
}

export function AppProviders({ children }: PropsWithChildren) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      }),
  );

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      queryClient.invalidateQueries({ queryKey: ADMIN_AUTH_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: CURRENT_PROFILE_QUERY_KEY });
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [queryClient]);

  return (
    <QueryClientProvider client={queryClient}>
      <AppBadgeProvider>{children}</AppBadgeProvider>
    </QueryClientProvider>
  );
}
