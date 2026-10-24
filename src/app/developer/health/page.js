
export const metadata = {
  title: "System Health",
};

const checks = [
  { name: "Application", status: "Not verified" },
  { name: "Database", status: "Not verified" },
  { name: "QuickBooks", status: "Not verified" },
];

export default function HealthPage() {
  return (
    <div className="space-y-6">
      <section>
        <h2 className="text-2xl font-semibold">System Health</h2>
        <p className="mt-2 text-sm text-gray-500">
          Review application and service health indicators.
        </p>
      </section>

      <section className="rounded-xl border border-black/10 bg-white p-5">
        <h3 className="font-semibold">Health Checks</h3>
        <div className="mt-4 divide-y divide-black/10">
          {checks.map((check) => (
            <div key={check.name} className="flex items-center justify-between gap-4 py-4 first:pt-0 last:pb-0">
              <span className="text-sm font-medium">{check.name}</span>
              <span className="rounded-full bg-amber-50 px-3 py-1 text-xs text-amber-800">
                {check.status}
              </span>
            </div>
          ))}
        </div>
        <p className="mt-4 text-xs text-gray-400">
          Live health checks have not been configured.
        </p>
      </section>
    </div>
  );
}
