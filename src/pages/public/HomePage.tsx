import { Link } from 'react-router-dom'

export function HomePage() {
  return (
    <section className="grid gap-6 md:grid-cols-[1.3fr_1fr] md:items-center">
      <div className="space-y-4">
        <p className="inline-flex rounded-full border border-secondary/40 bg-secondary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-secondary">
          Public Registration
        </p>
        <h1 className="font-heading text-4xl font-bold leading-tight text-text md:text-5xl">
          ID-first event registration with scalable admin controls.
        </h1>
        <p className="max-w-xl text-base text-muted md:text-lg">
          This app is scaffolded for a Supabase-powered, metadata-driven registration platform. The
          next chunks will wire database schema, RLS, and dynamic event forms.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <Link
            to="/events/sample-event/register"
            className="rounded-md bg-primary px-4 py-2.5 font-medium text-white transition hover:bg-primary/90"
          >
            Open Sample Event Route
          </Link>
          <Link
            to="/admin/login"
            className="rounded-md border border-border bg-surface px-4 py-2.5 font-medium text-text transition hover:border-primary/40"
          >
            Go To Admin Login
          </Link>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
        <h2 className="font-heading text-xl font-semibold text-text">Chunk 0 Progress</h2>
        <ul className="mt-4 space-y-2 text-sm text-muted">
          <li>React + TypeScript app scaffolded</li>
          <li>Theme A design tokens wired</li>
          <li>Public/admin route skeleton created</li>
          <li>Supabase client scaffold added</li>
        </ul>
      </div>
    </section>
  )
}
