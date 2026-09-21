import { SectionCard } from '@/components/ui/SectionCard';
import { type AdminMember, formatDateOnly } from '@/lib';

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
    </div>
  );
}
