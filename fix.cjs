const fs = require('fs');
const path = 'supabase/functions/chat/tools/getServiceAttendanceForecast.ts';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(
  '}` };\n        }\n\n        // 2. Fetch Excused Members for the months covered by the date range',
  '}\n\n        // 2. Fetch Excused Members for the months covered by the date range',
);

fs.writeFileSync(path, content, 'utf8');
