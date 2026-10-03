import { useState } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { BarChart3, Calendar } from 'lucide-react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { z } from 'zod';

import { AdminBaseNavigation, AdminPageShell } from '@/components/layout';
import {
  Button,
  FormInputField,
  FormSelectField,
  FormTextareaField,
  SectionCard,
} from '@/components/ui';
import { ROUTE_PATHS } from '@/config/constants';
import type { AuthUserItem } from '@/hooks/domain/auth';
import { useBroadcastAudienceStatsQuery } from '@/hooks/domain/notifications';
import type { AdminEvent } from '@/lib/domain/events';
import {
  type BroadcastChannel,
  type SendAppNotificationPayload,
  type SendAppNotificationResponse,
  sendAppNotification,
} from '@/lib/domain/notifications';

import { BroadcastAudienceStatsCard } from './components/BroadcastAudienceStatsCard';
import { BroadcastChannelSelect } from './components/BroadcastChannelSelect';
import { BroadcastConfirmDialog } from './components/BroadcastConfirmDialog';
import { BroadcastEventPicker } from './components/BroadcastEventPicker';
import { BroadcastRoleMultiSelect } from './components/BroadcastRoleMultiSelect';
import { BroadcastUserPicker } from './components/BroadcastUserPicker';

const broadcastSchema = z
  .object({
    title: z.string().min(1, 'Title is required').max(100, 'Title cannot exceed 100 characters'),
    message: z
      .string()
      .min(1, 'Message is required')
      .max(500, 'Message cannot exceed 500 characters'),
    channels: z
      .array(z.enum(['push', 'email']))
      .min(1, 'Please select at least one delivery channel'),
    targetType: z.enum(['all', 'role', 'user', 'event']),
    targetRoles: z.array(z.string()).optional(),
    targetUserId: z.string().optional(),
    targetEventId: z.string().optional(),
    destinationUrl: z.string().optional(),
  })
  .refine(
    (data) => {
      if (data.targetType === 'role') {
        return !!data.targetRoles && data.targetRoles.length > 0;
      }
      return true;
    },
    {
      message: 'Please select at least one role',
      path: ['targetRoles'],
    },
  )
  .refine(
    (data) => {
      if (data.targetType === 'user') {
        return !!data.targetUserId && data.targetUserId.trim().length > 0;
      }
      return true;
    },
    {
      message: 'Please select a target user',
      path: ['targetUserId'],
    },
  )
  .refine(
    (data) => {
      if (data.targetType === 'event') {
        return !!data.targetEventId && data.targetEventId.trim().length > 0;
      }
      return true;
    },
    {
      message: 'Please select a target event',
      path: ['targetEventId'],
    },
  );

type BroadcastFormValues = z.infer<typeof broadcastSchema>;

