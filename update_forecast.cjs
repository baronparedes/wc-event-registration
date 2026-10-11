const fs = require('fs');

const path = 'supabase/functions/chat/tools/getServiceAttendanceForecast.ts';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(
  /\/\/ 1\. Fetch Member Schedules for the date range[\s\S]*?if \(schedulesError\) {[\s\S]*?}/,
  `// 1. Fetch Active Members (where their schedules are stored in metadata)
        const { data: users, error: usersError } = await client
          .from('users')
          .select('id, member_id, role, metadata')
          .eq('is_active', true);

        if (usersError) {
           console.error('[chat:tool:getServiceAttendanceForecast] Users query error', usersError);
           return { error: \`Failed to retrieve users: \${usersError.message}\` };
        }

        // Parse schedules from metadata for the target date range
        // Since we don't know the exact sundays easily, we will generate the sunday keys for the range
        // and match against the users' schedule.
        const SUNDAY_KEYS = ['first_sunday', 'second_sunday', 'third_sunday', 'fourth_sunday', 'fifth_sunday'];

        type MemberSchedule = { user_id: string, member_id: string | null, role: string, service_date: string, time_slots: TimeSlot[] };
        const schedules: MemberSchedule[] = [];

        // Find all sundays in the range
        const sundays: { dateStr: string, key: string }[] = [];
        let currDate = new Date(range.start);

        // Align to start of first month
        let monthIter = currDate.getMonth();
        let yearIter = currDate.getFullYear();
        let sundayIndex = 0;

        const iterLimit = new Date(range.end);

        while (currDate <= iterLimit) {
            if (currDate.getMonth() !== monthIter) {
                monthIter = currDate.getMonth();
                yearIter = currDate.getFullYear();
                sundayIndex = 0;
            }
            if (currDate.getDay() === 0) { // Sunday
                const key = SUNDAY_KEYS[sundayIndex] || 'fifth_sunday';
                sundays.push({ dateStr: formatDate(currDate), key });
                sundayIndex++;
            }
            currDate.setDate(currDate.getDate() + 1);
        }

        for (const user of users) {
             const metadata = (user.metadata as Record<string, unknown>) || {};
             const role = typeof user.role === 'string' ? user.role : '';

             for (const sunday of sundays) {
                  const scheduleStr = metadata[sunday.key];
                  if (typeof scheduleStr === 'string' && scheduleStr.trim().length > 0) {
                      const times = scheduleStr.split(',').map(t => t.trim().toUpperCase().replace(' ', ''));
                      const slots: TimeSlot[] = [];
                      for (const t of times) {
                           if (t === '9AM' || t === '12NN' || t === '3PM') {
                               slots.push(t as TimeSlot);
                           }
                      }
                      if (slots.length > 0) {
                           schedules.push({
                               user_id: user.id,
                               member_id: user.member_id,
                               role,
                               service_date: sunday.dateStr,
                               time_slots: slots
                           });
                      }
                  }
             }
        }`,
);

content = content.replace(
  /const usersArray = Array\.isArray\(schedule\.users\).*;/g,
  `const userRole = schedule.role;`,
);

content = content.replace(/const userRole = usersArray\[0\]\?\.role;/g, ``);

fs.writeFileSync(path, content, 'utf8');
console.log('Successfully updated getServiceAttendanceForecast.ts');
