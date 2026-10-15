import type { HelperPrompt } from './types';

export const DEFAULT_HELPER_PROMPTS: readonly HelperPrompt[] = [
  {
    id: 'sunday-schedule',
    icon: '📅',
    prompt: 'Who is scheduled to serve this Sunday, and who has filed approved excuses?',
  },
  {
    id: 'turnup-rate',
    icon: '📊',
    prompt:
      "What was our overall turn-up rate and attendance breakdown for last Sunday's services?",
  },
  {
    id: 'unexcused-absences',
    icon: '⚠️',
    prompt: 'Which volunteers had unexcused absences or missed their commitments last weekend?',
  },
  {
    id: 'top-volunteers',
    icon: '🏆',
    prompt: 'Who are our top-performing volunteers based on attendance scores this quarter?',
  },
  {
    id: 'staffing-forecast',
    icon: '👥',
    prompt:
      'Do we have enough volunteers scheduled for next Sunday, or are we facing any role deficits?',
  },
] as const;
