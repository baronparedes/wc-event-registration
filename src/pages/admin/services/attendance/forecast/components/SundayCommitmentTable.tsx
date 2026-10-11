import type { SundaySessionForecast } from '../hooks/useAttendanceForecastData';

export type SundayCommitmentTableProps = {
  title: string;
  sessions: SundaySessionForecast[];
  totalTarget: number;
  totalScheduled: number;
  totalConfirmed: number;
  totalOverShort: number;
};

export function SundayCommitmentTable({
  title,
  sessions,
  totalTarget,
  totalScheduled,
  totalConfirmed,
  totalOverShort,
}: SundayCommitmentTableProps) {
  const isTotalNegative = totalOverShort < 0;
  const isTotalPositive = totalOverShort > 0;

  return (
    <div className="w-full overflow-hidden rounded-lg border-2 border-neutral-900 dark:border-neutral-500 bg-white dark:bg-surface shadow-xs">
      {/* Table Banner Title */}
      <div className="border-b-2 border-neutral-900 dark:border-neutral-500 bg-white dark:bg-surface py-2.5 px-4 text-center">
        <h4 className="text-base sm:text-lg font-black tracking-wide text-neutral-900 dark:text-neutral-50 uppercase">
          {title}
        </h4>
      </div>

      {/* Spreadsheet Table */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-neutral-900 dark:border-neutral-500 bg-neutral-50 dark:bg-neutral-800/60 text-xs sm:text-sm font-bold uppercase tracking-wider text-neutral-900 dark:text-neutral-100">
              <th
                scope="col"
                className="border-r border-neutral-300 dark:border-neutral-700 px-4 py-2.5 text-center font-bold"
              >
                SESSION
              </th>
              <th
                scope="col"
                className="border-r border-neutral-300 dark:border-neutral-700 px-4 py-2.5 text-center font-bold"
              >
                TARGET
              </th>
              <th
                scope="col"
                className="border-r border-neutral-300 dark:border-neutral-700 px-4 py-2.5 text-center font-bold"
              >
                SCHEDULED
              </th>
              <th
                scope="col"
                className="border-r border-neutral-300 dark:border-neutral-700 px-4 py-2.5 text-center font-bold"
              >
                CONFIRMED
              </th>
              <th scope="col" className="px-4 py-2.5 text-center font-bold">
                <span className="text-emerald-600 dark:text-emerald-400">Over</span>
                <span className="text-rose-600 dark:text-rose-400">[/Short]</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {sessions.map((session) => {
              const isNegative = session.overShort < 0;
              const isPositive = session.overShort > 0;

              return (
                <tr
                  key={session.slot}
                  className="border-b border-neutral-300 dark:border-neutral-700 text-center font-medium transition-colors hover:bg-neutral-50/80 dark:hover:bg-neutral-800/30"
                >
                  <td className="border-r border-neutral-300 dark:border-neutral-700 px-4 py-3 font-semibold text-neutral-900 dark:text-neutral-100">
                    {session.slot}
                  </td>
                  <td className="border-r border-neutral-300 dark:border-neutral-700 px-4 py-3 text-neutral-800 dark:text-neutral-200 tabular-nums">
                    {session.target}
                  </td>
                  <td className="border-r border-neutral-300 dark:border-neutral-700 px-4 py-3 text-neutral-800 dark:text-neutral-200 tabular-nums">
                    {session.scheduled}
                  </td>
                  <td className="border-r border-neutral-300 dark:border-neutral-700 px-4 py-3 text-neutral-800 dark:text-neutral-200 tabular-nums font-semibold">
                    {session.confirmed}
                  </td>
                  <td
                    className={`px-4 py-3 font-black text-lg sm:text-xl tabular-nums ${
                      isNegative
                        ? 'bg-rose-100/90 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300'
                        : isPositive
                          ? 'bg-emerald-100/90 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                          : 'bg-emerald-50/60 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400'
                    }`}
                  >
                    {isPositive ? `+${session.overShort}` : session.overShort}
                  </td>
                </tr>
              );
            })}

            {/* Total Row */}
            <tr className="border-t-2 border-neutral-900 dark:border-neutral-500 bg-neutral-100/70 dark:bg-neutral-800/70 text-center font-bold">
              <td className="border-r border-neutral-300 dark:border-neutral-700 px-4 py-3 text-neutral-900 dark:text-neutral-100 font-extrabold uppercase">
                TOTAL
              </td>
              <td className="border-r border-neutral-300 dark:border-neutral-700 px-4 py-3 text-neutral-900 dark:text-neutral-100 tabular-nums font-bold">
                {totalTarget}
              </td>
              <td className="border-r border-neutral-300 dark:border-neutral-700 px-4 py-3 text-neutral-900 dark:text-neutral-100 tabular-nums font-bold">
                {totalScheduled}
              </td>
              <td className="border-r border-neutral-300 dark:border-neutral-700 px-4 py-3 text-neutral-900 dark:text-neutral-100 tabular-nums font-bold">
                {totalConfirmed}
              </td>
              <td
                className={`px-4 py-3 font-black text-lg sm:text-xl tabular-nums ${
                  isTotalNegative
                    ? 'bg-rose-100/90 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300'
                    : isTotalPositive
                      ? 'bg-emerald-100/90 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                      : 'bg-emerald-50/60 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400'
                }`}
              >
                {isTotalPositive ? `+${totalOverShort}` : totalOverShort}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
