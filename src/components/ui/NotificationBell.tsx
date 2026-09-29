import { useEffect, useRef, useState } from 'react';

import { Bell } from 'lucide-react';

import { useNotificationsQuery } from '@/hooks/domain/notifications';

import { Button } from './Button';
import { NotificationDrawer } from './NotificationDrawer';

type NotificationBellProps = {
  compact?: boolean;
};

export function NotificationBell({ compact = false }: NotificationBellProps) {
  const { data: notifications = [] } = useNotificationsQuery();
  const [isOpen, setIsOpen] = useState(false);
  const [isRinging, setIsRinging] = useState(false);
  const ringTimeoutRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    const handleUrlChange = () => {
      const params = new URLSearchParams(window.location.search);
      if (params.get('openDrawer') === 'notifications') {
        setTimeout(() => setIsOpen(true), 0);
        params.delete('openDrawer');
        const newUrl =
          window.location.pathname +
          (params.toString() ? `?${params.toString()}` : '') +
          window.location.hash;
        window.history.replaceState({}, '', newUrl);
      }
    };

    handleUrlChange();

    // Fallback if window URL changes without unmounting
    window.addEventListener('popstate', handleUrlChange);
    return () => {
      window.removeEventListener('popstate', handleUrlChange);
      if (ringTimeoutRef.current !== undefined) {
        window.clearTimeout(ringTimeoutRef.current);
      }
    };
  }, []);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  function handleBellClick() {
    setIsOpen(true);
    setIsRinging(true);
    if (ringTimeoutRef.current !== undefined) {
      window.clearTimeout(ringTimeoutRef.current);
    }
    ringTimeoutRef.current = window.setTimeout(() => setIsRinging(false), 800);
  }

  return (
    <>
      <Button
        variant="ghost"
        className={`relative inline-flex min-h-[44px] min-w-[44px] items-center justify-center ${
          compact
            ? 'rounded-full border-0 bg-transparent text-text shadow-none'
            : 'rounded-lg border-0 bg-transparent shadow-none'
        } ${isRinging ? 'notification-bell is-ringing' : 'notification-bell'} p-2.5 transition focus-visible:ring-2 focus-visible:ring-primary select-none`}
        onClick={handleBellClick}
        aria-label={`Notifications (${unreadCount} unread)`}
        aria-expanded={isOpen}
      >
        <Bell className={`notification-bell-icon h-6 w-6 ${compact ? '' : 'text-black'}`} />
        {unreadCount > 0 && (
          <span className="absolute right-1.5 top-1.5 flex h-2.5 w-2.5 items-center justify-center rounded-full bg-danger ring-2 ring-background" />
        )}
      </Button>

      <NotificationDrawer isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}
