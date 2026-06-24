import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/Button'

export function NotFoundPage() {
  const navigate = useNavigate()

  return (
    <section className="mx-auto flex max-w-md flex-col items-center justify-center space-y-4 text-center">
      <div className="text-6xl font-bold text-text">404</div>
      <h1 className="text-2xl font-semibold text-text">Page Not Found</h1>
      <p className="text-sm text-muted">
        The page you're looking for doesn't exist or has been moved.
      </p>
      <div className="flex gap-3 pt-2">
        <Button onClick={() => navigate('/')} variant="default">
          Go Home
        </Button>
        <Button onClick={() => navigate(-1)} variant="outline">
          Go Back
        </Button>
      </div>
    </section>
  )
}
