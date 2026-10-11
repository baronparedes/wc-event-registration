const fs = require('fs');
const path = 'supabase/functions/chat/tools/getServiceAttendanceForecast.ts';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(
  'z.record(z.record(z.number()))',
  'z.record(z.string(), z.record(z.string(), z.number()))',
);

fs.writeFileSync(path, content, 'utf8');
