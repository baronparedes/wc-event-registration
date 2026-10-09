import { useCallback, useEffect, useState } from 'react';

import { isIOSDevice } from '@/lib/infrastructure';

import { useLocalStorage } from './useLocalStorage';

export interface BeforeInstallPromptChoice {
  outcome: 'accepted' | 'dismissed';
  platform: string;
}

export interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<BeforeInstallPromptChoice>;
  prompt(): Promise<void>;
}

export const PWA_INSTALLED_STORAGE_KEY = 'wc:pwa:installed';

export function isStandaloneMode(): boolean {
  if (typeof window === 'undefined') return false;

  const isDisplayStandalone = window.matchMedia?.('(display-mode: standalone)')?.matches ?? false;
  const isDisplayFullscreen = window.matchMedia?.('(display-mode: fullscreen)')?.matches ?? false;
  const isDisplayMinimalUi = window.matchMedia?.('(display-mode: minimal-ui)')?.matches ?? false;
  const isIosStandalone =
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true;

  return isDisplayStandalone || isDisplayFullscreen || isDisplayMinimalUi || isIosStandalone;
}

export { isIOSDevice };

export function usePwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone] = useState<boolean>(() => isStandaloneMode());
  const [isIOS] = useState<boolean>(() => isIOSDevice());
  const installedStorage = useLocalStorage<string>(PWA_INSTALLED_STORAGE_KEY);
  const [isAppInstalled, setIsAppInstalled] = useState<boolean>(
    () => isStandaloneMode() || installedStorage.get() === 'true',
  );

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setIsAppInstalled(true);
      installedStorage.set('true');
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, [installedStorage]);

  const promptToInstall = useCallback(async (): Promise<{
    outcome: 'accepted' | 'dismissed' | 'manual_guide' | 'unavailable';
  }> => {
    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt();
        const choice = await deferredPrompt.userChoice;
        if (choice.outcome === 'accepted') {
          setIsAppInstalled(true);
          installedStorage.set('true');
        }
        setDeferredPrompt(null);
        return { outcome: choice.outcome };
      } catch {
        return { outcome: 'unavailable' };
      }
    }

    if (isIOS && !isStandalone) {
      return { outcome: 'manual_guide' };
    }

    return { outcome: 'unavailable' };
  }, [deferredPrompt, isIOS, isStandalone, installedStorage]);

  const canInstall = !isStandalone && !isAppInstalled && (Boolean(deferredPrompt) || isIOS);

  return {
    canInstall,
    isStandalone,
    isAppInstalled,
    isIOS,
    hasNativePrompt: Boolean(deferredPrompt),
    promptToInstall,
  };
}
