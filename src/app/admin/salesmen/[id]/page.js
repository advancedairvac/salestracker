import { Suspense } from "react";
import { redirect, notFound } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth";

import {
  getSalesRevenueDateRange,
  getSalesRevenueSummaryData,
  getSalesRevenueTableData,
} from "@/lib/dashboard/revenue-data";

import { getPipelineFollowUpsData } from "@/lib/dashboard/pipeline-data";

import RevenueDateFilter from "@/components/dashboard/revenue-date-filter";
import RevenueSummary from "@/components/dashboard/revenue-summary";
import RevenueTable from "@/components/dashboard/revenue-table";
import EstimatesTable from "@/components/dashboard/estimates-table";
import FollowUpsTable from "@/components/dashboard/followUps-table";

import Breadcrumbs from "@/components/ui/breadcrumbs";
import PageTagline from "@/components/ui/page-tagline";

import SummarySkeleton from "@/components/ui/skeleton/summary-skeleton";
import TableSkeleton from "@/components/ui/skeleton/table-skeleton";

export const metadata = {
  title: "Salesman Details",
};

export const dynamic = "force-dynamic";

// ============================================
// SALESMAN REVENUE SUMMARY SECTION
// ============================================

async function SalesmanRevenueSummarySection({ dateRange, salesmanId }) {
  const { totalRevenue, totalCommission, teamGoal, goalConfiguration } =
    await getSalesRevenueSummaryData({
      dateRange,
      salesmanId,
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
// SALESMAN REVENUE TABLE SECTION
// ============================================

async function SalesmanRevenueTableSection({
  dateRange,
  searchParams,
  salesmanId,
}) {
  const { revenueData, pagination } = await getSalesRevenueTableData({
    dateRange,
    searchParams,
    salesmanId,
  });

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-bold uppercase text-[#555]">
          Revenue Details
        </h3>

        <span className="shrink-0 text-xs text-[#777]">
          {pagination.totalItems} {pagination.totalItems === 1 ? "Job" : "Jobs"}
        </span>
      </div>

      <RevenueTable
        sales={revenueData}
        currentPage={pagination.currentPage}
        pageSize={pagination.pageSize}
        totalItems={pagination.totalItems}
        showSalesman={false}
      />
    </section>
  );
}

// ============================================
// SALESMAN FOLLOW-UPS SECTION
// Reuses Pipeline follow-up data
// ============================================

async function SalesmanFollowUpsSection({ salesmanId }) {
  const followUps = await getPipelineFollowUpsData({
    selectedFilter: "ALL",
    salesmanId,
  });

  return (
    <section className="w-full">
      <h2 className="mb-5 px-1 text-sm font-bold uppercase text-black sm:text-base">
        Follow-ups
      </h2>

      <FollowUpsTable followUps={followUps} showSalesman={false} />
    </section>
  );
}

// ============================================
// SECTION DIVIDER
// ============================================

function SectionDivider() {
  return (
    <div className="flex items-center gap-0 pt-2">
      <div className="h-[4px] w-8 rounded-full bg-black" />

      <div className="h-[3px] flex-1 rounded-full bg-[#eeeeee]" />
    </div>
  );
}

// ============================================
// REVENUE TABLE FALLBACK
// ============================================

function RevenueTableFallback() {
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="h-4 w-28 animate-pulse rounded bg-[#eeeeee]" />
      </div>

      <TableSkeleton rows={10} columns={5} />
    </section>
  );
}

// ============================================
// FOLLOW-UPS FALLBACK
// ============================================

function FollowUpsFallback() {
  return (
    <section className="w-full">
      <h2 className="mb-5 px-1 text-sm font-bold uppercase text-black sm:text-base">
        Follow-ups
      </h2>

      <TableSkeleton rows={5} columns={5} />
    </section>
  );
}

// ============================================
// SALESMAN DETAILS PAGE
// ============================================

export default async function SalesmanDetailsPage({ params, searchParams }) {
  // ============================================
  // AUTHENTICATION
  // ============================================

  const user = await getAuthenticatedUser();

  if (!user) {
    redirect("/login");
  }

  if (user.role !== "ADMIN") {
    redirect("/salesperson");
  }

  // ============================================
  // ROUTE & SEARCH PARAMETERS
  // ============================================

  const { id } = await params;
  const query = (await searchParams) || {};

  // ============================================
  // SHARED REVENUE DATE RANGE
  // ============================================

  const dateRange = getSalesRevenueDateRange(query);

  const { preset: selectedPreset, startDate, endDate } = dateRange;

  // ============================================
  // SALESPERSON INFORMATION
  // ============================================

  const salesman = await prisma.user.findFirst({
    where: {
      id,
      role: {
        in: ["ADMIN", "SALESPERSON"],
      },
    },

    select: {
      id: true,
      name: true,
      title: true,
    },
  });

  if (!salesman) {
    notFound();
  }

  // ============================================
  // CLOSE RATE
  // Placeholder until reporting logic is connected
  // ============================================

  const closeRate = 0;

  // ============================================
  // SUSPENSE KEYS
  // ============================================

  const revenueSummaryKey = [
    salesman.id,
    selectedPreset,
    startDate,
    endDate,
  ].join("-");

  const revenueTableKey = [
    salesman.id,
    startDate,
    endDate,
    query.page || "1",
    query.pageSize || "10",
  ].join("-");

  const followUpsKey = salesman.id;

  // ============================================
  // ESTIMATES
  // Temporarily empty until estimate assignment
  // and database schema are implemented.
  // Keep the table connected for future use.
  // ============================================

  const estimates = [];

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
            href: "/admin",
          },
          {
            label: "Dashboard",
            href: "/admin",
          },
        ]}
        currentPage={salesman.name}
      />

      {/* DATE FILTER */}

      <RevenueDateFilter
        value={{
          startDate,
          endDate,
        }}
        preset={selectedPreset}
        basePath={`/admin/salesmen/${salesman.id}`}
      />

      {/* SALESMAN HEADER */}

      <section className="border-b border-[#d9d9d9] pb-5">
        <div className="flex items-start justify-between gap-4 px-1">
          <div>
            <h1 className="text-base font-bold uppercase text-black sm:text-lg">
              {salesman.name}
            </h1>

            <p className="mt-1 text-xs uppercase text-[#777]">
              {salesman.title || "Salesperson"}
            </p>
          </div>

          <div className="shrink-0 text-right">
            <p className="text-lg font-bold text-black">{closeRate}%</p>

            <p className="text-[10px] uppercase text-[#777]">Close Rate</p>
          </div>
        </div>
      </section>

      {/* SALES REVENUE */}

      <section className="space-y-4">
        <h2 className="px-1 text-sm font-bold uppercase text-black sm:text-base">
          Sales Revenue
        </h2>

        {/* REVENUE SUMMARY */}

        <Suspense
          key={revenueSummaryKey}
          fallback={<SummarySkeleton variant="revenue" />}
        >
          <SalesmanRevenueSummarySection
            dateRange={dateRange}
            salesmanId={salesman.id}
          />
        </Suspense>

        {/* REVENUE DETAILS */}

        <Suspense key={revenueTableKey} fallback={<RevenueTableFallback />}>
          <SalesmanRevenueTableSection
            dateRange={dateRange}
            searchParams={query}
            salesmanId={salesman.id}
          />
        </Suspense>
      </section>

      <SectionDivider />

      {/* FOLLOW-UPS */}

      <Suspense key={followUpsKey} fallback={<FollowUpsFallback />}>
        <SalesmanFollowUpsSection salesmanId={salesman.id} />
      </Suspense>

      <SectionDivider />

      {/* ESTIMATES */}

      <section className="space-y-3">
        <h2 className="px-1 text-sm font-bold uppercase text-black sm:text-base">
          Estimates
        </h2>

        <EstimatesTable
          estimates={estimates}
          currentPage={1}
          pageSize={10}
          totalItems={0}
          serverPaginated={false}
        />
      </section>

      <SectionDivider />

      {/* PAGE TAGLINE */}

      <PageTagline>Men produce, boys consume.</PageTagline>
    </div>
  );
}
