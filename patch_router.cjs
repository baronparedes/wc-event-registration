const fs = require('fs');

let content = fs.readFileSync('src/app/router.tsx', 'utf8');

// Replace Routes imports with createBrowserRouter
content = content.replace(
  /import \{\n  Navigate,\n  Outlet,\n  Route,\n  Routes,\n  matchPath,\n  useLocation,\n  useNavigate,\n\} from 'react-router-dom';/,
  `import {\n  Navigate,\n  Outlet,\n  createBrowserRouter,\n  matchPath,\n  useLocation,\n  useNavigate,\n} from 'react-router-dom';`,
);

// We need to rewrite the AppRouter function to export a router object instead
const newAppRouter = `
export const appRouter = createBrowserRouter([
  {
    element: <ResponsiveShellLayout />,
    children: [
      {
        element: <OfflineNavigationGuard />,
        children: APP_ROUTE_DEFINITIONS.filter((route) => route.layout === 'shell').map(
          (route) => ({
            path: route.path,
            element: renderAppRoute(route),
          })
        ),
      },
    ],
  },
  {
    element: <OfflineNavigationGuard />,
    children: APP_ROUTE_DEFINITIONS.filter((route) => route.layout === 'standalone').map(
      (route) => ({
        path: route.path,
        element: renderAppRoute(route),
      })
    ),
  },
  {
    path: ROUTE_PATHS.notFound,
    element: (
      <LazyRoute>
        <NotFoundPage />
      </LazyRoute>
    ),
  },
]);
`;

// Replace the old AppRouter with the new one
content = content.replace(/export function AppRouter\(\) \{[\s\S]*\}\n/g, newAppRouter);

// We need to simplify the RouteLoadingFallback since Data Routers handle transitions mostly automatically,
// but we want to avoid aggressive skeletons. We will return null to prevent layout shifts.
content = content.replace(
  /function RouteLoadingFallback\(\) \{[\s\S]*?return \([\s\S]*?<\/section>\);\n\}/,
  `function RouteLoadingFallback() {\n  return null;\n}`,
);

fs.writeFileSync('src/app/router.tsx', content);
