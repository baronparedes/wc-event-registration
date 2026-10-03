import webpush from 'web-push';

import { isLocalBroadcastEnabled } from './edge.ts';

export interface PushSubscriptionKeys {
  auth: string;
  p256dh: string;
}

export interface PushSubscriptionData {
  id?: string;
  endpoint: string;
  keys: PushSubscriptionKeys;
}

export interface PushNotificationPayload {
  title: string;
  body: string;
  url?: string | null;
  unreadCount?: number;
  [key: string]: unknown;
}

export interface SendPushNotificationOptions {
  subscription: PushSubscriptionData;
  payload: PushNotificationPayload | string;
  vapidPublicKey?: string;
  vapidPrivateKey?: string;
  subject?: string;
  recipientId?: string;
  targetType?: string;
  customSender?: (
    subscription: { endpoint: string; keys: PushSubscriptionKeys },
    payload: string,
  ) => Promise<void>;
}

export type SendPushNotificationResult =
  | { ok: true; status: number }
  | { ok: false; error: string; status?: number; isExpiredSubscription?: boolean };

interface LocalBroadcastPushEntry {
  recipient: string;
  title: string;
  body: string;
  url?: string | null;
  targetType?: string;
}

async function logLocalBroadcastPush(entry: LocalBroadcastPushEntry): Promise<void> {
  const timestamp = new Date().toISOString();
  const divider = '='.repeat(80);
  const formatted = [
    divider,
    `[LOCAL BROADCAST - PUSH]`,
    `Timestamp: ${timestamp}`,
    `Target Type: ${entry.targetType ?? 'push-notification'}`,
    `Recipient: ${entry.recipient}`,
    `Title: ${entry.title}`,
    entry.url ? `URL: ${entry.url}` : null,
    `Content:`,
    entry.body,
    divider,
    '',
  ]
    .filter((line): line is string => line !== null)
    .join('\n');

  // 1. Output to stdout/console
  console.log(formatted);

  // 2. Best-effort write to local-broadcasts.log
  const targetPaths: string[] = [];
  try {
    targetPaths.push(new URL('../local-broadcasts.log', import.meta.url).pathname);
  } catch {
    // Ignore URL parsing errors
  }
  targetPaths.push('./local-broadcasts.log', './supabase/functions/local-broadcasts.log');

  for (const logPath of targetPaths) {
    try {
      await Deno.writeTextFile(logPath, formatted, { append: true, create: true });
      break;
    } catch {
      // Best-effort in sandboxed environments like Docker Edge Runtime
    }
  }
}

let lastConfiguredVapid: { subject: string; publicKey: string; privateKey: string } | null = null;

function ensureVapidConfigured(subject: string, publicKey: string, privateKey: string) {
  if (
    publicKey &&
    privateKey &&
    (!lastConfiguredVapid ||
      lastConfiguredVapid.subject !== subject ||
      lastConfiguredVapid.publicKey !== publicKey ||
      lastConfiguredVapid.privateKey !== privateKey)
  ) {
    webpush.setVapidDetails(subject, publicKey, privateKey);
    lastConfiguredVapid = { subject, publicKey, privateKey };
  }
}

/**
 * Unified helper for sending web push notifications.
 * Encapsulates the local broadcast test/dev harness, VAPID initialization,
 * and stale subscription handling (404/410) privately so callers do not need
 * environment-specific branching across the codebase.
 */
export async function sendWebPushNotification(
  options: SendPushNotificationOptions,
): Promise<SendPushNotificationResult> {
  const vapidPublicKey = options.vapidPublicKey || Deno.env.get('VAPID_PUBLIC_KEY') || '';
  const vapidPrivateKey = options.vapidPrivateKey || Deno.env.get('VAPID_PRIVATE_KEY') || '';
  const subject = options.subject || 'mailto:admin@welcomehub.app';
  const isLocal = isLocalBroadcastEnabled();

  const payloadString =
    typeof options.payload === 'string' ? options.payload : JSON.stringify(options.payload);

  const parsedPayload =
    typeof options.payload === 'string'
      ? (() => {
          try {
            return JSON.parse(options.payload);
          } catch {
            return { title: 'Notification', body: options.payload };
          }
        })()
      : options.payload;

  // 1. If running under local simulation or VAPID keys missing in non-production
  if (isLocal || (!vapidPublicKey && !vapidPrivateKey)) {
    if ((!vapidPublicKey || !vapidPrivateKey) && !isLocal) {
      console.error('[sendWebPushNotification] VAPID keys not configured and not in local mode');
      return {
        ok: false,
        error: 'VAPID keys not configured',
        status: 500,
      };
    }

    await logLocalBroadcastPush({
      targetType: options.targetType,
      recipient: options.recipientId || options.subscription.endpoint,
      title: parsedPayload.title || 'Push Notification',
      body: parsedPayload.body || '',
      url: parsedPayload.url,
    });

    return {
      ok: true,
      status: 200,
    };
  }

  // 2. Production / Live delivery
  try {
    const sub = {
      endpoint: options.subscription.endpoint,
      keys: {
        auth: options.subscription.keys.auth,
        p256dh: options.subscription.keys.p256dh,
      },
    };

    if (options.customSender) {
      await options.customSender(sub, payloadString);
    } else {
      ensureVapidConfigured(subject, vapidPublicKey, vapidPrivateKey);
      await webpush.sendNotification(sub, payloadString);
    }

    return {
      ok: true,
      status: 200,
    };
  } catch (err: unknown) {
    const pushError = err as { statusCode?: number; message?: string };
    const statusCode = pushError.statusCode;
    const isExpired = statusCode === 404 || statusCode === 410;
    const errorMessage = pushError.message || String(err);

    return {
      ok: false,
      error: errorMessage,
      status: statusCode,
      isExpiredSubscription: isExpired,
    };
  }
}
