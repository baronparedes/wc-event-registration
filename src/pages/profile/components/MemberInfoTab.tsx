import { Bell } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/Button';
import { SectionCard } from '@/components/ui/SectionCard';
import { usePushSubscription } from '@/hooks/domain/notifications';
import type { AdminMember } from '@/lib/domain/members';
import { formatDateOnly } from '@/lib/infrastructure';

import { SundayAvailabilityDisplay } from './SundayAvailabilityDisplay';

const PROMOTED_METADATA_FIELDS = [
  { label: 'Civil Status', keys: ['civil_status', 'civilstatus', 'Civil Status'] },
  {
    label: 'DGroup Leader',
    keys: ['dgroup_leader', 'dgroupleader', 'd_group_leader', 'DGroup Leader'],
  },
  {
    label: 'DGroup Status',
    keys: ['dgroup_status', 'dgroupstatus', 'd_group_status', 'DGroup Status'],
  },
  {
    label: 'DGroup Member Since',
    keys: [
      'dgroup_member_since',
      'dgroupmember since',
      'd_group_member_since',
      'DGroup Member Since',
    ],
  },
] as const;

function getMetadataValue(
  metadata: Record<string, string>,
  candidateKeys: readonly string[],
): string | undefined {
  for (const candidate of candidateKeys) {
    if (metadata[candidate] !== undefined && metadata[candidate].trim() !== '') {
      return metadata[candidate];
    }
  }
  const normalizedCandidates = candidateKeys.map((k) => k.toLowerCase().replace(/[\s_-]+/g, ''));
  for (const [key, value] of Object.entries(metadata)) {
    const normalizedKey = key.toLowerCase().replace(/[\s_-]+/g, '');
    if (normalizedCandidates.includes(normalizedKey) && value.trim() !== '') {
      return value;
    }
  }
  return undefined;
}

interface MemberInfoTabProps {
  member: AdminMember;
}

export function MemberInfoTab({ member }: MemberInfoTabProps) {
  const metadata = member.extra_metadata ?? {};
  const push = usePushSubscription();

  const promotedFields = PROMOTED_METADATA_FIELDS.map((field) => ({
    label: field.label,
    value: getMetadataValue(metadata, field.keys),
  }));

  return (
    <div className="space-y-6">
      <SectionCard title="Personal Details">
        <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-base md:grid-cols-4">
          {member.email && (
            <div className="col-span-2 min-w-0 md:col-span-1">
              <dt className="text-muted text-sm">Email</dt>
              <dd className="break-all font-medium text-text">{member.email}</dd>
            </div>
          )}
          {member.phone && (
            <div className="min-w-0">
              <dt className="text-muted text-sm">Phone</dt>
              <dd className="break-words font-medium text-text">{member.phone}</dd>
            </div>
          )}
          {member.date_of_birth && (
            <div className="min-w-0">
              <dt className="text-muted text-sm">Date of Birth</dt>
              <dd className="break-words font-medium text-text">
                {formatDateOnly(member.date_of_birth)}
              </dd>
            </div>
          )}
          {promotedFields.map(
            ({ label, value }) =>
              value && (
                <div key={label} className="min-w-0">
                  <dt className="text-muted text-sm">{label}</dt>
                  <dd className="break-words font-medium text-text">{value}</dd>
                </div>
              ),
          )}
        </dl>
      </SectionCard>

      <SectionCard title="Sunday Availability">
        <SundayAvailabilityDisplay metadata={metadata} />
      </SectionCard>

      {push.isSupported && (
        <SectionCard title="Push Notifications">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Bell className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-medium text-text">Device Notifications</p>
                <p className="text-xs text-muted">
                  {push.isSubscribed
                    ? 'This device is currently registered to receive announcements and updates.'
                    : 'Enable web push to receive event updates and announcements directly on this device.'}
                </p>
              </div>
            </div>

            <Button
              variant={push.isSubscribed ? 'accent' : 'default'}
              onClick={async () => {
                try {
                  if (push.isSubscribed) {
                    await push.unsubscribeAsync();
                    toast.success('Unsubscribed this device from push notifications.');
                  } else {
                    await push.subscribeAsync();
                    toast.success('Successfully subscribed this device to push notifications!');
                  }
                } catch (err) {
                  toast.error(
                    err instanceof Error ? err.message : 'Failed to update push subscription',
                  );
                }
              }}
              disabled={push.isLoading}
            >
              {push.isLoading
                ? 'Updating...'
                : push.isSubscribed
                  ? 'Unsubscribe Device'
                  : 'Subscribe Device'}
            </Button>
          </div>
        </SectionCard>
      )}
    </div>
  );
}
