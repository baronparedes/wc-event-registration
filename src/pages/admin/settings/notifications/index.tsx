import { useState } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { Controller, useForm, useWatch } from 'react-hook-form';
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
import { type AuthUserItem } from '@/hooks/domain/auth';
import { type SendAppNotificationPayload, sendAppNotification } from '@/lib/domain/notifications';

import { BroadcastConfirmDialog } from './components/BroadcastConfirmDialog';
import { BroadcastRoleMultiSelect } from './components/BroadcastRoleMultiSelect';
import { BroadcastUserPicker } from './components/BroadcastUserPicker';

const broadcastSchema = z
  .object({
    title: z.string().min(1, 'Title is required').max(255),
    message: z.string().min(1, 'Message is required'),
    targetType: z.enum(['all', 'role', 'user']),
    targetRoles: z.array(z.string()).optional(),
    targetUserId: z.string().optional(),
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
  );

type BroadcastFormValues = z.infer<typeof broadcastSchema>;

export function AdminNotificationsPage() {
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [pendingValues, setPendingValues] = useState<BroadcastFormValues | null>(null);
  const [selectedUser, setSelectedUser] = useState<AuthUserItem | null>(null);

  const form = useForm<BroadcastFormValues>({
    resolver: zodResolver(broadcastSchema),
    defaultValues: {
      targetType: 'all',
      title: '',
      message: '',
      targetRoles: [],
      targetUserId: '',
      destinationUrl: '',
    },
  });

  const targetType = useWatch({ control: form.control, name: 'targetType' });

  const broadcastMutation = useMutation({
    mutationFn: async (values: BroadcastFormValues) => {
      const payload: SendAppNotificationPayload = {
        title: values.title,
        message: values.message,
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
      }

      return sendAppNotification(payload);
    },
    onSuccess: (data: { count: number }) => {
      toast.success(`Successfully sent broadcast to ${data.count} users!`);
      setIsConfirmOpen(false);
      setPendingValues(null);
      setSelectedUser(null);
      form.reset();
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
        description="Broadcast push notifications and in-app alerts to users."
        breadcrumbs={[
          { label: 'Settings', to: ROUTE_PATHS.adminSettings },
          { label: 'Notifications' },
        ]}
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
                name="title"
                render={({ field }) => (
                  <FormInputField
                    id="title"
                    label="Title"
                    placeholder="e.g. Sunday Service Reminder"
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
                    placeholder="Enter notification details..."
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
                  { value: 'all', label: 'Registered Members' },
                  { value: 'role', label: 'Specific Roles' },
                  { value: 'user', label: 'Specific User' },
                ]}
                value={targetType}
                onChange={(value) => {
                  form.setValue('targetType', value as BroadcastFormValues['targetType']);
                  form.setValue('targetRoles', []);
                  form.setValue('targetUserId', '');
                  setSelectedUser(null);
                }}
                error={form.formState.errors.targetType?.message}
              />

              {targetType === 'role' && (
                <Controller
                  control={form.control}
                  name="targetRoles"
                  render={({ field }) => (
                    <BroadcastRoleMultiSelect
                      id="targetRoles"
                      selectedRoles={field.value ?? []}
                      onChange={(roles) => form.setValue('targetRoles', roles)}
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
                        form.setValue('targetUserId', userId);
                        setSelectedUser(user ?? null);
                      }}
                      error={form.formState.errors.targetUserId?.message}
                    />
                  )}
                />
              )}

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
                <Button type="submit" disabled={broadcastMutation.isPending}>
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
        />
      </AdminPageShell.Content>
    </AdminPageShell>
  );
}
