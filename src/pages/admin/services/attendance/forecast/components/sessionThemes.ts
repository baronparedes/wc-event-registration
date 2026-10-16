export interface SessionTheme {
  borderAccent: string;
  badge: string;
  iconBg: string;
  dotColor: string;
  tag: string;
  slotLabel: string;
}

export const FORECAST_CHART_COLORS = {
  scheduled: '#1ca0b3', // Primary
  expected: '#51a29a', // Secondary
  target: '#f5bd5c', // Accent
  danger: '#f2685c', // Danger
} as const;

export function getSessionTheme(slotKey?: string | null): SessionTheme {
  switch (slotKey) {
    case '9AM':
      return {
        borderAccent: 'border-l-primary',
        badge: 'bg-primary/10 text-primary border-primary/30',
        iconBg: 'bg-primary/15 text-primary',
        dotColor: 'bg-primary',
        tag: 'Morning',
        slotLabel: '9 AM',
      };
    case '12NN':
      return {
        borderAccent: 'border-l-secondary',
        badge: 'bg-secondary/15 text-secondary border-secondary/30',
        iconBg: 'bg-secondary/20 text-secondary',
        dotColor: 'bg-secondary',
        tag: 'Midday',
        slotLabel: '12 NN',
      };
    case '3PM':
      return {
        borderAccent: 'border-l-tertiary',
        badge: 'bg-tertiary/10 text-tertiary border-tertiary/30',
        iconBg: 'bg-tertiary/15 text-tertiary',
        dotColor: 'bg-tertiary',
        tag: 'Afternoon',
        slotLabel: '3 PM',
      };
    default:
      return {
        borderAccent: 'border-l-muted',
        badge: 'bg-surface text-muted border-border',
        iconBg: 'bg-surface-hover text-muted',
        dotColor: 'bg-muted',
        tag: 'All Sessions',
        slotLabel: slotKey ?? 'ALL',
      };
  }
}
