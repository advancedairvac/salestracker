
export const metadata = {
  title: "Integrations",
};

export default function IntegrationsPage() {
  return (
    <div className="space-y-6">
      <section>
        <h2 className="text-2xl font-semibold">Integrations</h2>
        <p className="mt-2 text-sm text-gray-500">
          Review external services connected to the application.
        </p>
      </section>

      <section className="rounded-xl border border-black/10 bg-white p-5">
        <h3 className="font-semibold">QuickBooks</h3>
        <p className="mt-2 text-sm text-gray-500">
          QuickBooks sandbox connection is configured separately. This page
          does not test or change the existing connection.
        </p>
        <a
          href="/api/quickbooks/connect"
          className="mt-4 inline-block rounded-lg bg-[#0d0d0d] px-4 py-2.5 text-sm text-white"
        >
          Open QuickBooks Connection
        </a>
      </section>

      <section className="rounded-xl border border-black/10 bg-white p-5">
        <h3 className="font-semibold">Database</h3>
        <p className="mt-2 text-sm text-gray-500">
          PostgreSQL connection monitoring and diagnostic status will be
          implemented later.
        </p>
        <span className="mt-3 inline-block rounded-full bg-amber-50 px-3 py-1 text-xs text-amber-800">
          Monitoring not configured
        </span>
      </section>
    </div>
  );
}
