import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import { AdminPageShell } from '@/components/layout/AdminPageShell';
import {
  Button,
  FormInputField,
  FormSelectField,
  FormTextareaField,
  SectionCard,
} from '@/components/ui';
import { type SendAppNotificationPayload, sendAppNotification } from '@/lib/domain/notifications';

const broadcastSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255),
  message: z.string().min(1, 'Message is required'),
  targetType: z.enum(['all', 'role', 'user']),
  targetRole: z.string().optional(),
  targetUserId: z.string().uuid('Invalid user ID').optional().or(z.literal('')),
  destinationUrl: z.string().optional(),
});

type BroadcastFormValues = z.infer<typeof broadcastSchema>;

export function AdminNotificationsPage() {
  const form = useForm<BroadcastFormValues>({
    resolver: zodResolver(broadcastSchema),
    defaultValues: {
      targetType: 'all',
      title: '',
      message: '',
      targetRole: '',
      targetUserId: '',
      destinationUrl: '',
    },
  });

  const targetType = useWatch({ control: form.control, name: 'targetType' });
  const targetRole = useWatch({ control: form.control, name: 'targetRole' });

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

      if (values.targetType === 'role' && values.targetRole) {
        payload.targetRole = values.targetRole;
      } else if (values.targetType === 'user' && values.targetUserId) {
        payload.targetUserId = values.targetUserId;
      }

      return sendAppNotification(payload);
    },
    onSuccess: (data: { count: number }) => {
      toast.success(`Successfully sent broadcast to ${data.count} users!`);
      form.reset();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  return (
    <AdminPageShell>
      <AdminPageShell.Header
        title="App Notifications"
        description="Broadcast push notifications and in-app alerts to users."
      />

      <AdminPageShell.Content>
        <div className="w-full">
          <SectionCard
            title="Notification Broadcast"
            subtitle="Compose and send an announcement to application users."
          >
            <form
              onSubmit={form.handleSubmit((v) => broadcastMutation.mutate(v))}
              className="space-y-4 pt-4"
            >
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
                render={() => (
                  <FormTextareaField
                    id="message"
                    label="Message"
                    rows={3}
                    placeholder="Enter notification details..."
                    error={form.formState.errors.message?.message}
                    registration={form.register('message')}
                  />
                )}
              />

              <FormSelectField
                id="targetType"
                label="Target Audience"
                options={[
                  { value: 'all', label: 'All Users' },
                  { value: 'role', label: 'Specific Role' },
                  { value: 'user', label: 'Specific User ID' },
                ]}
                value={targetType}
                onChange={(value) =>
                  form.setValue('targetType', value as BroadcastFormValues['targetType'])
                }
                error={form.formState.errors.targetType?.message}
              />

              {targetType === 'role' && (
                <FormSelectField
                  id="targetRole"
                  label="Role"
                  options={[
                    { value: 'super_admin', label: 'Super Admin' },
                    { value: 'admin', label: 'Admin' },
                    { value: 'slod', label: 'SLOD' },
                    { value: 'imt', label: 'IMT' },
                  ]}
                  value={targetRole || ''}
                  onChange={(value) => form.setValue('targetRole', value)}
                  error={form.formState.errors.targetRole?.message}
                />
              )}

              {targetType === 'user' && (
                <Controller
                  control={form.control}
                  name="targetUserId"
                  render={({ field }) => (
                    <FormInputField
                      id="targetUserId"
                      label="User ID (UUID)"
                      placeholder="e.g. a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11"
                      error={form.formState.errors.targetUserId?.message}
                      {...field}
                      value={field.value ?? ''}
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
                  {broadcastMutation.isPending ? 'Sending...' : 'Send Broadcast'}
                </Button>
              </div>
            </form>
          </SectionCard>
        </div>
      </AdminPageShell.Content>
    </AdminPageShell>
  );
}
