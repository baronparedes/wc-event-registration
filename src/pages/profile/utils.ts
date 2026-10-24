export type ProfileTab = 'member_info' | 'events' | 'forms' | 'service_attendance';

export function resolveProfileTab(tabParam: string | null): ProfileTab {
  if (!tabParam) return 'member_info';
  const normalized = tabParam.toLowerCase().trim();
  if (
    normalized === 'commitments' ||
    normalized === 'commitment' ||
    normalized === 'service_attendance' ||
    normalized === 'service-attendance' ||
    normalized === 'services'
  ) {
    return 'service_attendance';
  }
  if (
    normalized === 'events' ||
    normalized === 'event' ||
    normalized === 'history' ||
    normalized === 'event_history' ||
    normalized === 'event-history'
  ) {
    return 'events';
  }
  if (
    normalized === 'forms' ||
    normalized === 'form' ||
    normalized === 'submissions' ||
    normalized === 'form_submissions' ||
    normalized === 'form-submissions'
  ) {
    return 'forms';
  }
  return 'member_info';
}
