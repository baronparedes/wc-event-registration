import { useEffect, useState } from 'react';

import { createPortal } from 'react-dom';

import { Bell, CheckCheck, Loader2, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import {
  useMarkAllNotificationsReadMutation,
  useMarkNotificationReadMutation,
  useNotificationsQuery,
  usePushSubscription,
} from '@/hooks/domain/notifications';
import { formatDateTime } from '@/lib/infrastructure/dateFormat';

import { Badge } from './Badge';
import { Button } from './Button';
import { EmptyState } from './EmptyState';
import { Tabs, TabsList, TabsTrigger } from './Tabs';

export type NotificationDrawerProps = {
  isOpen: boolean;
  onClose: () => void;
};

export function NotificationDrawer({ isOpen, onClose }: NotificationDrawerProps) {
  const navigate = useNavigate();
  const { data: notifications = [] } = useNotificationsQuery();
  const markRead = useMarkNotificationReadMutation();
  const markAllRead = useMarkAllNotificationsReadMutation();
  const push = usePushSubscription();

  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  const unreadCount = notifications.filter((n) => !n.is_read).length;
  const filteredNotifications =
    filter === 'unread' ? notifications.filter((n) => !n.is_read) : notifications;

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && isOpen) {
        onClose();
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => {
        document.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [isOpen, onClose]);

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

  return createPortal(
    <>
      {isOpen && (
        <button
          type="button"
          aria-label="Close notifications drawer overlay"
          className="fixed inset-0 z-40 bg-text/25 backdrop-blur-[1px] select-none"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed right-0 top-0 z-50 h-full w-full max-w-sm sm:max-w-md border-l border-border bg-surface shadow-xl transition-transform duration-200 select-none ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        aria-label="Notifications drawer"
      >
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <div className="flex items-center gap-2.5">
              <h2 className="font-heading text-xl font-semibold text-text">Notifications</h2>
              {unreadCount > 0 && (
                <Badge variant="primaryOutline" className="text-xs px-2.5 py-0.5">
                  {unreadCount} New
                </Badge>
              )}
            </div>

            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  type="button"
                  className="inline-flex items-center gap-1 text-xs font-medium text-muted hover:text-primary transition-colors cursor-pointer disabled:opacity-50"
                  onClick={() => markAllRead.mutate()}
                  disabled={markAllRead.isPending}
                >
                  {markAllRead.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCheck className="h-4 w-4" />
                  )}
                  <span>{markAllRead.isPending ? 'Marking read...' : 'Mark all as read'}</span>
                </button>
              )}
              <button
                type="button"
                aria-label="Close notifications drawer"
                title="Close notifications drawer"
                className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg p-2.5 text-muted transition hover:bg-primary/10 hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                onClick={onClose}
              >
                <X className="h-6 w-6" aria-hidden="true" />
              </button>
            </div>
          </div>

          {/* Filter Tabs */}
          <div className="border-b border-border px-5 py-2.5 bg-surface/50">
            <Tabs value={filter} onValueChange={(val) => setFilter(val as 'all' | 'unread')}>
              <TabsList containerClassName="justify-start" className="w-auto">
                <TabsTrigger value="all" className="!px-3.5 !py-1 !text-xs gap-1.5">
                  <span>All</span>
                  <span
                    className={`rounded-full px-1.5 py-0.2 text-[10px] font-semibold ${
                      filter === 'all' ? 'bg-white/20 text-white' : 'bg-muted/15 text-muted'
                    }`}
                  >
                    {notifications.length}
                  </span>
                </TabsTrigger>
                <TabsTrigger value="unread" className="!px-3.5 !py-1 !text-xs gap-1.5">
                  <span>Unread</span>
                  {unreadCount > 0 && (
                    <span
                      className={`rounded-full px-1.5 py-0.2 text-[10px] font-semibold ${
                        filter === 'unread'
                          ? 'bg-white/20 text-white'
                          : 'bg-primary/15 text-primary'
                      }`}
                    >
                      {unreadCount}
                    </span>
                  )}
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto divide-y divide-border/40">
            {filteredNotifications.length === 0 ? (
              <div className="py-12">
                <EmptyState
                  icon={<Bell className="h-10 w-10" />}
                  title={filter === 'unread' ? 'No unread notifications' : 'No notifications'}
                  description={
                    filter === 'unread'
                      ? "You've read all your notifications."
                      : "You're all caught up!"
                  }
                  className="border-none bg-transparent py-6"
                />
              </div>
            ) : (
              filteredNotifications.map((n) => (
                <div
                  key={n.id}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      if (!n.is_read) {
                        markRead.mutate(n.id);
                      }
                      if (n.notification.target_url) {
                        navigate(n.notification.target_url);
                        onClose();
                      }
                    }
                  }}
                  className={`group relative flex items-start gap-3.5 px-5 py-4 transition-colors cursor-pointer select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/50 ${
                    !n.is_read
                      ? 'bg-primary/[0.04] hover:bg-primary/[0.08]'
                      : 'hover:bg-background/80'
                  }`}
                  onClick={() => {
                    if (!n.is_read) {
                      markRead.mutate(n.id);
                    }
                    if (n.notification.target_url) {
                      navigate(n.notification.target_url);
                      onClose();
                    }
                  }}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      if (!n.is_read) {
                        markRead.mutate(n.id);
                      }
                      if (n.notification.target_url) {
                        navigate(n.notification.target_url);
                        onClose();
                      }
                    }
                  }}
                >
                  {/* Left Accent Bar for unread */}
                  {!n.is_read && <span className="absolute left-0 top-0 bottom-0 w-1 bg-primary" />}

                  {/* Icon Avatar */}
                  <div
                    className={`h-9 w-9 shrink-0 rounded-full flex items-center justify-center transition-colors ${
                      !n.is_read
                        ? 'bg-primary/15 text-primary'
                        : 'bg-muted/10 text-muted group-hover:text-text'
                    }`}
                  >
                    <Bell className="h-4 w-4" />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p
                        className={`text-sm sm:text-base leading-snug truncate ${
                          !n.is_read ? 'font-bold text-text' : 'font-semibold text-text/90'
                        }`}
                      >
                        {n.notification.title}
                      </p>
                      {!n.is_read && (
                        <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
                      )}
                    </div>
                    <p className="text-xs sm:text-sm text-muted leading-relaxed mt-0.5 break-words">
                      {n.notification.message}
                    </p>
                    <span className="text-[11px] sm:text-xs text-muted/70 mt-1 block">
                      {formatDateTime(n.notification.created_at)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer / Push Notification Section */}
          {push.isSupported && (
            <div className="border-t border-border/80 px-5 py-3.5 bg-surface/90 backdrop-blur-xs">
              {!push.isSubscribed ? (
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-xs sm:text-sm font-medium text-text">
                    <Bell className="h-4 w-4 text-primary shrink-0" />
                    <span>Get alerts on this device</span>
                  </div>
                  <Button size="sm" onClick={handleSubscribe} disabled={push.isLoading}>
                    {push.isLoading && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
                    {push.isLoading ? 'Enabling...' : 'Enable'}
                  </Button>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-3">
                  <span className="flex items-center gap-2 text-xs sm:text-sm text-primary font-medium">
                    <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                    Push alerts active on this device
                  </span>
                  <Button
                    type="button"
                    variant="accent"
                    size="sm"
                    onClick={handleUnsubscribe}
                    disabled={push.isLoading}
                  >
                    {push.isLoading && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
                    {push.isLoading ? 'Turning off...' : 'Turn off'}
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </aside>
    </>,
    document.body,
  );
}
