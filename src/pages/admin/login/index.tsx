import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { useAdminAuthQuery, useAdminLoginMutation } from '../../../hooks/admin'

export function AdminLoginPage() {
  const navigate = useNavigate()
  const loginMutation = useAdminLoginMutation()
  const { data: adminAuth, isLoading } = useAdminAuthQuery()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  useEffect(() => {
    if (!isLoading && adminAuth?.isAuthenticated) {
      navigate('/admin/events', { replace: true })
    }
  }, [adminAuth?.isAuthenticated, isLoading, navigate])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    try {
      await loginMutation.mutateAsync({ email, password })
      toast.success('Welcome back. Admin access granted.')
      navigate('/admin/events', { replace: true })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to sign in as admin.'
      toast.error(message)
    }
  }

  return (
    <section className="mx-auto max-w-md rounded-2xl border border-border bg-surface p-6 shadow-sm">
      <h1 className="font-heading text-2xl font-semibold text-text">Admin Login</h1>
      <p className="mt-2 text-sm text-muted">Sign in with your admin credentials.</p>

      <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
        <div className="space-y-1">
          <label className="block text-sm font-medium text-text" htmlFor="admin-email">
            Email Address
          </label>
          <input
            autoComplete="email"
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-text focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
            id="admin-email"
            onChange={(event) => setEmail(event.target.value)}
            placeholder="admin@example.com"
            required
            type="email"
            value={email}
          />
        </div>

        <div className="space-y-1">
          <label className="block text-sm font-medium text-text" htmlFor="admin-password">
            Password
          </label>
          <input
            autoComplete="current-password"
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-text focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
            id="admin-password"
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Enter your password"
            required
            type="password"
            value={password}
          />
        </div>

        <button
          className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-white transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={loginMutation.isPending}
          type="submit"
        >
          {loginMutation.isPending ? 'Signing in...' : 'Sign In'}
        </button>
      </form>
    </section>
  )
}
