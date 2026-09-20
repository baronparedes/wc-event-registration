const fs = require('fs');

let content = fs.readFileSync('src/App.tsx', 'utf8');

// Replace BrowserRouter import with RouterProvider
content = content.replace(
  /import \{ BrowserRouter \} from 'react-router-dom';/,
  `import { RouterProvider } from 'react-router-dom';`,
);

// Replace AppRouter import with appRouter
content = content.replace(
  /import \{ AppRouter \} from '\.\/app\/router';/,
  `import { appRouter } from './app/router';`,
);

// Replace the JSX structure
content = content.replace(
  /<BrowserRouter>\s*<AppRouter \/>\s*<Toaster[\s\S]*?\/>\s*<SpeedInsights \/>\s*<\/BrowserRouter>/,
  `
          <RouterProvider router={appRouter} />
          <Toaster
            richColors
            closeButton
            position={isMobileToastLayout ? 'bottom-center' : 'bottom-right'}
            duration={7000}
            mobileOffset={8}
            toastOptions={{
              style: {
                width: isMobileToastLayout ? 'min(calc(100vw - 0.25rem), 34rem)' : '24rem',
                fontSize: isMobileToastLayout ? '1.1rem' : '0.95rem',
              },
              classNames: {
                toast: isMobileToastLayout
                  ? 'min-h-20 rounded-2xl px-7 py-6 shadow-lg'
                  : 'min-h-16 rounded-2xl px-5 py-4 shadow-lg',
                title: isMobileToastLayout ? 'font-semibold leading-8' : 'font-semibold leading-6',
                description: isMobileToastLayout ? 'leading-7 text-muted' : 'leading-5 text-muted',
                closeButton: isMobileToastLayout
                  ? '!h-10 !w-10 !min-h-0 !min-w-0 !p-0 !rounded-full aspect-square flex items-center justify-center'
                  : '!h-8 !w-8 !min-h-0 !min-w-0 !p-0 !rounded-full aspect-square flex items-center justify-center',
              },
            }}
          />
          <SpeedInsights />
`,
);

fs.writeFileSync('src/App.tsx', content);
