
import { Suspense } from "react";

import { getSalesConfigurationData } from "@/lib/dashboard/sales-configuration-data";
import JobCardsList from "@/components/settings/sales-configuration/job-cards-list";
import Breadcrumbs from "@/components/ui/breadcrumbs";

export const dynamic = "force-dynamic";

// ============================================
// JOB CARD SKELETON
// ============================================

function JobCardSkeleton() {
  return (
    <div className="animate-pulse border border-[#d5d5d5] bg-white p-4 sm:p-[18px]">
      {/* Header */}
      <div className="space-y-3">
        <div className="h-4 w-3/4 rounded bg-[#e5e5e5]" />
        <div className="h-3 w-1/2 rounded bg-[#eeeeee]" />
      </div>

      {/* Job Value */}
      <div className="mt-5 space-y-2">
        <div className="h-2.5 w-28 rounded bg-[#e5e5e5]" />
        <div className="h-7 w-24 rounded bg-[#eeeeee]" />
      </div>

      {/* Information */}
      <div className="mt-4 grid grid-cols-2 gap-4 border-t border-[#ededed] pt-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="space-y-2">
            <div className="h-2.5 w-16 rounded bg-[#e5e5e5]" />
            <div className="h-3.5 w-24 rounded bg-[#eeeeee]" />
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="mt-4 flex items-center justify-between border-t border-[#ededed] pt-3">
        <div className="h-3 w-28 rounded bg-[#e5e5e5]" />
        <div className="h-4 w-4 rounded bg-[#eeeeee]" />
      </div>
    </div>
  );
}

// ============================================
// JOB CARDS SKELETON
// ============================================

function JobCardsSkeleton() {
  return (
    <section className="space-y-5">
      {/* Tabs Skeleton */}
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: 5 }).map((_, index) => (
          <div
            key={index}
            className="h-9 w-28 animate-pulse border border-[#e5e5e5] bg-[#f5f5f5]"
          />
        ))}
      </div>

      {/* Section Header */}
      <div className="flex items-center justify-between">
        <div className="h-4 w-28 animate-pulse rounded bg-[#e5e5e5]" />
        <div className="h-3 w-16 animate-pulse rounded bg-[#eeeeee]" />
      </div>

      {/* Job Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 9 }).map((_, index) => (
          <JobCardSkeleton key={index} />
        ))}
      </div>
    </section>
  );
}

// ============================================
// SALES CONFIGURATION DATA SECTION
// ============================================

async function SalesConfigurationSection({ searchParams }) {
  try {
    const { jobs, salesmen, activeTab, tabCounts, pagination } =
      await getSalesConfigurationData(searchParams);

    return (
      <section className="space-y-5">
        {/* Job Cards */}
        {jobs.length > 0 ? (
          <JobCardsList
            jobs={jobs}
            salesmen={salesmen}
            activeTab={activeTab}
            tabCounts={tabCounts}
            currentPage={pagination.currentPage}
            pageSize={pagination.pageSize}
            totalItems={pagination.totalItems}
          />
        ) : (
          <div className="border border-[#d5d5d5] bg-white px-5 py-12 text-center">
            <h2 className="text-[15px] font-bold text-[#171717]">
              No Jobs Found
            </h2>

            <p className="mt-2 text-[13px] text-[#737373]">
              No ServiceTitan Jobs are currently available.
            </p>
          </div>
        )}
      </section>
    );
  } catch (error) {
    console.error("Sales Configuration Page Error:", error);

    return (
      <div className="border border-red-200 bg-red-50 p-4 text-[13px] text-red-700">
        Unable to load ServiceTitan Jobs. Please try again later.
      </div>
    );
  }
}

// ============================================
// SALES CONFIGURATION PAGE
// ============================================

export default async function SalesConfigurationPage({ searchParams }) {
  const params = await searchParams;

  const tableKey = [
    params.tab || "all",
    params.page || "1",
    params.pageSize || "9",
  ].join("-");

  return (
    <div className="w-full space-y-6">
      {/* Breadcrumbs */}
      <Breadcrumbs
        items={[
          { label: "Sales Tracker", href: "/admin" },
          { label: "Settings", href: "/admin/settings" },
        ]}
        currentPage="Sales Configuration"
      />
      {/* JOB CARDS */}
      <Suspense
        key={tableKey}
        fallback={<JobCardsSkeleton />}
      >
        <SalesConfigurationSection searchParams={params} />
      </Suspense>
    </div>
  );
}
