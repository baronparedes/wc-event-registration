import type { ReactNode } from 'react';
import { createElement } from 'react';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { RenderHookOptions } from '@testing-library/react';
import { renderHook } from '@testing-library/react';

export function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
      mutations: {
        retry: false,
      },
    },
  });
}

export function createTestWrapper(queryClient: QueryClient) {
  return function TestWrapper({ children }: { children: ReactNode }) {
    return createElement(QueryClientProvider, { client: queryClient }, children);
  };
}

export function renderHookWithClient<Result, Props = undefined>(
  render: (initialProps: Props) => Result,
  options?: Omit<RenderHookOptions<Props>, 'wrapper'>,
) {
  const queryClient = createTestQueryClient();
  const wrapper = createTestWrapper(queryClient);

  const hook = renderHook(render, { ...options, wrapper });
  return {
    ...hook,
    queryClient,
  };
}
