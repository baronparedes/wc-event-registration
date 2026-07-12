type EventNavigationSection =
  | 'event'
  | 'fields'
  | 'registrations'
  | 'registrations-detail'
  | 'public-registrations'
  | 'public-registrations-detail'
  | 'attendance'
  | 'attendance-check-in'
  | 'attendance-fields'
  | 'attendance-data'
  | 'attendance-unregistered-members';

type EventNavigationLinksProps = {
  eventId: string;
  currentSection: EventNavigationSection;
};

export function EventNavigationLinks({ eventId, currentSection }: EventNavigationLinksProps) {
  void eventId;
  void currentSection;

  return null;
}
