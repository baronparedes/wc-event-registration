import { BrowserRouter } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { Toaster } from 'sonner'
import type { ToasterProps } from 'sonner'
import { AppProviders } from './app/providers/AppProviders'
import { AppRouter } from './app/router'
import { ErrorBoundary } from './components/ErrorBoundary'

function App() {
  const [toastPosition, setToastPosition] = useState<ToasterProps['position']>(() =>
    window.matchMedia('(max-width: 640px)').matches ? 'bottom-center' : 'bottom-right',
  )

  useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 640px)')

    const updatePosition = () => {
      setToastPosition(mediaQuery.matches ? 'bottom-center' : 'bottom-right')
    }

    mediaQuery.addEventListener('change', updatePosition)

    return () => {
      mediaQuery.removeEventListener('change', updatePosition)
    }
  }, [])

  return (
    <ErrorBoundary>
      <AppProviders>
        <BrowserRouter>
          <AppRouter />
          <Toaster richColors position={toastPosition} />
        </BrowserRouter>
      </AppProviders>
    </ErrorBoundary>
  )
}

export default App
