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
import { usePushSubscription } from '@/hooks/domain/notifications';
import { supabase } from '@/lib/infrastructure';

const broadcastSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255),
  message: z.string().min(1, 'Message is required'),
  targetType: z.enum(['all', 'role', 'user']),
  targetRole: z.string().optional(),
  targetUserId: z.string().uuid('Invalid user ID').optional().or(z.literal('')),
});

type BroadcastFormValues = z.infer<typeof broadcastSchema>;

export function AdminNotificationsPage() {
  const {
    isSupported,
    isSubscribed,
    isLoading: isPushLoading,
    subscribeAsync,
  } = usePushSubscription();

  const form = useForm<BroadcastFormValues>({
    resolver: zodResolver(broadcastSchema),
    defaultValues: {
      targetType: 'all',
      title: '',
      message: '',
      targetRole: '',
      targetUserId: '',
    },
  });

  const targetType = useWatch({ control: form.control, name: 'targetType' });
  const targetRole = useWatch({ control: form.control, name: 'targetRole' });

  const broadcastMutation = useMutation({
    mutationFn: async (values: BroadcastFormValues) => {
      const { data: session } = await supabase.auth.getSession();

      const payload: Record<string, string | null> = {
        title: values.title,
        message: values.message,
        targetType: values.targetType,
      };

      if (values.targetType === 'role' && values.targetRole) {
        payload.targetRole = values.targetRole;
      } else if (values.targetType === 'user' && values.targetUserId) {
        payload.targetUserId = values.targetUserId;
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-app-notification`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session?.session?.access_token}`,
          },
          body: JSON.stringify(payload),
        },
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to send broadcast');
      }

      return response.json();
    },
    onSuccess: (data: { count: number }) => {
      toast.success(`Successfully sent broadcast to ${data.count} users!`);
      form.reset();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleSubscribe = async () => {
    try {
      await subscribeAsync();
      toast.success('Successfully subscribed to push notifications!');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to subscribe');
    }
  };

  return (
    <AdminPageShell>
      <AdminPageShell.Header
        title="App Notifications"
        description="Manage push subscriptions and broadcast notifications to users."
      />

      <AdminPageShell.Content>
        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-6">
            <SectionCard
              title="Notification Broadcast"
              subtitle="Send a notification to application users."
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
                      label="Title"
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
                      error={form.formState.errors.message?.message}
                      registration={form.register('message')}
                    />
                  )}
                />

                <FormSelectField
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
                        label="User ID (UUID)"
                        error={form.formState.errors.targetUserId?.message}
                        {...field}
                        value={field.value ?? ''}
                      />
                    )}
                  />
                )}

                <div className="flex justify-end pt-2">
                  <Button type="submit" disabled={broadcastMutation.isPending}>
                    {broadcastMutation.isPending ? 'Sending...' : 'Send Broadcast'}
                  </Button>
                </div>
              </form>
            </SectionCard>
          </div>

          <div className="space-y-6">
            <SectionCard
              title="My Push Subscriptions"
              subtitle="Manage your device's subscription to push notifications."
            >
              <div className="pt-4">
                {!isSupported ? (
                  <p className="text-sm text-muted">
                    Push notifications are not supported by this browser.
                  </p>
                ) : isSubscribed ? (
                  <p className="text-sm font-medium text-emerald-600">
                    This device is subscribed to push notifications.
                  </p>
                ) : (
                  <div className="space-y-4">
                    <p className="text-sm text-muted">
                      Subscribe this device to receive web push notifications when admins broadcast
                      messages.
                    </p>
                    <Button onClick={handleSubscribe} disabled={isPushLoading} variant="outline">
                      {isPushLoading ? 'Subscribing...' : 'Subscribe Device'}
                    </Button>
                  </div>
                )}
              </div>
            </SectionCard>
          </div>
        </div>
      </AdminPageShell.Content>
    </AdminPageShell>
  );
}
