import { useEffect, useState } from 'react';

import { Bell, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { TIMING } from '@/config/constants';
import { useAdminAuthQuery } from '@/hooks/domain/auth';
import { usePushSubscription } from '@/hooks/domain/notifications';
import { useLocalStorage, usePwaInstallPrompt } from '@/hooks/utils';

import { Button } from './Button';
import { NotificationPrompt } from './NotificationPrompt';
import { PWA_PROMPT_SNOOZE_STORAGE_KEY } from './PWAInstallPromptBanner';

export const PUSH_PROMPT_SNOOZE_STORAGE_KEY = 'wc:push-prompt:snoozed-until';

export function PushNotificationPromptBanner() {
  const { data: adminAuth } = useAdminAuthQuery();
  const push = usePushSubscription();
  const pwa = usePwaInstallPrompt();
  const snoozeStorage = useLocalStorage<string>(PUSH_PROMPT_SNOOZE_STORAGE_KEY);
  const pwaSnoozeStorage = useLocalStorage<string>(PWA_PROMPT_SNOOZE_STORAGE_KEY);
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  const hasSession = Boolean(adminAuth?.session);
  const isSupported = push.isSupported;
  const isSubscribed = push.isSubscribed;

  useEffect(() => {
    // If not authenticated, push unsupported, already subscribed, or dismissed: do not show
    if (!hasSession || !isSupported || isSubscribed || isDismissed) {
      return;
    }

    // Prioritize PWA Install prompt: If PWA is installable and not snoozed, defer push prompt
    if (pwa.canInstall) {
      const pwaSnoozedUntil = pwaSnoozeStorage.get();
      const isPwaSnoozed =
        pwaSnoozedUntil &&
        !Number.isNaN(Number(pwaSnoozedUntil)) &&
        Date.now() < Number(pwaSnoozedUntil);
      if (!isPwaSnoozed) {
        return;
      }
    }

    // Check if user blocked notifications in browser settings
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'denied') {
        return;
      }
    }

    // Check if prompt was snoozed within the cooldown period
    const snoozedUntil = snoozeStorage.get();
    if (snoozedUntil) {
      const snoozedTimestamp = Number(snoozedUntil);
      if (!Number.isNaN(snoozedTimestamp) && Date.now() < snoozedTimestamp) {
        return;
      }
    }

    // Subtle delayed entry to avoid visual clutter during initial page load
    const timer = window.setTimeout(() => {
      setIsVisible(true);
    }, TIMING.pushNotificationPromptDelayMs);

    return () => {
      window.clearTimeout(timer);
    };
  }, [
    hasSession,
    isSupported,
    isSubscribed,
    isDismissed,
    snoozeStorage,
    pwa.canInstall,
    pwaSnoozeStorage,
  ]);

  const handleDismiss = () => {
    const nextSnoozeTime =
      Date.now() + TIMING.pushNotificationPromptSnoozeDays * 24 * 60 * 60 * 1000;
    snoozeStorage.set(String(nextSnoozeTime));
    setIsDismissed(true);
    setIsVisible(false);
  };

  const handleEnable = async () => {
    try {
      await push.subscribeAsync();
      toast.success('Successfully subscribed this device to notifications!');
      setIsDismissed(true);
      setIsVisible(false);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Failed to enable push notifications on this device.',
      );
    }
  };

  if (!isVisible || !hasSession || !isSupported || isSubscribed || isDismissed) {
    return null;
  }

  return (
    <NotificationPrompt
      ariaLabel="Device notification subscription prompt"
      onDismiss={handleDismiss}
    >
      <NotificationPrompt.Header>
        <NotificationPrompt.Icon>
          <Bell className="h-5 w-5" />
        </NotificationPrompt.Icon>
        <NotificationPrompt.Content>
          <NotificationPrompt.Title>Enable Device Notifications</NotificationPrompt.Title>
          <NotificationPrompt.Description>
            Stay updated on Sunday schedules, broadcasts, and announcements directly on this device.
          </NotificationPrompt.Description>
        </NotificationPrompt.Content>
        <NotificationPrompt.DismissButton ariaLabel="Dismiss notification prompt" />
      </NotificationPrompt.Header>

      <NotificationPrompt.Actions>
        <Button
          type="button"
          variant="ghost"
          size="xs"
          onClick={handleDismiss}
          className="text-xs text-muted hover:text-text"
        >
          Not now
        </Button>
        <Button
          type="button"
          size="xs"
          onClick={handleEnable}
          disabled={push.isLoading}
          className="gap-1.5"
        >
          {push.isLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          <span>{push.isLoading ? 'Enabling...' : 'Enable notifications'}</span>
        </Button>
      </NotificationPrompt.Actions>
    </NotificationPrompt>
  );
}
