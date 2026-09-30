import webpush from 'web-push';

import { handleCronProcessPushReminders } from './handler.ts';

const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY') ?? '';
const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY') ?? '';
const subject = 'mailto:admin@welcomehub.app';

if (vapidPublicKey && vapidPrivateKey) {
  webpush.setVapidDetails(subject, vapidPublicKey, vapidPrivateKey);
}

Deno.serve((req) =>
  handleCronProcessPushReminders(req, async (subscription, payload) => {
    await webpush.sendNotification(subscription, payload);
  }),
);
