const fs = require('fs');
const path = 'supabase/functions/chat/tools/getServiceAttendanceForecast.ts';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(
  'const startStr = formatDate(range.start);\n      const endStr = formatDate(range.end);',
  '',
);
content = content.replace(
  'let currDate = new Date(range.start);',
  'const currDate = new Date(range.start);',
);
content = content.replace('let yearIter = currDate.getFullYear();', '');
content = content.replace('yearIter = currDate.getFullYear();', '');

fs.writeFileSync(path, content, 'utf8');
