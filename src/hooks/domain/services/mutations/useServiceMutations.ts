import { useMutation, useQueryClient } from '@tanstack/react-query';

import {
  createServiceLayout,
  createServiceSeat,
  deleteServiceAttendance,
  deleteServiceSeat,
  recordServiceAttendance,
  updateServiceAttendance,
  updateServiceLayout,
  updateServiceSeat,
} from '@/lib/infrastructure/servicesData';

import {
  ACTIVE_SERVICE_LAYOUT_QUERY_KEY,
  SERVICE_LAYOUTS_QUERY_KEY,
} from '../queries/useServiceLayoutsQuery';

export function useCreateServiceLayoutMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createServiceLayout,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SERVICE_LAYOUTS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ACTIVE_SERVICE_LAYOUT_QUERY_KEY });
    },
  });
}

export function useUpdateServiceLayoutMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Parameters<typeof updateServiceLayout>[1] }) =>
      updateServiceLayout(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SERVICE_LAYOUTS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ACTIVE_SERVICE_LAYOUT_QUERY_KEY });
    },
  });
}

export function useCreateServiceSeatMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createServiceSeat,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['service-seats', variables.layout_id] });
    },
  });
}

export function useUpdateServiceSeatMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Parameters<typeof updateServiceSeat>[1] }) =>
      updateServiceSeat(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-seats'] });
    },
  });
}

export function useDeleteServiceSeatMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteServiceSeat,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-seats'] });
    },
  });
}

export function useRecordServiceAttendanceMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: recordServiceAttendance,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-attendance'] });
    },
  });
}

export function useUpdateServiceAttendanceMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      input,
    }: {
      id: string;
      input: Parameters<typeof updateServiceAttendance>[1];
    }) => updateServiceAttendance(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-attendance'] });
    },
  });
}

export function useDeleteServiceAttendanceMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteServiceAttendance,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-attendance'] });
    },
  });
}
