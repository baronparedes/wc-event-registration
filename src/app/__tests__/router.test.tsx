import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, waitFor } from '@testing-library/react';
import { RouterProvider, createMemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import { ROUTE_PATHS } from '@/config/constants';

import { appRoutes } from '../router';

describe('Router Legacy URL Redirects', () => {
  it.each([
    ['/events/excuse-request-2026/register', ROUTE_PATHS.excuseRequest],
    ['/events/excuse-request-2026/register-public', ROUTE_PATHS.excuseRequest],
    ['/events/excuse-request-2026/countdown', ROUTE_PATHS.excuseRequest],
    ['/events/excuse-request-2026', ROUTE_PATHS.excuseRequest],
    ['/events/excuse-request-2026/anything-else', ROUTE_PATHS.excuseRequest],
  ])('redirects %s to %s', async (initialPath, expectedTarget) => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });

    const memoryRouter = createMemoryRouter(appRoutes, {
      initialEntries: [initialPath],
    });

    render(
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={memoryRouter} />
      </QueryClientProvider>,
    );

    await waitFor(() => {
      expect(memoryRouter.state.location.pathname).toBe(expectedTarget);
    });
  });
});
