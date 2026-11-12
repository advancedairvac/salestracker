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

export default async function SalesRevenuePage({ searchParams }) {
  const params = await searchParams;

  const {
    dateRange,
    totalRevenue,
    teamGoal,
    goalConfiguration,
    revenueData,
    pagination,
  } = await getSalesRevenueData({
    searchParams: params,
  });

  return (
    <div className="space-y-4 sm:space-y-5">
      <Breadcrumbs currentPage="Sales Revenue" />

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

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold text-black">
            Revenue Details
          </h2>

          <span className="text-sm text-[#777]">
            {pagination.totalItems} Jobs
          </span>
        </div>

        <RevenueTable
          sales={revenueData}
          currentPage={pagination.currentPage}
          pageSize={pagination.pageSize}
          totalItems={pagination.totalItems}
        />
      </section>

      <PageTagline>
        Revenue performance based on completed ServiceTitan jobs.
      </PageTagline>
    </div>
  );
}
