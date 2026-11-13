import { Suspense } from "react";

import {
  getSalesRevenueDateRange,
  getSalesRevenueSummaryData,
  getSalesRevenueTableData,
} from "@/lib/dashboard/revenue-data";

import RevenueDateFilter from "@/components/dashboard/revenue-date-filter";
import RevenueSummary from "@/components/dashboard/revenue-summary";
import RevenueTable from "@/components/dashboard/revenue-table";

import Breadcrumbs from "@/components/ui/breadcrumbs";
import PageTagline from "@/components/ui/page-tagline";

import SummarySkeleton from "@/components/ui/skeleton/summary-skeleton";
import TableSkeleton from "@/components/ui/skeleton/table-skeleton";

export const metadata = {
  title: "Sales Revenue",
};

export const dynamic = "force-dynamic";

// ============================================
// REVENUE SUMMARY SECTION
// ============================================

async function RevenueSummarySection({ dateRange }) {
  const { totalRevenue, teamGoal, goalConfiguration } =
    await getSalesRevenueSummaryData({
      dateRange,
    });

  return (
    <RevenueSummary
      revenue={totalRevenue}
      goal={teamGoal}
      goalLabel={goalConfiguration.label}
      commissionRate={0}
    />
  );
}

// ============================================
// REVENUE TABLE SECTION
// ============================================

async function RevenueTableSection({ dateRange, searchParams }) {
  const { revenueData, pagination } = await getSalesRevenueTableData({
    dateRange,
    searchParams,
  });

  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-base font-semibold text-black">Revenue Details</h2>

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
  );
}

// ============================================
// SALES REVENUE PAGE
// ============================================

export default async function SalesRevenuePage({ searchParams }) {
  const params = await searchParams;

  // ------------------------------------------
  // DATE RANGE
  // ------------------------------------------

  const dateRange = getSalesRevenueDateRange(params);

  // ------------------------------------------
  // SUSPENSE KEYS
  // ------------------------------------------

  const summaryKey = [
    dateRange.preset,
    dateRange.startDate,
    dateRange.endDate,
  ].join("-");

  const tableKey = [
    dateRange.startDate,
    dateRange.endDate,
    params.page || "1",
    params.pageSize || "10",
  ].join("-");

  // ------------------------------------------
  // RENDER
  // ------------------------------------------

  return (
    <div className="space-y-4 sm:space-y-5">
      <Breadcrumbs currentPage="Sales Revenue" />

      {/* DATE FILTER - STATIC */}

      <RevenueDateFilter
        value={{
          startDate: dateRange.startDate,
          endDate: dateRange.endDate,
        }}
        preset={dateRange.preset}
      />

      {/* REVENUE SUMMARY */}

      <Suspense key={summaryKey} fallback={<SummarySkeleton variant="revenue" />}>
        <RevenueSummarySection dateRange={dateRange} />
      </Suspense>

      {/* REVENUE TABLE */}

      <Suspense
        key={tableKey}
        fallback={
          <section>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-base font-semibold text-black">
                Revenue Details
              </h2>
            </div>

            <TableSkeleton rows={10} columns={5} />
          </section>
        }
      >
        <RevenueTableSection dateRange={dateRange} searchParams={params} />
      </Suspense>

      <PageTagline>
        Revenue performance based on completed ServiceTitan jobs.
      </PageTagline>
    </div>
  );
}
