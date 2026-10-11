const fs = require('fs');
const path = 'supabase/functions/chat/tools/getServiceAttendanceForecast.ts';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(
  'z.record(z.record(z.number()))',
  'z.record(z.string(), z.record(z.string(), z.number()))',
);
content = content.replace("'upcoming_sunday'", "'previous_sunday'");

// Types are missing, we should define them
const types = `
type TimeSlot = '9AM' | '12NN' | '3PM';
type RoleForecast = {
    target: number;
    committed: number;
    excused: number;
    expectedTurnup: number;
};
type SlotForecast = {
    totalTarget: number;
    totalCommitted: number;
    totalExcused: number;
    totalExpectedTurnup: number;
    totalNeeded: number;
    totalSurplus: number;
    roles: Record<string, RoleForecast>;
};
`;

content = content.replace(
  'type SlotRoleTargets = Record<string, number>;',
  types + '\ntype SlotRoleTargets = Record<string, number>;',
);

// Clean up duplicate definitions later in the file
content = content.replace(
  `
        type RoleForecast = {
            target: number;
            committed: number;
            excused: number;
            expectedTurnup: number;
        };

        type SlotForecast = {
            totalTarget: number;
            totalCommitted: number;
            totalExcused: number;
            totalExpectedTurnup: number;
            totalNeeded: number;
            totalSurplus: number;
            roles: Record<string, RoleForecast>;
        };`,
  '',
);

fs.writeFileSync(path, content, 'utf8');
