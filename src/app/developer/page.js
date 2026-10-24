
import StatCard from "@/components/dashboard/stat-card";

export const metadata = {
  title: "Developer Dashboard",
};

const checks = [
  {
    name: "Application",
    description: "Application monitoring endpoint not configured",
    status: "Not verified",
  },
  {
    name: "PostgreSQL",
    description: "Database health check not configured",
    status: "Not verified",
  },
  {
    name: "QuickBooks",
    description: "Integration health check not configured",
    status: "Not verified",
  },
];

export default function DeveloperDashboardPage() {
  return (
    <div className="space-y-6">
      <section>
        <p className="text-sm font-medium text-[#0690c8]">
          SYSTEM MONITORING
        </p>
        <h2 className="mt-2 text-2xl font-semibold text-[#0d0d0d]">
          Developer Workspace
        </h2>
        <p className="mt-2 text-sm text-gray-500">
          Review application diagnostics, integration status, and project issues.
        </p>
      </section>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard
          title="Environment"
          value="Development"
          detail="Current UI mode"
          symbol="E"
        />
        <StatCard
          title="Health Checks"
          value="Pending"
          detail="Monitoring endpoint required"
          symbol="H"
        />
        <StatCard
          title="Integrations"
          value="Unverified"
          detail="Live status not yet loaded"
          symbol="I"
        />
      </div>

      <section className="rounded-2xl border border-black/[0.08] bg-white p-5 shadow-sm sm:p-6">
        <h3 className="font-semibold text-[#0d0d0d]">
          System diagnostics
        </h3>
        <p className="mt-1 text-sm text-gray-500">
          These checks are placeholders until live monitoring is implemented.
        </p>

        <div className="mt-5 divide-y divide-black/[0.06]">
          {checks.map((check) => (
            <div
              key={check.name}
              className="flex flex-wrap items-center justify-between gap-3 py-4 first:pt-0 last:pb-0"
            >
              <div>
                <p className="font-medium text-[#0d0d0d]">{check.name}</p>
                <p className="mt-1 text-sm text-gray-500">
                  {check.description}
                </p>
              </div>
              <span className="rounded-full bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-800">
                {check.status}
              </span>
            </div>
          ))}
        </div>

        <a
          href="https://github.com/advancedairvac/salestracker/issues"
          target="_blank"
          rel="noreferrer"
          className="mt-6 inline-flex items-center gap-2 rounded-lg bg-[#0d0d0d] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#262626]"
        >
          View GitHub Issues <span aria-hidden="true">↗</span>
        </a>
      </section>

      <section className="rounded-2xl border border-black/[0.08] bg-white p-5 shadow-sm">
        <h3 className="font-semibold text-[#0d0d0d]">Developer notes</h3>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6 text-gray-600">
          <li>Do not expose API secrets, access tokens, or database credentials in the browser.</li>
          <li>Restrict diagnostic endpoints to authorized developers.</li>
          <li>Configure server-side health checks before relying on status indicators.</li>
        </ul>
      </section>
    </div>
  );
}