export function AdminNotificationsPage() {
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [pendingValues, setPendingValues] = useState<BroadcastFormValues | null>(null);
  const [selectedUser, setSelectedUser] = useState<AuthUserItem | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<AdminEvent | null>(null);

  const form = useForm<BroadcastFormValues>({
    resolver: zodResolver(broadcastSchema),
    defaultValues: {
      channels: ['push', 'email'],
      targetType: 'all',
      title: '',
      message: '',
      targetRoles: [],
      targetUserId: '',
      targetEventId: '',
      destinationUrl: '',
    },
  });

  const channels = useWatch({ control: form.control, name: 'channels' }) ?? ['push', 'email'];
  const targetType = useWatch({ control: form.control, name: 'targetType' });
  const targetRoles = useWatch({ control: form.control, name: 'targetRoles' });
  const targetUserId = useWatch({ control: form.control, name: 'targetUserId' });
  const targetEventId = useWatch({ control: form.control, name: 'targetEventId' });

  const { data: audienceStats } = useBroadcastAudienceStatsQuery({
    targetType,
    targetRoles,
    targetUserId,
    targetEventId,
  });

  const broadcastMutation = useMutation({
    mutationFn: async (values: BroadcastFormValues): Promise<SendAppNotificationResponse> => {
      const payload: SendAppNotificationPayload = {
        title: values.title,
        message: values.message,
        channels: values.channels,
        targetType: values.targetType,
      };

      if (values.destinationUrl) {
        payload.url = values.destinationUrl;
      }

      if (values.targetType === 'role' && values.targetRoles && values.targetRoles.length > 0) {
        payload.targetRoles = values.targetRoles;
        payload.targetRole = values.targetRoles[0];
      } else if (values.targetType === 'user' && values.targetUserId) {
        payload.targetUserId = values.targetUserId;
      } else if (values.targetType === 'event' && values.targetEventId) {
        payload.targetEventId = values.targetEventId;
      }

      return sendAppNotification(payload);
    },
    onSuccess: (data: SendAppNotificationResponse) => {
      const pushDetails = data.pushCount !== undefined ? `${data.pushCount} push` : null;
      const emailDetails = data.emailCount !== undefined ? `${data.emailCount} email` : null;
      const detailsList = [pushDetails, emailDetails].filter(Boolean).join(', ');
      const detailString = detailsList ? ` (${detailsList})` : '';

      toast.success(`Successfully sent broadcast to ${data.count} recipients${detailString}!`);
      setIsConfirmOpen(false);
      setPendingValues(null);
      setSelectedUser(null);
      setSelectedEvent(null);
      form.reset({
        channels: ['push', 'email'],
        targetType: 'all',
        title: '',
        message: '',
        targetRoles: [],
        targetUserId: '',
        targetEventId: '',
        destinationUrl: '',
      });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleFormSubmit = (values: BroadcastFormValues) => {
    setPendingValues(values);
    setIsConfirmOpen(true);
  };

  const handleConfirmBroadcast = () => {
    if (pendingValues) {
      broadcastMutation.mutate(pendingValues);
    }
  };

  return (
    <AdminPageShell>
      <AdminPageShell.Header
        title="App Notifications"
        description="Broadcast push notifications, emails, and in-app alerts to users."
        breadcrumbs={[
          { label: 'Settings', to: ROUTE_PATHS.adminSettings },
          { label: 'Notifications' },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <Link to={ROUTE_PATHS.adminSundayReminders}>
              <Button className="gap-1.5">
                <Calendar className="h-3.5 w-3.5" />
                <span>Sunday Reminders</span>
              </Button>
            </Link>
            <Link to={ROUTE_PATHS.adminNotificationsDashboard}>
              <Button className="gap-1.5">
                <BarChart3 className="h-3.5 w-3.5" />
                <span>Dashboard</span>
              </Button>
            </Link>
          </div>
        }
      />

      <AdminBaseNavigation />

      <AdminPageShell.Content>
        <div className="w-full">
          <SectionCard
            title="Notification Broadcast"
            subtitle="Compose and send an announcement to application users."
          >
            <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4 pt-4">
              <Controller
                control={form.control}
                name="channels"
                render={({ field }) => (
                  <BroadcastChannelSelect
                    value={field.value ?? []}
                    onChange={(newChannels: BroadcastChannel[]) =>
                      form.setValue('channels', newChannels, { shouldValidate: true })
                    }
                    error={form.formState.errors.channels?.message}
                  />
                )}
              />

              <Controller
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormInputField
                    id="title"
                    label="Title / Subject"
                    placeholder="e.g. Sunday Service Reminder"
                    maxLength={100}
                    helperText={`${(field.value ?? '').length}/100 characters (max 100 for push notifications)`}
                    error={form.formState.errors.title?.message}
                    {...field}
                    value={field.value ?? ''}
                  />
                )}
              />

              <Controller
                control={form.control}
                name="message"
                render={({ field }) => (
                  <FormTextareaField
                    id="message"
                    label="Message"
                    rows={3}
                    placeholder="Enter announcement or reminder details..."
                    maxLength={500}
                    helperText={`${(field.value ?? '').length}/500 characters (max 500 for push notifications)`}
                    error={form.formState.errors.message?.message}
                    {...field}
                    value={field.value ?? ''}
                  />
                )}
              />

              <FormSelectField
                id="targetType"
                label="Target Audience"
                options={[
                  { value: 'all', label: 'All Registered Members' },
                  { value: 'event', label: 'Specific Event (Members & Public)' },
                  { value: 'role', label: 'Specific Roles' },
                  { value: 'user', label: 'Specific User' },
                ]}
                value={targetType}
                onChange={(value) => {
                  form.setValue('targetType', value as BroadcastFormValues['targetType']);
                  form.setValue('targetRoles', []);
                  form.setValue('targetUserId', '');
                  form.setValue('targetEventId', '');
                  setSelectedUser(null);
                  setSelectedEvent(null);
                }}
                error={form.formState.errors.targetType?.message}
              />

              {targetType === 'event' && (
                <Controller
                  control={form.control}
                  name="targetEventId"
                  render={({ field }) => (
                    <BroadcastEventPicker
                      id="targetEventId"
                      value={field.value}
                      onChange={(eventId, event) => {
                        form.setValue('targetEventId', eventId, { shouldValidate: true });
                        setSelectedEvent(event);
                      }}
                      error={form.formState.errors.targetEventId?.message}
                    />
                  )}
                />
              )}

              {targetType === 'role' && (
                <Controller
                  control={form.control}
                  name="targetRoles"
                  render={({ field }) => (
                    <BroadcastRoleMultiSelect
                      id="targetRoles"
                      selectedRoles={field.value ?? []}
                      onChange={(roles) =>
                        form.setValue('targetRoles', roles, { shouldValidate: true })
                      }
                      error={form.formState.errors.targetRoles?.message}
                    />
                  )}
                />
              )}

              {targetType === 'user' && (
                <Controller
                  control={form.control}
                  name="targetUserId"
                  render={({ field }) => (
                    <BroadcastUserPicker
                      id="targetUserId"
                      value={field.value}
                      onChange={(userId, user) => {
                        form.setValue('targetUserId', userId, { shouldValidate: true });
                        setSelectedUser(user ?? null);
                      }}
                      error={form.formState.errors.targetUserId?.message}
                    />
                  )}
                />
              )}

              <BroadcastAudienceStatsCard
                channels={channels}
                targetType={targetType}
                targetRoles={targetRoles}
                targetUserId={targetUserId}
                targetEventId={targetEventId}
              />

              <Controller
                control={form.control}
                name="destinationUrl"
                render={({ field }) => (
                  <FormInputField
                    id="destinationUrl"
                    label="Destination URL (Optional)"
                    placeholder="e.g. / or /profile (defaults to /)"
                    error={form.formState.errors.destinationUrl?.message}
                    {...field}
                    value={field.value ?? ''}
                  />
                )}
              />

              <div className="flex justify-end pt-2">
                <Button
                  type="submit"
                  disabled={broadcastMutation.isPending || channels.length === 0}
                >
                  Send Broadcast
                </Button>
              </div>
            </form>
          </SectionCard>
        </div>

        <BroadcastConfirmDialog
          isOpen={isConfirmOpen}
          onClose={() => setIsConfirmOpen(false)}
          onConfirm={handleConfirmBroadcast}
          isPending={broadcastMutation.isPending}
          values={pendingValues}
          targetUser={selectedUser}
          targetEvent={selectedEvent}
          audienceStats={audienceStats}
        />
      </AdminPageShell.Content>
    </AdminPageShell>
  );
}
