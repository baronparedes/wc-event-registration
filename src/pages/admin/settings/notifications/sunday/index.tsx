import { useState } from 'react';

import { Bell, Mail, RefreshCw, Send } from 'lucide-react';
import { toast } from 'sonner';

import { AdminBaseNavigation, AdminPageShell } from '@/components/layout';
import { Button, SectionCard } from '@/components/ui';
import { ROUTE_PATHS } from '@/config/constants';
import {
  useDispatchSundayRemindersMutation,
  useSundaySchedulePreviewQuery,
} from '@/hooks/domain/notifications';
import type { BroadcastChannel } from '@/lib/domain/notifications';
import { formatDateOnly } from '@/lib/infrastructure/dateFormat';

import { SundayDateSelector } from './components/SundayDateSelector';
import { SundayDeliveryStatusCard } from './components/SundayDeliveryStatusCard';
import { SundayDispatchConfirmDialog } from './components/SundayDispatchConfirmDialog';
import { SundayVolunteersTable } from './components/SundayVolunteersTable';

export function AdminSundayRemindersPage() {
  const [selectedDate, setSelectedDate] = useState<string | undefined>(undefined);
  const [channels, setChannels] = useState<BroadcastChannel[]>(['push', 'email']);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  const {
    data: preview,
    isLoading,
    isRefetching,
    refetch,
  } = useSundaySchedulePreviewQuery({
    targetSundayDate: selectedDate,
  });

  const dispatchMutation = useDispatchSundayRemindersMutation();

  const handleDateChange = (newDate: string) => {
    setSelectedDate(newDate);
  };

  const handleResetToNearest = () => {
    setSelectedDate(undefined);
  };

  const handleToggleChannel = (channel: BroadcastChannel) => {
    setChannels((prev) => {
      if (prev.includes(channel)) {
        return prev.filter((c) => c !== channel);
      }
      return [...prev, channel];
    });
  };

  const handleConfirmDispatch = (force: boolean) => {
    if (!preview) return;

    dispatchMutation.mutate(
      {
        targetSundayDate: preview.sunday_date,
        channels,
        force,
      },
      {
        onSuccess: (data) => {
          const pushText = channels.includes('push') ? `${data.push_enqueued} push` : null;
          const emailText = channels.includes('email') ? `${data.email_enqueued} email` : null;
          const detail = [pushText, emailText].filter(Boolean).join(', ');

          toast.success(
            `Successfully dispatched Sunday reminders for ${formatDateOnly(data.sunday_date)} (${detail})!`,
          );
          setIsConfirmOpen(false);
          refetch();
        },
        onError: (err) => {
          toast.error(`Dispatch failed: ${err.message}`);
        },
      },
    );
  };

  const isNearest = !selectedDate;
  const activeSundayDate = preview?.sunday_date ?? selectedDate ?? '';

  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' });
  const isPastSunday = activeSundayDate ? activeSundayDate < today : false;

  return (
    <AdminPageShell wide>
      <AdminPageShell.Header
        title="Sunday Service Reminders"
        description="Inspect volunteer commitments, monitor delivery logs, and manually trigger automated push and email schedule reminders."
        breadcrumbs={[
          { label: 'Settings', to: ROUTE_PATHS.adminSettings },
          { label: 'Notifications', to: ROUTE_PATHS.adminNotifications },
          { label: 'Sunday Reminders' },
        ]}
      />

      <AdminBaseNavigation />

      <AdminPageShell.Content>
        <div className="space-y-6">
          {/* Controls Card */}
          <SectionCard
            title="Schedule Dispatch Controls"
            subtitle="Select a Sunday date and delivery channels to review audience and dispatch reminders."
            headerAction={
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetch()}
                disabled={isLoading || isRefetching}
                className="gap-1.5 text-xs"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isRefetching ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </Button>
            }
          >
            <div className="space-y-4 pt-2">
              <SundayDateSelector
                selectedDate={activeSundayDate}
                onDateChange={handleDateChange}
                onResetToNearest={handleResetToNearest}
                ordinal={preview?.ordinal}
                sundayKey={preview?.sunday_key}
                isNearest={isNearest}
              />

              {/* Channel Selector & Dispatch Action */}
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-xl border border-border bg-background p-4">
                <div className="flex flex-col gap-1.5">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted">
                    Active Delivery Channels
                  </span>
                  <div className="flex flex-wrap items-center gap-3">
                    <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-text">
                      <input
                        type="checkbox"
                        checked={channels.includes('push')}
                        onChange={() => handleToggleChannel('push')}
                        className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                      />
                      <span className="flex items-center gap-1.5">
                        <Bell className="h-4 w-4 text-primary" /> Push Notifications
                      </span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-text">
                      <input
                        type="checkbox"
                        checked={channels.includes('email')}
                        onChange={() => handleToggleChannel('email')}
                        className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                      />
                      <span className="flex items-center gap-1.5">
                        <Mail className="h-4 w-4 text-primary" /> Email Notifications
                      </span>
                    </label>
                  </div>
                </div>

                {!isPastSunday && (
                  <div className="flex w-full items-center justify-end pt-2 sm:w-auto sm:pt-0 [&>button]:w-full sm:[&>button]:w-auto">
                    <Button
                      fullWidthMobile
                      variant="default"
                      onClick={() => setIsConfirmOpen(true)}
                      disabled={
                        isLoading ||
                        !preview ||
                        channels.length === 0 ||
                        preview.total_volunteers === 0
                      }
                      className="gap-2"
                    >
                      <Send className="h-4 w-4" />
                      <span>Dispatch Reminders</span>
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </SectionCard>

          {/* Delivery Status & Reach Metrics */}
          {preview && (
            <SundayDeliveryStatusCard
              alreadySentPush={preview.already_sent_push}
              pushSentAt={preview.push_sent_at}
              pushDelivery={preview.push_delivery}
              alreadySentEmail={preview.already_sent_email}
              emailSentAt={preview.email_sent_at}
              emailDelivery={preview.email_delivery}
              totalVolunteers={preview.total_volunteers}
              pushEligibleCount={preview.push_eligible_count}
              emailEligibleCount={preview.email_eligible_count}
              sundayDate={preview.sunday_date}
            />
          )}

          {/* Volunteer Commitment Roster */}
          <SectionCard
            title="Scheduled Volunteer Roster"
            subtitle={`Volunteers configured in the system on ${formatDateOnly(preview?.sunday_date || null)} (${preview?.sunday_key || 'upcoming'}).`}
          >
            <div className="pt-2">
              <SundayVolunteersTable
                volunteers={preview?.volunteers ?? []}
                isLoading={isLoading}
                sundayDate={preview?.sunday_date}
              />
            </div>
          </SectionCard>
        </div>

        {/* Confirmation Modal */}
        {preview && (
          <SundayDispatchConfirmDialog
            isOpen={isConfirmOpen}
            onClose={() => setIsConfirmOpen(false)}
            onConfirm={handleConfirmDispatch}
            isPending={dispatchMutation.isPending}
            sundayDate={preview.sunday_date}
            ordinal={preview.ordinal}
            channels={channels}
            totalVolunteers={preview.total_volunteers}
            pushEligibleCount={preview.push_eligible_count}
            emailEligibleCount={preview.email_eligible_count}
            alreadySentPush={preview.already_sent_push}
            alreadySentEmail={preview.already_sent_email}
          />
        )}
      </AdminPageShell.Content>
    </AdminPageShell>
  );
}
