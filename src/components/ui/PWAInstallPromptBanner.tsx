import { useEffect, useState } from 'react';

import { Download, Smartphone } from 'lucide-react';
import { toast } from 'sonner';

import { TIMING } from '@/config/constants';
import { useAdminAuthQuery } from '@/hooks/domain/auth';
import { useLocalStorage, usePwaInstallPrompt } from '@/hooks/utils';

import { Button } from './Button';
import { NotificationPrompt } from './NotificationPrompt';
import { PWAInstallGuideModal } from './PWAInstallGuideModal';

export const PWA_PROMPT_SNOOZE_STORAGE_KEY = 'wc:pwa-prompt:snoozed-until';

export function PWAInstallPromptBanner() {
  const { data: adminAuth } = useAdminAuthQuery();
  const { canInstall, isIOS, promptToInstall } = usePwaInstallPrompt();
  const snoozeStorage = useLocalStorage<string>(PWA_PROMPT_SNOOZE_STORAGE_KEY);
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  const hasSession = Boolean(adminAuth?.session);

  useEffect(() => {
    // Only prompt authenticated users with an active session when install is possible and not dismissed
    if (!hasSession || !canInstall || isDismissed) {
      return;
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
    }, TIMING.pwaInstallPromptDelayMs);

    return () => {
      window.clearTimeout(timer);
    };
  }, [hasSession, canInstall, isDismissed, snoozeStorage]);

  const handleDismiss = () => {
    const nextSnoozeTime = Date.now() + TIMING.pwaInstallPromptSnoozeDays * 24 * 60 * 60 * 1000;
    snoozeStorage.set(String(nextSnoozeTime));
    setIsDismissed(true);
    setIsVisible(false);
  };

  const handleInstallClick = async () => {
    const result = await promptToInstall();

    if (result.outcome === 'manual_guide') {
      setShowIOSGuide(true);
      return;
    }

    if (result.outcome === 'accepted') {
      toast.success('Thank you for installing Welcome Hub!');
      setIsDismissed(true);
      setIsVisible(false);
    } else if (result.outcome === 'dismissed') {
      handleDismiss();
    }
  };

  const handleCloseGuide = () => {
    setShowIOSGuide(false);
    handleDismiss();
  };

  if (!isVisible || !hasSession || !canInstall || isDismissed) {
    return (
      <>
        {showIOSGuide && <PWAInstallGuideModal isOpen={showIOSGuide} onClose={handleCloseGuide} />}
      </>
    );
  }

  return (
    <>
      <NotificationPrompt ariaLabel="App installation prompt" onDismiss={handleDismiss}>
        <NotificationPrompt.Header>
          <NotificationPrompt.Icon>
            {isIOS ? <Smartphone className="h-5 w-5" /> : <Download className="h-5 w-5" />}
          </NotificationPrompt.Icon>
          <NotificationPrompt.Content>
            <NotificationPrompt.Title>Install Welcome Hub</NotificationPrompt.Title>
            <NotificationPrompt.Description>
              Install as an app on this device for one-tap access, fast offline loading, and a
              seamless experience.
            </NotificationPrompt.Description>
          </NotificationPrompt.Content>
          <NotificationPrompt.DismissButton ariaLabel="Dismiss app install prompt" />
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
          <Button type="button" size="xs" onClick={handleInstallClick} className="gap-1.5">
            {isIOS ? (
              <>
                <Smartphone className="h-3.5 w-3.5" />
                <span>How to install</span>
              </>
            ) : (
              <>
                <Download className="h-3.5 w-3.5" />
                <span>Install app</span>
              </>
            )}
          </Button>
        </NotificationPrompt.Actions>
      </NotificationPrompt>

      <PWAInstallGuideModal isOpen={showIOSGuide} onClose={handleCloseGuide} />
    </>
  );
}
