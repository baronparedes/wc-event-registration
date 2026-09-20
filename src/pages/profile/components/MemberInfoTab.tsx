import { SectionCard } from '@/components/ui/SectionCard';
import { type AdminMember, formatDateOnly } from '@/lib';

import { SundayAvailabilityDisplay } from './SundayAvailabilityDisplay';

const SUNDAY_KEYS = [
  'first_sunday',
  'second_sunday',
  'third_sunday',
  'fourth_sunday',
  'fifth_sunday',
];

// Helper to convert snake_case to Title Case
function toTitleCase(str: string): string {
  return str
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

interface MemberInfoTabProps {
  member: AdminMember;
}

export function MemberInfoTab({ member }: MemberInfoTabProps) {
  const metadata = member.extra_metadata ?? {};
  // Filter out sunday keys for the general Additional Information section
  const generalMetadataEntries = Object.entries(metadata).filter(
    ([key]) => !SUNDAY_KEYS.includes(key),
  );

  return (
    <div className="space-y-6">
      <SectionCard title="Personal Details">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
          <dl className="grid min-w-0 flex-1 grid-cols-1 gap-x-6 gap-y-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
            {member.email && (
              <div className="min-w-0">
                <dt className="text-muted">Email</dt>
                <dd className="break-all font-medium text-text">{member.email}</dd>
              </div>
            )}
            {member.phone && (
              <div className="min-w-0">
                <dt className="text-muted">Phone</dt>
                <dd className="break-words font-medium text-text">{member.phone}</dd>
              </div>
            )}
            {member.date_of_birth && (
              <div className="min-w-0">
                <dt className="text-muted">Date of Birth</dt>
                <dd className="break-words font-medium text-text">
                  {formatDateOnly(member.date_of_birth)}
                </dd>
              </div>
            )}
          </dl>
        </div>
      </SectionCard>

      <SectionCard title="Sunday Availability">
        <SundayAvailabilityDisplay metadata={metadata} />
      </SectionCard>

      {generalMetadataEntries.length > 0 && (
        <SectionCard title="Additional Information">
          <dl className="grid min-w-0 grid-cols-1 gap-x-6 gap-y-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
            {generalMetadataEntries.map(([key, value]) => (
              <div key={key} className="min-w-0">
                <dt className="text-muted">{toTitleCase(key)}</dt>
                <dd className="break-words font-medium text-text">{value}</dd>
              </div>
            ))}
          </dl>
        </SectionCard>
      )}
    </div>
  );
}
