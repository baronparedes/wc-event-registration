import { useEffect, useState } from 'react';

import { Download, Smartphone, X } from 'lucide-react';
import { toast } from 'sonner';

import { TIMING } from '@/config/constants';
import { useAdminAuthQuery } from '@/hooks/domain/auth';
import { useLocalStorage, usePwaInstallPrompt } from '@/hooks/utils';

import { Button } from './Button';
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
      <aside
        role="region"
        aria-label="App installation prompt"
        className="fixed bottom-4 left-4 right-4 z-40 sm:left-auto sm:right-6 sm:bottom-6 sm:max-w-md animate-fadeIn select-none"
      >
        <div className="relative flex flex-col gap-3 rounded-2xl border border-border/80 bg-surface/95 p-4 shadow-xl backdrop-blur-md">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              {isIOS ? <Smartphone className="h-5 w-5" /> : <Download className="h-5 w-5" />}
            </div>
            <div className="min-w-0 flex-1 pr-6">
              <h3 className="text-sm font-semibold text-text">Install Welcome Hub</h3>
              <p className="mt-0.5 text-xs leading-relaxed text-muted">
                Install as an app on this device for one-tap access, fast offline loading, and a
                seamless experience.
              </p>
            </div>
            <button
              type="button"
              aria-label="Dismiss app install prompt"
              onClick={handleDismiss}
              className="absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted transition hover:bg-primary/10 hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-border/40 pt-2">
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
          </div>
        </div>
      </aside>

      <PWAInstallGuideModal isOpen={showIOSGuide} onClose={handleCloseGuide} />
    </>
  );
}
