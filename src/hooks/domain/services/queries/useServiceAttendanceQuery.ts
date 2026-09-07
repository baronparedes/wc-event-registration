import { useQuery } from '@tanstack/react-query';

import {
  type FetchServiceAttendanceFilters,
  fetchServiceAttendance,
} from '@/lib/infrastructure/servicesData';

export const serviceAttendanceQueryKey = (filters: FetchServiceAttendanceFilters) =>
  ['service-attendance', filters] as const;

export function useServiceAttendanceQuery(filters: FetchServiceAttendanceFilters = {}) {
  return useQuery({
    queryKey: serviceAttendanceQueryKey(filters),
    queryFn: () => fetchServiceAttendance(filters),
  });
}
