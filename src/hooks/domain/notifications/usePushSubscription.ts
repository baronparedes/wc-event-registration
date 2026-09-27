import { useMutation, useQuery } from '@tanstack/react-query';

import { supabase } from '@/lib/infrastructure';

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY;

export function usePushSubscription() {
  const checkSubscriptionQuery = useQuery({
    queryKey: ['push-subscription-status'],
    queryFn: async () => {
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        return false;
      }
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      return !!subscription;
    },
  });

  const subscribeMutation = useMutation({
    mutationFn: async () => {
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        throw new Error('Push notifications are not supported by your browser.');
      }

      let registration = await navigator.serviceWorker.getRegistration();
      if (!registration) {
        registration = await navigator.serviceWorker.register('/sw.js');
      }

      let subscription = await registration.pushManager.getSubscription();

      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: VAPID_PUBLIC_KEY,
        });
      }

      const p256dh = subscription.getKey('p256dh');
      const auth = subscription.getKey('auth');

      if (!p256dh || !auth) {
        throw new Error('Failed to get push keys.');
      }

      const payload = {
        action: 'subscribe',
        subscription: {
          endpoint: subscription.endpoint,
          keys: {
            p256dh: btoa(
              String.fromCharCode.apply(null, Array.from(new Uint8Array(p256dh)) as number[]),
            ),
            auth: btoa(
              String.fromCharCode.apply(null, Array.from(new Uint8Array(auth)) as number[]),
            ),
          },
        },
      };

      const { data: session } = await supabase.auth.getSession();
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/manage-push-subscription`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session?.session?.access_token}`,
          },
          body: JSON.stringify(payload),
        },
      );

      if (!response.ok) {
        throw new Error('Failed to register subscription on the server');
      }

      return true;
    },
    onSuccess: () => {
      checkSubscriptionQuery.refetch();
    },
  });

  return {
    isSupported: 'serviceWorker' in navigator && 'PushManager' in window,
    isSubscribed: checkSubscriptionQuery.data ?? false,
    isLoading: checkSubscriptionQuery.isLoading || subscribeMutation.isPending,
    subscribe: subscribeMutation.mutate,
    subscribeAsync: subscribeMutation.mutateAsync,
  };
}
