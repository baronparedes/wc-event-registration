import {useParams} from "react-router-dom";

export function EventRegistrationPage() {
  const {slug} = useParams();

  return (
    <section className="mx-auto max-w-3xl space-y-6">
      <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wide text-secondary">
          Step 1 Required
        </p>
        <h1 className="mt-2 font-heading text-3xl font-bold text-text">
          Event Registration
        </h1>
        <p className="mt-2 text-sm text-muted">
          Event slug: <span className="font-mono text-text">{slug}</span>
        </p>
      </div>

      <div className="rounded-2xl border border-dashed border-primary/35 bg-primary/5 p-6">
        <h2 className="font-heading text-xl font-semibold text-text">
          ID Lookup Gate (coming in Chunk 3)
        </h2>
        <p className="mt-2 text-sm text-muted">
          This route is ready for the mandatory ID-first flow. In the next implementation
          chunk, we will block all form fields until a valid ID match is returned from
          Supabase.
        </p>
      </div>
    </section>
  );
}
