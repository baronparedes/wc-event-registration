export type WeekRange = {
  weekNumber: number;
  startDate: Date;
  endDate: Date;
  days: Date[];
};

export function getMonthWeekRanges(year: number, monthIndex: number): WeekRange[] {
  const firstDay = new Date(year, monthIndex, 1);
  const lastDay = new Date(year, monthIndex + 1, 0);

  const startDayOfWeek = firstDay.getDay();
  const diffToMonday = startDayOfWeek === 0 ? 6 : startDayOfWeek - 1;
  const firstMonday = new Date(year, monthIndex, 1 - diffToMonday);

  const lastDayOfWeek = lastDay.getDay();
  const diffToSunday = lastDayOfWeek === 0 ? 0 : 7 - lastDayOfWeek;
  const lastSunday = new Date(
    lastDay.getFullYear(),
    lastDay.getMonth(),
    lastDay.getDate() + diffToSunday,
  );

  const weeks: WeekRange[] = [];
  let currMonday = new Date(firstMonday);
  let weekIndex = 1;

  while (currMonday <= lastSunday) {
    const days: Date[] = [];
    for (let i = 0; i < 7; i++) {
      days.push(
        new Date(currMonday.getFullYear(), currMonday.getMonth(), currMonday.getDate() + i),
      );
    }
    weeks.push({
      weekNumber: weekIndex,
      startDate: new Date(currMonday),
      endDate: new Date(days[6]),
      days,
    });
    currMonday = new Date(
      currMonday.getFullYear(),
      currMonday.getMonth(),
      currMonday.getDate() + 7,
    );
    weekIndex++;
  }

  return weeks;
}
