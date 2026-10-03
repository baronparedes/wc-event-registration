import { Bell, Mail } from 'lucide-react';

import { type BroadcastChannel } from '@/lib/domain/notifications';

interface BroadcastChannelSelectProps {
  value: BroadcastChannel[];
  onChange: (channels: BroadcastChannel[]) => void;
  error?: string;
}

export function BroadcastChannelSelect({ value, onChange, error }: BroadcastChannelSelectProps) {
  const toggleChannel = (channel: BroadcastChannel) => {
    if (value.includes(channel)) {
      onChange(value.filter((c) => c !== channel));
    } else {
      onChange([...value, channel]);
    }
  };

  const isPush = value.includes('push');
  const isEmail = value.includes('email');

  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-semibold uppercase tracking-wider text-muted">
        Delivery Channels <span className="text-red-500">*</span>
      </label>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Push Notification Option */}
        <label
          className={`flex items-start gap-3 p-3 rounded-xl border text-left transition-all cursor-pointer ${
            isPush
              ? 'border-primary bg-primary/5 text-text ring-1 ring-primary/30'
              : 'border-border bg-background text-muted hover:border-border/80'
          }`}
        >
          <input
            type="checkbox"
            checked={isPush}
            onChange={() => toggleChannel('push')}
            className="mt-0.5 h-4 w-4 cursor-pointer rounded border-border text-primary focus:ring-primary/30"
          />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <Bell className="h-4 w-4 text-primary shrink-0" />
              <p className="text-sm font-semibold text-text">Push Notification</p>
            </div>
            <p className="text-xs text-muted mt-0.5">
              In-app notification center & web push to subscribed devices.
            </p>
          </div>
        </label>

        {/* Email Announcement Option */}
        <label
          className={`flex items-start gap-3 p-3 rounded-xl border text-left transition-all cursor-pointer ${
            isEmail
              ? 'border-primary bg-primary/5 text-text ring-1 ring-primary/30'
              : 'border-border bg-background text-muted hover:border-border/80'
          }`}
        >
          <input
            type="checkbox"
            checked={isEmail}
            onChange={() => toggleChannel('email')}
            className="mt-0.5 h-4 w-4 cursor-pointer rounded border-border text-primary focus:ring-primary/30"
          />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <Mail className="h-4 w-4 text-primary shrink-0" />
              <p className="text-sm font-semibold text-text">Email Announcement</p>
            </div>
            <p className="text-xs text-muted mt-0.5">
              Transactional email delivery to all registered email addresses.
            </p>
          </div>
        </label>
      </div>

      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
    </div>
  );
}
