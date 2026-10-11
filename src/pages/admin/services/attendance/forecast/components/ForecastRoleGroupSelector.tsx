import { Tabs, TabsList, TabsTrigger } from '@/components/ui';

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
    <Tabs
      value={activeGroup}
      onValueChange={(val) => onChangeGroup(val as ForecastRoleGroup)}
      className="w-full"
    >
      <TabsList containerClassName="justify-start">
        {FORECAST_ROLE_GROUPS.map(({ id, label }) => (
          <TabsTrigger key={id} value={id}>
            {label}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}
