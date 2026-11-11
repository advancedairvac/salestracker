import { getSalesRevenueData } from "@/lib/dashboard/revenue-data";

import RevenueDateFilter from "@/components/dashboard/revenue-date-filter";
import RevenueSummary from "@/components/dashboard/revenue-summary";
import RevenueTable from "@/components/dashboard/revenue-table";

import Breadcrumbs from "@/components/ui/breadcrumbs";
import PageTagline from "@/components/ui/page-tagline";

export const metadata = {
  title: "Sales Revenue",
};

export const dynamic = "force-dynamic";

// ============================================
// SALES REVENUE PAGE
// ============================================

export default async function SalesRevenuePage({ searchParams }) {
  const params = await searchParams;

  // ============================================
  // FETCH SHARED REVENUE DATA
  // ============================================

  const { dateRange, totalRevenue, teamGoal, goalConfiguration, revenueData } =
    await getSalesRevenueData({
      searchParams: params,
    });

  // ============================================
  // RENDER
  // ============================================

  return (
    <div className="space-y-4 sm:space-y-5">
      <Breadcrumbs
        items={[
          {
            label: "Sales Tracker",
            href: "/admin",
          },
        ]}
        currentPage="Sales Revenue"
      />

      <RevenueDateFilter
        value={{
          startDate: dateRange.startDate,
          endDate: dateRange.endDate,
        }}
        preset={dateRange.preset}
      />

      <RevenueSummary
        revenue={totalRevenue}
        goal={teamGoal}
        goalLabel={goalConfiguration.label}
        commissionRate={0}
      />

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-bold uppercase tracking-wide text-[#555]">
            Revenue Details
          </h2>

          <span className="shrink-0 text-xs text-[#777]">
            {revenueData.length} {revenueData.length === 1 ? "Job" : "Jobs"}
          </span>
        </div>

        <RevenueTable sales={revenueData} />
      </section>

      <PageTagline>
        Success is the sum of small efforts, repeated day in and day out.
      </PageTagline>
    </div>
  );
}
