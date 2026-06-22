type AdminEventFormPageProps = {
  mode: "create" | "edit";
};

export function AdminEventFormPage({mode}: AdminEventFormPageProps) {
  const title = mode === "create" ? "Create Event" : "Edit Event";

  return (
    <section className="mx-auto max-w-4xl space-y-4">
      <h1 className="font-heading text-3xl font-bold text-text">{title}</h1>
      <div className="rounded-2xl border border-border bg-surface p-6">
        <p className="text-sm text-muted">
          Event metadata form scaffold. Includes future controls for duplicate policy and
          registration window fields.
        </p>
      </div>
    </section>
  );
}
