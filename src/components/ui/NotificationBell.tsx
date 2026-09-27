import { useState } from 'react';

import { Bell } from 'lucide-react';

import {
  useMarkNotificationReadMutation,
  useNotificationsQuery,
} from '@/hooks/domain/notifications';
import { formatDateTime } from '@/lib/infrastructure/dateFormat';

import { Button } from './Button';
import { EmptyState } from './EmptyState';

export function NotificationBell() {
  const { data: notifications = [] } = useNotificationsQuery();
  const markRead = useMarkNotificationReadMutation();
  const [isOpen, setIsOpen] = useState(false);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <div className="relative">
      <Button
        variant="ghost"
        className="relative"
        onClick={() => setIsOpen(!isOpen)}
        aria-label={`Notifications (${unreadCount} unread)`}
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute right-1.5 top-1.5 flex h-2.5 w-2.5 items-center justify-center rounded-full bg-red-500 ring-2 ring-background"></span>
        )}
      </Button>

      {isOpen && (
        <div className="absolute right-0 z-50 mt-2 w-80 sm:w-96 rounded-xl border border-border bg-surface p-2 shadow-lg ring-1 ring-black/5">
          <div className="flex items-center justify-between border-b border-border pb-2 px-3 pt-2">
            <h3 className="font-semibold text-text">Notifications</h3>
            {unreadCount > 0 && (
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                {unreadCount} New
              </span>
            )}
          </div>

          <div className="flex max-h-[400px] flex-col overflow-y-auto pt-2">
            {notifications.length === 0 ? (
              <div className="py-8">
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
        </div>
      )}

      {/* Invisible backdrop for closing dropdown */}
      {isOpen && <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />}
    </div>
  );
}
