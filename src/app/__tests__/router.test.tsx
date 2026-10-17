import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, RouterProvider, Routes, createMemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ROUTE_PATHS } from '@/config/constants';
import type { AppRouteDefinition } from '@/config/constants';
import type { AdminRole } from '@/lib/domain/auth';

import {
  LazyRoute,
  OfflineNavigationFallback,
  OfflineNavigationGuard,
  RequireAdminAuth,
  ResponsiveShellLayout,
  RouteLoadingFallback,
  appRoutes,
  isOfflineSupportedPath,
  renderAppRoute,
} from '../router';

vi.mock('@/components/layout', () => ({
  AppShell: () => <div data-testid="app-shell-mock">AppShellContent</div>,
}));
vi.mock('../components/layout', () => ({
  AppShell: () => <div data-testid="app-shell-mock">AppShellContent</div>,
}));
vi.mock('../../components/layout', () => ({
  AppShell: () => <div data-testid="app-shell-mock">AppShellContent</div>,
}));

const mockUseAdminAuthQuery = vi.fn();
vi.mock('@/hooks/domain/auth', () => ({
  useAdminAuthQuery: () => mockUseAdminAuthQuery(),
}));
vi.mock('../hooks/domain/auth', () => ({
  useAdminAuthQuery: () => mockUseAdminAuthQuery(),
}));
vi.mock('../../hooks/domain/auth', () => ({
  useAdminAuthQuery: () => mockUseAdminAuthQuery(),
}));

const mockUseOnlineStatus = vi.fn();
vi.mock('@/hooks/utils', () => ({
  useOnlineStatus: () => mockUseOnlineStatus(),
}));
vi.mock('../hooks/utils', () => ({
  useOnlineStatus: () => mockUseOnlineStatus(),
}));
vi.mock('../../hooks/utils', () => ({
  useOnlineStatus: () => mockUseOnlineStatus(),
}));

