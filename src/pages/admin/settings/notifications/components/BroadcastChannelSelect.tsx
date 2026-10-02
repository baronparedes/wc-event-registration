import { Bell, Check, Mail } from 'lucide-react';

import { type BroadcastChannel } from '@/lib/domain/notifications';

interface BroadcastChannelSelectProps {
  value: BroadcastChannel[];
  onChange: (channels: BroadcastChannel[]) => void;
  error?: string;
}

export function BroadcastChannelSelect({ value, onChange, error }: BroadcastChannelSelectProps) {
  const toggleChannel = (channel: BroadcastChannel) => {
    if (value.includes(channel)) {
      if (value.length > 1) {
        onChange(value.filter((c) => c !== channel));
      }
    } else {
      onChange([...value, channel]);
    }
  };

  const isPush = value.includes('push');
  const isEmail = value.includes('email');

  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-semibold uppercase tracking-wider text-muted">
        Delivery Channels <span className="text-destructive">*</span>
      </label>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Push Notification Option */}
        <button
          type="button"
          onClick={() => toggleChannel('push')}
          className={`flex items-start gap-3 p-3 rounded-xl border text-left transition-all ${
            isPush
              ? 'border-primary bg-primary/5 text-text ring-1 ring-primary/30'
              : 'border-border bg-background text-muted hover:border-border/80'
          }`}
        >
          <div
            className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border mt-0.5 transition-colors ${
              isPush
                ? 'bg-primary border-primary text-primary-foreground'
                : 'border-border bg-surface'
            }`}
          >
            {isPush && <Check className="h-3.5 w-3.5 stroke-[3]" />}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <Bell className="h-4 w-4 text-primary shrink-0" />
              <p className="text-sm font-semibold text-text">Push Notification</p>
            </div>
            <p className="text-xs text-muted mt-0.5">
              In-app notification center & web push to subscribed devices.
            </p>
          </div>
        </button>

        {/* Email Announcement Option */}
        <button
          type="button"
          onClick={() => toggleChannel('email')}
          className={`flex items-start gap-3 p-3 rounded-xl border text-left transition-all ${
            isEmail
              ? 'border-primary bg-primary/5 text-text ring-1 ring-primary/30'
              : 'border-border bg-background text-muted hover:border-border/80'
          }`}
        >
          <div
            className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border mt-0.5 transition-colors ${
              isEmail
                ? 'bg-primary border-primary text-primary-foreground'
                : 'border-border bg-surface'
            }`}
          >
            {isEmail && <Check className="h-3.5 w-3.5 stroke-[3]" />}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <Mail className="h-4 w-4 text-primary shrink-0" />
              <p className="text-sm font-semibold text-text">Email Announcement</p>
            </div>
            <p className="text-xs text-muted mt-0.5">
              Transactional email delivery to all registered email addresses.
            </p>
          </div>
        </button>
      </div>

      {error && <p className="text-xs text-destructive mt-1">{error}</p>}
    </div>
  );
}
