import type { ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook } from '@testing-library/react'
import { createElement } from 'react'

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
  })
}

export function createTestWrapper(queryClient: QueryClient) {
  return function TestWrapper({ children }: { children: ReactNode }) {
    return createElement(QueryClientProvider, { client: queryClient }, children)
  }
}

export function renderHookWithClient<Result>(callback: () => Result) {
  const queryClient = createTestQueryClient()
  const wrapper = createTestWrapper(queryClient)

  const hook = renderHook(callback, { wrapper })
  return {
    ...hook,
    queryClient,
  }
}
