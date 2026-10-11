const fs = require('fs');
const path = 'supabase/functions/chat/tools/getServiceAttendanceForecast.ts';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(
  'targetsOverride: z\n      .record(z.record(z.number()))',
  'targetsOverride: z\n      .record(z.string(), z.record(z.string(), z.number()))',
);

fs.writeFileSync(path, content, 'utf8');
