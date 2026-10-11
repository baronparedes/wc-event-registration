import { FORECAST_ROLE_GROUPS, type ForecastRoleGroup } from '../hooks/useAttendanceForecastData';

export type ForecastRoleGroupSelectorProps = {
  activeGroup: ForecastRoleGroup;
  onChangeGroup: (group: ForecastRoleGroup) => void;
};

export function ForecastRoleGroupSelector({
  activeGroup,
  onChangeGroup,
}: ForecastRoleGroupSelectorProps) {
  return (
    <div className="border-b border-border">
      <div
        className="overflow-x-auto overflow-y-hidden [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden overscroll-x-contain"
        style={{ touchAction: 'pan-x' }}
      >
        <div className="-mb-px flex gap-6 min-w-max">
          {FORECAST_ROLE_GROUPS.map(({ id, label }) => {
            const isActive = activeGroup === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => onChangeGroup(id)}
                className={`whitespace-nowrap border-b-2 px-1 pb-3 text-sm font-medium transition-colors focus:outline-none flex items-center gap-1.5 shrink-0 cursor-pointer ${
                  isActive
                    ? 'border-primary text-primary font-semibold'
                    : 'border-transparent text-muted hover:border-border hover:text-text'
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
