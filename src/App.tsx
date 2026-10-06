import { SpeedInsights } from '@vercel/speed-insights/react';
import { RouterProvider } from 'react-router-dom';
import { Toaster } from 'sonner';

import '@/components/ui/NotificationPromptToast';
import { useIsMobileViewport } from '@/hooks/utils';

import './App.css';
import { AppProviders } from './app/providers/AppProviders';
import { appRouter } from './app/router';
import { ErrorBoundary } from './components/ErrorBoundary';

function App() {
  const isMobileToastLayout = useIsMobileViewport();

  return (
    <ErrorBoundary>
      <AppProviders>
        <RouterProvider router={appRouter} />
        <Toaster
          closeButton={false}
          position={isMobileToastLayout ? 'bottom-center' : 'bottom-right'}
          duration={5000}
          visibleToasts={4}
          expand={false}
          offset={isMobileToastLayout ? 16 : 24}
          gap={12}
          toastOptions={{
            style: {
              width: isMobileToastLayout ? 'min(calc(100vw - 2rem), 28rem)' : '24rem',
            },
          }}
        />
        <SpeedInsights />
      </AppProviders>
    </ErrorBoundary>
  );
}

export default App;
