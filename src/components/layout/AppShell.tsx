import { Outlet } from 'react-router-dom'

export function AppShell() {
  return (
    <div className="min-h-screen bg-background text-text">
      <header className="border-b border-border bg-surface/90 backdrop-blur-sm">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-3">
          <div>
            <p className="font-heading text-lg font-semibold text-text">WC Event Registration</p>
            <p className="text-xs text-muted">{new Date().toDateString()}</p>
          </div>
          <nav className="flex items-center gap-2 text-sm">
            <a className="rounded-md px-3 py-1.5 hover:bg-primary/10" href="/">
              Public Events
            </a>
            <a className="rounded-md px-3 py-1.5 hover:bg-primary/10" href="/admin/events">
              Admin
            </a>
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-4 py-8">
        <Outlet />
      </main>
    </div>
  )
}
