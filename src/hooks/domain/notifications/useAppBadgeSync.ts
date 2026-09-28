import { useEffect, useRef } from 'react';

export function useAppBadgeSync(unreadCount: number) {
  const previousTitleRef = useRef<string | null>(null);

  useEffect(() => {
    // Save original title on first mount if not already saved
    if (previousTitleRef.current === null) {
      // Strip any existing notification count from the title just in case
      previousTitleRef.current = document.title.replace(/^\(\d+\)\s/, '');
    }

    const originalTitle = previousTitleRef.current;

    // Update app badge if API is supported
    if ('setAppBadge' in navigator && 'clearAppBadge' in navigator) {
      try {
        if (unreadCount > 0) {
          navigator.setAppBadge(unreadCount).catch(console.error);
        } else {
          navigator.clearAppBadge().catch(console.error);
        }
      } catch (err) {
        console.error('Error setting app badge:', err);
      }
    }

    // Always update document.title for desktop browsers
    if (unreadCount > 0) {
      document.title = `(${unreadCount}) ${originalTitle}`;
    } else {
      document.title = originalTitle;
    }
  }, [unreadCount]);

  useEffect(() => {
    // Handler to send message to Service Worker to clear notifications when app gains focus
    const handleVisibilityOrFocus = () => {
      if (document.visibilityState === 'visible' || document.hasFocus()) {
        if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
          navigator.serviceWorker.controller.postMessage({
            type: 'CLEAR_NOTIFICATIONS',
          });
        }
      }
    };

    // Attach to multiple events to catch different focus/visibility scenarios reliably
    window.addEventListener('focus', handleVisibilityOrFocus);
    document.addEventListener('visibilitychange', handleVisibilityOrFocus);

    // Initial check just in case the app was already visible/focused
    handleVisibilityOrFocus();

    return () => {
      window.removeEventListener('focus', handleVisibilityOrFocus);
      document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
    };
  }, []);
}
