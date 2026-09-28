import { useEffect, useState } from 'react';

import { Bell } from 'lucide-react';

import { useNotificationsQuery } from '@/hooks/domain/notifications';

import { Button } from './Button';
import { NotificationDrawer } from './NotificationDrawer';

export function NotificationBell() {
  const { data: notifications = [] } = useNotificationsQuery();
  const [isOpen, setIsOpen] = useState(false);

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
    return () => window.removeEventListener('popstate', handleUrlChange);
  }, []);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <>
      <Button
        variant="ghost"
        className="relative inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg border border-border bg-background p-2.5 text-text shadow-xs transition hover:bg-primary/10 focus-visible:ring-2 focus-visible:ring-primary select-none"
        onClick={() => setIsOpen(true)}
        aria-label={`Notifications (${unreadCount} unread)`}
        aria-expanded={isOpen}
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute right-1.5 top-1.5 flex h-2.5 w-2.5 items-center justify-center rounded-full bg-danger ring-2 ring-background" />
        )}
      </Button>

      <NotificationDrawer isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}