describe('src/app/router.tsx', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseOnlineStatus.mockReturnValue(true);
    mockUseAdminAuthQuery.mockReturnValue({
      data: {
        isAuthenticated: true,
        session: { user: { id: 'user-1', email: 'admin@example.com' } },
        adminRole: 'super_admin' as AdminRole,
      },
      isLoading: false,
    });
  });

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

  describe('isOfflineSupportedPath', () => {
    it('returns true for attendance data and check-in routes', () => {
      expect(isOfflineSupportedPath('/admin/events/evt-123/attendance/data')).toBe(true);
      expect(isOfflineSupportedPath('/admin/events/evt-456/attendance/check-in')).toBe(true);
    });

    it('returns false for non-supported paths', () => {
      expect(isOfflineSupportedPath('/')).toBe(false);
      expect(isOfflineSupportedPath('/profile')).toBe(false);
      expect(isOfflineSupportedPath('/admin/members')).toBe(false);
      expect(isOfflineSupportedPath('/admin/events/evt-123/attendance')).toBe(false);
    });
  });

  describe('RouteLoadingFallback & LazyRoute', () => {
    it('renders loading fallback skeleton', () => {
      const { container } = render(<RouteLoadingFallback />);
      expect(container.querySelector('section')).toBeInTheDocument();
    });

    it('renders children wrapped in LazyRoute', () => {
      render(
        <LazyRoute>
          <div data-testid="lazy-child">Resolved Content</div>
        </LazyRoute>,
      );
      expect(screen.getByTestId('lazy-child')).toHaveTextContent('Resolved Content');
    });
  });

  describe('ResponsiveShellLayout', () => {
    it('renders AppShell component', () => {
      render(
        <MemoryRouter>
          <ResponsiveShellLayout />
        </MemoryRouter>,
      );
      expect(screen.getByTestId('app-shell-mock')).toBeInTheDocument();
    });
  });

  describe('OfflineNavigationFallback', () => {
    it('renders offline warning and handles go back click', async () => {
      const user = userEvent.setup();
      const onGoBack = vi.fn();

      render(<OfflineNavigationFallback onGoBack={onGoBack} />);

      expect(screen.getByText('You are offline')).toBeInTheDocument();
      await user.click(screen.getByRole('button', { name: /go back/i }));
      expect(onGoBack).toHaveBeenCalledTimes(1);
    });
  });

  describe('OfflineNavigationGuard', () => {
    it('renders outlet when online', () => {
      mockUseOnlineStatus.mockReturnValue(true);

      render(
        <MemoryRouter initialEntries={['/some-page']}>
          <Routes>
            <Route element={<OfflineNavigationGuard />}>
              <Route path="/some-page" element={<div>Online Content</div>} />
            </Route>
          </Routes>
        </MemoryRouter>,
      );

      expect(screen.getByText('Online Content')).toBeInTheDocument();
    });

    it('renders outlet when offline but on supported path', () => {
      mockUseOnlineStatus.mockReturnValue(false);

      render(
        <MemoryRouter initialEntries={['/admin/events/evt-1/attendance/data']}>
          <Routes>
            <Route element={<OfflineNavigationGuard />}>
              <Route
                path="/admin/events/:id/attendance/data"
                element={<div>Offline Supported Content</div>}
              />
            </Route>
          </Routes>
        </MemoryRouter>,
      );

      expect(screen.getByText('Offline Supported Content')).toBeInTheDocument();
    });

    it('renders offline fallback when offline on unsupported route and navigates back', async () => {
      const user = userEvent.setup();
      mockUseOnlineStatus.mockReturnValue(false);

      render(
        <MemoryRouter initialEntries={['/unsupported-route']}>
          <Routes>
            <Route element={<OfflineNavigationGuard />}>
              <Route path="/unsupported-route" element={<div>Protected Content</div>} />
            </Route>
          </Routes>
        </MemoryRouter>,
      );

      expect(screen.getByText('You are offline')).toBeInTheDocument();
      expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: /go back/i }));
    });

    it('restores last supported path when navigating offline', async () => {
      const user = userEvent.setup();
      let isOnline = true;
      mockUseOnlineStatus.mockImplementation(() => isOnline);

      const router = createMemoryRouter(
        [
          {
            element: <OfflineNavigationGuard />,
            children: [
              {
                path: '/admin/events/:id/attendance/data',
                element: <div>Offline Data Page</div>,
              },
              {
                path: '/unsupported-route',
                element: <div>Unsupported Page</div>,
              },
            ],
          },
        ],
        { initialEntries: ['/admin/events/evt-123/attendance/data'] },
      );

      const { rerender } = render(<RouterProvider router={router} />);
      expect(screen.getByText('Offline Data Page')).toBeInTheDocument();

      // Navigate to unsupported route while going offline
      isOnline = false;
      await act(async () => {
        await router.navigate('/unsupported-route');
      });
      rerender(<RouterProvider router={router} />);

      expect(screen.getByText('You are offline')).toBeInTheDocument();
      await user.click(screen.getByRole('button', { name: /go back/i }));

      // Should return to the cached last supported path
      await waitFor(() => {
        expect(router.state.location.pathname).toBe('/admin/events/evt-123/attendance/data');
      });
    });
  });

  describe('RequireAdminAuth', () => {
    it('bypasses auth check when offline on supported attendance route', () => {
      mockUseOnlineStatus.mockReturnValue(false);
      mockUseAdminAuthQuery.mockReturnValue({
        data: { isAuthenticated: false, session: null },
        isLoading: false,
      });

      render(
        <MemoryRouter initialEntries={['/admin/events/123/attendance/data']}>
          <RequireAdminAuth>
            <div>Offline Allowed Content</div>
          </RequireAdminAuth>
        </MemoryRouter>,
      );

      expect(screen.getByText('Offline Allowed Content')).toBeInTheDocument();
    });

    it('renders null while auth query is loading', () => {
      mockUseAdminAuthQuery.mockReturnValue({
        data: null,
        isLoading: true,
      });

      const { container } = render(
        <MemoryRouter initialEntries={['/admin/events']}>
          <RequireAdminAuth>
            <div>Should Not Render</div>
          </RequireAdminAuth>
        </MemoryRouter>,
      );

      expect(container).toBeEmptyDOMElement();
    });

    it('redirects to login when no session exists', () => {
      mockUseAdminAuthQuery.mockReturnValue({
        data: { isAuthenticated: false, session: null },
        isLoading: false,
      });

      render(
        <MemoryRouter initialEntries={['/admin/events?tab=upcoming#details']}>
          <Routes>
            <Route
              path="/admin/events"
              element={
                <RequireAdminAuth>
                  <div>Admin Events</div>
                </RequireAdminAuth>
              }
            />
            <Route path={ROUTE_PATHS.login} element={<div>Login Page Redirected</div>} />
          </Routes>
        </MemoryRouter>,
      );

      expect(screen.getByText('Login Page Redirected')).toBeInTheDocument();
    });

    it('redirects to home when session exists but isAuthenticated is false', () => {
      mockUseAdminAuthQuery.mockReturnValue({
        data: { isAuthenticated: false, session: { user: { id: 'u1' } } },
        isLoading: false,
      });

      render(
        <MemoryRouter initialEntries={['/admin/events']}>
          <Routes>
            <Route
              path="/admin/events"
              element={
                <RequireAdminAuth>
                  <div>Admin Events</div>
                </RequireAdminAuth>
              }
            />
            <Route path={ROUTE_PATHS.home} element={<div>Home Page Redirected</div>} />
          </Routes>
        </MemoryRouter>,
      );

      expect(screen.getByText('Home Page Redirected')).toBeInTheDocument();
    });

    it('redirects to adminEvents when allowedRoles does not include current role', () => {
      mockUseAdminAuthQuery.mockReturnValue({
        data: {
          isAuthenticated: true,
          session: { user: { id: 'u1' } },
          adminRole: 'kiosk' as AdminRole,
        },
        isLoading: false,
      });

      render(
        <MemoryRouter initialEntries={['/admin/users/roles']}>
          <Routes>
            <Route
              path="/admin/users/roles"
              element={
                <RequireAdminAuth allowedRoles={['super_admin']}>
                  <div>Super Admin Only</div>
                </RequireAdminAuth>
              }
            />
            <Route path={ROUTE_PATHS.adminEvents} element={<div>Admin Events Redirected</div>} />
          </Routes>
        </MemoryRouter>,
      );

      expect(screen.getByText('Admin Events Redirected')).toBeInTheDocument();
    });

    it('renders children when user role matches allowedRoles', () => {
      mockUseAdminAuthQuery.mockReturnValue({
        data: {
          isAuthenticated: true,
          session: { user: { id: 'u1' } },
          adminRole: 'super_admin' as AdminRole,
        },
        isLoading: false,
      });

      render(
        <MemoryRouter initialEntries={['/admin/users/roles']}>
          <RequireAdminAuth allowedRoles={['super_admin']}>
            <div>Super Admin Granted</div>
          </RequireAdminAuth>
        </MemoryRouter>,
      );

      expect(screen.getByText('Super Admin Granted')).toBeInTheDocument();
    });

    it('redirects to home when requiredPermission is not granted', () => {
      mockUseAdminAuthQuery.mockReturnValue({
        data: {
          isAuthenticated: true,
          session: { user: { id: 'u1' } },
          adminRole: 'kiosk' as AdminRole,
        },
        isLoading: false,
      });

      render(
        <MemoryRouter initialEntries={['/admin/settings/roles']}>
          <Routes>
            <Route
              path="/admin/settings/roles"
              element={
                <RequireAdminAuth requiredPermission="canManageAdminRoles">
                  <div>Roles Management</div>
                </RequireAdminAuth>
              }
            />
            <Route path={ROUTE_PATHS.home} element={<div>Home Redirected</div>} />
          </Routes>
        </MemoryRouter>,
      );

      expect(screen.getByText('Home Redirected')).toBeInTheDocument();
    });

    it('renders children when requiredPermission is granted', () => {
      mockUseAdminAuthQuery.mockReturnValue({
        data: {
          isAuthenticated: true,
          session: { user: { id: 'u1' } },
          adminRole: 'admin' as AdminRole,
        },
        isLoading: false,
      });

      render(
        <MemoryRouter initialEntries={['/admin/members']}>
          <RequireAdminAuth requiredPermission="canReadAdminMemberData">
            <div>Member Data Access Granted</div>
          </RequireAdminAuth>
        </MemoryRouter>,
      );

      expect(screen.getByText('Member Data Access Granted')).toBeInTheDocument();
    });

    it('uses default canReadAdminData permission check when neither allowedRoles nor requiredPermission is provided', () => {
      mockUseAdminAuthQuery.mockReturnValue({
        data: {
          isAuthenticated: true,
          session: { user: { id: 'u1' } },
          adminRole: 'slod' as AdminRole,
        },
        isLoading: false,
      });

      render(
        <MemoryRouter initialEntries={['/admin/events']}>
          <RequireAdminAuth>
            <div>General Admin Data Granted</div>
          </RequireAdminAuth>
        </MemoryRouter>,
      );

      expect(screen.getByText('General Admin Data Granted')).toBeInTheDocument();
    });
  });

  describe('renderAppRoute', () => {
    it('renders public route without auth guard', () => {
      const publicDef: AppRouteDefinition = {
        key: 'home',
        path: '/',
        layout: 'shell',
        requiresAuth: false,
      };

      const element = renderAppRoute(publicDef);
      render(<MemoryRouter>{element}</MemoryRouter>);
      // Public route renders without redirecting to login
      expect(screen.queryByText('Login Page Redirected')).not.toBeInTheDocument();
    });

    it('wraps protected route with auth guard', () => {
      mockUseAdminAuthQuery.mockReturnValue({
        data: { isAuthenticated: false, session: null },
        isLoading: false,
      });

      const protectedDef: AppRouteDefinition = {
        key: 'adminEvents',
        path: '/admin/events',
        layout: 'shell',
        requiresAuth: true,
      };

      const element = renderAppRoute(protectedDef);
      render(
        <MemoryRouter initialEntries={['/admin/events']}>
          <Routes>
            <Route path="/admin/events" element={element} />
            <Route path={ROUTE_PATHS.login} element={<div>Login Page Redirected</div>} />
          </Routes>
        </MemoryRouter>,
      );

      expect(screen.getByText('Login Page Redirected')).toBeInTheDocument();
    });
  });
});
