import { useState } from 'react';

import { Bell, CheckCheck } from 'lucide-react';
import { toast } from 'sonner';

import {
  useMarkAllNotificationsReadMutation,
  useMarkNotificationReadMutation,
  useNotificationsQuery,
  usePushSubscription,
} from '@/hooks/domain/notifications';
import { formatDateTime } from '@/lib/infrastructure/dateFormat';

import { Button } from './Button';
import { EmptyState } from './EmptyState';

export function NotificationBell() {
  const { data: notifications = [] } = useNotificationsQuery();
  const markRead = useMarkNotificationReadMutation();
  const markAllRead = useMarkAllNotificationsReadMutation();
  const push = usePushSubscription();
  const [isOpen, setIsOpen] = useState(false);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const handleSubscribe = async () => {
    try {
      await push.subscribeAsync();
      toast.success('Successfully enabled push notifications on this device!');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to enable push notifications');
    }
  };

  const handleUnsubscribe = async () => {
    try {
      await push.unsubscribeAsync();
      toast.success('Disabled push notifications on this device.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to disable push notifications');
    }
  };

  return (
    <div className="relative">
      <Button
        variant="ghost"
        className="relative min-h-[40px] min-w-[40px] p-2"
        onClick={() => setIsOpen(!isOpen)}
        aria-label={`Notifications (${unreadCount} unread)`}
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute right-1 top-1 flex h-2.5 w-2.5 items-center justify-center rounded-full bg-red-500 ring-2 ring-background"></span>
        )}
      </Button>

      {isOpen && (
        <div className="absolute right-0 z-50 mt-2 w-80 sm:w-96 rounded-xl border border-border bg-surface p-2 shadow-lg ring-1 ring-black/5">
          <div className="flex items-center justify-between border-b border-border pb-2 px-3 pt-2">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-text">Notifications</h3>
              {unreadCount > 0 && (
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                  {unreadCount} New
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                type="button"
                className="inline-flex items-center gap-1 text-xs font-medium text-muted hover:text-primary transition-colors cursor-pointer"
                onClick={() => markAllRead.mutate()}
                disabled={markAllRead.isPending}
              >
                <CheckCheck className="h-3.5 w-3.5" />
                <span>Mark all as read</span>
              </button>
            )}
          </div>

          <div className="flex max-h-[360px] flex-col overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="py-2">
                <EmptyState
                  icon={<Bell className="h-8 w-8" />}
                  title="No notifications"
                  description="You're all caught up!"
                />
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  className={`flex flex-col gap-1 rounded-lg p-3 transition-colors hover:bg-surface-hover ${
                    !n.is_read ? 'bg-primary/5' : ''
                  }`}
                  onClick={() => {
                    if (!n.is_read) {
                      markRead.mutate(n.id);
                    }
                  }}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      if (!n.is_read) {
                        markRead.mutate(n.id);
                      }
                    }
                  }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p
                      className={`text-sm ${!n.is_read ? 'font-semibold' : 'font-medium'} text-text`}
                    >
                      {n.notification.title}
                    </p>
                    {!n.is_read && (
                      <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" />
                    )}
                  </div>
                  <p className="text-xs text-muted line-clamp-2">{n.notification.message}</p>
                  <span className="text-[10px] text-muted-foreground mt-1">
                    {formatDateTime(n.notification.created_at)}
                  </span>
                </div>
              ))
            )}
          </div>

          {push.isSupported && (
            <div className="border-t border-border mt-2 pt-2 px-1">
              {!push.isSubscribed ? (
                <div className="flex items-center justify-between gap-2 rounded-lg bg-surface-secondary/40 p-2">
                  <div className="flex items-center gap-1.5 text-xs text-muted">
                    <Bell className="h-3.5 w-3.5 text-primary shrink-0" />
                    <span>Get alerts on this device</span>
                  </div>
                  <Button onClick={handleSubscribe} disabled={push.isLoading}>
                    {push.isLoading ? 'Enabling...' : 'Enable'}
                  </Button>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-2 px-1 py-1 text-xs text-muted">
                  <span className="flex items-center gap-1.5 text-xs text-primary dark:text-primary font-medium">
                    <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                    Push alerts active on this device
                  </span>
                  <Button
                    type="button"
                    variant="accent"
                    onClick={handleUnsubscribe}
                    disabled={push.isLoading}
                  >
                    Turn off
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Invisible backdrop for closing dropdown */}
      {isOpen && <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />}
    </div>
  );
}
