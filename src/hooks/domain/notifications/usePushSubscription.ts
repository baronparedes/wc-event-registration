import { useMutation, useQuery } from '@tanstack/react-query';

import { env } from '@/config/env';
import {
  type ManagePushSubscriptionPayload,
  managePushSubscription,
} from '@/lib/domain/notifications';

function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');

  const rawData = window.atob(base64);
  const buffer = new ArrayBuffer(rawData.length);
  const outputArray = new Uint8Array(buffer);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return buffer;
}

export function usePushSubscription() {
  const checkSubscriptionQuery = useQuery({
    queryKey: ['push-subscription-status'],
    queryFn: async () => {
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        return false;
      }
      try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        return !!subscription;
      } catch {
        return false;
      }
    },
  });

  const subscribeMutation = useMutation({
    mutationFn: async () => {
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        throw new Error('Push notifications are not supported by your browser.');
      }

      if (!env.vapidPublicKey) {
        throw new Error(
          'Push notification VAPID public key is missing. Please set VITE_VAPID_PUBLIC_KEY in your environment.',
        );
      }

      if ('Notification' in window) {
        const permission = await Notification.requestPermission();
        if (permission === 'denied') {
          throw new Error(
            'Notification permission was blocked in browser settings. Please enable notifications to subscribe.',
          );
        }
        if (permission !== 'granted') {
          throw new Error('Notification permission was not granted.');
        }
      }

      const registration = await navigator.serviceWorker.ready;
      let subscription = await registration.pushManager.getSubscription();

      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(env.vapidPublicKey),
        });
      }

      const p256dh = subscription.getKey('p256dh');
      const auth = subscription.getKey('auth');

      if (!p256dh || !auth) {
        throw new Error('Failed to retrieve push encryption keys from browser.');
      }

      const payload: ManagePushSubscriptionPayload = {
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

      await managePushSubscription(payload);

      return true;
    },
    onSuccess: () => {
      checkSubscriptionQuery.refetch();
    },
  });

  const unsubscribeMutation = useMutation({
    mutationFn: async () => {
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        return true;
      }

      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        const p256dh = subscription.getKey('p256dh');
        const auth = subscription.getKey('auth');

        const payload: Parameters<typeof managePushSubscription>[0] = {
          action: 'unsubscribe',
          subscription: {
            endpoint: subscription.endpoint,
            keys: {
              p256dh: p256dh
                ? btoa(
                    String.fromCharCode.apply(null, Array.from(new Uint8Array(p256dh)) as number[]),
                  )
                : '',
              auth: auth
                ? btoa(
                    String.fromCharCode.apply(null, Array.from(new Uint8Array(auth)) as number[]),
                  )
                : '',
            },
          },
        };

        await managePushSubscription(payload);

        await subscription.unsubscribe();
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
    isLoading:
      checkSubscriptionQuery.isLoading ||
      subscribeMutation.isPending ||
      unsubscribeMutation.isPending,
    subscribe: subscribeMutation.mutate,
    subscribeAsync: subscribeMutation.mutateAsync,
    unsubscribe: unsubscribeMutation.mutate,
    unsubscribeAsync: unsubscribeMutation.mutateAsync,
  };
}
