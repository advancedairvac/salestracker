
import { Suspense } from "react";
import { redirect } from "next/navigation";

import { getAuthenticatedUser } from "@/lib/auth";

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
// Company-Wide Revenue Data
// ============================================

async function RevenueSummarySection({ dateRange }) {
  const {
    totalRevenue,
    totalCommission,
    teamGoal,
    goalConfiguration,
  } = await getSalesRevenueSummaryData({
    dateRange,
  });

  return (
    <RevenueSummary
      revenue={totalRevenue}
      goal={teamGoal}
      goalLabel={goalConfiguration.label}
      commissionAmount={totalCommission}
    />
  );
}

// ============================================
// REVENUE TABLE SECTION
// Company-Wide Revenue Data
// ============================================

async function RevenueTableSection({
  dateRange,
  searchParams,
}) {
  const { revenueData, pagination } =
    await getSalesRevenueTableData({
      dateRange,
      searchParams,
    });

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-bold uppercase tracking-wide text-[#555]">
          Revenue Details
        </h2>

        <span className="shrink-0 text-xs text-[#777]">
          {pagination.totalItems}{" "}
          {pagination.totalItems === 1 ? "Job" : "Jobs"}
        </span>
      </div>

      <RevenueTable
        sales={revenueData}
        currentPage={pagination.currentPage}
        pageSize={pagination.pageSize}
        totalItems={pagination.totalItems}
        currency="$"
        showSalesman={true}
      />
    </section>
  );
}

// ============================================
// SALESPERSON SALES REVENUE PAGE
// ============================================

export default async function SalesRevenuePage({
  searchParams,
}) {
  // ============================================
  // AUTHENTICATION & ROLE VALIDATION
  // ============================================

  const user = await getAuthenticatedUser();

  if (!user) {
    redirect("/login");
  }

  if (user.role === "ADMIN") {
    redirect("/admin/sales-revenue");
  }

  if (user.role !== "SALESPERSON") {
    redirect("/login");
  }

  // ============================================
  // SEARCH PARAMS & DATE RANGE
  // ============================================

  const params = (await searchParams) || {};

  const dateRange = getSalesRevenueDateRange(params);

  // ============================================
  // SUSPENSE KEYS
  // ============================================

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

  // ============================================
  // RENDER
  // ============================================

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* BREADCRUMBS */}

      <Breadcrumbs
        items={[
          {
            label: "Sales Tracker",
            href: "/salesperson",
          },
        ]}
        currentPage="Sales Revenue"
      />

      {/* DATE FILTER */}

      <RevenueDateFilter
        value={{
          startDate: dateRange.startDate,
          endDate: dateRange.endDate,
        }}
        preset={dateRange.preset}
        basePath="/salesperson/sales-revenue"
      />

      {/* REVENUE SUMMARY */}

      <Suspense
        key={summaryKey}
        fallback={<SummarySkeleton variant="revenue" />}
      >
        <RevenueSummarySection dateRange={dateRange} />
      </Suspense>

      {/* REVENUE TABLE */}

      <Suspense
        key={tableKey}
        fallback={
          <section className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-sm font-bold uppercase tracking-wide text-[#555]">
                Revenue Details
              </h2>
            </div>

            <TableSkeleton rows={10} columns={6} />
          </section>
        }
      >
        <RevenueTableSection
          dateRange={dateRange}
          searchParams={params}
        />
      </Suspense>

      {/* PAGE TAGLINE */}

      <PageTagline>
        There's many witty men whose brains can't fill their bellies. 
      </PageTagline>
    </div>
  );
}
