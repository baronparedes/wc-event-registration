import { handleCronProcessPushReminders } from './handler.ts';

Deno.serve((req) => handleCronProcessPushReminders(req));
