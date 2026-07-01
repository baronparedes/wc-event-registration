import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'sonner'
import { useIsMobileViewport } from '@/hooks/utils'
import { AppProviders } from './app/providers/AppProviders'
import { AppRouter } from './app/router'
import { ErrorBoundary } from './components/ErrorBoundary'

function App() {
  const isMobileToastLayout = useIsMobileViewport()

  return (
    <ErrorBoundary>
      <AppProviders>
        <BrowserRouter>
          <AppRouter />
          <Toaster
            richColors
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
                closeButton: isMobileToastLayout ? 'h-10 w-10' : 'h-8 w-8',
              },
            }}
          />
        </BrowserRouter>
      </AppProviders>
    </ErrorBoundary>
  )
}

export default App
