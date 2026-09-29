export type ProfileTab = 'member_info' | 'events' | 'service_attendance';

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
  return 'member_info';
}
