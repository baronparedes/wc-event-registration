import { handleSyncKioskAttendance } from './handler.ts';

Deno.serve((req: Request) => handleSyncKioskAttendance(req));
