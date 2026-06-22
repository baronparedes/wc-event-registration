export function AdminLoginPage() {
  return (
    <section className="mx-auto max-w-md rounded-2xl border border-border bg-surface p-6 shadow-sm">
      <h1 className="font-heading text-2xl font-semibold text-text">Admin Login</h1>
      <p className="mt-2 text-sm text-muted">
        Supabase auth wiring starts in a later chunk. This route is now reserved and styled.
      </p>
      <div className="mt-5 rounded-md border border-secondary/30 bg-secondary/10 p-3 text-sm text-secondary">
        Learning note: admin routes are protected by authenticated session checks + RLS, not just UI
        guards.
      </div>
    </section>
  )
}
