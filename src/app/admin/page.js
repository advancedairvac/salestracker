
import StatCard from "@/components/dashboard/stat-card";
import RevenueOverview from "@/components/dashboard/revenue-overview";
import RecentActivities from "@/components/dashboard/recent-activities";

export const metadata = {
  title: "Admin Dashboard",
};

export default function AdminDashboardPage() {
  return (
    <div className="space-y-6">
      <section>
        <p className="text-sm font-medium text-[#0690c8]">
          BUSINESS OVERVIEW
        </p>
        <h2 className="mt-2 text-2xl font-semibold text-[#0d0d0d]">
          Welcome to your dashboard
        </h2>
        <p className="mt-2 text-sm text-gray-500">
          Monitor sales activity, team performance, and business operations.
        </p>
      </section>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Total Leads" value="128" detail="Demo records" symbol="L" />
        <StatCard title="Open Opportunities" value="34" detail="Across the pipeline" symbol="O" />
        <StatCard title="Open Quotes" value="19" detail="Awaiting a response" symbol="Q" />
        <StatCard title="Closed Sales" value="42" detail="Demo records" symbol="S" />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <RevenueOverview />
        <RecentActivities />
      </div>

      <section className="rounded-2xl border border-[#0690c8]/20 bg-[#e7f6fc] p-5">
        <h3 className="font-semibold text-[#0d0d0d]">
          Admin workspace
        </h3>
        <p className="mt-2 text-sm leading-6 text-gray-700">
          Use the sidebar to review team members, finance, reports, users, and
          application settings. All figures currently shown are illustrative demo data.
        </p>
      </section>
    </div>
  );
}
