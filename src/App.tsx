import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'sonner'
import { AppProviders } from './app/providers/AppProviders'
import { AppRouter } from './app/router'
import { ErrorBoundary } from './components/ErrorBoundary'

function App() {
  return (
    <ErrorBoundary>
      <AppProviders>
        <BrowserRouter>
          <AppRouter />
          <Toaster richColors position="top-right" />
        </BrowserRouter>
      </AppProviders>
    </ErrorBoundary>
  )
}

export default App
